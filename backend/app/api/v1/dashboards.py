"""Dashboard endpoints for different user roles"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.time import utc_today
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.job import Job, JobStatus
from app.models.parts import Part, PartsRequest, PartsRequestStatus
from app.models.estimate import CustomerEstimate, EstimateApprovalStatus
from app.schemas.dashboard import (
    EngineerDashboard, StorekeeperDashboard, AccountantDashboard,
    ManagerDashboard, FrontDeskDashboard
)

router = APIRouter()


@router.get("/engineer", response_model=EngineerDashboard)
async def get_engineer_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ENGINEER]))
):
    """Get engineer dashboard data"""
    
    # Get job statistics
    total_assigned = db.query(func.count(Job.id)).filter(
        Job.assigned_to_id == current_user.id
    ).scalar()
    
    pending = db.query(func.count(Job.id)).filter(
        Job.assigned_to_id == current_user.id,
        Job.status.in_([JobStatus.ASSIGNED, JobStatus.IN_PROGRESS, JobStatus.REPAIR_IN_PROGRESS, JobStatus.REPAIR_IN_PROGRESS_HANDOVERED])
    ).scalar()
    
    completed = db.query(func.count(Job.id)).filter(
        Job.assigned_to_id == current_user.id,
        Job.status.in_([JobStatus.COMPLETED, JobStatus.DELIVERED])
    ).scalar()
    
    waiting_approval = db.query(func.count(Job.id)).filter(
        Job.assigned_to_id == current_user.id,
        Job.status == JobStatus.WAITING_FOR_ESTIMATE_APPROVAL
    ).scalar()
    
    waiting_parts = db.query(func.count(Job.id)).filter(
        Job.assigned_to_id == current_user.id,
        Job.status == JobStatus.WAITING_FOR_PARTS
    ).scalar()
    
    # Get recent jobs
    jobs = db.query(Job).filter(
        Job.assigned_to_id == current_user.id
    ).order_by(Job.created_at.desc()).limit(10).all()
    
    job_summaries = []
    for job in jobs:
        customer = db.query(Customer).filter(Customer.id == job.customer_id).first()
        job_summaries.append({
            "id": job.id,
            "job_number": job.job_number,
            "customer_name": customer.display_name if customer else "Unknown",
            "customer_phone": customer.phone_1 if customer else "",
            "machine_model": job.machine_model,
            "serial_number": job.serial_number,
            "fault_description": job.fault_description,
            "status": job.status,
            "job_type": job.job_type,
            "job_category": job.job_category,
            "assigned_to_id": job.assigned_to_id,
            "assigned_to_name": current_user.full_name,
            "created_at": job.created_at
        })
    
    return {
        "total_assigned_jobs": total_assigned,
        "pending_jobs": pending,
        "completed_jobs": completed,
        "waiting_for_approval_jobs": waiting_approval,
        "waiting_for_parts_jobs": waiting_parts,
        "jobs": job_summaries
    }


@router.get("/storekeeper", response_model=StorekeeperDashboard)
async def get_storekeeper_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.STOREKEEPER, UserRole.ADMIN]))
):
    """Get storekeeper dashboard data"""
    
    today = utc_today()
    
    # Get parts request statistics
    pending_requests = db.query(func.count(PartsRequest.id)).filter(
        PartsRequest.status == PartsRequestStatus.PENDING
    ).scalar()
    
    approved_today = db.query(func.count(PartsRequest.id)).filter(
        PartsRequest.status.in_([PartsRequestStatus.APPROVED, PartsRequestStatus.PARTIALLY_APPROVED]),
        func.date(PartsRequest.approved_at) == today
    ).scalar()
    
    # Get inventory statistics
    low_stock = db.query(func.count(Part.id)).filter(
        Part.quantity_in_stock <= Part.minimum_stock_level,
        Part.quantity_in_stock > 0
    ).scalar()
    
    out_of_stock = db.query(func.count(Part.id)).filter(
        Part.quantity_in_stock == 0
    ).scalar()
    
    # Get recent requests
    requests = db.query(PartsRequest).order_by(
        PartsRequest.created_at.desc()
    ).limit(10).all()
    
    request_summaries = []
    for req in requests:
        job = db.query(Job).filter(Job.id == req.job_id).first()
        engineer = db.query(User).filter(User.id == req.engineer_id).first()
        
        from app.models.parts import PartsRequestItem
        item_count = db.query(func.count(PartsRequestItem.id)).filter(
            PartsRequestItem.request_id == req.id
        ).scalar()
        
        request_summaries.append({
            "id": req.id,
            "request_number": req.request_number,
            "job_number": job.job_number if job else "",
            "engineer_name": engineer.full_name if engineer else "",
            "status": req.status,
            "total_items": item_count,
            "created_at": req.created_at
        })
    
    return {
        "pending_requests": pending_requests,
        "approved_requests_today": approved_today,
        "low_stock_items": low_stock,
        "out_of_stock_items": out_of_stock,
        "pending_returns": 0,  # Can be implemented if needed
        "parts_requests": request_summaries
    }


@router.get("/accountant", response_model=AccountantDashboard)
async def get_accountant_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ACCOUNTANT, UserRole.ADMIN]))
):
    """Get accountant dashboard data"""
    
    from app.models.estimate import EngineerEstimate
    
    today = utc_today()
    
    # Engineer estimates pending review
    pending_engineer_estimates = db.query(func.count(EngineerEstimate.id)).filter(
        ~EngineerEstimate.job_id.in_(
            db.query(CustomerEstimate.job_id)
        )
    ).scalar()
    
    # Customer estimates pending approval
    pending_customer_approvals = db.query(func.count(CustomerEstimate.id)).filter(
        CustomerEstimate.approval_status == EstimateApprovalStatus.PENDING
    ).scalar()
    
    # Approved today
    approved_today = db.query(func.count(CustomerEstimate.id)).filter(
        CustomerEstimate.approval_status == EstimateApprovalStatus.APPROVED,
        func.date(CustomerEstimate.approved_at) == today
    ).scalar()
    
    # Rejected today
    rejected_today = db.query(func.count(CustomerEstimate.id)).filter(
        CustomerEstimate.approval_status == EstimateApprovalStatus.REJECTED,
        func.date(CustomerEstimate.approved_at) == today
    ).scalar()
    
    # Completed jobs pending review
    completed_pending = db.query(func.count(Job.id)).filter(
        Job.status == JobStatus.WAITING_FOR_ACCOUNTANT_REVIEW
    ).scalar()
    
    return {
        "pending_engineer_estimates": pending_engineer_estimates,
        "pending_customer_approvals": pending_customer_approvals,
        "approved_estimates_today": approved_today,
        "rejected_estimates_today": rejected_today,
        "completed_jobs_pending_review": completed_pending
    }


@router.get("/manager", response_model=ManagerDashboard)
async def get_manager_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN]))
):
    """Get manager dashboard data"""
    
    # Job statistics
    total_jobs = db.query(func.count(Job.id)).scalar()
    unassigned = db.query(func.count(Job.id)).filter(
        Job.status == JobStatus.UNASSIGNED
    ).scalar()
    
    in_progress = db.query(func.count(Job.id)).filter(
        Job.status.in_([JobStatus.ASSIGNED, JobStatus.IN_PROGRESS, JobStatus.WAITING_FOR_PARTS, JobStatus.REPAIR_IN_PROGRESS, JobStatus.REPAIR_IN_PROGRESS_HANDOVERED])
    ).scalar()
    
    completed = db.query(func.count(Job.id)).filter(
        Job.status.in_([JobStatus.COMPLETED, JobStatus.WAITING_FOR_ACCOUNTANT_REVIEW])
    ).scalar()
    
    delivered = db.query(func.count(Job.id)).filter(
        Job.status == JobStatus.DELIVERED
    ).scalar()
    
    # Count engineers and customers
    total_engineers = db.query(func.count(User.id)).filter(
        User.role == UserRole.ENGINEER,
        User.is_active == True
    ).scalar()
    
    total_customers = db.query(func.count(Customer.id)).scalar()
    
    # Jobs by status
    jobs_by_status = {}
    for status in JobStatus:
        count = db.query(func.count(Job.id)).filter(Job.status == status).scalar()
        jobs_by_status[status.value] = count
    
    return {
        "total_jobs": total_jobs,
        "unassigned_jobs": unassigned,
        "in_progress_jobs": in_progress,
        "completed_jobs": completed,
        "delivered_jobs": delivered,
        "total_engineers": total_engineers,
        "total_customers": total_customers,
        "jobs_by_status": jobs_by_status
    }


@router.get("/front-desk", response_model=FrontDeskDashboard)
async def get_front_desk_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.FRONT_DESK, UserRole.ADMIN]))
):
    """Get front desk dashboard data"""
    
    today = utc_today()
    
    # New customers today
    new_customers_today = db.query(func.count(Customer.id)).filter(
        func.date(Customer.created_at) == today
    ).scalar()
    
    # New jobs today
    new_jobs_today = db.query(func.count(Job.id)).filter(
        func.date(Job.created_at) == today
    ).scalar()
    
    # Jobs ready for delivery
    ready_for_delivery = db.query(func.count(Job.id)).filter(
        Job.status == JobStatus.READY_FOR_DELIVERY
    ).scalar()
    
    # Delivered today
    delivered_today = db.query(func.count(Job.id)).filter(
        func.date(Job.delivered_at) == today
    ).scalar()
    
    return {
        "new_customers_today": new_customers_today,
        "new_jobs_today": new_jobs_today,
        "jobs_ready_for_delivery": ready_for_delivery,
        "delivered_today": delivered_today
    }
