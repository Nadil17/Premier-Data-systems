"""
Schemas package initialization
"""

from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse,
    LoginRequest, TokenResponse
)
from app.schemas.customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    CustomerSearchParams, CustomerWithJobHistory
)
from app.schemas.job import (
    JobCreate, JobUpdate, JobResponse, JobSummary,
    JobAssignment, JobCompletion, JobDelivery,
    JobHistory, JobSearchParams
)
from app.schemas.parts import (
    PartCreate, PartUpdate, PartResponse,
    PartsRequestCreate, PartsRequestUpdate, PartsRequestResponse,
    PartsRequestApproval, PartsRequestSummary,
    PartsRequestItemCreate, PartsRequestItemResponse,
    PartsRequestItemApproval, PartsRequestItemUsage,
    PartsRequestItemReturn, PartsInventorySummary
)
from app.schemas.product import (
    ProductLookupCreate, ProductLookupResponse,
    ProductCreate, ProductUpdate, ProductResponse
)
from app.schemas.estimate import (
    EngineerEstimateCreate, EngineerEstimateUpdate, EngineerEstimateResponse,
    EngineerEstimateItemCreate, EngineerEstimateItemResponse,
    CustomerEstimateCreate, CustomerEstimateUpdate, CustomerEstimateResponse,
    CustomerEstimateItemCreate, CustomerEstimateItemResponse,
    CustomerEstimateApprovalRequest, CustomerEstimateApprovalItem,
    EstimateVerifyRequest, EstimateVerifyResponse,
    EstimateLinkResponse
)
from app.schemas.notification import (
    NotificationCreate, NotificationResponse,
    NotificationMarkRead, NotificationSummary
)
from app.schemas.dashboard import (
    EngineerDashboard, StorekeeperDashboard, AccountantDashboard,
    ManagerDashboard, FrontDeskDashboard
)

__all__ = [
    "UserCreate", "UserUpdate", "UserResponse",
    "LoginRequest", "TokenResponse",
    "CustomerCreate", "CustomerUpdate", "CustomerResponse",
    "CustomerSearchParams", "CustomerWithJobHistory",
    "JobCreate", "JobUpdate", "JobResponse", "JobSummary",
    "JobAssignment", "JobCompletion", "JobDelivery",
    "JobHistory", "JobSearchParams",
    "PartCreate", "PartUpdate", "PartResponse",
    "PartsRequestCreate", "PartsRequestUpdate", "PartsRequestResponse",
    "PartsRequestApproval", "PartsRequestSummary",
    "PartsRequestItemCreate", "PartsRequestItemResponse",
    "PartsRequestItemApproval", "PartsRequestItemUsage",
    "PartsRequestItemReturn", "PartsInventorySummary",
    "ProductLookupCreate", "ProductLookupResponse",
    "ProductCreate", "ProductUpdate", "ProductResponse",
    "EngineerEstimateCreate", "EngineerEstimateUpdate", "EngineerEstimateResponse",
    "EngineerEstimateItemCreate", "EngineerEstimateItemResponse",
    "CustomerEstimateCreate", "CustomerEstimateUpdate", "CustomerEstimateResponse",
    "CustomerEstimateItemCreate", "CustomerEstimateItemResponse",
    "CustomerEstimateApprovalRequest", "CustomerEstimateApprovalItem",
    "EstimateVerifyRequest", "EstimateVerifyResponse",
    "EstimateLinkResponse",
    "NotificationCreate", "NotificationResponse",
    "NotificationMarkRead", "NotificationSummary",
    "EngineerDashboard", "StorekeeperDashboard", "AccountantDashboard",
    "ManagerDashboard", "FrontDeskDashboard"
]
