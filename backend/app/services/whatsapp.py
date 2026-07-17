"""WhatsApp notification service using self-hosted Baileys bridge"""

import requests
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class WhatsAppService:
    """WhatsApp notification service using local Baileys bridge server"""
    
    def __init__(self):
        self.base_url = settings.WHATSAPP_BRIDGE_URL
        self.api_key = settings.WHATSAPP_BRIDGE_API_KEY
        self.enabled = settings.WHATSAPP_ENABLED
        
        if not self.enabled:
            logger.warning("WhatsApp service is disabled")
        else:
            logger.info(f"WhatsApp bridge configured at {self.base_url}")
    
    def _get_headers(self):
        return {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }
    
    def get_status(self) -> dict:
        """Get current WhatsApp connection status"""
        try:
            resp = requests.get(
                f"{self.base_url}/status",
                headers=self._get_headers(),
                timeout=5,
            )
            return resp.json()
        except Exception as e:
            logger.error(f"Failed to get WhatsApp status: {e}")
            return {"status": "unreachable", "connected": False}
    
    def get_qr_image(self) -> dict:
        """Get QR code image for pairing"""
        try:
            resp = requests.get(
                f"{self.base_url}/qr/image",
                headers=self._get_headers(),
                timeout=5,
            )
            return resp.json()
        except Exception as e:
            logger.error(f"Failed to get QR code: {e}")
            return {"connected": False, "qr": None, "error": str(e)}
    
    def restart(self) -> dict:
        """Restart WhatsApp connection"""
        try:
            resp = requests.post(
                f"{self.base_url}/restart",
                headers=self._get_headers(),
                timeout=5,
            )
            return resp.json()
        except Exception as e:
            logger.error(f"Failed to restart WhatsApp: {e}")
            return {"error": str(e)}
    
    def logout(self) -> dict:
        """Logout and clear WhatsApp session"""
        try:
            resp = requests.post(
                f"{self.base_url}/logout",
                headers=self._get_headers(),
                timeout=5,
            )
            return resp.json()
        except Exception as e:
            logger.error(f"Failed to logout WhatsApp: {e}")
            return {"error": str(e)}
    
    def send_message(self, to_phone: str, message: str) -> bool:
        """
        Send WhatsApp message via the local Baileys bridge
        
        Args:
            to_phone: Recipient phone number (format: +1234567890 or 0771234567)
            message: Message text
            
        Returns:
            True if message sent successfully, False otherwise
        """
        if not self.enabled:
            logger.warning("WhatsApp service is disabled")
            return False
        
        try:
            # Clean the phone number
            phone = to_phone.strip()
            if phone.startswith('+'):
                phone = phone[1:]
            
            resp = requests.post(
                f"{self.base_url}/send-message",
                headers=self._get_headers(),
                json={"to": phone, "message": message},
                timeout=15,
            )
            
            data = resp.json()
            if data.get("sent"):
                logger.info(f"WhatsApp message sent successfully to {to_phone}")
                return True
            else:
                logger.warning(f"WhatsApp message not sent: {data}")
                return False
                
        except requests.exceptions.ConnectionError:
            logger.error("WhatsApp bridge server is not running")
            return False
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {e}")
            return False
            
    def send_document(self, to_phone: str, file_path: str, file_name: str, caption: str = None) -> bool:
        """
        Send a PDF document via the WhatsApp bridge
        """
        if not self.enabled:
            logger.warning("WhatsApp service is disabled")
            return False
        
        try:
            phone = to_phone.strip()
            if phone.startswith('+'):
                phone = phone[1:]
            
            payload = {
                "to": phone,
                "filePath": file_path,
                "fileName": file_name
            }
            if caption:
                payload["caption"] = caption
                
            resp = requests.post(
                f"{self.base_url}/send-document",
                headers=self._get_headers(),
                json=payload,
                timeout=30,
            )
            
            data = resp.json()
            if data.get("sent"):
                logger.info(f"WhatsApp document sent successfully to {to_phone}")
                return True
            else:
                logger.warning(f"WhatsApp document not sent: {data}")
                return False
                
        except requests.exceptions.ConnectionError:
            logger.error("WhatsApp bridge server is not running")
            return False
        except Exception as e:
            logger.error(f"Failed to send WhatsApp document: {e}")
            return False
    
    def send_estimate_link(
        self,
        customer_phone: str,
        customer_name: str,
        estimate_number: str,
        otp: str,
        link: str
    ) -> bool:
        """Send estimate approval link to customer"""
        message = f"""Hello {customer_name},

Your repair estimate is ready for review.

Estimate Number: {estimate_number}

Please click the link below to view your estimate:
{link}

Your OTP code is: {otp}

This code will expire in {settings.OTP_EXPIRY_MINUTES} minutes.

Thank you!"""
        
        return self.send_message(customer_phone, message)
    
    def send_job_assigned_notification(
        self,
        engineer_phone: str,
        engineer_name: str,
        job_number: str
    ) -> bool:
        """Notify engineer of job assignment"""
        message = f"""Hello {engineer_name},

A new job has been assigned to you.

Job Number: {job_number}

Please check your dashboard for details."""
        
        return self.send_message(engineer_phone, message)
    
    def send_parts_request_notification(
        self,
        storekeeper_phone: str,
        request_number: str,
        engineer_name: str
    ) -> bool:
        """Notify storekeeper of new parts request"""
        message = f"""New parts request received.

Request Number: {request_number}
From: {engineer_name}

Please review and approve in your dashboard."""
        
        return self.send_message(storekeeper_phone, message)
    
    def send_estimate_approval_notification(
        self,
        phone: str,
        recipient_name: str,
        estimate_number: str,
        job_number: str,
        customer_name: str,
        approval_status: str,
        customer_comments: str = None
    ) -> bool:
        """
        Notify engineer or accountant of estimate approval/rejection/partial approval
        """
        status_text = {
            "approved": "✅ APPROVED",
            "rejected": "❌ REJECTED", 
            "partially_approved": "⚠️ PARTIALLY APPROVED"
        }.get(approval_status, approval_status.upper())
        
        message = f"""Hello {recipient_name},

Customer Estimate Update:

Estimate: {estimate_number}
Job: {job_number}
Customer: {customer_name}
Status: {status_text}"""
        
        if customer_comments:
            message += f"""

Customer Comments:
\"{customer_comments}\""""
        
        message += """

Please check your dashboard for full details."""
        
        return self.send_message(phone, message)
    
    def send_job_completed_notification(
        self,
        customer_phone: str,
        customer_name: str,
        job_number: str
    ) -> bool:
        """Notify customer that job is completed"""
        message = f"""Hello {customer_name},

Good news! Your repair is complete.

Job Number: {job_number}

Your device is ready for pickup. Please visit us at your convenience.

Thank you!"""
        
        return self.send_message(customer_phone, message)


# Singleton instance
whatsapp_service = WhatsAppService()
