"""Parts and inventory management endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.time import utc_now
from app.models.user import User, UserRole
from app.models.job import Job
from app.models.parts import Part, PartsRequest, PartsRequestItem, PartsRequestStatus, PartsRequestItemStatus
from app.models.product import Brand, Category, ProductModel
from app.schemas.parts import (
    PartCreate, PartUpdate, PartResponse,
    PartsRequestCreate, PartsRequestResponse, PartsRequestApproval,
    PartsRequestSummary, PartsInventorySummary,
    PartsRequestItemUsage, PartsRequestItemReturn,
    LookupCreate, LookupResponse
)
from app.utils.id_generator import generate_parts_request_number
from app.services.notification import notification_service

router = APIRouter()


def build_part_response(part: Part) -> dict:
    """Build part response with resolved brand/model/category names"""
    return {
        "id": part.id,
        "part_number": part.part_number,
        "name": part.name,
        "description": part.description,
        "brand_id": part.brand_id,
        "brand_name": part.brand_ref.name if part.brand_ref else None,
        "model_id": part.model_id,
        "model_name": part.model_ref.name if part.model_ref else None,
        "category_id": part.category_id,
        "category_name": part.category_ref.name if part.category_ref else None,
        "quantity_in_stock": part.quantity_in_stock,
        "minimum_stock_level": part.minimum_stock_level,
        "unit_price": part.unit_price,
        "created_at": part.created_at,
        "updated_at": part.updated_at,
    }


def validate_lookup_ids(
    db: Session,
    brand_id: Optional[int],
    model_id: Optional[int],
    category_id: Optional[int],
) -> None:
    """Validate referenced shared lookup rows before saving parts."""
    if brand_id is not None and not db.query(Brand).filter(Brand.id == brand_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    if model_id is not None and not db.query(ProductModel).filter(ProductModel.id == model_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    if category_id is not None and not db.query(Category).filter(Category.id == category_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")


# ─── Lookup table CRUD: Brands ───

@router.get("/brands", response_model=List[LookupResponse])
async def list_brands(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Brand).order_by(Brand.name).all()


@router.post("/brands", response_model=LookupResponse, status_code=status.HTTP_201_CREATED)
async def create_brand(
    data: LookupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.STOREKEEPER]))
):
    existing = db.query(Brand).filter(Brand.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Brand already exists")
    brand = Brand(name=data.name)
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


# ─── Lookup table CRUD: Models ───

@router.get("/models", response_model=List[LookupResponse])
async def list_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(ProductModel).order_by(ProductModel.name).all()


@router.post("/models", response_model=LookupResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    data: LookupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.STOREKEEPER]))
):
    existing = db.query(ProductModel).filter(ProductModel.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Model already exists")
    model = ProductModel(name=data.name)
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


# ─── Lookup table CRUD: Categories ───

@router.get("/categories", response_model=List[LookupResponse])
async def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Category).order_by(Category.name).all()


@router.post("/categories", response_model=LookupResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: LookupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.STOREKEEPER]))
):
    existing = db.query(Category).filter(Category.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    category = Category(name=data.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


# Part Management
@router.post("/inventory", response_model=PartResponse, status_code=status.HTTP_201_CREATED)
async def create_part(
    part_data: PartCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.STOREKEEPER]))
):
    """Create a new part"""
    
    # Check if part number exists
    existing = db.query(Part).filter(Part.part_number == part_data.part_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Part number already exists"
        )

    validate_lookup_ids(db, part_data.brand_id, part_data.model_id, part_data.category_id)
    
    new_part = Part(**part_data.model_dump())
    db.add(new_part)
    db.commit()
    db.refresh(new_part)
    
    # Eager load relationships
    part = db.query(Part).options(
        joinedload(Part.brand_ref),
        joinedload(Part.model_ref),
        joinedload(Part.category_ref)
    ).filter(Part.id == new_part.id).first()
    
    return build_part_response(part)


@router.get("/inventory/search", response_model=List[PartResponse])
async def search_parts(
    q: str = Query(..., min_length=1, description="Search query for part name or number"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search parts by name or part number"""
    
    search_pattern = f"%{q}%"
    parts = db.query(Part).options(
        joinedload(Part.brand_ref),
        joinedload(Part.model_ref),
        joinedload(Part.category_ref)
    ).filter(
        (Part.name.ilike(search_pattern)) | 
        (Part.part_number.ilike(search_pattern))
    ).limit(limit).all()
    
    return [build_part_response(p) for p in parts]


@router.get("/inventory", response_model=List[PartResponse])
async def list_parts(
    category: Optional[int] = Query(None),
    low_stock: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List parts inventory"""
    
    query = db.query(Part).options(
        joinedload(Part.brand_ref),
        joinedload(Part.model_ref),
        joinedload(Part.category_ref)
    )
    
    if category:
        query = query.filter(Part.category_id == category)
    
    if low_stock:
        query = query.filter(Part.quantity_in_stock <= Part.minimum_stock_level)
    
    parts = query.offset(skip).limit(limit).all()
    return [build_part_response(p) for p in parts]


@router.get("/inventory/summary", response_model=PartsInventorySummary)
async def get_inventory_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.STOREKEEPER, UserRole.MANAGER]))
):
    """Get inventory summary"""
    
    total_parts = db.query(Part).count()
    low_stock = db.query(Part).filter(
        Part.quantity_in_stock <= Part.minimum_stock_level,
        Part.quantity_in_stock > 0
    ).count()
    out_of_stock = db.query(Part).filter(Part.quantity_in_stock == 0).count()
    
    total_value = sum([p.quantity_in_stock * p.unit_price for p in db.query(Part).all()])
    
    return {
        "total_parts": total_parts,
        "low_stock_count": low_stock,
        "out_of_stock_count": out_of_stock,
        "total_value": total_value
    }


@router.put("/inventory/{part_id}", response_model=PartResponse)
async def update_part(
    part_id: int,
    part_data: PartUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.STOREKEEPER]))
):
    """Update part information"""
    
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Part not found"
        )
    
    update_data = part_data.model_dump(exclude_unset=True)
    validate_lookup_ids(
        db,
        update_data.get("brand_id"),
        update_data.get("model_id"),
        update_data.get("category_id"),
    )
    for field, value in update_data.items():
        setattr(part, field, value)
    
    db.commit()
    
    # Reload with relationships
    part = db.query(Part).options(
        joinedload(Part.brand_ref),
        joinedload(Part.model_ref),
        joinedload(Part.category_ref)
    ).filter(Part.id == part_id).first()
    
    return build_part_response(part)


# Parts Request Management
@router.post("/requests", response_model=PartsRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_parts_request(
    request_data: PartsRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ENGINEER]))
):
    """Engineer creates parts request"""
    
    # Verify job exists and is assigned to engineer
    job = db.query(Job).filter(Job.id == request_data.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    if job.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Job not assigned to you"
        )
    
    # Generate request number
    request_number = generate_parts_request_number()
    while db.query(PartsRequest).filter(PartsRequest.request_number == request_number).first():
        request_number = generate_parts_request_number()
    
    # Create request
    new_request = PartsRequest(
        request_number=request_number,
        job_id=request_data.job_id,
        engineer_id=current_user.id,
        reason=request_data.reason,
        status=PartsRequestStatus.PENDING
    )
    
    db.add(new_request)
    db.flush()
    
    # Add items
    for item_data in request_data.items:
        part = db.query(Part).filter(Part.id == item_data.part_id).first()
        if not part:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Part with ID {item_data.part_id} not found"
            )
        
        request_item = PartsRequestItem(
            request_id=new_request.id,
            part_id=item_data.part_id,
            quantity_requested=item_data.quantity_requested,
            status=PartsRequestItemStatus.PENDING
        )
        db.add(request_item)
    
    db.commit()
    db.refresh(new_request)
    
    # Get storekeeper for notification (first storekeeper found)
    storekeeper = db.query(User).filter(User.role == UserRole.STOREKEEPER, User.is_active == True).first()
    if storekeeper:
        notification_service.notify_parts_request_submitted(
            db=db,
            storekeeper_id=storekeeper.id,
            storekeeper_phone=storekeeper.phone or "",
            request_number=request_number,
            engineer_name=current_user.full_name,
            job_id=job.id
        )
    
    # Build response
    return build_parts_request_response(db, new_request)


@router.get("/requests", response_model=List[PartsRequestSummary])
async def list_parts_requests(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List parts requests"""
    
    query = db.query(PartsRequest)
    
    # Filter by role
    if current_user.role == UserRole.ENGINEER:
        query = query.filter(PartsRequest.engineer_id == current_user.id)
    
    if status:
        query = query.filter(PartsRequest.status == status)
    
    requests = query.order_by(PartsRequest.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for req in requests:
        job = db.query(Job).filter(Job.id == req.job_id).first()
        engineer = db.query(User).filter(User.id == req.engineer_id).first()
        item_count = db.query(PartsRequestItem).filter(PartsRequestItem.request_id == req.id).count()
        
        result.append({
            "id": req.id,
            "request_number": req.request_number,
            "job_number": job.job_number if job else "",
            "engineer_name": engineer.full_name if engineer else "",
            "status": req.status,
            "total_items": item_count,
            "created_at": req.created_at
        })
    
    return result


@router.get("/requests/{request_id}", response_model=PartsRequestResponse)
async def get_parts_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get parts request details"""
    
    request = db.query(PartsRequest).filter(PartsRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parts request not found"
        )
    
    return build_parts_request_response(db, request)


@router.post("/requests/{request_id}/approve", response_model=PartsRequestResponse)
async def approve_parts_request(
    request_id: int,
    approval_data: PartsRequestApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.STOREKEEPER, UserRole.ADMIN]))
):
    """Storekeeper approves/rejects parts request"""
    
    request = db.query(PartsRequest).filter(PartsRequest.id == request_id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parts request not found"
        )
    
    # Update request status
    request.status = approval_data.status
    request.storekeeper_notes = approval_data.storekeeper_notes
    request.approved_by_id = current_user.id
    request.approved_at = utc_now()
    
    # Update individual items
    for item_approval in approval_data.items:
        item = db.query(PartsRequestItem).filter(PartsRequestItem.id == item_approval.item_id).first()
        if item and item.request_id == request_id:
            item.quantity_approved = item_approval.quantity_approved
            item.status = item_approval.status
            item.alternative_part_id = item_approval.alternative_part_id
            item.alternative_notes = item_approval.alternative_notes
            
            # Update stock if approved
            if item_approval.status == PartsRequestItemStatus.APPROVED:
                part = db.query(Part).filter(Part.id == item.part_id).first()
                if part:
                    if part.quantity_in_stock < item_approval.quantity_approved:
                        db.rollback()
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Insufficient stock for part {part.name}"
                        )
                    part.quantity_in_stock -= item_approval.quantity_approved
                    item.quantity_issued = item_approval.quantity_approved
                    item.status = PartsRequestItemStatus.ISSUED

    db.commit()
    db.refresh(request)
    
    return build_parts_request_response(db, request)


@router.post("/requests/items/{item_id}/mark-used")
async def mark_part_as_used(
    item_id: int,
    usage_data: PartsRequestItemUsage,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ENGINEER]))
):
    """Engineer marks parts as used"""
    
    item = db.query(PartsRequestItem).filter(PartsRequestItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parts request item not found"
        )
    
    available_to_use = (item.quantity_issued or 0) - (item.quantity_used or 0) - (item.quantity_returned or 0) - (item.quantity_pending_return or 0)
    if usage_data.quantity_used > available_to_use:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot use more parts than available"
        )
    
    item.quantity_used = (item.quantity_used or 0) + usage_data.quantity_used
    item.status = PartsRequestItemStatus.USED
    
    db.commit()
    
    return {"message": "Parts marked as used", "quantity_used": usage_data.quantity_used}


@router.post("/requests/items/{item_id}/return")
async def return_unused_parts(
    item_id: int,
    return_data: PartsRequestItemReturn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ENGINEER]))
):
    """Engineer requests to return unused parts (requires storekeeper approval)"""
    
    item = db.query(PartsRequestItem).filter(PartsRequestItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parts request item not found"
        )
    
    available_to_return = (item.quantity_issued or 0) - (item.quantity_returned or 0) - (item.quantity_pending_return or 0)
    if return_data.quantity_returned > available_to_return:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot return more parts than available"
        )
    
    # If returning parts that were marked as used, reduce quantity_used
    unused_available = (item.quantity_issued or 0) - (item.quantity_used or 0) - (item.quantity_returned or 0) - (item.quantity_pending_return or 0)
    if return_data.quantity_returned > unused_available:
        used_parts_to_return = return_data.quantity_returned - unused_available
        item.quantity_used = max(0, (item.quantity_used or 0) - used_parts_to_return)
    
    # Mark as return requested (pending storekeeper approval)
    item.quantity_pending_return = (item.quantity_pending_return or 0) + return_data.quantity_returned
    item.status = PartsRequestItemStatus.RETURN_REQUESTED
    
    db.commit()
    
    # Notify storekeeper
    try:
        storekeeper = db.query(User).filter(User.role == UserRole.STOREKEEPER, User.is_active == True).first()
        if storekeeper:
            # Get job_id for notification
            request = db.query(PartsRequest).filter(PartsRequest.id == item.request_id).first()
            job_id = request.job_id if request else None
            
            notification_service.notify_parts_return_requested(
                db=db,
                storekeeper_id=storekeeper.id,
                engineer_name=current_user.full_name,
                part_name=db.query(Part).filter(Part.id == item.part_id).first().name if db.query(Part).filter(Part.id == item.part_id).first() else "Unknown",
                quantity=return_data.quantity_returned,
                job_id=job_id
            )
    except Exception as e:
        # Log error but don't fail the request since the DB update was successful
        print(f"Failed to send notification: {str(e)}")
    
    return {"message": "Return request submitted, waiting for storekeeper approval", "quantity_pending_return": return_data.quantity_returned}


@router.post("/requests/items/{item_id}/accept-return")
async def accept_parts_return(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.STOREKEEPER, UserRole.ADMIN]))
):
    """Storekeeper accepts returned parts and adds back to inventory"""
    
    item = db.query(PartsRequestItem).filter(PartsRequestItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parts request item not found"
        )
    
    if item.status != PartsRequestItemStatus.RETURN_REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No return request pending for this item"
        )
    
    if not item.quantity_pending_return or item.quantity_pending_return == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No parts pending return"
        )
    
    # Accept return and add back to inventory
    item.quantity_returned = (item.quantity_returned or 0) + item.quantity_pending_return
    returned_qty = item.quantity_pending_return
    item.quantity_pending_return = 0
    item.status = PartsRequestItemStatus.RETURNED
    
    # Add back to stock
    part = db.query(Part).filter(Part.id == item.part_id).first()
    if part:
        part.quantity_in_stock += returned_qty
    
    db.commit()
    
    # Notify engineer
    request = db.query(PartsRequest).filter(PartsRequest.id == item.request_id).first()
    if request:
        engineer = db.query(User).filter(User.id == request.engineer_id).first()
        if engineer:
            notification_service.notify_parts_return_accepted(
                db=db,
                engineer_id=engineer.id,
                storekeeper_name=current_user.full_name,
                part_name=part.name if part else "Unknown",
                quantity=returned_qty
            )
    
    return {"message": "Parts return accepted and added back to inventory", "quantity_returned": returned_qty}


def build_parts_request_response(db: Session, request: PartsRequest):
    """Helper to build parts request response"""
    job = db.query(Job).filter(Job.id == request.job_id).first()
    engineer = db.query(User).filter(User.id == request.engineer_id).first()
    approver = db.query(User).filter(User.id == request.approved_by_id).first() if request.approved_by_id else None
    
    items = []
    for item in request.items:
        part = db.query(Part).filter(Part.id == item.part_id).first()
        items.append({
            "id": item.id,
            "part_id": item.part_id,
            "part_name": part.name if part else "",
            "part_number": part.part_number if part else "",
            "quantity_requested": item.quantity_requested,
            "quantity_approved": item.quantity_approved,
            "quantity_issued": item.quantity_issued,
            "quantity_used": item.quantity_used,
            "quantity_returned": item.quantity_returned,
            "quantity_pending_return": item.quantity_pending_return,
            "status": item.status,
            "alternative_part_id": item.alternative_part_id,
            "alternative_notes": item.alternative_notes,
            "created_at": item.created_at
        })
    
    return {
        "id": request.id,
        "request_number": request.request_number,
        "job_id": request.job_id,
        "job_number": job.job_number if job else "",
        "engineer_id": request.engineer_id,
        "engineer_name": engineer.full_name if engineer else "",
        "status": request.status,
        "reason": request.reason,
        "storekeeper_notes": request.storekeeper_notes,
        "approved_by_id": request.approved_by_id,
        "approved_by_name": approver.full_name if approver else None,
        "approved_at": request.approved_at,
        "items": items,
        "created_at": request.created_at,
        "updated_at": request.updated_at
    }
