import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_estimate_pdf(estimate, output_path: str):
    """
    Generate a professional PDF of the customer estimate using ReportLab.
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1e3a8a"),
        spaceAfter=15
    )
    
    h2_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#2563eb"),
        spaceBefore=10,
        spaceAfter=10
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#374151")
    )
    
    bold_style = ParagraphStyle(
        'BoldTextCustom',
        parent=body_style,
        fontName='Helvetica-Bold'
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
    
    # Document Header
    story.append(Paragraph("PREMIER DATA SYSTEMS", title_style))
    story.append(Paragraph("Repair Center - Customer Estimate", bold_style))
    story.append(Spacer(1, 15))
    
    # Metadata Setup
    job = getattr(estimate, 'job', None)
    customer = getattr(job, 'customer', None) if job else None
    
    meta_data = [
        [
            Paragraph(f"<b>Estimate Number:</b> {estimate.estimate_number}", body_style),
            Paragraph(f"<b>Customer Name:</b> {customer.name if customer else 'N/A'}", body_style)
        ],
        [
            Paragraph(f"<b>Date Created:</b> {estimate.created_at.strftime('%Y-%m-%d') if getattr(estimate, 'created_at', None) else 'N/A'}", body_style),
            Paragraph(f"<b>Phone:</b> {customer.phone_1 if customer else 'N/A'}", body_style)
        ],
        [
            Paragraph(f"<b>Job Number:</b> {job.job_number if job else 'N/A'}", body_style),
            Paragraph(f"<b>Email:</b> {customer.email if customer else 'N/A'}", body_style)
        ],
        [
            Paragraph(f"<b>Machine Model:</b> {job.machine_model if job else 'N/A'}", body_style),
            Paragraph("", body_style)
        ]
    ]
    
    meta_table = Table(meta_data, colWidths=[260, 260])
    meta_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))
    
    # Items Section
    story.append(Paragraph("Estimate Items", h2_style))
    
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
    
    items_table = Table(table_data, colWidths=[70, 210, 40, 100, 100])
    table_styles = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f3f4f6")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#d1d5db")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]

    summary_rows_count = 3 if (include_tax and tax_amount > 0) else 1
    total_rows = len(table_data)
    for r_idx in range(total_rows - summary_rows_count, total_rows):
        table_styles.append(('SPAN', (0, r_idx), (3, r_idx)))
        table_styles.append(('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor("#f3f4f6")))

    items_table.setStyle(TableStyle(table_styles))
    story.append(items_table)
    story.append(Spacer(1, 15))
    
    # Special Notes
    if estimate.special_notes:
        story.append(Paragraph("Special Notes", h2_style))
        story.append(Paragraph(estimate.special_notes, body_style))
        
    doc.build(story)
