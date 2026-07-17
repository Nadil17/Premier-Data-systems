import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body: str, attachment_path: str = None, attachment_name: str = None) -> bool:
    """Send an email using configured SMTP settings, optionally with an attachment"""
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP email credentials are not fully configured")
        return False
        
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Automatically choose content type
        msg.attach(MIMEText(body, 'html' if '<html>' in body or '<p>' in body or '<br>' in body else 'plain'))
        
        # Add attachment if specified
        if attachment_path:
            import os
            from email.mime.base import MIMEBase
            from email import encoders
            if os.path.exists(attachment_path):
                with open(attachment_path, "rb") as f:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(f.read())
                encoders.encode_base64(part)
                filename = attachment_name or os.path.basename(attachment_path)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename=\"{filename}\"",
                )
                msg.attach(part)
                logger.info(f"Attached file {filename} to email")
            else:
                logger.warning(f"Attachment file not found at {attachment_path}")
        
        # Connect to server
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        if settings.SMTP_USE_TLS:
            server.starttls()
            
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
