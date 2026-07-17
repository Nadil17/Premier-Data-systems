"""Notification schemas"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime
from app.models.notification import NotificationType, NotificationChannel


# Notification Base Schema
class NotificationBase(BaseModel):
    notification_type: NotificationType
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    channel: NotificationChannel = NotificationChannel.IN_APP
    related_job_id: Optional[int] = None
    related_estimate_id: Optional[int] = None


# Create Notification Schema
class NotificationCreate(NotificationBase):
    user_id: int


# Notification Response Schema
class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Mark as Read Schema
class NotificationMarkRead(BaseModel):
    notification_ids: list[int]


# Notification Summary
class NotificationSummary(BaseModel):
    total_notifications: int
    unread_count: int
