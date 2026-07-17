"""Parts Handover API endpoints"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.time import utc_now
from app.models.user import User, UserRole
from app.models.job import Job
from app.models.parts import PartsRequestItem
from app.models.handover import PartsHandover, HandoverStatus
from app.schemas.handover import PartsHandoverResponse, PartsHandoverTransfer, PartsHandoverReturn, PartsHandoverConfirm

router = APIRouter()


def build_handover_response(handover):
    """Build handover response with related names"""
    return {
        "id": handover.id,
        "job_id": handover.job_id,
        "previous_engineer_id": handover.previous_engineer_id,
        "new_engineer_id": handover.new_engineer_id,
        "part_id": handover.part_id,
        "request_item_id": handover.request_item_id,
        "quantity": handover.quantity,
        "status": handover.status,
        "notes": handover.notes,
        "created_at": handover.created_at,
        "updated_at": handover.updated_at,
        "transferred_at": handover.transferred_at,
        "received_at": handover.received_at,
        "part_name": handover.part.name if handover.part else None,
        "part_number": handover.part.part_number if handover.part else None,
        "previous_engineer_name": handover.previous_engineer.full_name if handover.previous_engineer else None,
        "new_engineer_name": handover.new_engineer.full_name if handover.new_engineer else None,
    }


@router.get("/jobs/{job_id}/handovers", response_model=List[PartsHandoverResponse])
async def get_job_handovers(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all parts handovers for a job"""
    handovers = db.query(PartsHandover).options(
        joinedload(PartsHandover.part),
        joinedload(PartsHandover.previous_engineer),
        joinedload(PartsHandover.new_engineer)
    ).filter(PartsHandover.job_id == job_id).all()
    
    return [build_handover_response(h) for h in handovers]


def check_and_clear_job_handover_flag(db: Session, job_id: int):
    """Check if all handovers are resolved and clear flag"""
    pending_handovers = db.query(PartsHandover).filter(
        PartsHandover.job_id == job_id,
        PartsHandover.status.in_([HandoverStatus.PENDING, HandoverStatus.TRANSFERRED])
    ).first()
    
    if not pending_handovers:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job and job.has_pending_handover:
            job.has_pending_handover = False
            from app.models.job import JobStatus
            job.status = JobStatus.REPAIR_IN_PROGRESS_HANDOVERED


@router.post("/handovers/{handover_id}/transfer", response_model=PartsHandoverResponse)
async def transfer_handover(
    handover_id: int,
    transfer_data: PartsHandoverTransfer,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ENGINEER, UserRole.ADMIN, UserRole.MANAGER]))
):
    """Previous engineer marks parts as transferred to new engineer"""
    handover = db.query(PartsHandover).options(
        joinedload(PartsHandover.part),
        joinedload(PartsHandover.previous_engineer),
        joinedload(PartsHandover.new_engineer)
    ).filter(PartsHandover.id == handover_id).first()
    
    if not handover:
        raise HTTPException(status_code=404, detail="Handover not found")
        
    if current_user.role == UserRole.ENGINEER and handover.previous_engineer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the previous engineer can transfer parts")
        
    if handover.status != HandoverStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot transfer from status {handover.status}")
        
    handover.status = HandoverStatus.TRANSFERRED
    handover.transferred_at = utc_now()
    if transfer_data.notes:
        handover.notes = transfer_data.notes
        
    db.commit()
    db.refresh(handover)
    return build_handover_response(handover)


@router.post("/handovers/{handover_id}/return", response_model=PartsHandoverResponse)
async def return_handover(
    handover_id: int,
    return_data: PartsHandoverReturn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ENGINEER, UserRole.ADMIN, UserRole.MANAGER]))
):
    """Previous engineer returns parts to store instead of transferring"""
    handover = db.query(PartsHandover).options(
        joinedload(PartsHandover.part),
        joinedload(PartsHandover.previous_engineer),
        joinedload(PartsHandover.new_engineer)
    ).filter(PartsHandover.id == handover_id).first()
    
    if not handover:
        raise HTTPException(status_code=404, detail="Handover not found")
        
    if current_user.role == UserRole.ENGINEER and handover.previous_engineer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the previous engineer can return parts")
        
    if handover.status != HandoverStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot return from status {handover.status}")
        
    handover.status = HandoverStatus.RETURNED_TO_STORE
    if return_data.notes:
        handover.notes = return_data.notes
        
    # Mark the underlying request item as returned (or partially returned)
    request_item = db.query(PartsRequestItem).filter(PartsRequestItem.id == handover.request_item_id).first()
    if request_item:
        request_item.quantity_returned = (request_item.quantity_returned or 0) + handover.quantity
        from app.models.parts import PartsRequestItemStatus
        if request_item.quantity_returned >= (request_item.quantity_issued or 0):
            request_item.status = PartsRequestItemStatus.RETURNED
            
        # Add back to stock
        if handover.part:
            handover.part.quantity_in_stock += handover.quantity
            
    check_and_clear_job_handover_flag(db, handover.job_id)
    
    db.commit()
    db.refresh(handover)
    return build_handover_response(handover)


@router.post("/handovers/{handover_id}/confirm", response_model=PartsHandoverResponse)
async def confirm_handover(
    handover_id: int,
    confirm_data: PartsHandoverConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ENGINEER, UserRole.ADMIN, UserRole.MANAGER]))
):
    """New engineer confirms receipt of transferred parts"""
    handover = db.query(PartsHandover).options(
        joinedload(PartsHandover.part),
        joinedload(PartsHandover.previous_engineer),
        joinedload(PartsHandover.new_engineer)
    ).filter(PartsHandover.id == handover_id).first()
    
    if not handover:
        raise HTTPException(status_code=404, detail="Handover not found")
        
    if current_user.role == UserRole.ENGINEER and handover.new_engineer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the new engineer can confirm receipt")
        
    if handover.status != HandoverStatus.TRANSFERRED:
        raise HTTPException(status_code=400, detail=f"Cannot confirm receipt from status {handover.status}")
        
    handover.status = HandoverStatus.RECEIVED
    handover.received_at = utc_now()
    if confirm_data.notes:
        handover.notes = confirm_data.notes
        
    # Create new PartsRequest for new engineer if needed
    from app.models.parts import PartsRequest, PartsRequestStatus, PartsRequestItemStatus
    
    # Find or create a parts request for the new engineer to hold the transferred parts
    pr = db.query(PartsRequest).filter(
        PartsRequest.job_id == handover.job_id,
        PartsRequest.engineer_id == handover.new_engineer_id,
        PartsRequest.status == PartsRequestStatus.APPROVED
    ).first()
    
    if not pr:
        from app.utils.id_generator import generate_parts_request_number
        pr = PartsRequest(
            request_number=generate_parts_request_number(),
            job_id=handover.job_id,
            engineer_id=handover.new_engineer_id,
            status=PartsRequestStatus.APPROVED,
            reason="System Generated: Parts handover from previous engineer",
            approved_by_id=handover.previous_engineer_id,
            approved_at=utc_now()
        )
        db.add(pr)
        db.flush()
        
    # Create new request item for the new engineer
    new_item = PartsRequestItem(
        request_id=pr.id,
        part_id=handover.part_id,
        quantity_requested=handover.quantity,
        quantity_approved=handover.quantity,
        quantity_issued=handover.quantity,
        quantity_used=0,
        quantity_returned=0,
        status=PartsRequestItemStatus.ISSUED
    )
    db.add(new_item)
    
    # Decrease quantity_issued from the old item so the parts are not double-counted
    old_item = db.query(PartsRequestItem).filter(PartsRequestItem.id == handover.request_item_id).first()
    if old_item:
        old_item.quantity_issued = max(0, (old_item.quantity_issued or 0) - handover.quantity)
    
    check_and_clear_job_handover_flag(db, handover.job_id)
    
    db.commit()
    db.refresh(handover)
    return build_handover_response(handover)
