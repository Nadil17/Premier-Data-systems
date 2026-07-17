"""Parts and inventory schemas"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from app.models.parts import (
    PartsRequestStatus,
    PartsRequestItemStatus
)


# Lookup table schemas
class LookupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

class LookupCreate(LookupBase):
    pass

class LookupResponse(LookupBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Part Schemas
class PartBase(BaseModel):
    part_number: str = Field(..., max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    brand_id: Optional[int] = None
    model_id: Optional[int] = None
    category_id: Optional[int] = None
    quantity_in_stock: int = Field(0, ge=0)
    minimum_stock_level: int = Field(0, ge=0)
    unit_price: float = Field(0.0, ge=0)


class PartCreate(PartBase):
    pass


class PartUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    brand_id: Optional[int] = None
    model_id: Optional[int] = None
    category_id: Optional[int] = None
    quantity_in_stock: Optional[int] = Field(None, ge=0)
    minimum_stock_level: Optional[int] = Field(None, ge=0)
    unit_price: Optional[float] = Field(None, ge=0)


class PartResponse(BaseModel):
    id: int
    part_number: str
    name: str
    description: Optional[str] = None
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    model_id: Optional[int] = None
    model_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    quantity_in_stock: int
    minimum_stock_level: int
    unit_price: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Parts Request Item Schemas
class PartsRequestItemCreate(BaseModel):
    part_id: int
    quantity_requested: int = Field(..., gt=0)


class PartsRequestItemResponse(BaseModel):
    id: int
    part_id: int
    part_name: str
    part_number: str
    quantity_requested: int
    quantity_approved: int
    quantity_issued: int
    quantity_used: int
    quantity_returned: int
    quantity_pending_return: int
    status: PartsRequestItemStatus
    alternative_part_id: Optional[int]
    alternative_notes: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PartsRequestItemApproval(BaseModel):
    item_id: int
    quantity_approved: int = Field(..., ge=0)
    status: PartsRequestItemStatus
    alternative_part_id: Optional[int] = None
    alternative_notes: Optional[str] = None


class PartsRequestItemUsage(BaseModel):
    quantity_used: int = Field(..., ge=0)


class PartsRequestItemReturn(BaseModel):
    quantity_returned: int = Field(..., ge=0)


# Parts Request Schemas
class PartsRequestCreate(BaseModel):
    job_id: int
    reason: Optional[str] = None
    items: List[PartsRequestItemCreate]


class PartsRequestUpdate(BaseModel):
    reason: Optional[str] = None
    storekeeper_notes: Optional[str] = None


class PartsRequestApproval(BaseModel):
    status: PartsRequestStatus
    storekeeper_notes: Optional[str] = None
    items: List[PartsRequestItemApproval]


class PartsRequestResponse(BaseModel):
    id: int
    request_number: str
    job_id: int
    job_number: str
    engineer_id: int
    engineer_name: str
    status: PartsRequestStatus
    reason: Optional[str]
    storekeeper_notes: Optional[str]
    approved_by_id: Optional[int]
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime]
    items: List[PartsRequestItemResponse]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# Parts Request Summary (for lists)
class PartsRequestSummary(BaseModel):
    id: int
    request_number: str
    job_number: str
    engineer_name: str
    status: PartsRequestStatus
    total_items: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Parts Inventory Summary
class PartsInventorySummary(BaseModel):
    total_parts: int
    low_stock_count: int
    out_of_stock_count: int
    total_value: float
