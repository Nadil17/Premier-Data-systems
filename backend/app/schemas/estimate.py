from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.estimate import EstimateItemType, EstimateApprovalStatus, CustomerEstimateItemApprovalStatus


# ==========================================
# ENGINEER ESTIMATE
# ==========================================
class EngineerEstimateItemBase(BaseModel):
    item_type: EstimateItemType
    part_id: Optional[int] = None
    description: str = Field(..., min_length=1, max_length=500)
    technical_description: Optional[str] = None
    quantity: int = Field(1, ge=1)
    notes: Optional[str] = None

class EngineerEstimateItemCreate(EngineerEstimateItemBase):
    pass

class EngineerEstimateItemResponse(EngineerEstimateItemBase):
    id: int
    estimate_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EngineerEstimateBase(BaseModel):
    technical_notes: Optional[str] = None
    additional_notes: Optional[str] = None

class EngineerEstimateCreate(EngineerEstimateBase):
    job_id: int
    items: List[EngineerEstimateItemCreate] = Field(..., min_length=1)

class EngineerEstimateUpdate(EngineerEstimateBase):
    items: Optional[List[EngineerEstimateItemCreate]] = None

class EngineerEstimateResponse(EngineerEstimateBase):
    id: int
    estimate_number: str
    job_id: int
    job_number: Optional[str] = None
    customer_name: Optional[str] = None
    engineer_id: int
    engineer_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[EngineerEstimateItemResponse]
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# CUSTOMER ESTIMATE
# ==========================================
class CustomerEstimateItemBase(BaseModel):
    item_type: EstimateItemType
    part_id: Optional[int] = None
    description: str = Field(..., min_length=1, max_length=500)
    quantity: int = Field(1, ge=1)
    unit_price: float = Field(0.0, ge=0)
    item_comments: Optional[str] = None

class CustomerEstimateItemCreate(CustomerEstimateItemBase):
    pass

class CustomerEstimateItemResponse(CustomerEstimateItemBase):
    id: int
    estimate_id: int
    total_price: float
    approval_status: CustomerEstimateItemApprovalStatus
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CustomerEstimateBase(BaseModel):
    special_notes: Optional[str] = None
    include_tax: bool = False

class CustomerEstimateCreate(CustomerEstimateBase):
    job_id: int
    items: List[CustomerEstimateItemCreate] = Field(..., min_length=1)

class CustomerEstimateUpdate(CustomerEstimateBase):
    items: Optional[List[CustomerEstimateItemCreate]] = None

class CustomerEstimateResponse(CustomerEstimateBase):
    id: int
    estimate_number: str
    job_id: int
    job_number: Optional[str] = None
    customer_name: Optional[str] = None
    accountant_id: int
    accountant_name: Optional[str] = None
    approval_status: EstimateApprovalStatus
    customer_comments: Optional[str] = None
    approved_at: Optional[datetime] = None
    subtotal: float = 0.0
    include_tax: bool = False
    tax_rate: float = 0.0
    tax_amount: float = 0.0
    total_amount: float
    otp_generated_at: Optional[datetime] = None
    otp_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[CustomerEstimateItemResponse]
    model_config = ConfigDict(from_attributes=True)


class CustomerEstimateItemApprovalUpdate(BaseModel):
    item_id: int
    approval_status: CustomerEstimateItemApprovalStatus

class CustomerEstimateApproval(BaseModel):
    approval_status: EstimateApprovalStatus
    customer_comments: Optional[str] = None
    items: Optional[List[CustomerEstimateItemApprovalUpdate]] = None

class OTPVerification(BaseModel):
    estimate_number: str
    otp_code: str = Field(..., min_length=6, max_length=6)

class OTPVerificationResponse(BaseModel):
    success: bool
    access_token: str
    estimate: CustomerEstimateResponse

class EstimateLinkResponse(BaseModel):
    success: bool
    message: str


# ==========================================
# EMAIL & MANUAL APPROVAL
# ==========================================
class SendEmailRequest(BaseModel):
    email: Optional[EmailStr] = None
    send_via: Optional[str] = None

class SendEmailResponse(BaseModel):
    success: bool
    message: str

class ManualApprovalItemData(BaseModel):
    item_id: int
    approval_status: CustomerEstimateItemApprovalStatus

class ManualApprovalRequest(BaseModel):
    overall_status: EstimateApprovalStatus
    customer_comments: Optional[str] = None
    items: List[ManualApprovalItemData]
