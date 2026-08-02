import os
import tempfile
import io
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from datetime import timedelta
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.core.time import utc_now
from app.models.user import User, UserRole
from app.models.job import Job, JobStatus
from app.models.estimate import (
    EngineerEstimate, EngineerEstimateItem,
    CustomerEstimate, CustomerEstimateItem,
    EstimateApprovalStatus, CustomerEstimateItemApprovalStatus
)
from app.schemas.estimate import (
    EngineerEstimateCreate, EngineerEstimateResponse,
    CustomerEstimateCreate, CustomerEstimateResponse, CustomerEstimateUpdate,
    ManualApprovalRequest, SendEmailRequest, SendEmailResponse,
    OTPVerification, OTPVerificationResponse, CustomerEstimateApproval
)
from app.utils.id_generator import (
    generate_engineer_estimate_number,
    generate_customer_estimate_number,
    generate_otp
)
from app.services.notification import notification_service
from app.services.whatsapp import whatsapp_service
from app.services.email_service import send_email
from app.services.pdf_generator import generate_estimate_pdf

logger = logging.getLogger(__name__)
router = APIRouter()


def populate_cust_est(est):
    if est:
        est.accountant_name = est.accountant.full_name if est.accountant else None
        est.job_number = est.job.job_number if est.job else None
        est.customer_name = est.job.customer.name if est.job and est.job.customer else None
    return est


def recalculate_estimate_totals(db_estimate: CustomerEstimate):
    status_str = db_estimate.approval_status.value if hasattr(db_estimate.approval_status, 'value') else str(db_estimate.approval_status)
    if status_str == 'rejected':
        db_estimate.subtotal = 0.0
        db_estimate.tax_amount = 0.0
        db_estimate.total_amount = 0.0
    else:
        if status_str == 'pending':
            relevant_items = db_estimate.items
        else:
            relevant_items = [
                item for item in db_estimate.items
                if (item.approval_status.value if hasattr(item.approval_status, 'value') else str(item.approval_status)) == 'approved'
            ]
        
        subtotal = sum(item.total_price for item in relevant_items)
        db_estimate.subtotal = round(subtotal, 2)
        if db_estimate.include_tax:
            db_estimate.tax_amount = round(subtotal * 0.18, 2)
        else:
            db_estimate.tax_amount = 0.0
        db_estimate.total_amount = round(db_estimate.subtotal + db_estimate.tax_amount, 2)


def populate_eng_est(est):
    if est:
        est.engineer_name = est.engineer.full_name if est.engineer else None
        est.job_number = est.job.job_number if est.job else None
        est.customer_name = est.job.customer.name if est.job and est.job.customer else None
    return est


@router.get("/customer", response_model=List[CustomerEstimateResponse])
def get_customer_estimates(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List customer estimates for the estimates page."""
    estimates = (
        db.query(CustomerEstimate)
        .options(
            joinedload(CustomerEstimate.items),
            joinedload(CustomerEstimate.accountant),
            joinedload(CustomerEstimate.job).joinedload(Job.customer)
        )
        .order_by(CustomerEstimate.created_at.desc())
        .offset(max(skip, 0))
        .limit(min(max(limit, 1), 100))
        .all()
    )
    return [populate_cust_est(est) for est in estimates]


@router.post("/engineer", response_model=EngineerEstimateResponse)
def create_engineer_estimate(
    *,
    db: Session = Depends(get_db),
    estimate_in: EngineerEstimateCreate,
    current_user: User = Depends(get_current_user)
):
    # Verify job exists
    job = db.query(Job).filter(Job.id == estimate_in.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check if engineer estimate already exists
    existing = db.query(EngineerEstimate).filter(EngineerEstimate.job_id == estimate_in.job_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Engineer estimate already exists for this job")

    estimate_number = generate_engineer_estimate_number()
    db_estimate = EngineerEstimate(
        estimate_number=estimate_number,
        job_id=estimate_in.job_id,
        engineer_id=current_user.id,
        technical_notes=estimate_in.technical_notes,
        additional_notes=estimate_in.additional_notes
    )
    db.add(db_estimate)
    db.flush()

    for item in estimate_in.items:
        db_item = EngineerEstimateItem(
            estimate_id=db_estimate.id,
            item_type=item.item_type,
            part_id=item.part_id,
            description=item.description,
            technical_description=item.technical_description,
            quantity=item.quantity,
            notes=item.notes
        )
        db.add(db_item)
    
    # Notify all accountant role users
    accountants = db.query(User).filter(User.role == UserRole.ACCOUNTANT).all()
    for acc in accountants:
        notification_service.notify_estimate_created(
            db=db,
            accountant_id=acc.id,
            estimate_number=estimate_number,
            job_id=job.id
        )

    db.commit()
    
    # Fetch completed estimate with relationships loaded
    db_estimate = (
        db.query(EngineerEstimate)
        .options(
            joinedload(EngineerEstimate.items),
            joinedload(EngineerEstimate.engineer),
            joinedload(EngineerEstimate.job).joinedload(Job.customer)
        )
        .filter(EngineerEstimate.id == db_estimate.id)
        .first()
    )
    return populate_eng_est(db_estimate)


@router.get("/engineer/pending", response_model=List[EngineerEstimateResponse])
def get_pending_engineer_estimates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List engineer estimates pending accountant review."""
    estimates = (
        db.query(EngineerEstimate)
        .options(
            joinedload(EngineerEstimate.items),
            joinedload(EngineerEstimate.engineer),
            joinedload(EngineerEstimate.job).joinedload(Job.customer)
        )
        .filter(
            ~EngineerEstimate.job_id.in_(
                db.query(CustomerEstimate.job_id)
            )
        )
        .order_by(EngineerEstimate.created_at.desc())
        .all()
    )
    return [populate_eng_est(est) for est in estimates]


@router.post("/customer", response_model=CustomerEstimateResponse)
def create_customer_estimate(
    *,
    db: Session = Depends(get_db),
    estimate_in: CustomerEstimateCreate,
    current_user: User = Depends(get_current_user)
):
    # Verify job exists
    job = db.query(Job).filter(Job.id == estimate_in.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check if customer estimate already exists
    existing = db.query(CustomerEstimate).filter(CustomerEstimate.job_id == estimate_in.job_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer estimate already exists for this job")

    estimate_number = generate_customer_estimate_number()
    otp_code = generate_otp(6)
    
    # Trust the frontend's include_tax value directly — it was set based on
    # customer tax number detection and controls whether item prices were
    # sent as base prices (include_tax=True) or tax-inclusive (include_tax=False).
    include_tax = estimate_in.include_tax
    tax_rate = 18.0 if include_tax else 0.0
    
    db_estimate = CustomerEstimate(
        estimate_number=estimate_number,
        job_id=estimate_in.job_id,
        accountant_id=current_user.id,
        special_notes=estimate_in.special_notes,
        approval_status=EstimateApprovalStatus.PENDING,
        otp_code=otp_code,
        otp_generated_at=utc_now(),
        otp_verified=False,
        subtotal=0.0,
        include_tax=include_tax,
        tax_rate=tax_rate,
        tax_amount=0.0,
        total_amount=0.0
    )
    db.add(db_estimate)
    db.flush()

    subtotal = 0.0
    for item in estimate_in.items:
        # If include_tax is False (customer has no Tax Number), item unit_price from frontend is already tax-inclusive (or unit_price * 1.18)
        item_unit_price = round(item.unit_price, 2)
        item_total = round(item.quantity * item_unit_price, 2)
        subtotal += item_total

        db_item = CustomerEstimateItem(
            estimate_id=db_estimate.id,
            item_type=item.item_type,
            part_id=item.part_id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item_unit_price,
            total_price=item_total,
            item_comments=item.item_comments,
            approval_status=CustomerEstimateItemApprovalStatus.PENDING
        )
        db.add(db_item)

    db_estimate.subtotal = round(subtotal, 2)
    db_estimate.tax_amount = round(subtotal * 0.18, 2) if include_tax else 0.0
    db_estimate.total_amount = round(db_estimate.subtotal + db_estimate.tax_amount, 2)
    
    # Update job status to WAITING_FOR_ESTIMATE_APPROVAL
    job.status = JobStatus.WAITING_FOR_ESTIMATE_APPROVAL
    db.add(job)

    db.commit()
    
    # Reload with all relationships
    db_estimate = (
        db.query(CustomerEstimate)
        .options(
            joinedload(CustomerEstimate.items),
            joinedload(CustomerEstimate.accountant),
            joinedload(CustomerEstimate.job).joinedload(Job.customer)
        )
        .filter(CustomerEstimate.id == db_estimate.id)
        .first()
    )
    return populate_cust_est(db_estimate)


@router.put("/customer/{estimate_id}", response_model=CustomerEstimateResponse)
def update_customer_estimate(
    estimate_id: int,
    estimate_in: CustomerEstimateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_estimate = db.query(CustomerEstimate).filter(CustomerEstimate.id == estimate_id).first()
    if not db_estimate:
        raise HTTPException(status_code=404, detail="Customer estimate not found")

    if db_estimate.approval_status != EstimateApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only pending estimates can be edited")

    # Update basic fields
    if estimate_in.special_notes is not None:
        db_estimate.special_notes = estimate_in.special_notes
    if estimate_in.include_tax is not None:
        db_estimate.include_tax = estimate_in.include_tax

    # Update items if provided
    if estimate_in.items is not None:
        # Delete existing items
        db.query(CustomerEstimateItem).filter(CustomerEstimateItem.estimate_id == estimate_id).delete()
        
        subtotal = 0.0
        for item in estimate_in.items:
            item_unit_price = round(item.unit_price, 2)
            item_total = round(item.quantity * item_unit_price, 2)
            subtotal += item_total

            db_item = CustomerEstimateItem(
                estimate_id=db_estimate.id,
                item_type=item.item_type,
                part_id=item.part_id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item_unit_price,
                total_price=item_total,
                item_comments=item.item_comments,
                approval_status=CustomerEstimateItemApprovalStatus.PENDING
            )
            db.add(db_item)
            
        db_estimate.subtotal = round(subtotal, 2)
        db_estimate.tax_amount = round(subtotal * 0.18, 2) if db_estimate.include_tax else 0.0
        db_estimate.total_amount = round(db_estimate.subtotal + db_estimate.tax_amount, 2)

    db.commit()
    
    # Reload with all relationships
    db_estimate = (
        db.query(CustomerEstimate)
        .options(
            joinedload(CustomerEstimate.items),
            joinedload(CustomerEstimate.accountant),
            joinedload(CustomerEstimate.job).joinedload(Job.customer)
        )
        .filter(CustomerEstimate.id == db_estimate.id)
        .first()
    )
    return populate_cust_est(db_estimate)


@router.post("/customer/{id}/send-email", response_model=SendEmailResponse)
def send_estimate_email(
    id: int,
    request: SendEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_estimate = db.query(CustomerEstimate).filter(CustomerEstimate.id == id).first()
    if not db_estimate:
        raise HTTPException(status_code=404, detail="Customer estimate not found")

    job = db.query(Job).filter(Job.id == db_estimate.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Associated job not found")

    customer = job.customer
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Generate OTP
    otp_code = generate_otp(6)
    db_estimate.otp_code = otp_code
    db_estimate.otp_generated_at = utc_now()
    db.add(db_estimate)
    db.commit()

    # Generate temporary PDF of the estimate
    import tempfile
    import os
    
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    pdf_generated = False
    try:
        try:
            generate_estimate_pdf(db_estimate, pdf_path)
            pdf_generated = True
            logger.info(f"Generated estimate PDF at {pdf_path}")
        except Exception as e:
            logger.error(f"Failed to generate estimate PDF: {e}")
            
        # Determine recipient email
        email_to = request.email or customer.email
        email_sent = False
        
        link = f"http://localhost:5173/estimate/verify/{db_estimate.estimate_number}"
        
        should_send_email = request.send_via in ["email", "both", None]
        if should_send_email and email_to:
            subject = f"Repair Estimate Ready - {db_estimate.estimate_number}"
            body = f"""
            Hello {customer.name},
            
            Your repair estimate is ready for review.
            
            Estimate Number: {db_estimate.estimate_number}
            Total Amount: LKR {db_estimate.total_amount:,.2f}
            
            Please click the link below to view your estimate:
            {link}
            
            Your OTP code is: {otp_code}
            This code will expire in {settings.OTP_EXPIRY_MINUTES} minutes.
            
            Thank you for choosing Premier Data Systems!
            """
            email_sent = send_email(
                to_email=email_to,
                subject=subject,
                body=body,
                attachment_path=pdf_path if pdf_generated else None,
                attachment_name=f"Estimate_{db_estimate.estimate_number}.pdf"
            )

        # Send WhatsApp notification
        whatsapp_sent = False
        should_send_whatsapp = request.send_via in ["whatsapp", "both", None]
        if should_send_whatsapp and customer.phone_1:
            whatsapp_sent = whatsapp_service.send_estimate_link(
                customer_phone=customer.phone_1,
                customer_name=customer.name,
                estimate_number=db_estimate.estimate_number,
                otp=otp_code,
                link=link
            )
            if pdf_generated:
                doc_sent = whatsapp_service.send_document(
                    to_phone=customer.phone_1,
                    file_path=pdf_path,
                    file_name=f"Estimate_{db_estimate.estimate_number}.pdf",
                    caption=f"Attached is the estimate PDF for {db_estimate.estimate_number}."
                )
                whatsapp_sent = whatsapp_sent or doc_sent

        # Notify engineer
        if job.assigned_to_id:
            notification_service.notify_estimate_sent_to_customer(
                db=db,
                engineer_id=job.assigned_to_id,
                estimate_number=db_estimate.estimate_number,
                job_id=job.id
            )

        message = "Estimate sent successfully"
        if email_sent and whatsapp_sent:
            message = "Estimate sent via Email and WhatsApp"
        elif email_sent:
            message = "Estimate sent via Email"
        elif whatsapp_sent:
            message = "Estimate sent via WhatsApp"
        else:
            target_services = []
            if should_send_email:
                target_services.append("Email")
            if should_send_whatsapp:
                target_services.append("WhatsApp")
            services_str = " and ".join(target_services) or "Email/WhatsApp"
            message = f"Estimate generated, but failed to send via {services_str} (check SMTP and WhatsApp service status)"

        return {"success": True, "message": message}

    finally:
        if os.path.exists(pdf_path):
            try:
                os.unlink(pdf_path)
                logger.info(f"Cleaned up temporary PDF at {pdf_path}")
            except Exception as e:
                logger.error(f"Failed to delete temporary PDF file {pdf_path}: {e}")


@router.post("/customer/{id}/manual-approve", response_model=CustomerEstimateResponse)
def manual_approve_estimate(
    id: int,
    request: ManualApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_estimate = db.query(CustomerEstimate).filter(CustomerEstimate.id == id).first()
    if not db_estimate:
        raise HTTPException(status_code=404, detail="Customer estimate not found")

    job = db.query(Job).filter(Job.id == db_estimate.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Associated job not found")

    customer = job.customer

    # Update item approval statuses
    for item_data in request.items:
        db_item = db.query(CustomerEstimateItem).filter(
            CustomerEstimateItem.estimate_id == db_estimate.id,
            CustomerEstimateItem.id == item_data.item_id
        ).first()
        if db_item:
            db_item.approval_status = item_data.approval_status
            db.add(db_item)

    # Update overall status
    db_estimate.approval_status = request.overall_status
    db_estimate.customer_comments = request.customer_comments
    if request.overall_status in [EstimateApprovalStatus.APPROVED, EstimateApprovalStatus.PARTIALLY_APPROVED]:
        db_estimate.approved_at = utc_now()
        job.status = JobStatus.ESTIMATE_APPROVED
    elif request.overall_status == EstimateApprovalStatus.REJECTED:
        job.status = JobStatus.ESTIMATE_REJECTED

    recalculate_estimate_totals(db_estimate)

    db.add(db_estimate)
    db.add(job)

    # Notify engineer and accountant
    if job.assigned_to:
        notification_service.notify_estimate_response(
            db=db,
            engineer_id=job.assigned_to.id,
            engineer_phone=job.assigned_to.phone or "",
            engineer_name=job.assigned_to.full_name,
            accountant_id=current_user.id,
            accountant_phone=current_user.phone or "",
            accountant_name=current_user.full_name,
            estimate_number=db_estimate.estimate_number,
            job_number=job.job_number,
            job_id=job.id,
            customer_name=customer.name if customer else "Unknown",
            approval_status=request.overall_status.value,
            customer_comments=request.customer_comments
        )

    db.commit()
    
    # Reload with all relationships
    db_estimate = (
        db.query(CustomerEstimate)
        .options(
            joinedload(CustomerEstimate.items),
            joinedload(CustomerEstimate.accountant),
            joinedload(CustomerEstimate.job).joinedload(Job.customer)
        )
        .filter(CustomerEstimate.id == id)
        .first()
    )
    return populate_cust_est(db_estimate)


@router.get("/customer/{id}", response_model=CustomerEstimateResponse)
def get_customer_estimate_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    estimate = (
        db.query(CustomerEstimate)
        .options(
            joinedload(CustomerEstimate.items),
            joinedload(CustomerEstimate.accountant),
            joinedload(CustomerEstimate.job).joinedload(Job.customer)
        )
        .filter(CustomerEstimate.id == id)
        .first()
    )
    if not estimate:
        raise HTTPException(status_code=404, detail="Customer estimate not found")
    return populate_cust_est(estimate)


@router.get("/customer/{id}/pdf")
def download_customer_estimate_pdf(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download customer estimate PDF for accountants and authenticated users."""
    estimate = (
        db.query(CustomerEstimate)
        .options(
            joinedload(CustomerEstimate.items),
            joinedload(CustomerEstimate.accountant),
            joinedload(CustomerEstimate.job).joinedload(Job.customer)
        )
        .filter(CustomerEstimate.id == id)
        .first()
    )
    if not estimate:
        raise HTTPException(status_code=404, detail="Customer estimate not found")

    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)

    try:
        generate_estimate_pdf(estimate, pdf_path)
        filename = f"Estimate_{estimate.estimate_number}.pdf"
        
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{filename}"'}
        )
    except Exception as e:
        logger.error(f"Error generating estimate PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate estimate PDF")
    finally:
        if os.path.exists(pdf_path):
            try:
                os.unlink(pdf_path)
            except Exception:
                pass


@router.get("/customer/verify/{estimate_number}/pdf")
def download_public_customer_estimate_pdf(
    estimate_number: str,
    db: Session = Depends(get_db)
):
    """Download customer estimate PDF via estimate number (for public verification page)."""
    estimate = (
        db.query(CustomerEstimate)
        .options(
            joinedload(CustomerEstimate.items),
            joinedload(CustomerEstimate.accountant),
            joinedload(CustomerEstimate.job).joinedload(Job.customer)
        )
        .filter(CustomerEstimate.estimate_number == estimate_number)
        .first()
    )
    if not estimate:
        raise HTTPException(status_code=404, detail="Customer estimate not found")

    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)

    try:
        generate_estimate_pdf(estimate, pdf_path)
        filename = f"Estimate_{estimate.estimate_number}.pdf"

        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{filename}"'}
        )
    except Exception as e:
        logger.error(f"Error generating estimate PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate estimate PDF")
    finally:
        if os.path.exists(pdf_path):
            try:
                os.unlink(pdf_path)
            except Exception:
                pass


@router.get("/job/{job_id}/engineer", response_model=List[EngineerEstimateResponse])
def get_engineer_estimates_for_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    estimates = (
        db.query(EngineerEstimate)
        .options(
            joinedload(EngineerEstimate.items),
            joinedload(EngineerEstimate.engineer),
            joinedload(EngineerEstimate.job).joinedload(Job.customer)
        )
        .filter(EngineerEstimate.job_id == job_id)
        .all()
    )
    return [populate_eng_est(est) for est in estimates]


@router.get("/job/{job_id}/customer", response_model=List[CustomerEstimateResponse])
def get_customer_estimates_for_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    estimates = (
        db.query(CustomerEstimate)
        .options(
            joinedload(CustomerEstimate.items),
            joinedload(CustomerEstimate.accountant),
            joinedload(CustomerEstimate.job).joinedload(Job.customer)
        )
        .filter(CustomerEstimate.job_id == job_id)
        .all()
    )
    return [populate_cust_est(est) for est in estimates]


@router.post("/customer/verify", response_model=OTPVerificationResponse)
def verify_customer_estimate_otp(
    *,
    db: Session = Depends(get_db),
    verification: OTPVerification
):
    db_estimate = (
        db.query(CustomerEstimate)
        .options(
            joinedload(CustomerEstimate.items),
            joinedload(CustomerEstimate.accountant),
            joinedload(CustomerEstimate.job).joinedload(Job.customer)
        )
        .filter(CustomerEstimate.estimate_number == verification.estimate_number)
        .first()
    )
    if not db_estimate:
        raise HTTPException(status_code=404, detail="Customer estimate not found")

    if db_estimate.otp_code != verification.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    # Expiry check
    if db_estimate.otp_generated_at:
        now = utc_now()
        # Ensure offset alignment
        if now.tzinfo is not None and db_estimate.otp_generated_at.tzinfo is None:
            now = now.replace(tzinfo=None)
        elif now.tzinfo is None and db_estimate.otp_generated_at.tzinfo is not None:
            db_estimate.otp_generated_at = db_estimate.otp_generated_at.replace(tzinfo=None)
            
        expiry_time = db_estimate.otp_generated_at + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        if now > expiry_time:
            raise HTTPException(status_code=400, detail="OTP code has expired")

    db_estimate.otp_verified = True
    db.add(db_estimate)
    db.commit()
    db.refresh(db_estimate)

    from app.core.security import create_access_token
    access_token = create_access_token(data={"sub": "0", "role": "public"})  # Dummy user id for verification page

    return {
        "success": True,
        "access_token": access_token,
        "estimate": populate_cust_est(db_estimate)
    }


@router.post("/customer/verify/{estimateNumber}/approve", response_model=CustomerEstimateResponse)
def approve_customer_estimate(
    estimateNumber: str,
    *,
    db: Session = Depends(get_db),
    approval_data: CustomerEstimateApproval
):
    db_estimate = (
        db.query(CustomerEstimate)
        .options(
            joinedload(CustomerEstimate.items),
            joinedload(CustomerEstimate.accountant),
            joinedload(CustomerEstimate.job).joinedload(Job.customer)
        )
        .filter(CustomerEstimate.estimate_number == estimateNumber)
        .first()
    )
    if not db_estimate:
        raise HTTPException(status_code=404, detail="Customer estimate not found")

    job = db.query(Job).filter(Job.id == db_estimate.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Associated job not found")

    # Update items
    if approval_data.items:
        for item_data in approval_data.items:
            db_item = db.query(CustomerEstimateItem).filter(
                CustomerEstimateItem.estimate_id == db_estimate.id,
                CustomerEstimateItem.id == item_data.item_id
            ).first()
            if db_item:
                db_item.approval_status = item_data.approval_status
                db.add(db_item)

    # Update overall status
    db_estimate.approval_status = approval_data.approval_status
    db_estimate.customer_comments = approval_data.customer_comments
    if approval_data.approval_status in [EstimateApprovalStatus.APPROVED, EstimateApprovalStatus.PARTIALLY_APPROVED]:
        db_estimate.approved_at = utc_now()
        job.status = JobStatus.ESTIMATE_APPROVED
    elif approval_data.approval_status == EstimateApprovalStatus.REJECTED:
        job.status = JobStatus.ESTIMATE_REJECTED

    recalculate_estimate_totals(db_estimate)

    db.add(db_estimate)
    db.add(job)

    # Notify engineer and accountant
    if job.assigned_to:
        notification_service.notify_estimate_response(
            db=db,
            engineer_id=job.assigned_to.id,
            engineer_phone=job.assigned_to.phone or "",
            engineer_name=job.assigned_to.full_name,
            accountant_id=db_estimate.accountant_id,
            accountant_phone=db_estimate.accountant.phone or "",
            accountant_name=db_estimate.accountant.full_name,
            estimate_number=db_estimate.estimate_number,
            job_number=job.job_number,
            job_id=job.id,
            customer_name=job.customer.name if job.customer else "Unknown",
            approval_status=approval_data.approval_status.value,
            customer_comments=approval_data.customer_comments
        )

    db.commit()
    db.refresh(db_estimate)
    return populate_cust_est(db_estimate)
