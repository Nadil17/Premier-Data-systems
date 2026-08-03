"""Job schemas for request/response validation"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime, date
from app.models.job import JobType, JobCategory, JobStatus


# Job Item Schemas
class JobItemBase(BaseModel):
    item_name: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(1, ge=1)
    notes: Optional[str] = Field(None, max_length=500)


class JobItemCreate(JobItemBase):
    pass


class JobItemResponse(JobItemBase):
    id: int
    job_id: int
    returned: bool

    model_config = ConfigDict(from_attributes=True)


# Base Job Schema
class JobBase(BaseModel):
    customer_id: int
    reported_by: str = Field(..., min_length=1, max_length=255)
    additional_phone: Optional[str] = Field(None, max_length=20)
    brand_id: Optional[int] = None
    model_id: Optional[int] = None
    machine_category_id: Optional[int] = None
    machine_model: str = Field(..., min_length=1, max_length=255)
    serial_number: Optional[str] = Field(None, max_length=255)
    fault_description: str = Field(..., min_length=1)
    job_type: JobType
    job_category: JobCategory
    remarks: Optional[str] = None


# Create Job Schema
class JobCreate(JobBase):
    items: List[JobItemCreate] = Field(default_factory=list)


# Update Job Schema
class JobUpdate(BaseModel):
    reported_by: Optional[str] = Field(None, min_length=1, max_length=255)
    additional_phone: Optional[str] = Field(None, max_length=20)
    brand_id: Optional[int] = None
    model_id: Optional[int] = None
    machine_category_id: Optional[int] = None
    machine_model: Optional[str] = Field(None, min_length=1, max_length=255)
    serial_number: Optional[str] = Field(None, max_length=255)
    fault_description: Optional[str] = Field(None, min_length=1)
    job_type: Optional[JobType] = None
    job_category: Optional[JobCategory] = None
    remarks: Optional[str] = None
    items: Optional[List[JobItemCreate]] = None


# Job Assignment Schema
class JobAssignment(BaseModel):
    engineer_id: int


# Job Start Repair Schema
class JobStartRepair(BaseModel):
    engineer_id: Optional[int] = None


class UsedPartDetailCreate(BaseModel):
    part_id: int
    serial_number: str = Field(..., min_length=1)
    warranty_period: str = Field(..., min_length=1)
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None

class UsedPartDetailResponse(BaseModel):
    id: int
    part_id: int
    part_name: Optional[str] = None
    serial_number: str
    warranty_period: str
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None
    
    model_config = ConfigDict(from_attributes=True)

# Job Completion Schema
class JobCompletion(BaseModel):
    work_done: str = Field(..., min_length=1)
    tests_performed: str = Field(..., min_length=1)
    repair_notes: Optional[str] = None
    warranty_details: Optional[str] = None
    used_parts: Optional[List[UsedPartDetailCreate]] = None


# Job Delivery Schema
class JobDelivery(BaseModel):
    returned_item_ids: List[int] = Field(..., description="List of job_item IDs that were returned")


# Accountant Review Schema
class AccountantReview(BaseModel):
    invoice_number: str = Field(..., min_length=1, max_length=100, description="Invoice number assigned by accountant")


# Job Response Schema
class JobResponse(BaseModel):
    id: int
    job_number: str
    customer_id: int
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer: Optional[dict] = None
    reported_by: str
    additional_phone: Optional[str] = None
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    model_id: Optional[int] = None
    model_name: Optional[str] = None
    machine_category_id: Optional[int] = None
    machine_category_name: Optional[str] = None
    machine_model: str
    serial_number: Optional[str] = None
    fault_description: str
    job_type: JobType
    job_category: JobCategory
    status: JobStatus
    has_pending_handover: bool = False
    has_previous_jobs: bool = False
    assigned_to_id: Optional[int] = None
    assigned_at: Optional[datetime] = None
    work_done: Optional[str] = None
    tests_performed: Optional[str] = None
    repair_notes: Optional[str] = None
    warranty_details: Optional[str] = None
    completed_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    invoice_number: Optional[str] = None
    reviewed_by_id: Optional[int] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[JobItemResponse] = Field(default_factory=list)
    used_parts: List[UsedPartDetailResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# Job Summary (for lists)
class JobSummary(BaseModel):
    id: int
    job_number: str
    customer_name: str
    customer_phone: str
    machine_model: str
    serial_number: Optional[str]
    fault_description: str
    status: JobStatus
    job_type: JobType
    job_category: JobCategory
    has_previous_jobs: bool = False
    assigned_to_id: Optional[int]
    assigned_to_name: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Job History (for serial number lookup)
class JobHistoryPart(BaseModel):
    part_name: str
    part_number: str
    quantity_requested: int
    quantity_approved: int
    quantity_issued: int
    quantity_used: int
    quantity_returned: int
    status: str

    model_config = ConfigDict(from_attributes=True)


class JobHistory(BaseModel):
    id: int
    job_number: str
    fault_description: str
    work_done: Optional[str]
    tests_performed: Optional[str]
    repair_notes: Optional[str]
    remarks: Optional[str]
    status: JobStatus
    job_category: str
    completed_at: Optional[datetime]
    created_at: datetime
    parts: List[JobHistoryPart] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# Job Search Parameters
class JobSearchParams(BaseModel):
    job_number: Optional[str] = None
    customer_id: Optional[int] = None
    serial_number: Optional[str] = None
    status: Optional[JobStatus] = None
    assigned_to_id: Optional[int] = None
    skip: int = Field(0, ge=0)
    limit: int = Field(10, ge=1, le=100)
