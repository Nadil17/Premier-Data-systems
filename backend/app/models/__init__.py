"""
Models package initialization
Import all models here for easy access
"""

from app.models.user import User, UserRole
from app.models.customer import Customer, CustomerCategory
from app.models.job import Job, JobType, JobCategory, JobStatus
from app.models.job_item import JobItem
from app.models.parts import (
    Part,
    PartsRequest, PartsRequestStatus,
    PartsRequestItem, PartsRequestItemStatus
)
from app.models.product import Brand, ProductModel, Category, Product
from app.models.estimate import (
    EngineerEstimate, EngineerEstimateItem,
    CustomerEstimate, CustomerEstimateItem,
    EstimateItemType, EstimateApprovalStatus,
    CustomerEstimateItemApprovalStatus
)
from app.models.notification import Notification, NotificationType, NotificationChannel
from app.models.handover import PartsHandover, HandoverStatus

__all__ = [
    "User", "UserRole",
    "Customer", "CustomerCategory",
    "Job", "JobType", "JobCategory", "JobStatus", "JobItem",
    "Part",
    "PartsRequest", "PartsRequestStatus",
    "PartsRequestItem", "PartsRequestItemStatus",
    "Brand", "ProductModel", "Category", "Product",
    "EngineerEstimate", "EngineerEstimateItem",
    "CustomerEstimate", "CustomerEstimateItem",
    "EstimateItemType", "EstimateApprovalStatus",
    "CustomerEstimateItemApprovalStatus",
    "Notification", "NotificationType", "NotificationChannel",
    "PartsHandover", "HandoverStatus"
]
