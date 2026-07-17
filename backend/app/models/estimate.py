"""Estimate models for engineer and customer estimates"""

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class EngineerEstimate(Base):
    """Internal estimate created by engineer"""
    __tablename__ = "engineer_estimates"
    
    id = Column(Integer, primary_key=True, index=True)
    estimate_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # Job Information
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, unique=True)
    engineer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Additional Notes
    technical_notes = Column(Text)
    additional_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    job = relationship("Job", back_populates="engineer_estimate")
    engineer = relationship("User", foreign_keys=[engineer_id])
    items = relationship("EngineerEstimateItem", back_populates="estimate", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<EngineerEstimate {self.estimate_number}>"


class EstimateItemType(str, enum.Enum):
    """Type of estimate item"""
    PART = "part"
    SERVICE = "service"


class EngineerEstimateItem(Base):
    """Item in engineer estimate"""
    __tablename__ = "engineer_estimate_items"
    
    id = Column(Integer, primary_key=True, index=True)
    
    estimate_id = Column(Integer, ForeignKey("engineer_estimates.id"), nullable=False)
    
    # Item Information
    item_type = Column(Enum(EstimateItemType, values_callable=lambda e: [member.value for member in e]), nullable=False)
    part_id = Column(Integer, ForeignKey("parts.id"))  # If item_type is PART
    
    # Description
    description = Column(String(500), nullable=False)
    technical_description = Column(Text)
    quantity = Column(Integer, default=1, nullable=False)
    
    # Notes
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    estimate = relationship("EngineerEstimate", back_populates="items")
    part = relationship("Part", foreign_keys=[part_id])
    
    def __repr__(self):
        return f"<EngineerEstimateItem: {self.description}>"


class EstimateApprovalStatus(str, enum.Enum):
    """Customer estimate approval status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PARTIALLY_APPROVED = "partially_approved"


class CustomerEstimate(Base):
    """Customer-facing estimate"""
    __tablename__ = "customer_estimates"
    
    id = Column(Integer, primary_key=True, index=True)
    estimate_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # Job Information
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, unique=True)
    accountant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Approval
    approval_status = Column(Enum(EstimateApprovalStatus, values_callable=lambda e: [member.value for member in e]), default=EstimateApprovalStatus.PENDING, nullable=False)
    customer_comments = Column(Text)
    approved_at = Column(DateTime(timezone=True))
    
    # OTP for customer access
    otp_code = Column(String(10))
    otp_generated_at = Column(DateTime(timezone=True))
    otp_verified = Column(Boolean, default=False)
    
    # Special notes for customer
    special_notes = Column(Text)
    
    # Total
    total_amount = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    job = relationship("Job", back_populates="customer_estimate")
    accountant = relationship("User", foreign_keys=[accountant_id])
    items = relationship("CustomerEstimateItem", back_populates="estimate", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<CustomerEstimate {self.estimate_number}>"


class CustomerEstimateItemApprovalStatus(str, enum.Enum):
    """Individual item approval status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class CustomerEstimateItem(Base):
    """Item in customer estimate"""
    __tablename__ = "customer_estimate_items"
    
    id = Column(Integer, primary_key=True, index=True)
    
    estimate_id = Column(Integer, ForeignKey("customer_estimates.id"), nullable=False)
    
    # Item Information
    item_type = Column(Enum(EstimateItemType, values_callable=lambda e: [member.value for member in e]), nullable=False)
    part_id = Column(Integer, ForeignKey("parts.id"))
    
    # Description (customer-friendly)
    description = Column(String(500), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    
    # Pricing
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    
    # Comments
    item_comments = Column(Text)
    
    # Individual item approval
    approval_status = Column(Enum(CustomerEstimateItemApprovalStatus, values_callable=lambda e: [member.value for member in e]), default=CustomerEstimateItemApprovalStatus.PENDING)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    estimate = relationship("CustomerEstimate", back_populates="items")
    part = relationship("Part", foreign_keys=[part_id])
    
    def __repr__(self):
        return f"<CustomerEstimateItem: {self.description}>"
