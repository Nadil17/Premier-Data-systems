"""Parts Handover models"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class HandoverStatus(str, enum.Enum):
    """Parts Handover Status"""
    PENDING = "pending"
    TRANSFERRED = "transferred"
    RECEIVED = "received"
    RETURNED_TO_STORE = "returned_to_store"


class PartsHandover(Base):
    """Parts Handover from previous engineer to new engineer"""
    __tablename__ = "parts_handovers"
    
    id = Column(Integer, primary_key=True, index=True)
    
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    previous_engineer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    new_engineer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=False)
    request_item_id = Column(Integer, ForeignKey("parts_request_items.id"), nullable=False)
    
    quantity = Column(Integer, nullable=False)
    status = Column(Enum(HandoverStatus, values_callable=lambda e: [member.value for member in e]), default=HandoverStatus.PENDING, nullable=False)
    
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    transferred_at = Column(DateTime(timezone=True), nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    job = relationship("Job", foreign_keys=[job_id])
    previous_engineer = relationship("User", foreign_keys=[previous_engineer_id])
    new_engineer = relationship("User", foreign_keys=[new_engineer_id])
    part = relationship("Part", foreign_keys=[part_id])
    request_item = relationship("PartsRequestItem", foreign_keys=[request_item_id])
    
    def __repr__(self):
        return f"<PartsHandover Job:{self.job_id} Part:{self.part_id} Qty:{self.quantity}>"
