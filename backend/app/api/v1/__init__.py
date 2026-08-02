"""
API v1 Router
Combines all API endpoints
"""

from fastapi import APIRouter

from app.api.v1 import auth, customers, jobs, parts, products, estimates, dashboards, notifications, whatsapp, handovers, users

api_router = APIRouter()

# Include all routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(parts.router, prefix="/parts", tags=["Parts & Inventory"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(estimates.router, prefix="/estimates", tags=["Estimates"])
api_router.include_router(dashboards.router, prefix="/dashboards", tags=["Dashboards"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["WhatsApp"])
api_router.include_router(handovers.router, tags=["Parts Handovers"])
api_router.include_router(users.router, tags=["Users"])
