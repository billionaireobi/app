"""
Receipt generation utility for orders.
Design cloned from create_order view — Antioch Africa Limited style.
"""

import os
from io import BytesIO
from decimal import Decimal

from django.conf import settings

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, Paragraph, Spacer, Image
)
from reportlab.graphics.barcode import code128


def generate_receipt_pdf(order):
    """
    Generate a PDF receipt identical in design to the create_order view receipt.

    Args:
        order: Order instance

    Returns:
        BytesIO object positioned at offset 0, containing PDF data.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=50,
        rightMargin=50,
        topMargin=50,
        bottomMargin=50,
    )

    styles = getSampleStyleSheet()

    # ── Styles (copied verbatim from create_order) ─────────────────────────
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=colors.white,
        backColor=colors.HexColor('#1e3a8a'),
        alignment=1,
        spaceAfter=6,
        spaceBefore=6,
        leading=20,
    )
    tagline_style = ParagraphStyle(
        'Tagline',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        textColor=colors.white,
        alignment=0,
        spaceAfter=8,
        spaceBefore=8,
        backColor=colors.HexColor('#3b82f6'),
        borderPadding=5,
        borderWidth=0.5,
        borderColor=colors.HexColor('#1e3a8a'),
    )
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.black,
        spaceAfter=4,
    )
    italic_style = ParagraphStyle(
        'CustomItalic',
        parent=styles['Italic'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        textColor=colors.grey,
        spaceBefore=8,
    )
    total_style = ParagraphStyle(
        'Total',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor('#1e3a8a'),
        alignment=2,
        spaceBefore=12,
        spaceAfter=12,
        backColor=colors.HexColor('#e0f2fe'),
        borderPadding=5,
        borderWidth=1,
        borderColor=colors.HexColor('#1e3a8a'),
    )
    contact_style = ParagraphStyle(
        'Contact',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        textColor=colors.HexColor('#4b5563'),
        alignment=1,
        spaceBefore=8,
    )

    elements = []

    # ── Logo search (same path logic as create_order) ──────────────────────
    logo_path = None
    possible_paths = [
        os.path.join(settings.STATIC_ROOT, 'assets/images/mcdave/Ant.jpg')
        if getattr(settings, 'STATIC_ROOT', None) else None,
        *[
            os.path.join(d, 'assets/images/mcdave/Ant.jpg')
            for d in getattr(settings, 'STATICFILES_DIRS', [])
        ],
        os.path.join(settings.BASE_DIR, 'static', 'assets/images/mcdave/Ant.jpg'),
    ]
    for path in possible_paths:
        if path and os.path.exists(path):
            logo_path = path
            break

    # ── Header: logo | company name + tagline ──────────────────────────────
    if logo_path:
        try:
            logo_cell = Image(logo_path, width=80, height=45)
        except Exception:
            logo_cell = ""
    else:
        logo_cell = ""

    title_cell = [
        Paragraph("Antioch Africa Limited", title_style),
        Paragraph("Reliable Excellence", tagline_style),
    ]

    header_table = Table([[logo_cell, title_cell]], colWidths=[100, 370])
    header_table.setStyle([
        ('VALIGN', (0, 0), (0, 0), 'TOP'),
        ('VALIGN', (1, 0), (1, 0), 'MIDDLE'),
        ('LEFTPADDING',  (0, 0), (0, 0), 0),
        ('RIGHTPADDING', (1, 0), (1, 0), 10),
    ])
    elements.append(header_table)
    elements.append(Spacer(1, 12))

    # ── Address block ──────────────────────────────────────────────────────
    address_data = [
        [Paragraph("P.O. Box 12345-00100, Nairobi, Kenya", normal_style)],
        [Paragraph("Phone: +254 722 123456 / +254 733 789012", normal_style)],
        [Paragraph("Email: info@antioch.co.ke", normal_style)],
        [Paragraph("Website: www.antioch.co.ke", normal_style)],
    ]
    address_table = Table(address_data, colWidths=[512])
    address_table.setStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), colors.HexColor('#f8f9ff')),
        ('BOX',           (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e7ff')),
        ('LEFTPADDING',   (0, 0), (-1, -1), 12),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 12),
        ('TOPPADDING',    (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ])
    elements.append(address_table)
    elements.append(Spacer(1, 12))

    # ── Barcode + M-Pesa payment details ───────────────────────────────────
    barcode_value = f"ORDER-{order.id}"
    barcode = code128.Code128(barcode_value, barHeight=20, barWidth=0.5)

    payment_data = [
        [Paragraph("Paybill No: 522522", normal_style)],
        [Paragraph("A/c No: 5881754", normal_style)],
    ]
    payment_cell = Table(payment_data)

    payment_table = Table([[barcode, payment_cell]], colWidths=[256, 256])
    payment_table.setStyle([
        ('VALIGN',       (0, 0), (0, 0), 'TOP'),
        ('ALIGN',        (0, 0), (0, 0), 'LEFT'),
        ('ALIGN',        (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING',  (0, 0), (0, 0), 0),
        ('RIGHTPADDING', (1, 0), (1, 0), 0),
    ])
    elements.append(payment_table)
    elements.append(Spacer(1, 12))

    # ── Blue divider ───────────────────────────────────────────────────────
    divider = Table([[""]], colWidths=[512], rowHeights=[2])
    divider.setStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e3a8a'))])
    elements.append(divider)
    elements.append(Spacer(1, 12))

    # ── Order meta ─────────────────────────────────────────────────────────
    store_display = (
        dict(order.STORE_CHOICES).get(order.store, order.store)
        if hasattr(order, 'STORE_CHOICES') else order.store
    )
    date_str = order.order_date.strftime('%Y-%m-%d') if order.order_date else 'N/A'
    customer_name = order.customer.first_name if order.customer else 'N/A'
    address_str = (
        getattr(order, 'address', None)
        or (order.customer.address if order.customer else None)
        or 'N/A'
    )

    elements.append(Paragraph(f"Store: {store_display}", normal_style))
    elements.append(Paragraph(f"Date: {date_str}", normal_style))
    elements.append(Paragraph(f"M/s: {customer_name}", normal_style))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(f"Location: {address_str}", contact_style))
    elements.append(Spacer(1, 8))

    # ── Items table ────────────────────────────────────────────────────────
    table_data = [['Qty', 'Item Description', '@', 'Amount (Ksh)']]

    for item in order.order_items.all():
        qty = item.quantity or 0
        product_name = item.product.name if item.product else 'Unknown Product'
        unit_price = item.unit_price or Decimal('0.00')
        variance = item.variance or Decimal('0.00')
        item_total = item.line_total or Decimal('0.00')
        table_data.append([
            str(qty),
            product_name,
            f"{(unit_price + variance):.0f}",
            f"{item_total:.2f}",
        ])

    if len(table_data) == 1:
        table_data.append(["0", "No items", "0.00", "0.00"])

    item_table = Table(table_data, colWidths=[40, 280, 50, 80])
    table_style = [
        ('GRID',        (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('BACKGROUND',  (0, 0), (-1, 0),  colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR',   (0, 0), (-1, 0),  colors.white),
        ('FONTNAME',    (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, 0),  11),
        ('FONTSIZE',    (0, 1), (-1, -1), 10),
        ('FONTNAME',    (0, 1), (-1, -1), 'Helvetica'),
        ('ALIGN',       (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX',         (0, 0), (-1, -1), 1, colors.HexColor('#1e3a8a')),
        ('INNERGRID',   (0, 0), (-1, -1), 0.25, colors.lightgrey),
        ('LEFTPADDING',  (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING',   (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 6),
        ('ALIGN',       (1, 1), (1, -1),  'LEFT'),
    ]
    for i in range(1, len(table_data)):
        if i % 2 == 0:
            table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#f8f9ff')))
    item_table.setStyle(table_style)
    elements.append(item_table)

    # ── Totals ─────────────────────────────────────────────────────────────
    items_subtotal = (
        sum(item.line_total for item in order.order_items.all()) or Decimal('0.00')
    )
    delivery_fee = Decimal(str(order.delivery_fee or 0))
    total_amount = Decimal(str(order.total_amount or 0))

    if delivery_fee > 0:
        subtotal_style = ParagraphStyle(
            'Subtotal',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            textColor=colors.HexColor('#1e3a8a'),
            alignment=2,
            spaceBefore=8,
        )
        elements.append(Paragraph(f"Subtotal: {items_subtotal:.2f}", subtotal_style))
        elements.append(Paragraph(f"Delivery Fee: {delivery_fee:.2f}", subtotal_style))

    elements.append(Paragraph(f"TOTAL: {total_amount:.2f}", total_style))

    # ── Footer row ─────────────────────────────────────────────────────────
    footer_table = Table(
        [[
            Paragraph(f"Receipt: #Mc{order.id}Z", italic_style),
            Paragraph("Goods once sold cannot be re-accepted", italic_style),
        ]],
        colWidths=[235, 235],
    )
    footer_table.setStyle([
        ('TOPPADDING',  (0, 0), (-1, -1), 8),
        ('LINEABOVE',   (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e7ff')),
    ])
    elements.append(footer_table)

    # ── Salesperson + contact ──────────────────────────────────────────────
    salesperson_name = (
        order.sales_person.get_full_name() or order.sales_person.username
        if order.sales_person else 'N/A'
    )
    elements.append(Paragraph(f"Served by: {salesperson_name}", contact_style))
    elements.append(Paragraph(
        "Need assistance? Contact us at support@antioch.co.ke", contact_style
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer
