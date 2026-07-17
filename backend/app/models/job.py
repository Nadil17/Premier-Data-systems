"""Job model for repair jobs"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class JobType(str, enum.Enum):
    """Job type"""
    IN_HOUSE = "in_house"
    FIELD = "field"


class JobCategory(str, enum.Enum):
    """Job category"""
    WARRANTY = "warranty"
    CHARGEABLE = "chargeable"
    AGREEMENT = "agreement"


class JobStatus(str, enum.Enum):
    """Job status"""
    UNASSIGNED = "unassigned"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    WAITING_FOR_PARTS = "waiting_for_parts"
    WAITING_FOR_ESTIMATE_APPROVAL = "waiting_for_estimate_approval"
    ESTIMATE_APPROVED = "estimate_approved"
    ESTIMATE_REJECTED = "estimate_rejected"
    REPAIR_IN_PROGRESS = "repair_in_progress"
    REPAIR_IN_PROGRESS_HANDOVERED = "repair_in_progress_handovered"
    COMPLETED = "completed"
    WAITING_FOR_ACCOUNTANT_REVIEW = "waiting_for_accountant_review"
    READY_FOR_DELIVERY = "ready_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class Job(Base):
    """Job model"""
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    job_number = Column(String(50), unique=True, index=True, nullable=False)  # Auto-generated
    
    # Customer Information
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    reported_by = Column(String(255), nullable=False)
    additional_phone = Column(String(20))
    
    # Machine Information
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=True)
    machine_category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    machine_model = Column(String(255), nullable=False)
    serial_number = Column(String(255), index=True)
    fault_description = Column(Text, nullable=False)
    
    # Job Classification
    job_type = Column(Enum(JobType, values_callable=lambda e: [member.value for member in e]), nullable=False)
    job_category = Column(Enum(JobCategory, values_callable=lambda e: [member.value for member in e]), nullable=False)
    status = Column(Enum(JobStatus, values_callable=lambda e: [member.value for member in e]), default=JobStatus.UNASSIGNED, nullable=False)
    has_pending_handover = Column(Boolean, default=False, nullable=False)
    
    # Assignment
    assigned_to_id = Column(Integer, ForeignKey("users.id"))  # Engineer
    assigned_at = Column(DateTime(timezone=True))
    
    # Completion Information
    work_done = Column(Text)
    tests_performed = Column(Text)
    repair_notes = Column(Text)
    warranty_details = Column(Text)
    completed_at = Column(DateTime(timezone=True))
    
    # Delivery
    delivered_at = Column(DateTime(timezone=True))
    
    # Accountant Review / Invoice
    invoice_number = Column(String(100), nullable=True, unique=True, index=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Additional Information
    remarks = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    customer = relationship("Customer", back_populates="jobs")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    brand_ref = relationship("Brand", foreign_keys=[brand_id])
    model_ref = relationship("ProductModel", foreign_keys=[model_id])
    machine_category_ref = relationship("Category", foreign_keys=[machine_category_id])
    parts_requests = relationship("PartsRequest", back_populates="job", cascade="all, delete-orphan")
    engineer_estimate = relationship("EngineerEstimate", back_populates="job", uselist=False, cascade="all, delete-orphan")
    customer_estimate = relationship("CustomerEstimate", back_populates="job", uselist=False, cascade="all, delete-orphan")
    job_items = relationship("JobItem", back_populates="job", cascade="all, delete-orphan")
    handovers = relationship("PartsHandover", back_populates="job", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Job {self.job_number}: {self.machine_model}>"
