"""Dashboard schemas for different user roles"""

from pydantic import BaseModel
from typing import List, Optional
from app.schemas.job import JobSummary
from app.schemas.parts import PartsRequestSummary


# Engineer Dashboard
class EngineerDashboard(BaseModel):
    total_assigned_jobs: int
    pending_jobs: int
    completed_jobs: int
    waiting_for_approval_jobs: int
    waiting_for_parts_jobs: int
    jobs: List[JobSummary]


# Storekeeper Dashboard
class StorekeeperDashboard(BaseModel):
    pending_requests: int
    approved_requests_today: int
    low_stock_items: int
    out_of_stock_items: int
    pending_returns: int
    parts_requests: List[PartsRequestSummary]


# Accountant Dashboard
class AccountantDashboard(BaseModel):
    pending_engineer_estimates: int
    pending_customer_approvals: int
    approved_estimates_today: int
    rejected_estimates_today: int
    completed_jobs_pending_review: int


# Manager Dashboard
class ManagerDashboard(BaseModel):
    total_jobs: int
    unassigned_jobs: int
    in_progress_jobs: int
    completed_jobs: int
    delivered_jobs: int
    total_engineers: int
    total_customers: int
    jobs_by_status: dict


# Front Desk Dashboard
class FrontDeskDashboard(BaseModel):
    new_customers_today: int
    new_jobs_today: int
    jobs_ready_for_delivery: int
    delivered_today: int
