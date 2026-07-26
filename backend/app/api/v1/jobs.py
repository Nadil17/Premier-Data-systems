"""Job management endpoints"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.time import utc_now
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.job import Job, JobStatus
from app.models.job_item import JobItem
from app.models.parts import (
    PartsRequest,
    PartsRequestItem,
    PartsRequestItemStatus,
    PartsRequestStatus,
)
from app.models.handover import PartsHandover, HandoverStatus
from app.models.product import Brand, Category, ProductModel
from app.schemas.job import (
    JobCreate, JobUpdate, JobResponse, JobSummary,
    JobAssignment, JobStartRepair, JobCompletion, JobDelivery, JobHistory,
    JobItemResponse, AccountantReview
)
from app.utils.id_generator import generate_job_number
from app.services.notification import notification_service

router = APIRouter()


def build_job_response(job, customer=None, assigned_engineer=None):
    """Build a complete job response dict with resolved lookup names."""
    customer = customer or getattr(job, "customer", None)
    assigned_engineer = assigned_engineer or getattr(job, "assigned_to", None)

    if customer is None:
        customer_name = "Unknown"
        customer_phone = ""
    else:
        customer_name = customer.name
        customer_phone = customer.phone_1 or ""

    return {
        "id": job.id,
        "job_number": job.job_number,
        "customer_id": job.customer_id,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "tax_number": getattr(customer, "tax_number", None) or getattr(customer, "vat_number", None),
            "vat_number": getattr(customer, "vat_number", None),
            "address": customer.address,
            "email": customer.email,
        } if customer else None,
        "reported_by": job.reported_by,
        "additional_phone": job.additional_phone,
        "brand_id": job.brand_id,
        "brand_name": job.brand_ref.name if job.brand_ref else None,
        "model_id": job.model_id,
        "model_name": job.model_ref.name if job.model_ref else None,
        "machine_category_id": job.machine_category_id,
        "machine_category_name": job.machine_category_ref.name if job.machine_category_ref else None,
        "machine_model": job.machine_model,
        "serial_number": job.serial_number,
        "fault_description": job.fault_description,
        "job_type": job.job_type,
        "job_category": job.job_category,
        "status": job.status,
        "has_pending_handover": getattr(job, "has_pending_handover", False),
        "assigned_to_id": job.assigned_to_id,
        "assigned_to_name": assigned_engineer.full_name if assigned_engineer else None,
        "assigned_at": job.assigned_at,
        "work_done": job.work_done,
        "tests_performed": job.tests_performed,
        "repair_notes": job.repair_notes,
        "warranty_details": job.warranty_details,
        "completed_at": job.completed_at,
        "delivered_at": job.delivered_at,
        "invoice_number": job.invoice_number,
        "reviewed_by_id": job.reviewed_by_id,
        "reviewed_by_name": job.reviewed_by.full_name if job.reviewed_by else None,
        "reviewed_at": job.reviewed_at,
        "remarks": job.remarks,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
        "items": [
            {
                "id": item.id,
                "job_id": item.job_id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "returned": item.returned,
                "notes": item.notes
            }
            for item in job.job_items
        ]
    }


def _process_job_reassignment(db: Session, job: Job, previous_engineer_id: int, new_engineer_id: int):
    """Check for unused parts and create handover records if needed."""
    parts_requests = db.query(PartsRequest).filter(
        PartsRequest.job_id == job.id,
        PartsRequest.status.in_([PartsRequestStatus.APPROVED, PartsRequestStatus.PARTIALLY_APPROVED])
    ).all()
    
    has_unused = False
    for request in parts_requests:
        for item in request.items:
            issued = item.quantity_issued or 0
            used = item.quantity_used or 0
            returned = item.quantity_returned or 0
            
            unused = issued - used - returned
            if unused > 0:
                has_unused = True
                handover = PartsHandover(
                    job_id=job.id,
                    previous_engineer_id=previous_engineer_id,
                    new_engineer_id=new_engineer_id,
                    part_id=item.part_id,
                    request_item_id=item.id,
                    quantity=unused,
                    status=HandoverStatus.PENDING
                )
                db.add(handover)
                
    if has_unused:
        job.has_pending_handover = True


def validate_job_lookup_ids(db: Session, brand_id, model_id, machine_category_id):
    """Validate that lookup FK IDs exist."""
    if brand_id is not None and not db.query(Brand).filter(Brand.id == brand_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    if model_id is not None and not db.query(ProductModel).filter(ProductModel.id == model_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    if machine_category_id is not None and not db.query(Category).filter(Category.id == machine_category_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")


def load_job_with_refs(db: Session, job_id: int):
    """Load a job with all lookup relationships eagerly loaded."""
    return db.query(Job).options(
        joinedload(Job.customer),
        joinedload(Job.assigned_to),
        joinedload(Job.job_items),
        joinedload(Job.brand_ref),
        joinedload(Job.model_ref),
        joinedload(Job.machine_category_ref),
    ).filter(Job.id == job_id).first()


@router.get("", response_model=dict)
async def get_all_jobs(
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    assigned_to_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all jobs with pagination"""
    
    query = db.query(Job).options(
        joinedload(Job.customer),
        joinedload(Job.assigned_to),
        joinedload(Job.job_items),
        joinedload(Job.brand_ref),
        joinedload(Job.model_ref),
        joinedload(Job.machine_category_ref),
    )
    
    # Role-based filtering
    if current_user.role == UserRole.ENGINEER:
        from sqlalchemy import or_
        has_handover = db.query(PartsHandover).filter(
            PartsHandover.job_id == Job.id,
            PartsHandover.previous_engineer_id == current_user.id,
            PartsHandover.status == HandoverStatus.PENDING
        ).exists()
        
        query = query.filter(or_(
            Job.assigned_to_id == current_user.id,
            has_handover
        ))

    if status:
        query = query.filter(Job.status == status)
    if customer_id:
        query = query.filter(Job.customer_id == customer_id)
    if assigned_to_id:
        query = query.filter(Job.assigned_to_id == assigned_to_id)

    total = query.count()
    jobs = query.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    
    result = [build_job_response(job) for job in jobs]
    
    return {
        "items": result,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.MANAGER]))
):
    """Create a new repair job"""
    
    # Verify customer exists
    customer = db.query(Customer).filter(Customer.id == job_data.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Validate lookup FK IDs
    validate_job_lookup_ids(db, job_data.brand_id, job_data.model_id, job_data.machine_category_id)
    
    # Generate unique job number
    job_number = generate_job_number()
    while db.query(Job).filter(Job.job_number == job_number).first():
        job_number = generate_job_number()
    
    # Extract items data before creating job
    items_data = job_data.items
    job_dict = job_data.model_dump(exclude={'items'})
    
    # Create job
    new_job = Job(
        job_number=job_number,
        status=JobStatus.UNASSIGNED,
        **job_dict
    )
    
    db.add(new_job)
    db.flush()
    
    # Create job items
    for item_data in items_data:
        job_item = JobItem(
            job_id=new_job.id,
            **item_data.model_dump()
        )
        db.add(job_item)
    
    db.commit()
    
    # Reload with relationships
    job = load_job_with_refs(db, new_job.id)
    return build_job_response(job, customer)


@router.get("/history/{serial_number}", response_model=List[JobHistory])
async def get_job_history_by_serial(
    serial_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get job history for a serial number"""
    
    jobs = db.query(Job).options(
        joinedload(Job.parts_requests)
        .joinedload(PartsRequest.items)
        .joinedload(PartsRequestItem.part)
    ).filter(
        Job.serial_number == serial_number
    ).order_by(Job.created_at.desc()).all()
    
    result = []
    for job in jobs:
        parts = []
        for pr in job.parts_requests:
            for item in pr.items:
                parts.append({
                    "part_name": item.part.name if item.part else "Unknown",
                    "part_number": item.part.part_number if item.part else "",
                    "quantity_requested": item.quantity_requested or 0,
                    "quantity_approved": item.quantity_approved or 0,
                    "quantity_issued": item.quantity_issued or 0,
                    "quantity_used": item.quantity_used or 0,
                    "quantity_returned": item.quantity_returned or 0,
                    "status": item.status.value if hasattr(item.status, 'value') else str(item.status),
                })
        result.append({
            "id": job.id,
            "job_number": job.job_number,
            "fault_description": job.fault_description,
            "work_done": job.work_done,
            "tests_performed": job.tests_performed,
            "repair_notes": job.repair_notes,
            "remarks": job.remarks,
            "status": job.status,
            "job_category": job.job_category.value if hasattr(job.job_category, 'value') else str(job.job_category),
            "completed_at": job.completed_at,
            "created_at": job.created_at,
            "parts": parts,
        })
    return result


@router.get("/unassigned", response_model=List[JobSummary])
async def get_unassigned_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK]))
):
    """Get all unassigned jobs"""
    
    jobs = db.query(Job).filter(Job.status == JobStatus.UNASSIGNED).all()
    
    result = []
    for job in jobs:
        customer = db.query(Customer).filter(Customer.id == job.customer_id).first()
        result.append({
            "id": job.id,
            "job_number": job.job_number,
            "customer_name": customer.name if customer else "Unknown",
            "customer_phone": customer.phone_1 if customer else "",
            "machine_model": job.machine_model,
            "serial_number": job.serial_number,
            "fault_description": job.fault_description,
            "status": job.status,
            "job_type": job.job_type,
            "job_category": job.job_category,
            "assigned_to_id": None,
            "assigned_to_name": None,
            "created_at": job.created_at
        })
    
    return result


@router.post("/{job_id}/assign", response_model=JobResponse)
async def assign_job_to_engineer(
    job_id: int,
    assignment: JobAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    """Assign job to an engineer"""
    
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Verify engineer exists
    engineer = db.query(User).filter(
        User.id == assignment.engineer_id,
        User.role == UserRole.ENGINEER
    ).first()
    
    if not engineer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found"
        )
    
    # Assign job
    previous_engineer_id = job.assigned_to_id
    reassigned = (previous_engineer_id is not None) and (previous_engineer_id != assignment.engineer_id)
    
    job.assigned_to_id = assignment.engineer_id
    job.assigned_at = utc_now()
    job.status = JobStatus.ASSIGNED
    
    if reassigned:
        _process_job_reassignment(db, job, previous_engineer_id, assignment.engineer_id)
    
    db.commit()
    
    # Reload with relationships
    job = load_job_with_refs(db, job_id)
    
    # Send notification
    notification_service.notify_job_assigned(
        db=db,
        engineer_id=engineer.id,
        engineer_phone=engineer.phone or "",
        engineer_name=engineer.full_name,
        job_number=job.job_number,
        job_id=job.id
    )
    
    return build_job_response(job)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get job details"""
    
    job = load_job_with_refs(db, job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Engineers can only view jobs assigned to them or if they have a pending handover
    if current_user.role == UserRole.ENGINEER and job.assigned_to_id != current_user.id:
        has_handover = db.query(PartsHandover).filter(
            PartsHandover.job_id == job_id,
            PartsHandover.previous_engineer_id == current_user.id,
            PartsHandover.status == HandoverStatus.PENDING
        ).first()
        
        if not has_handover:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view jobs assigned to you or those with pending handovers"
            )
    
    customer = db.query(Customer).filter(Customer.id == job.customer_id).first()
    assigned_engineer = None
    if job.assigned_to_id:
        assigned_engineer = db.query(User).filter(User.id == job.assigned_to_id).first()
    
    return build_job_response(job, customer, assigned_engineer)


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_data: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update job information"""
    
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Update fields
    update_data = job_data.model_dump(exclude_unset=True, exclude={'items'})
    
    # Validate lookup FK IDs if provided
    validate_job_lookup_ids(
        db,
        update_data.get("brand_id"),
        update_data.get("model_id"),
        update_data.get("machine_category_id"),
    )
    
    for field, value in update_data.items():
        setattr(job, field, value)
    
    # Update items if provided
    if job_data.items is not None:
        db.query(JobItem).filter(JobItem.job_id == job_id).delete()
        for item_data in job_data.items:
            job_item = JobItem(
                job_id=job_id,
                **item_data.model_dump()
            )
            db.add(job_item)
    
    db.commit()
    
    # Reload with relationships
    job = load_job_with_refs(db, job_id)
    customer = db.query(Customer).filter(Customer.id == job.customer_id).first()
    assigned_engineer = None
    if job.assigned_to_id:
        assigned_engineer = db.query(User).filter(User.id == job.assigned_to_id).first()
    
    return build_job_response(job, customer, assigned_engineer)


@router.post("/{job_id}/start-repair", response_model=JobResponse)
async def start_job_repair(
    job_id: int,
    repair_data: JobStartRepair,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT]))
):
    """Accountant updates job status to repair in progress and optionally reassigns engineer"""
    
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    if job.status != JobStatus.ESTIMATE_APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job cannot start repair from current status: {job.status}"
        )
        
    if job.has_pending_handover:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job has pending parts handover. Cannot start repair until handovers are completed."
        )
    
    reassigned = False
    new_engineer = None
    
    if repair_data.engineer_id and repair_data.engineer_id != job.assigned_to_id:
        # Verify new engineer exists
        new_engineer = db.query(User).filter(
            User.id == repair_data.engineer_id,
            User.role == UserRole.ENGINEER
        ).first()
        
        if not new_engineer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Engineer not found"
            )
        
        previous_engineer_id = job.assigned_to_id
        job.assigned_to_id = repair_data.engineer_id
        job.assigned_at = utc_now()
        reassigned = True
        
        if previous_engineer_id and previous_engineer_id != repair_data.engineer_id:
            _process_job_reassignment(db, job, previous_engineer_id, repair_data.engineer_id)

    job.status = JobStatus.REPAIR_IN_PROGRESS
    db.commit()
    
    # Reload with relationships
    job = load_job_with_refs(db, job_id)
    
    # Send notification if reassigned
    if reassigned and new_engineer:
        notification_service.notify_job_assigned(
            db=db,
            engineer_id=new_engineer.id,
            engineer_phone=new_engineer.phone or "",
            engineer_name=new_engineer.full_name,
            job_number=job.job_number,
            job_id=job.id
        )
        
    return build_job_response(job)


@router.get("/{job_id}/parts-requests", response_model=list)
async def get_job_parts_requests(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all parts requests for a specific job"""
    
    # First, verify the user has access to this job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if current_user.role == UserRole.ENGINEER and job.assigned_to_id != current_user.id:
        has_handover = db.query(PartsHandover).filter(
            PartsHandover.job_id == job_id,
            PartsHandover.previous_engineer_id == current_user.id,
            PartsHandover.status == HandoverStatus.PENDING
        ).first()
        if not has_handover:
            raise HTTPException(status_code=403, detail="Not authorized to view this job's parts requests")
            
    # Return all parts requests for this job
    requests = db.query(PartsRequest).filter(PartsRequest.job_id == job_id).all()
    from app.api.v1.parts import build_parts_request_response
    return [build_parts_request_response(db, req) for req in requests]


@router.get("/{job_id}/completion-check", response_model=dict)
async def check_job_completion_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ENGINEER]))
):
    """Check if job can be completed - validates all requirements"""

    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    if job.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only check jobs assigned to you"
        )
    
    # Get all parts requests for this job
    parts_requests = db.query(PartsRequest).filter(
        PartsRequest.job_id == job_id,
        PartsRequest.status.in_([PartsRequestStatus.APPROVED, PartsRequestStatus.PARTIALLY_APPROVED])
    ).all()
    
    validation_results = {
        "can_complete": True,
        "blocking_issues": [],
        "warnings": [],
        "parts_summary": {
            "total_issued": 0,
            "total_used": 0,
            "total_returned": 0,
            "pending_return": 0
        }
    }
    
    if not parts_requests:
        return validation_results
    
    for request in parts_requests:
        for item in request.items:
            if item.status not in [PartsRequestItemStatus.APPROVED, PartsRequestItemStatus.ISSUED, 
                                   PartsRequestItemStatus.USED, PartsRequestItemStatus.RETURNED,
                                   PartsRequestItemStatus.RETURN_REQUESTED]:
                continue
            
            issued = item.quantity_issued or 0
            used = item.quantity_used or 0
            returned = item.quantity_returned or 0
            
            validation_results["parts_summary"]["total_issued"] += issued
            validation_results["parts_summary"]["total_used"] += used
            validation_results["parts_summary"]["total_returned"] += returned
            
            unused = issued - used
            
            if unused > 0:
                if returned < unused:
                    pending = unused - returned
                    validation_results["parts_summary"]["pending_return"] += pending
                    
                    if item.status == PartsRequestItemStatus.RETURN_REQUESTED:
                        validation_results["blocking_issues"].append({
                            "type": "return_not_approved",
                            "message": f"Part '{item.part.name}' return requested but not yet approved by storekeeper",
                            "part_name": item.part.name,
                            "quantity_pending": pending
                        })
                    else:
                        validation_results["blocking_issues"].append({
                            "type": "parts_not_returned",
                            "message": f"Part '{item.part.name}' has {pending} unused item(s) not returned to store",
                            "part_name": item.part.name,
                            "quantity_pending": pending
                        })
                    validation_results["can_complete"] = False
                
                if item.status != PartsRequestItemStatus.RETURNED and returned > 0:
                    validation_results["blocking_issues"].append({
                        "type": "return_not_approved",
                        "message": f"Part '{item.part.name}' return not yet approved by storekeeper",
                        "part_name": item.part.name
                    })
                    validation_results["can_complete"] = False
            
            if issued > 0 and used == 0 and returned < issued:
                validation_results["warnings"].append({
                    "type": "no_parts_marked_used",
                    "message": f"Part '{item.part.name}' was issued but not marked as used",
                    "part_name": item.part.name
                })
    
    return validation_results


@router.post("/{job_id}/complete", response_model=JobResponse)
async def complete_job(
    job_id: int,
    completion_data: JobCompletion,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ENGINEER]))
):
    """Mark job as completed with validation"""

    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    if job.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only complete jobs assigned to you"
        )
    
    if not completion_data.work_done or not completion_data.work_done.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Work done description is required"
        )
    
    if not completion_data.tests_performed or not completion_data.tests_performed.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tests performed description is required"
        )
    
    if not completion_data.repair_notes or not completion_data.repair_notes.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Repair notes are required"
        )
    
    parts_requests = db.query(PartsRequest).filter(
        PartsRequest.job_id == job_id,
        PartsRequest.status.in_([PartsRequestStatus.APPROVED, PartsRequestStatus.PARTIALLY_APPROVED])
    ).all()
    
    if parts_requests:
        for request in parts_requests:
            for item in request.items:
                if item.status not in [PartsRequestItemStatus.APPROVED, PartsRequestItemStatus.ISSUED,
                                       PartsRequestItemStatus.USED, PartsRequestItemStatus.RETURNED,
                                       PartsRequestItemStatus.RETURN_REQUESTED]:
                    continue
                
                issued = item.quantity_issued or 0
                used = item.quantity_used or 0
                returned = item.quantity_returned or 0
                unused = issued - used
                
                if unused > 0 and returned < unused:
                    if item.status == PartsRequestItemStatus.RETURN_REQUESTED:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Cannot complete job: Part '{item.part.name}' return requested but not yet approved by storekeeper"
                        )
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Cannot complete job: Part '{item.part.name}' has {unused - returned} unused item(s) not returned to store"
                        )
                
                if unused > 0 and returned > 0 and item.status != PartsRequestItemStatus.RETURNED:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Cannot complete job: Part '{item.part.name}' return not yet approved by storekeeper"
                    )
    
    job.work_done = completion_data.work_done
    job.tests_performed = completion_data.tests_performed
    job.repair_notes = completion_data.repair_notes
    job.warranty_details = completion_data.warranty_details
    job.completed_at = utc_now()
    job.status = JobStatus.WAITING_FOR_ACCOUNTANT_REVIEW
    
    db.commit()
    
    job = load_job_with_refs(db, job_id)
    
    # Notify accountant
    accountant = db.query(User).filter(
        User.role == UserRole.ACCOUNTANT,
        User.is_active == True
    ).first()
    if accountant:
        notification_service.create_notification(
            db=db,
            user_id=accountant.id,
            notification_type="job_completed",
            title="Job Completed",
            message=f"Engineer completed job {job.job_number}. Ready for review.",
            related_job_id=job.id
        )
    
    return build_job_response(job)


@router.post("/{job_id}/accountant-review", response_model=JobResponse)
async def accountant_review_job(
    job_id: int,
    review_data: AccountantReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT])),
):
    """Accountant reviews completed job, assigns invoice number, and marks it as ready for delivery"""
    
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    if job.status != JobStatus.WAITING_FOR_ACCOUNTANT_REVIEW:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job is not waiting for accountant review. Current status: {job.status}"
        )
    
    # Require invoice number
    invoice_number = review_data.invoice_number
    if not invoice_number or not invoice_number.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invoice number is required to approve the job"
        )
    
    # Check uniqueness of invoice number
    existing = db.query(Job).filter(
        Job.invoice_number == invoice_number.strip(),
        Job.id != job_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invoice number '{invoice_number.strip()}' is already assigned to job {existing.job_number}"
        )
    
    job.status = JobStatus.READY_FOR_DELIVERY
    job.invoice_number = invoice_number.strip()
    job.reviewed_by_id = current_user.id
    job.reviewed_at = utc_now()
    
    db.commit()
    
    job = load_job_with_refs(db, job_id)
    
    # Send notification to front desk
    try:
        front_desk_users = db.query(User).filter(
            User.role == UserRole.FRONT_DESK,
            User.is_active == True
        ).all()
        
        from app.models.notification import NotificationType, NotificationChannel
        
        for front_desk_user in front_desk_users:
            notification_service.create_notification(
                db=db,
                user_id=front_desk_user.id,
                notification_type=NotificationType.JOB_READY_FOR_DELIVERY,
                title=f"Job {job.job_number} Ready for Delivery",
                message=f"Job {job.job_number} (Invoice: {invoice_number.strip()}) has been reviewed and is ready for delivery to customer.",
                channel=NotificationChannel.IN_APP,
                related_job_id=job.id
            )
    except Exception as e:
        print(f"Failed to send notification: {e}")
    
    return build_job_response(job)


@router.post("/{job_id}/deliver", response_model=JobResponse)
async def deliver_job(
    job_id: int,
    delivery_data: JobDelivery,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.MANAGER]))
):
    """Mark job as delivered to customer"""
    
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    if job.status != JobStatus.READY_FOR_DELIVERY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is not ready for delivery"
        )
    
    # Mark specified items as returned
    for item_id in delivery_data.returned_item_ids:
        job_item = db.query(JobItem).filter(
            JobItem.id == item_id,
            JobItem.job_id == job_id
        ).first()
        
        if job_item:
            job_item.returned = True
    
    job.delivered_at = utc_now()
    job.status = JobStatus.DELIVERED
    
    db.commit()
    
    job = load_job_with_refs(db, job_id)
    return build_job_response(job)


@router.put("/{job_id}/items/{item_id}/return", response_model=JobItemResponse)
async def return_job_item(
    job_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.MANAGER, UserRole.ENGINEER]))
):
    """Mark a job item as returned"""
    item = db.query(JobItem).filter(
        JobItem.id == item_id,
        JobItem.job_id == job_id
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job item not found"
        )
        
    item.returned = True
    db.commit()
    db.refresh(item)
    
    return item
