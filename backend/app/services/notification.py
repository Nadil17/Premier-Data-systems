"""Notification service for creating system notifications"""

from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationType, NotificationChannel
from app.schemas.notification import NotificationCreate
from app.services.whatsapp import whatsapp_service
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating and managing notifications"""
    
    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        channel: NotificationChannel = NotificationChannel.IN_APP,
        related_job_id: Optional[int] = None,
        related_estimate_id: Optional[int] = None
    ) -> Notification:
        """Create a new notification"""
        
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            channel=channel,
            related_job_id=related_job_id,
            related_estimate_id=related_estimate_id
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        logger.info(f"Notification created: {notification.id} for user {user_id}")
        
        return notification
    
    @staticmethod
    def notify_job_assigned(
        db: Session,
        engineer_id: int,
        engineer_phone: str,
        engineer_name: str,
        job_number: str,
        job_id: int
    ):
        """Send notification when job is assigned to engineer"""
        
        # Create in-app notification
        NotificationService.create_notification(
            db=db,
            user_id=engineer_id,
            notification_type=NotificationType.JOB_ASSIGNED,
            title="New Job Assigned",
            message=f"Job {job_number} has been assigned to you",
            related_job_id=job_id
        )
        
        # Send WhatsApp notification
        whatsapp_service.send_job_assigned_notification(
            engineer_phone=engineer_phone,
            engineer_name=engineer_name,
            job_number=job_number
        )
    
    @staticmethod
    def notify_parts_request_submitted(
        db: Session,
        storekeeper_id: int,
        storekeeper_phone: str,
        request_number: str,
        engineer_name: str,
        job_id: int
    ):
        """Notify storekeeper of new parts request"""
        
        # Create in-app notification
        NotificationService.create_notification(
            db=db,
            user_id=storekeeper_id,
            notification_type=NotificationType.PARTS_REQUEST_SUBMITTED,
            title="New Parts Request",
            message=f"Parts request {request_number} from {engineer_name}",
            related_job_id=job_id
        )
        
        # Send WhatsApp notification
        whatsapp_service.send_parts_request_notification(
            storekeeper_phone=storekeeper_phone,
            request_number=request_number,
            engineer_name=engineer_name
        )
    
    @staticmethod
    def notify_estimate_created(
        db: Session,
        accountant_id: int,
        estimate_number: str,
        job_id: int
    ):
        """Notify accountant that engineer estimate is created"""
        
        NotificationService.create_notification(
            db=db,
            user_id=accountant_id,
            notification_type=NotificationType.ENGINEER_ESTIMATE_CREATED,
            title="New Engineer Estimate",
            message=f"Engineer estimate {estimate_number} needs review",
            related_job_id=job_id
        )
    
    @staticmethod
    def notify_estimate_sent_to_customer(
        db: Session,
        engineer_id: int,
        estimate_number: str,
        job_id: int
    ):
        """Notify engineer that estimate was sent to customer"""
        
        NotificationService.create_notification(
            db=db,
            user_id=engineer_id,
            notification_type=NotificationType.CUSTOMER_ESTIMATE_SENT,
            title="Estimate Sent to Customer",
            message=f"Customer estimate {estimate_number} sent for approval",
            related_job_id=job_id
        )
    
    @staticmethod
    def notify_estimate_response(
        db: Session,
        engineer_id: int,
        engineer_phone: str,
        engineer_name: str,
        accountant_id: int,
        accountant_phone: str,
        accountant_name: str,
        estimate_number: str,
        job_number: str,
        job_id: int,
        customer_name: str,
        approval_status: str,
        customer_comments: str = None
    ):
        """
        Notify both engineer and accountant when customer responds to estimate
        Sends both in-app notifications and WhatsApp messages
        """
        
        # Determine notification type based on status
        if approval_status == "approved":
            notif_type = NotificationType.ESTIMATE_APPROVED
            title = "Estimate Approved"
            message = f"Customer approved estimate {estimate_number} for job {job_number}"
        elif approval_status == "rejected":
            notif_type = NotificationType.ESTIMATE_REJECTED
            title = "Estimate Rejected"
            message = f"Customer rejected estimate {estimate_number} for job {job_number}"
        else:  # partially_approved
            notif_type = NotificationType.ESTIMATE_APPROVED  # Using approved type for partial
            title = "Estimate Partially Approved"
            message = f"Customer partially approved estimate {estimate_number} for job {job_number}"
        
        if customer_comments:
            message += f". Comment: {customer_comments[:100]}..."
        
        # Create in-app notification for Engineer
        NotificationService.create_notification(
            db=db,
            user_id=engineer_id,
            notification_type=notif_type,
            title=title,
            message=message,
            related_job_id=job_id
        )
        
        # Create in-app notification for Accountant
        NotificationService.create_notification(
            db=db,
            user_id=accountant_id,
            notification_type=notif_type,
            title=title,
            message=message,
            related_job_id=job_id
        )
        
        # Send WhatsApp to Engineer
        whatsapp_service.send_estimate_approval_notification(
            phone=engineer_phone,
            recipient_name=engineer_name,
            estimate_number=estimate_number,
            job_number=job_number,
            customer_name=customer_name,
            approval_status=approval_status,
            customer_comments=customer_comments
        )
        
        # Send WhatsApp to Accountant
        whatsapp_service.send_estimate_approval_notification(
            phone=accountant_phone,
            recipient_name=accountant_name,
            estimate_number=estimate_number,
            job_number=job_number,
            customer_name=customer_name,
            approval_status=approval_status,
            customer_comments=customer_comments
        )
    
    @staticmethod
    def notify_parts_return_requested(
        db: Session,
        storekeeper_id: int,
        engineer_name: str,
        part_name: str,
        quantity: int,
        job_id: int
    ):
        """Notify storekeeper of parts return request"""
        
        NotificationService.create_notification(
            db=db,
            user_id=storekeeper_id,
            notification_type=NotificationType.PARTS_REQUEST_SUBMITTED,
            title="Parts Return Request",
            message=f"{engineer_name} requested to return {quantity}x {part_name}",
            related_job_id=job_id
        )
    
    @staticmethod
    def notify_parts_return_accepted(
        db: Session,
        engineer_id: int,
        storekeeper_name: str,
        part_name: str,
        quantity: int
    ):
        """Notify engineer that return was accepted"""
        
        NotificationService.create_notification(
            db=db,
            user_id=engineer_id,
            notification_type=NotificationType.PARTS_REQUEST_APPROVED,
            title="Parts Return Accepted",
            message=f"{storekeeper_name} accepted return of {quantity}x {part_name}"
        )


# Singleton instance
notification_service = NotificationService()
