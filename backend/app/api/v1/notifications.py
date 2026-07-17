"""Notification endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.time import utc_now
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationResponse, NotificationMarkRead, NotificationSummary
)

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    is_read: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user notifications"""
    
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id
    )
    
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    
    notifications = query.order_by(
        Notification.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return notifications


@router.get("/summary", response_model=NotificationSummary)
async def get_notification_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification summary"""
    
    from sqlalchemy import func
    
    total = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id
    ).scalar()
    
    unread = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).scalar()
    
    return {
        "total_notifications": total,
        "unread_count": unread
    }


@router.post("/mark-read", status_code=status.HTTP_200_OK)
async def mark_notifications_as_read(
    mark_read_data: NotificationMarkRead,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark notifications as read"""
    
    for notif_id in mark_read_data.notification_ids:
        notification = db.query(Notification).filter(
            Notification.id == notif_id,
            Notification.user_id == current_user.id
        ).first()
        
        if notification:
            notification.is_read = True
            notification.read_at = utc_now()
    
    db.commit()
    
    return {"message": f"Marked {len(mark_read_data.notification_ids)} notifications as read"}


@router.put("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compatibility endpoint used by the notification bell."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.is_read = True
    notification.read_at = utc_now()
    db.commit()
    return {"message": "Notification marked as read"}


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark every notification belonging to the current user as read."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({Notification.is_read: True, Notification.read_at: utc_now()}, synchronize_session=False)
    db.commit()
    return {"message": f"Marked {count} notifications as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a notification"""
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    db.delete(notification)
    db.commit()
    
    return None
