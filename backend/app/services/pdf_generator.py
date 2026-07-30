import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def _find_logo_path():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.abspath(os.path.join(base_dir, "../../../Frontend/public/logo.jpg")),
        os.path.abspath(os.path.join(base_dir, "../../Frontend/public/logo.jpg")),
        os.path.abspath(os.path.join(os.getcwd(), "Frontend/public/logo.jpg")),
        os.path.abspath(os.path.join(os.getcwd(), "public/logo.jpg")),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None

def generate_estimate_pdf(estimate, output_path: str):
    """
    Generate a professional PDF of the customer estimate matching the exact header and footer specifications.
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )
    
    styles = getSampleStyleSheet()
    
    top_bar_style = ParagraphStyle(
        'TopBar',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#4b5563")
    )
    
    top_bar_center = ParagraphStyle(
        'TopBarCenter',
        parent=top_bar_style,
        alignment=1 # Center
    )

    right_header_style = ParagraphStyle(
        'RightHeader',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        alignment=2, # Right
        textColor=colors.HexColor("#1f2937")
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1f2937")
    )
    
    bold_style = ParagraphStyle(
        'BoldTextCustom',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    footer_note_style = ParagraphStyle(
        'FooterNote',
        parent=body_style,
        fontName='Helvetica',
        fontSize=8,
        leading=12,
        textColor=colors.HexColor("#1f2937")
    )
    
    red_notice_style = ParagraphStyle(
        'RedNotice',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        alignment=1, # Center
        textColor=colors.HexColor("#ef4444")
    )
    
    right_align_style = ParagraphStyle(
        'RightAlign',
        parent=body_style,
        alignment=2
    )
    
    right_align_bold = ParagraphStyle(
        'RightAlignBold',
        parent=bold_style,
        alignment=2
    )
    
    story = []
    
    # ── Top Bar ──
    created_dt = getattr(estimate, 'created_at', None) or datetime.now()
    date_str = created_dt.strftime("%d/%m/%Y, %H:%M") if hasattr(created_dt, 'strftime') else str(created_dt)
    
    top_bar_data = [
        [
            Paragraph(date_str, top_bar_style),
            Paragraph("Smart Dashboard - ERP", top_bar_center),
            Paragraph("", top_bar_style)
        ]
    ]
    top_bar_table = Table(top_bar_data, colWidths=[180, 192, 180])
    top_bar_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(top_bar_table)
    story.append(Spacer(1, 8))
    
    # ── Main Header (Logo left, Estimate + Address right) ──
    logo_path = _find_logo_path()
    if logo_path:
        logo_cell = Image(logo_path, width=160, height=48)
    else:
        logo_cell = Paragraph("<b><font size=16 color='#1e3a8a'>PREMIER DATA<br/>SYSTEMS</font></b>", body_style)
        
    address_text = (
        "<b><font size=18 color='#25285c'>Estimate</font></b><br/><br/>"
        "No. 17A, Mudali Mawatha, Kohuwala, Sri Lanka<br/>"
        "Tel: +94 11 2815015<br/>"
        "Fax: 94 11 7396803<br/>"
        "Email: support@premier.lk<br/>"
        "Web:"
    )
    header_right_cell = Paragraph(address_text, right_header_style)
    
    header_table = Table([[logo_cell, header_right_cell]], colWidths=[240, 312])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))
    
    # Divider line
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#000000"), spaceBefore=2, spaceAfter=10))
    
    # ── Metadata Setup ──
    job = getattr(estimate, 'job', None)
    customer = getattr(job, 'customer', None) if job else None
    
    cust_name = customer.name if customer else (job.customer_name if job else 'N/A')
    cust_addr = f" ({customer.address})" if customer and getattr(customer, 'address', None) else ""
    
    meta_data = [
        [
            Paragraph(f"<b>Cust:</b> {cust_name}{cust_addr}", body_style),
            Paragraph(f"<b>Date:</b> {created_dt.strftime('%Y-%m-%d') if hasattr(created_dt, 'strftime') else 'N/A'}", body_style)
        ],
        [
            Paragraph(f"<b>Model:</b> {job.machine_model if job and job.machine_model else '-'}", body_style),
            Paragraph(f"<b>Serial No:</b> {job.serial_number if job and job.serial_number else '-'}", body_style)
        ],
        [
            Paragraph(f"<b>Estimate No:</b> {estimate.estimate_number}", body_style),
            Paragraph(f"<b>Job No:</b> {job.job_number if job else 'N/A'}", body_style)
        ]
    ]
    
    meta_table = Table(meta_data, colWidths=[332, 220])
    meta_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))
    
    # ── Items Section ──
    table_data = [
        [
            Paragraph("<b>Type</b>", bold_style),
            Paragraph("<b>Description</b>", bold_style),
            Paragraph("<b>Qty</b>", bold_style),
            Paragraph("<b>Unit Price (LKR)</b>", right_align_bold),
            Paragraph("<b>Total (LKR)</b>", right_align_bold)
        ]
    ]
    
    items = getattr(estimate, 'items', [])
    for item in items:
        table_data.append([
            Paragraph(item.item_type.capitalize() if item.item_type else "Other", body_style),
            Paragraph(item.description or "", body_style),
            Paragraph(str(item.quantity), body_style),
            Paragraph(f"{item.unit_price:,.2f}", right_align_style),
            Paragraph(f"{item.total_price:,.2f}", right_align_style)
        ])
        
    subtotal = getattr(estimate, 'subtotal', None) or estimate.total_amount
    tax_amount = getattr(estimate, 'tax_amount', 0.0) or 0.0
    include_tax = getattr(estimate, 'include_tax', False) or (tax_amount > 0)

    if include_tax and tax_amount > 0:
        table_data.append([
            Paragraph("<b>Subtotal:</b>", bold_style),
            "", "", "",
            Paragraph(f"<b>LKR {subtotal:,.2f}</b>", right_align_bold)
        ])
        table_data.append([
            Paragraph("<b>VAT (18%):</b>", bold_style),
            "", "", "",
            Paragraph(f"<b>LKR {tax_amount:,.2f}</b>", right_align_bold)
        ])

    table_data.append([
        Paragraph("<b>Total Amount:</b>", bold_style),
        "", "", "",
        Paragraph(f"<b>LKR {estimate.total_amount:,.2f}</b>", right_align_bold)
    ])
    
    items_table = Table(table_data, colWidths=[70, 242, 40, 100, 100])
    table_styles = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f3f4f6")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#d1d5db")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]

    summary_rows_count = 3 if (include_tax and tax_amount > 0) else 1
    total_rows = len(table_data)
    for r_idx in range(total_rows - summary_rows_count, total_rows):
        table_styles.append(('SPAN', (0, r_idx), (3, r_idx)))
        table_styles.append(('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor("#f3f4f6")))

    items_table.setStyle(TableStyle(table_styles))
    story.append(items_table)
    story.append(Spacer(1, 10))
    
    # Special Notes
    if estimate.special_notes:
        story.append(Paragraph("<b>Special Notes:</b>", bold_style))
        story.append(Paragraph(estimate.special_notes, body_style))
        story.append(Spacer(1, 10))
        
    # ── Terms & Conditions (Footer Notes) ──
    terms = [
        "* This estimate is valid only for a period of 14 Days.",
        "* Payment should be made on completion of job.",
        "* Spare parts marked with * mark are not available and need 2-3 weeks after confirmation.",
        "* We shall be pleased to receive your confirmation in writing in order to commence with the work.",
        "* We shall not be responsible for any item not collected by you after repair for any loss or damage after a period of 01 month,after which will be dispose off the whatever manner we deem suitable and practical.",
        "* If the equipment is taken without repairs after estimation an inspection charge of Rs. 3000 will be charged."
    ]
    
    for t in terms:
        story.append(Paragraph(t, footer_note_style))
        story.append(Spacer(1, 2))
        
    story.append(Spacer(1, 10))
    
    # ── Accountant Signature Line ──
    accountant = getattr(estimate, 'accountant', None)
    accountant_name = accountant.full_name if accountant and getattr(accountant, 'full_name', None) else getattr(estimate, 'accountant_name', None) or "Lahiru ."
    
    sig_data = [
        [
            Paragraph(f"{accountant_name}<br/><b>Premier Data Systems Pvt Ltd</b>", body_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[552])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 15))
    
    # ── Red Centered Notice ──
    story.append(Paragraph("THIS COMPUTER GENERATE EMAIL DOES NOT CARRY A SIGNATURE.", red_notice_style))
    
    doc.build(story)

