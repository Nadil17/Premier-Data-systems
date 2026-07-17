"""Job items model"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class JobItem(Base):
    """Items taken from customer for a job"""
    __tablename__ = "job_items"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    returned = Column(Boolean, default=False)
    notes = Column(String(500))
    
    # Relationship
    job = relationship("Job", back_populates="job_items")
    
    def __repr__(self):
        return f"<JobItem {self.item_name} for Job #{self.job_id}>"
