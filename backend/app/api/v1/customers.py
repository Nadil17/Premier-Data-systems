"""Customer management endpoints"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.job import Job, JobStatus
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerSearchParams,
    CustomerWithJobHistory
)
from app.utils.id_generator import generate_customer_id

router = APIRouter()


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.MANAGER]))
):
    """Create a new customer"""
    
    # Check if phone number already exists
    existing = db.query(Customer).filter(
        Customer.phone_1 == customer_data.phone_1
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer with this phone number already exists"
        )
    
    # Generate unique customer ID
    customer_id = generate_customer_id()
    while db.query(Customer).filter(Customer.customer_id == customer_id).first():
        customer_id = generate_customer_id()
    
    # Create customer
    new_customer = Customer(
        customer_id=customer_id,
        **customer_data.model_dump()
    )
    
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    return new_customer


@router.get("/search", response_model=List[CustomerResponse])
async def search_customers(
    query: Optional[str] = Query(None, description="Search by name, phone, or customer ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search customers"""
    
    query_filter = db.query(Customer)
    
    # Apply search filter
    if query:
        query_filter = query_filter.filter(
            or_(
                Customer.name.ilike(f"%{query}%"),
                Customer.customer_id.ilike(f"%{query}%"),
                Customer.phone_1.ilike(f"%{query}%"),
                Customer.phone_2.ilike(f"%{query}%"),
                Customer.phone_3.ilike(f"%{query}%"),
                Customer.company_name.ilike(f"%{query}%")
            )
        )
    
    # Apply category filter
    if category:
        query_filter = query_filter.filter(Customer.category == category)
    
    customers = query_filter.offset(skip).limit(limit).all()
    return customers


@router.get("/{customer_id}", response_model=CustomerWithJobHistory)
async def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customer by ID with job history"""
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Get job statistics
    total_jobs = db.query(func.count(Job.id)).filter(Job.customer_id == customer_id).scalar()
    pending_jobs = db.query(func.count(Job.id)).filter(
        Job.customer_id == customer_id,
        Job.status.in_([JobStatus.UNASSIGNED, JobStatus.ASSIGNED, JobStatus.IN_PROGRESS])
    ).scalar()
    completed_jobs = db.query(func.count(Job.id)).filter(
        Job.customer_id == customer_id,
        Job.status == JobStatus.DELIVERED
    ).scalar()

    customer_jobs = db.query(Job).filter(
        Job.customer_id == customer_id
    ).order_by(Job.created_at.desc()).all()

    jobs = []
    for job in customer_jobs:
        engineer = db.query(User).filter(User.id == job.assigned_to_id).first() if job.assigned_to_id else None
        jobs.append({
            "id": job.id,
            "job_number": job.job_number,
            "customer_name": customer.display_name,
            "customer_phone": customer.phone_1,
            "machine_model": job.machine_model,
            "serial_number": job.serial_number,
            "fault_description": job.fault_description,
            "status": job.status,
            "job_type": job.job_type,
            "job_category": job.job_category,
            "assigned_to_id": job.assigned_to_id,
            "assigned_to_name": engineer.full_name if engineer else None,
            "created_at": job.created_at,
        })
    
    customer_dict = customer.__dict__.copy()
    customer_dict["total_jobs"] = total_jobs
    customer_dict["pending_jobs"] = pending_jobs
    customer_dict["completed_jobs"] = completed_jobs
    customer_dict["jobs"] = jobs
    
    return customer_dict


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.MANAGER]))
):
    """Update customer information"""
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Update fields
    update_data = customer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    """Delete customer (admin only)"""
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Check if customer has active jobs
    active_jobs = db.query(Job).filter(
        Job.customer_id == customer_id,
        Job.status != JobStatus.DELIVERED
    ).count()
    
    if active_jobs > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete customer with active jobs"
        )
    
    db.delete(customer)
    db.commit()
    
    return None
