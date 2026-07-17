"""Customer schemas for request/response validation"""

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime

from app.models.customer import CustomerCategory
from app.schemas.job import JobSummary


# Base Customer Schema
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    phone_1: str = Field(..., min_length=7, max_length=20)
    phone_2: Optional[str] = Field(None, max_length=20)
    phone_3: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    category: CustomerCategory
    vat_number: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=255)
    remarks: Optional[str] = None


# Create Customer Schema
class CustomerCreate(CustomerBase):
    pass


# Update Customer Schema
class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    phone_1: Optional[str] = Field(None, min_length=7, max_length=20)
    phone_2: Optional[str] = Field(None, max_length=20)
    phone_3: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    category: Optional[CustomerCategory] = None
    vat_number: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=255)
    remarks: Optional[str] = None


# Customer Response Schema
class CustomerResponse(CustomerBase):
    id: int
    customer_id: str
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# Customer Search Schema
class CustomerSearchParams(BaseModel):
    query: Optional[str] = None  # Search by name, phone, or customer_id
    category: Optional[CustomerCategory] = None
    skip: int = Field(0, ge=0)
    limit: int = Field(10, ge=1, le=100)


# Customer with Job History
class CustomerWithJobHistory(CustomerResponse):
    total_jobs: int
    pending_jobs: int
    completed_jobs: int
    jobs: list[JobSummary] = Field(default_factory=list)
