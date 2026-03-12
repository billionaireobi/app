"""
Receipt generation utility for orders
Generates PDF receipts with order details
"""

from io import BytesIO
from decimal import Decimal
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from datetime import datetime
from django.conf import settings


def generate_receipt_pdf(order):
    """
    Generate a PDF receipt for an order.
    
    Args:
        order: Order instance
        
    Returns:
        BytesIO object containing PDF data
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Container for PDF elements
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#2D8659'),
        spaceAfter=6,
        alignment=1  # Center
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#2D8659'),
        spaceAfter=6
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=4
    )
    
    # Header - McDave Logo/Title
    elements.append(Paragraph("McDave Limited", title_style))
    elements.append(Paragraph("Sales Receipt", heading_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Receipt Info Table
    receipt_info = [
        ['Receipt #:', f"ORD-{order.id}"],
        ['Date:', datetime.now().strftime("%d %b %Y %H:%M")],
        ['Sales Person:', order.sales_person.get_full_name() if hasattr(order.sales_person, 'get_full_name') else order.sales_person.username],
        ['Store:', order.get_store_display() if hasattr(order, 'get_store_display') else order.store],
    ]
    
    info_table = Table(receipt_info, colWidths=[1.5*inch, 3.5*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2D8659')),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#E6F3EC')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#2D8659')),
    ]))
    
    elements.append(info_table)
    elements.append(Spacer(1, 0.15*inch))
    
    # Customer Info
    elements.append(Paragraph("Bill To:", heading_style))
    
    customer_info = [
        f"{order.customer.get_full_name()}",
        f"Phone: {order.customer.phone_number or 'N/A'}",
        f"Category: {order.get_customer_category_display() if hasattr(order, 'get_customer_category_display') else order.customer_category}",
        f"Address: {order.address or order.customer.address or 'N/A'}",
    ]
    
    for line in customer_info:
        elements.append(Paragraph(line, normal_style))
    
    elements.append(Spacer(1, 0.15*inch))
    
    # Order Items Table
    items_data = [['Item', 'Qty', 'Unit Price', 'Variance', 'Total']]
    
    for item in order.order_items.all():
        items_data.append([
            item.product.name[:30],
            str(item.quantity),
            f"Ksh {item.unit_price:,.2f}",
            f"Ksh {item.variance:,.2f}" if item.variance else "0.00",
            f"Ksh {item.line_total:,.2f}",
        ])
    
    items_table = Table(items_data, colWidths=[2.2*inch, 0.8*inch, 1.2*inch, 1.0*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2D8659')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
    ]))
    
    elements.append(items_table)
    elements.append(Spacer(1, 0.15*inch))
    
    # Totals
    VAT_RATE = Decimal('0.16')
    subtotal = sum(item.line_total for item in order.order_items.all())
    
    totals_data = [
        ['Subtotal:', f"Ksh {subtotal:,.2f}"],
        ['Delivery Fee:', f"Ksh {order.delivery_fee:,.2f}"],
    ]
    
    # Add VAT if applicable
    if order.vat_variation == 'with_vat':
        vat_amount = subtotal * VAT_RATE
        totals_data.append(['VAT (16%):', f"Ksh {vat_amount:,.2f}"])
    
    totals_data.append(['TOTAL:', f"Ksh {order.total_amount:,.2f}"])
    
    totals_table = Table(totals_data, colWidths=[3.5*inch, 2.5*inch])
    totals_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -2), 10),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#2D8659')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E6F3EC')),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#2D8659')),
        ('LINEBELOW', (0, -1), (-1, -1), 2, colors.HexColor('#2D8659')),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    
    elements.append(totals_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Footer
    footer_text = "Thank you for your business!"
    elements.append(Paragraph(footer_text, ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=10,
        alignment=1,
        textColor=colors.HexColor('#2D8659'),
    )))
    
    elements.append(Spacer(1, 0.1*inch))
    
    # Payment status footer
    try:
        paid_status_display = order.get_paid_status_display() if hasattr(order, 'get_paid_status_display') else order.paid_status
    except:
        paid_status_display = order.paid_status
    
    terms_text = f"Payment Status: <b>{paid_status_display}</b>"
    elements.append(Paragraph(terms_text, ParagraphStyle(
        'Terms',
        parent=styles['Normal'],
        fontSize=9,
        alignment=1,
    )))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer
