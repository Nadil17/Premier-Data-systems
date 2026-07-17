"""Parts and inventory models"""

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base
from app.models.product import Brand, Category, ProductModel


class Part(Base):
    """Part inventory model"""
    __tablename__ = "parts"
    
    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    
    # Inventory
    quantity_in_stock = Column(Integer, default=0, nullable=False)
    minimum_stock_level = Column(Integer, default=0)
    unit_price = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    brand_ref = relationship("Brand", back_populates="parts")
    model_ref = relationship("ProductModel", back_populates="parts")
    category_ref = relationship("Category", back_populates="parts")
    part_requests = relationship("PartsRequestItem", foreign_keys="PartsRequestItem.part_id", back_populates="part")
    
    def __repr__(self):
        return f"<Part {self.part_number}: {self.name}>"


class PartsRequestStatus(str, enum.Enum):
    """Parts request status"""
    PENDING = "pending"
    APPROVED = "approved"
    PARTIALLY_APPROVED = "partially_approved"
    REJECTED = "rejected"


class PartsRequest(Base):
    """Parts request from engineer"""
    __tablename__ = "parts_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    request_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # Job and Engineer Information
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    engineer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Request Information
    status = Column(Enum(PartsRequestStatus, values_callable=lambda e: [member.value for member in e]), default=PartsRequestStatus.PENDING, nullable=False)
    reason = Column(Text)
    storekeeper_notes = Column(Text)
    
    # Approval
    approved_by_id = Column(Integer, ForeignKey("users.id"))  # Storekeeper
    approved_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    job = relationship("Job", back_populates="parts_requests")
    engineer = relationship("User", foreign_keys=[engineer_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    items = relationship("PartsRequestItem", back_populates="request", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<PartsRequest {self.request_number}>"


class PartsRequestItemStatus(str, enum.Enum):
    """Individual parts request item status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ALTERNATIVE_PROVIDED = "alternative_provided"
    ISSUED = "issued"
    USED = "used"
    RETURN_REQUESTED = "return_requested"
    RETURNED = "returned"


class PartsRequestItem(Base):
    """Individual item in parts request"""
    __tablename__ = "parts_request_items"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Request and Part
    request_id = Column(Integer, ForeignKey("parts_requests.id"), nullable=False)
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=False)
    
    # Quantities
    quantity_requested = Column(Integer, nullable=False)
    quantity_approved = Column(Integer, default=0)
    quantity_issued = Column(Integer, default=0)
    quantity_used = Column(Integer, default=0)
    quantity_returned = Column(Integer, default=0)
    quantity_pending_return = Column(Integer, default=0)
    
    # Status
    status = Column(Enum(PartsRequestItemStatus, values_callable=lambda e: [member.value for member in e]), default=PartsRequestItemStatus.PENDING, nullable=False)
    
    # Alternative part if provided
    alternative_part_id = Column(Integer, ForeignKey("parts.id"))
    alternative_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    request = relationship("PartsRequest", back_populates="items")
    part = relationship("Part", foreign_keys=[part_id])
    alternative_part = relationship("Part", foreign_keys=[alternative_part_id])
    
    def __repr__(self):
        return f"<PartsRequestItem: {self.quantity_requested}x Part#{self.part_id}>"
