"""WhatsApp Bridge management endpoints (admin only)"""

from fastapi import APIRouter, Depends
from app.core.security import require_role
from app.models.user import User, UserRole
from app.services.whatsapp import whatsapp_service

router = APIRouter()


@router.get("/status")
async def get_whatsapp_status(
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT]))
):
    """Get WhatsApp connection status"""
    return whatsapp_service.get_status()


@router.get("/qr")
async def get_whatsapp_qr(
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Get QR code image for WhatsApp pairing"""
    return whatsapp_service.get_qr_image()


@router.post("/restart")
async def restart_whatsapp(
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Restart WhatsApp connection"""
    return whatsapp_service.restart()


@router.post("/logout")
async def logout_whatsapp(
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Logout WhatsApp and clear session (will need to re-scan QR)"""
    return whatsapp_service.logout()


@router.post("/test")
async def test_whatsapp_message(
    phone: str,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Send a test WhatsApp message"""
    success = whatsapp_service.send_message(
        phone,
        "✅ Test message from Premier Data Systems!\n\nYour WhatsApp integration is working correctly."
    )
    return {
        "sent": success,
        "phone": phone,
        "message": "Test message sent successfully" if success else "Failed to send test message"
    }
