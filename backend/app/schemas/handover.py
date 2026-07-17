"""Parts Handover schemas"""

from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.handover import HandoverStatus


class PartsHandoverBase(BaseModel):
    job_id: int
    previous_engineer_id: int
    new_engineer_id: int
    part_id: int
    request_item_id: int
    quantity: int
    notes: Optional[str] = None


class PartsHandoverCreate(PartsHandoverBase):
    pass


class PartsHandoverResponse(PartsHandoverBase):
    id: int
    status: HandoverStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    transferred_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    
    # Optional nested details for UI
    part_name: Optional[str] = None
    part_number: Optional[str] = None
    previous_engineer_name: Optional[str] = None
    new_engineer_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class PartsHandoverTransfer(BaseModel):
    notes: Optional[str] = None


class PartsHandoverReturn(BaseModel):
    notes: Optional[str] = None


class PartsHandoverConfirm(BaseModel):
    notes: Optional[str] = None
