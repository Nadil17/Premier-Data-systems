"""Customer model"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class CustomerCategory(str, enum.Enum):
    """Customer category types"""
    INDIVIDUAL = "individual"
    COMPANY = "company"
    DEALER = "dealer"


class Customer(Base):
    """Customer model"""
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(50), unique=True, index=True, nullable=False)  # Auto-generated unique ID
    
    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    company_name = Column(String(255))
    
    # Contact Information
    address = Column(Text)
    phone_1 = Column(String(20), index=True, nullable=False)
    phone_2 = Column(String(20))
    phone_3 = Column(String(20))
    email = Column(String(255), index=True)
    email_2 = Column(String(255), index=True)
    email_3 = Column(String(255), index=True)
    
    # Additional Information
    category = Column(Enum(CustomerCategory, values_callable=lambda e: [member.value for member in e]), nullable=False)
    tax_number = Column(String(50))
    vat_number = Column(String(50))
    website = Column(String(255))
    remarks = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    jobs = relationship("Job", back_populates="customer", cascade="all, delete-orphan")
    
    @property
    def display_name(self):
        if self.category in [CustomerCategory.COMPANY, CustomerCategory.DEALER] and self.company_name:
            return self.company_name
        return self.name
    
    def __repr__(self):
        return f"<Customer {self.customer_id}: {self.name}>"
