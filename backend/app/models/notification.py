"""Notification model for tracking system notifications"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class NotificationType(str, enum.Enum):
    """Notification type"""
    JOB_ASSIGNED = "job_assigned"
    PARTS_REQUEST_SUBMITTED = "parts_request_submitted"
    PARTS_REQUEST_APPROVED = "parts_request_approved"
    PARTS_REQUEST_REJECTED = "parts_request_rejected"
    ENGINEER_ESTIMATE_CREATED = "engineer_estimate_created"
    CUSTOMER_ESTIMATE_SENT = "customer_estimate_sent"
    ESTIMATE_APPROVED = "estimate_approved"
    ESTIMATE_REJECTED = "estimate_rejected"
    JOB_COMPLETED = "job_completed"
    JOB_READY_FOR_DELIVERY = "job_ready_for_delivery"
    GENERAL = "general"


class NotificationChannel(str, enum.Enum):
    """Notification delivery channel"""
    IN_APP = "in_app"
    WHATSAPP = "whatsapp"
    EMAIL = "email"


class Notification(Base):
    """Notification model"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Recipient
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Notification Content
    notification_type = Column(Enum(NotificationType, values_callable=lambda e: [member.value for member in e]), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Delivery
    channel = Column(Enum(NotificationChannel, values_callable=lambda e: [member.value for member in e]), default=NotificationChannel.IN_APP)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True))
    
    # Related Entity
    related_job_id = Column(Integer, ForeignKey("jobs.id"))
    related_estimate_id = Column(Integer)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    related_job = relationship("Job", foreign_keys=[related_job_id])
    
    def __repr__(self):
        return f"<Notification {self.id}: {self.title}>"
