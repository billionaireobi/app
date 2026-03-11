from django.shortcuts import render, redirect
from django.contrib.auth import logout
from django.contrib import messages
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from django.urls import reverse
from django.contrib.sites.shortcuts import get_current_site
from .forms import SignUpForm
from .tokens import AccountActivationTokenGenerator  # Assuming this is your custom token generator
from django.utils import timezone
from django.conf import settings
from django.utils.timezone import now, timedelta
from .models import *  # It's better to explicitly import what you need
from django.template.loader import render_to_string



def activate_user(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and AccountActivationTokenGenerator().check_token(user, token):
        user.is_active = True
        user.save()
        messages.success(request, 'Account activated! You can now log in.')
        return redirect('loginuser')  # Redirect to login page after activation
    else:
        if user:
            # user.delete()  # Clean up invalid user
            messages.error(request, 'Activation link is invalid or has expired.')
            return render(request, 'auth/link_expire.html')

def activateEmail(request, user, to_email):
    try:
        mail_subject = "Activate Your Account"
        message = render_to_string("auth/account_activation_email.html", {
            "user": user.username,
            "domain": get_current_site(request).domain,
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": AccountActivationTokenGenerator().make_token(user),
            "protocol": 'https' if request.is_secure() else 'http'
        })
        email = EmailMessage(mail_subject, message, to=[to_email])
        email.content_subtype = "html"  # Ensure email is sent as HTML
        if email.send(fail_silently=False):
            messages.success(
                request,
                f'Dear <b>{user.username}</b>, please check your email <b>{to_email}</b> and click the activation link to complete registration. <b>Note:</b> Check your spam folder.'
            )
        else:
            messages.error(request, f'Failed to send email to {to_email}. Please try again.')
            if user.pk:
                user.delete()  # Rollback user creation
    except Exception as e:
        messages.error(request, f'Error sending activation email: {str(e)}')
        if user.pk:
            user.delete()  # Rollback user creation

def sign_up_user(request):
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            try:
                user = form.save(commit=False)
                user.is_active = False  # User must activate via email
                user.save()
                activateEmail(request, user, form.cleaned_data.get("email"))
                return redirect('loginuser')
            except Exception as e:
                messages.error(request, f"Error during registration: {str(e)}")
                if user.pk:
                    user.delete()  # Rollback user creation
                return redirect('registeruser')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field.capitalize()}: {error}")
    else:
        form = SignUpForm()
    
    return render(request, "auth/register.html", {"form": form})

from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib import messages
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.urls import reverse
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import passwordreset

def forgetpassword(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        try:
            user = User.objects.get(email=email)
            
            # Delete any existing password reset tokens for this user
            passwordreset.objects.filter(user=user).delete()
            
            # Create new password reset token
            new_password_reset = passwordreset(user=user)
            new_password_reset.save()
            
            # Generate URL - Make sure this matches your URL name exactly
            password_reset_url = reverse('resetpassword', kwargs={'reset_id': new_password_reset.reset_id})
            full_password_reset = f'{request.scheme}://{request.get_host()}{password_reset_url}'
            
            # Render HTML email body using template
            email_body = render_to_string('auth/password_reset_email.html', {
                'user': user,
                'reset_link': full_password_reset,
            })
            
            email_message = EmailMessage(
                'Reset Your Password',
                email_body,
                settings.EMAIL_HOST_USER,
                [email]
            )
            email_message.content_subtype = 'html'
            
            try:
                email_message.send(fail_silently=False)
                messages.success(request, "Password reset email sent successfully. Please check your email.")
                return render(request, 'auth/passwordreset_done.html')
            except Exception as e:
                new_password_reset.delete()
                messages.error(request, f"Failed to send password reset email: {str(e)}")
                return redirect('forgetpassword')
                
        except User.DoesNotExist:
            messages.error(request, f"No user with email {email} was found")
            return redirect('forgetpassword')
            
    return render(request, 'auth/forget_password.html')

def resetpassword(request, reset_id):
    try:
        password_reset = passwordreset.objects.get(reset_id=reset_id)
        current_time = timezone.now()
        expiration_time = password_reset.created_when + timedelta(minutes=10)
        
        # Check if link has expired
        if current_time > expiration_time:
            messages.error(request, "The password reset link has expired. Please request a new one.")
            password_reset.delete()
            return render(request, 'auth/link_expired.html')
        
        if request.method == 'POST':
            password = request.POST.get('password')
            confirmpassword = request.POST.get('confirm_password')
            passwords_have_error = False
            
            if password != confirmpassword:
                passwords_have_error = True
                messages.error(request, "The two password fields did not match!")
            
            if len(password) < 8:
                passwords_have_error = True
                messages.error(request, "Password must be at least 8 characters long!")
            
            if not passwords_have_error:
                user = password_reset.user
                user.set_password(password)
                user.save()
                
                # Delete the used token
                password_reset.delete()
                
                # Delete any other tokens for this user
                passwordreset.objects.filter(user=user).delete()
                
                messages.success(request, "Password reset successfully!")
                return redirect('password_reset_complete')
        
        return render(request, 'auth/resetpassword.html', {'reset_id': reset_id})
        
    except passwordreset.DoesNotExist:
        messages.error(request, 'Invalid or expired password reset link. Please request a new one.')
        return render(request, 'auth/link_expired.html')

def passwordresetsent(request, reset_id):
    try:
        password_reset = passwordreset.objects.get(reset_id=reset_id)
        current_time = timezone.now()
        expiration_time = password_reset.created_when + timedelta(minutes=10)
        
        if current_time > expiration_time:
            password_reset.delete()
            messages.error(request, 'Reset link has expired. Please request a new one.')
            return redirect('forgetpassword')
            
        return render(request, 'auth/passwordreset_done.html', {'reset_id': reset_id})
    except passwordreset.DoesNotExist:
        messages.error(request, 'Invalid or expired reset link. Please request a new one.')
        return redirect('forgetpassword')

# def forgetpassword(request):
#     if request.method == 'POST':
#         email = request.POST.get('email')
#         try:
#             user = User.objects.get(email=email)
#             new_password_reset = passwordreset(user=user)
#             new_password_reset.save()

#             # Generate URL
#             password_reset_url = reverse('resetpassword', kwargs={'reset_id': new_password_reset.reset_id})
#             full_password_reset = f'{request.scheme}://{request.get_host()}{password_reset_url}'

#             # Render HTML email body using template
#             email_body = render_to_string('auth/password_reset_email.html', {
#                 'user': user,
#                 'reset_link': full_password_reset
#             })

#             email_message = EmailMessage(
#                 'Reset Your Password',
#                 email_body,
#                 settings.EMAIL_HOST_USER,
#                 [email]
#             )
#             email_message.content_subtype = 'html'
#             try:
#                 email_message.send(fail_silently=False)
#                 messages.success(request, "Password reset email sent successfully. Please check your email (including spam folder).")
#                 return render(request, 'auth/passwordreset_done.html')  # Render directly instead of redirect
#             except Exception as e:
#                 new_password_reset.delete()  # Rollback on email failure
#                 messages.error(request, f"Failed to send password reset email: {str(e)}")
#                 return redirect('forgetpassword')

#         except User.DoesNotExist:
#             messages.error(request, f"No user with email {email} was found")
#             return redirect('forgetpassword')

#     return render(request, 'auth/forget_password.html')

# def passwordresetsent(request, reset_id):
#     try:
#         password_reset = passwordreset.objects.get(reset_id=reset_id)
#         return render(request, 'auth/passwordreset_done.html', {'reset_id': reset_id})
#     except passwordreset.DoesNotExist:
#         messages.error(request, 'Invalid or expired reset link. Please request a new one.')
#         return redirect('forgetpassword')

# def resetpassword(request, reset_id):
#     try:
#         password_reset = passwordreset.objects.get(reset_id=reset_id)
#         current_time = timezone.now()
#         expiration_time = password_reset.created_when + timedelta(minutes=10)

#         if current_time > expiration_time:
#             messages.error(request, "The password reset link has expired. Please request a new one.")
#             password_reset.delete()
#             return render(request, 'auth/link_expired.html')

#         if request.method == 'POST':
#             password = request.POST.get('password')
#             confirmpassword = request.POST.get('confirm_password')
#             passwords_have_error = False

#             if password != confirmpassword:
#                 passwords_have_error = True
#                 messages.error(request, "The two password fields did not match!")
#             if len(password) < 8:
#                 passwords_have_error = True
#                 messages.error(request, "Password must be at least 8 characters long!")

#             if not passwords_have_error:
#                 user = password_reset.user
#                 user.set_password(password)
#                 user.save()
#                 password_reset.delete()  # Delete after successful reset
#                 messages.success(request, "Password reset successfully!")
#                 return redirect('password_reset_complete')

#         return render(request, 'auth/resetpassword.html', {'reset_id': reset_id})

#     except passwordreset.DoesNotExist:
#         messages.error(request, 'Invalid password reset link. Please request a new one.')
#         return render(request, 'auth/link_expired.html')
        

# quotation
from django.db import models
from django.utils import timezone
from decimal import Decimal
from django.contrib.auth.models import User
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from .forms import QuoteForm, QuoteItemFormSet
from django import forms

from store.models import *
from django.http import JsonResponse

from django.forms import inlineformset_factory
# Views for handling Quotes
# API for searching customers
VAT_RATE = Decimal('0.16')  # 16% VAT
def get_base_price(product, category):
    price_map = {
        'factory': product.factory_price,
        'distributor': product.distributor_price,
        'wholesale': product.wholesale_price,
        'Towns': product.offshore_price,
        'Retail customer': product.retail_price,
    }
    return price_map.get(category, product.wholesale_price)

# API for searching customers
@login_required
def customer_search(request):
    if not request.user.userprofile.is_admin():
        raise PermissionDenied("Only admins can search customers")
    q = request.GET.get('q', '')
    customers = Customer.objects.filter(models.Q(first_name__icontains=q) | models.Q(last_name__icontains=q))[:10]
    data = [{'id': c.id, 'text': c.get_full_name()} for c in customers]
    if not data:
        data = [{'id': '', 'text': 'No customers found - add some via admin or forms'}]
    return JsonResponse({'results': data})

# API for getting customer details (for category)
@login_required
def customer_detail(request, customer_id):
    if not request.user.userprofile.is_admin():
        raise PermissionDenied("Only admins can view customer details")
    customer = get_object_or_404(Customer, id=customer_id)
    data = {'category': customer.default_category}
    return JsonResponse(data)

# API for searching products
@login_required
def product_search(request):
    if not request.user.userprofile.is_admin():
        raise PermissionDenied("Only admins can search products")
    q = request.GET.get('q', '')
    category = request.GET.get('category', 'wholesale')
    vat = request.GET.get('vat', 'with_vat')
    products = Product.objects.filter(name__icontains=q)[:10]
    data = []
    for p in products:
        base_price = get_base_price(p, category)
        price = base_price * (1 + VAT_RATE) if vat == 'with_vat' else base_price
        data.append({'id': p.id, 'text': p.name, 'price': float(price)})
    if not data:
        data = [{'id': '', 'text': 'No products found - add some via admin or forms'}]
    return JsonResponse({'results': data})

# API for getting product price by ID
@login_required
def product_price(request, product_id):
    if not request.user.userprofile.is_admin():
        raise PermissionDenied("Only admins can view product prices")
    product = get_object_or_404(Product, id=product_id)
    category = request.GET.get('category', 'wholesale')
    vat = request.GET.get('vat', 'with_vat')
    base_price = get_base_price(product, category)
    price = base_price * (1 + VAT_RATE) if vat == 'with_vat' else base_price
    return JsonResponse({'price': float(price)})
@login_required
def create_quote(request):
    if not request.user.userprofile.is_admin():
        raise PermissionDenied("Only admins can create quotes")
    
    if request.method == 'POST':
        quote_form = QuoteForm(request.POST)
        quote_item_formset = QuoteItemFormSet(request.POST, instance=Quote())
        
        if quote_form.is_valid() and quote_item_formset.is_valid():
            quote = quote_form.save(commit=False)
            quote.sales_person = request.user
            quote.save()
            quote_item_formset.instance = quote
            quote_item_formset.save()
            quote.calculate_total()
            messages.success(request, 'Quote created successfully')
            return redirect('quote_detail', quote_id=quote.id)
    else:
        quote_form = QuoteForm()
        quote_item_formset = QuoteItemFormSet(instance=Quote())
    
    return render(request, 'quotes/create.html', {
        'quote_form': quote_form,
        'quote_item_formset': quote_item_formset
    })


@login_required
def quote_detail(request, quote_id):
    quote = get_object_or_404(Quote, id=quote_id)
    if not request.user.userprofile.is_admin():
        raise PermissionDenied("Only admins can view quotes")
    
    return render(request, 'quotes/detail.html', {'quote': quote})

@login_required
def approve_quote(request, quote_id):
    quote = get_object_or_404(Quote, id=quote_id)
    if not request.user.userprofile.is_admin():
        raise PermissionDenied("Only admins can approve quotes")
    
    if request.method == 'POST':
        quote.status = 'approved'
        quote.save()
        messages.success(request, 'Quote approved successfully')
        return redirect('quote_detail', quote_id=quote.id)
    
    return render(request, 'quotes/approve.html', {'quote': quote})

@login_required
def convert_quote_to_order(request, quote_id):
    quote = get_object_or_404(Quote, id=quote_id)
    if not request.user.userprofile.is_admin():
        raise PermissionDenied("Only admins can convert quotes to orders")
    
    if request.method == 'POST':
        try:
            order = quote.convert_to_order()
            messages.success(request, f'Quote converted to Order #{order.id} successfully')
            return redirect('order_detail', order_id=order.id)
        except ValueError as e:
            messages.error(request, str(e))
    
    return render(request, 'quotes/convert.html', {'quote': quote})

# @login_required
# def quote_list(request):
#     if not request.user.userprofile.is_admin():
#         raise PermissionDenied("Only admins can view quotes")
#     quotes = Quote.objects.all()
#     return render(request, 'quotes/list.html', {'quotes': quotes})
@login_required
def quote_list(request):
    if not request.user.userprofile.is_admin():
        raise PermissionDenied("Only admins can view quotes")
    
    quotes = Quote.objects.all().order_by('-created_at')  # newest first
    return render(request, 'quotes/list.html', {'quotes': quotes})

from django.urls import reverse
from django.http import HttpResponseRedirect
@login_required
def delete_quote(request, quote_id):
    if not request.user.userprofile.is_admin():
        raise PermissionDenied("Only admins can delete quotes")
    
    quote = get_object_or_404(Quote, id=quote_id)
    
    if request.method == 'POST':
        quote.delete()
        return HttpResponseRedirect(reverse('quote_list'))
    
    return render(request, 'quotes/delete.html', {'quote': quote})



from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.db import models
from store.models import *
from decimal import Decimal
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from io import BytesIO
import os

# Custom colors for branding
BRAND_BLUE = colors.HexColor("#55A807")  # Deep blue
BRAND_LIGHT_BLUE = colors.HexColor('#3B82F6')  # Lighter blue
BRAND_ACCENT = colors.HexColor('#F59E0B')  # Golden accent
LIGHT_GRAY = colors.HexColor('#F8FAFC')
MEDIUM_GRAY = colors.HexColor('#E2E8F0')
DARK_GRAY = colors.HexColor('#475569')
SUCCESS_GREEN = colors.HexColor('#10B981')

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for (page_num, page_state) in enumerate(self._saved_page_states):
            self.__dict__.update(page_state)
            self.draw_page_number(page_num + 1, num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_num, total_pages):
        self.setFont("Helvetica", 9)
        self.setFillColor(DARK_GRAY)
        
        # Company info footer
        self.drawString(0.75*inch, 0.6*inch, "Mcdave Holdings Limited")
        self.drawString(0.75*inch, 0.45*inch, "📞 +254 207 859 680 | ✉ support@mcdave.co.ke | 🌐 www.Mcdave.co.ke")
        
        # Page number
        self.drawRightString(7.25*inch, 0.6*inch, f"Page {page_num} of {total_pages}")
        
        # Decorative line
        self.setStrokeColor(BRAND_LIGHT_BLUE)
        self.setLineWidth(1)
        self.line(0.75*inch, 0.3*inch, 7.25*inch, 0.3*inch)

@login_required
def download_quote_pdf(request, quote_id):
    if not request.user.userprofile.is_admin():
        raise PermissionDenied("Only admins can download quotes")
    
    quote = get_object_or_404(Quote, id=quote_id)
    
    # Create a BytesIO buffer for the PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter, 
        rightMargin=0.75*inch, 
        leftMargin=0.75*inch, 
        topMargin=1*inch, 
        bottomMargin=1.2*inch
    )
    
    # Enhanced custom styles
    styles = getSampleStyleSheet()
    
    # Company name style - large and bold
    company_style = ParagraphStyle(
        name='CompanyStyle',
        fontSize=28,
        leading=32,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        textColor=BRAND_BLUE,
        spaceAfter=6
    )
    
    # Tagline style
    tagline_style = ParagraphStyle(
        name='TaglineStyle',
        fontSize=11,
        leading=13,
        fontName='Helvetica-Oblique',
        alignment=TA_CENTER,
        textColor=DARK_GRAY,
        spaceAfter=20
    )
    
    # Quote title style
    quote_title_style = ParagraphStyle(
        name='QuoteTitleStyle',
        fontSize=24,
        leading=28,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        textColor=BRAND_ACCENT,
        spaceAfter=20,
        borderWidth=2,
        borderColor=BRAND_ACCENT,
        borderPadding=10,
        backColor=colors.HexColor('#FEF3C7')  # Light yellow background
    )
    
    # Section header style
    section_header_style = ParagraphStyle(
        name='SectionHeaderStyle',
        fontSize=14,
        leading=16,
        fontName='Helvetica-Bold',
        textColor=BRAND_BLUE,
        spaceAfter=8,
        borderWidth=0,
        borderPadding=0,
        leftIndent=0,
        bulletIndent=0
    )
    
    # Customer info style
    customer_style = ParagraphStyle(
        name='CustomerStyle',
        fontSize=12,
        leading=14,
        fontName='Helvetica',
        textColor=DARK_GRAY,
        spaceAfter=4,
        leftIndent=10
    )
    
    # Details style
    details_style = ParagraphStyle(
        name='DetailsStyle',
        fontSize=11,
        leading=13,
        fontName='Helvetica',
        textColor=colors.black,
        spaceAfter=4
    )
    
    # Bold details style
    bold_details_style = ParagraphStyle(
        name='BoldDetailsStyle',
        fontSize=11,
        leading=13,
        fontName='Helvetica-Bold',
        textColor=BRAND_BLUE,
        spaceAfter=4
    )
    
    # Total style
    total_style = ParagraphStyle(
        name='TotalStyle',
        fontSize=16,
        leading=18,
        fontName='Helvetica-Bold',
        textColor=SUCCESS_GREEN,
        alignment=TA_RIGHT,
        spaceAfter=10,
        borderWidth=2,
        borderColor=SUCCESS_GREEN,
        borderPadding=8,
        backColor=colors.HexColor('#ECFDF5')
    )
    
    # Notes style
    notes_style = ParagraphStyle(
        name='NotesStyle',
        fontSize=10,
        leading=12,
        fontName='Helvetica',
        textColor=DARK_GRAY,
        spaceAfter=6,
        alignment=TA_JUSTIFY,
        borderWidth=1,
        borderColor=MEDIUM_GRAY,
        borderPadding=8,
        backColor=LIGHT_GRAY
    )
    
    # Terms style
    terms_style = ParagraphStyle(
        name='TermsStyle',
        fontSize=9,
        leading=11,
        fontName='Helvetica',
        textColor=DARK_GRAY,
        spaceAfter=4,
        alignment=TA_JUSTIFY
    )
    
    # Content elements
    elements = []
    
    # Header with company branding
    elements.append(Paragraph("MCDAVE HOLDINGS LIMITED", company_style))
    elements.append(Paragraph("Excellence in Manufacturing Solutions", tagline_style))
    
    # Contact information in a styled box
    contact_info = "63 Enterprise road, Industrial Area, Unit No.1, Nairobi, Kenya | +254 207 859 680 | support@mcdave.co.ke | www.Mcdave.co.ke"
    contact_style = ParagraphStyle(
        name='ContactStyle',
        fontSize=10,
        leading=12,
        fontName='Helvetica',
        alignment=TA_CENTER,
        textColor=colors.white,
        spaceAfter=30,
        borderWidth=1,
        borderColor=BRAND_BLUE,
        borderPadding=10,
        backColor=BRAND_BLUE
    )
    elements.append(Paragraph(contact_info, contact_style))
    
    
    # Two-column layout for customer and quote info
    customer_info = f"{quote.customer.get_full_name()}\n{quote.customer.address or 'Address not provided'}\n{quote.customer.format_phone_number() or 'Phone not provided'}"
    quote_details = f"Quote Date: {quote.quote_date.strftime('%B %d, %Y')}\nExpiry Date: {quote.expiry_date.strftime('%B %d, %Y') if quote.expiry_date else 'N/A'}\nCustomer Category: {quote.get_customer_category_display()}\nVAT Variation: {quote.get_vat_variation_display()}\nSales Person: {quote.sales_person.get_full_name() or quote.sales_person.username}"
    
    quote_info_data = [
        ['BILL TO:', 'QUOTE DETAILS:'],
        [customer_info, quote_details]
    ]
    
    info_table = Table(quote_info_data, colWidths=[3.25*inch, 3.25*inch])
    info_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        # Content rows
        ('BACKGROUND', (0, 1), (-1, -1), LIGHT_GRAY),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 15),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
        
        # Borders
        ('GRID', (0, 0), (-1, -1), 1, BRAND_BLUE),
        ('BOX', (0, 0), (-1, -1), 2, BRAND_BLUE),
    ]))
    
    elements.append(info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Items table with enhanced styling
    table_data = [['#', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'VARIANCE', 'TOTAL']]
    
    for index, item in enumerate(quote.quote_items.all(), start=1):
        table_data.append([
            str(index),
            item.product.name,
            f"{item.quantity:,.0f}",
            f"Ksh {item.unit_price:,.2f}",
            f"Ksh {item.variance:,.2f}" if item.variance >= 0 else f"-${abs(item.variance):,.2f}",
            f"ksh {item.line_total:,.2f}"
        ])
    
    # Add subtotal row
    table_data.append(['', '', '', '', 'SUBTOTAL:', f"ksh {quote.total_amount:,.2f}"])
    
    items_table = Table(table_data, colWidths=[0.4*inch, 2.8*inch, 0.6*inch, 1*inch, 1*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        # Item rows styling
        ('BACKGROUND', (0, 1), (-1, -2), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, LIGHT_GRAY]),
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -2), 10),
        ('ALIGN', (0, 1), (0, -2), 'CENTER'),  # Item numbers
        ('ALIGN', (1, 1), (1, -2), 'LEFT'),    # Descriptions
        ('ALIGN', (2, 1), (-1, -2), 'RIGHT'),  # Numbers
        ('TOPPADDING', (0, 1), (-1, -2), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -2), 10),
        
        # Subtotal row
        ('BACKGROUND', (0, -1), (-1, -1), SUCCESS_GREEN),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('ALIGN', (0, -1), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, -1), (-1, -1), 12),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 12),
        
        # Grid and borders
        ('GRID', (0, 0), (-1, -1), 0.5, DARK_GRAY),
        ('BOX', (0, 0), (-1, -1), 2, BRAND_BLUE),
        ('LINEBELOW', (0, 0), (-1, 0), 2, colors.white),
        ('LINEABOVE', (0, -1), (-1, -1), 2, SUCCESS_GREEN),
    ]))
    
    elements.append(items_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Total amount with prominent styling
    total_paragraph = f"TOTAL AMOUNT: ksh {quote.total_amount:,.2f}"
    elements.append(Paragraph(total_paragraph, total_style))
    # Quote title with styling
    elements.append(Paragraph(f"QUOTE No: #McQ{quote.id}Z", tagline_style))
    
    # Notes section
    if quote.notes:
        elements.append(Spacer(1, 0.2*inch))
        elements.append(Paragraph("SPECIAL NOTES:", section_header_style))
        elements.append(Paragraph(quote.notes, notes_style))
    
    # Professional terms and conditions
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("TERMS & CONDITIONS:", section_header_style))
    
    terms_list = [
        "Payment Terms: Net 30 days from quote acceptance. Early payment discount of 2% available within 10 days.",
        "Validity: This quotation is valid until the expiry date mentioned above. Prices may be subject to change thereafter.",
        "Delivery: Standard delivery terms apply. Express delivery available upon request at additional cost.", 
        "Warranty: All products come with manufacturer's warranty. Extended warranty options available.",
        "Acceptance: Quote acceptance constitutes agreement to these terms and conditions."
    ]
    
    for term in terms_list:
        elements.append(Paragraph(f"• {term}", terms_style))
    
    # Thank you message
    elements.append(Spacer(1, 0.3*inch))
    thank_you_style = ParagraphStyle(
        name='ThankYouStyle',
        fontSize=12,
        leading=14,
        fontName='Helvetica-BoldOblique',
        textColor=BRAND_BLUE,
        alignment=TA_CENTER,
        spaceAfter=10,
        borderWidth=1,
        borderColor=BRAND_ACCENT,
        borderPadding=10,
        backColor=colors.HexColor('#FEF3C7')
    )
    elements.append(Paragraph("Thank you for choosing Mcdave Holdings Limited! We look forward to serving you.", thank_you_style))
    
    # Build PDF with custom canvas
    doc.build(elements, canvasmaker=NumberedCanvas)
    
    # Serve PDF
    buffer.seek(0)
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Mcdave_Quotation_McQ{quote.id}Z.pdf"'
    response.write(buffer.getvalue())
    buffer.close()
    
    return response
    
    
# views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User, Group
from django.contrib import messages
from django.db.models import Q
from store.models import *
from store.forms import *
from django.contrib.auth.hashers import make_password
from .forms import *

def is_admin(user):
    """Check if user is admin"""
    return user.is_superuser or user.groups.filter(name='Admins').exists()

@login_required
@user_passes_test(is_admin)
def user_list(request):
    """Display all users with search functionality"""
    query = request.GET.get('q', '')
    users = User.objects.select_related('userprofile').all()
    
    if query:
        users = users.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query) |
            Q(userprofile__phone__icontains=query)
        )
    
    users = users.order_by('-date_joined')
    
    context = {
        'users': users,
        'query': query,
    }
    return render(request, 'users/user_list.html', context)

@login_required
@user_passes_test(is_admin)
def user_create(request):
    """Create a new user"""
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password'])
            user.save()
            
            # Update profile
            profile = user.userprofile
            profile.phone = form.cleaned_data['phone']
            profile.department = form.cleaned_data['department']
            profile.national_id = form.cleaned_data['national_id']
            profile.join_date = form.cleaned_data['join_date']
            profile.gender = form.cleaned_data['gender']
            profile.save()
            
            # Assign group based on department
            user.groups.clear()
            if form.cleaned_data['department'] == 'Executive':
                group = Group.objects.get_or_create(name='Admins')[0]
            else:
                group = Group.objects.get_or_create(name='Salespersons')[0]
            user.groups.add(group)
            
            # Log activity
            ActivityLog.objects.create(
                user=request.user,
                action="User Created",
                details=f"Created user: {user.username} ({user.get_full_name()})"
            )
            
            messages.success(request, f'User {user.username} created successfully!')
            return redirect('user_list')
    else:
        form = UserCreationForm()
    
    return render(request, 'users/user_form.html', {'form': form, 'title': 'Create User'})

@login_required
@user_passes_test(is_admin)
def user_edit(request, user_id):
    """Edit user details"""
    user = get_object_or_404(User, id=user_id)
    profile = user.userprofile
    
    if request.method == 'POST':
        form = UserEditForm(request.POST, instance=user)
        if form.is_valid():
            user = form.save()
            
            # Update profile
            profile.phone = form.cleaned_data['phone']
            profile.department = form.cleaned_data['department']
            profile.national_id = form.cleaned_data['national_id']
            profile.join_date = form.cleaned_data['join_date']
            profile.gender = form.cleaned_data['gender']
            profile.save()
            
            # Update group based on department
            user.groups.clear()
            if form.cleaned_data['department'] == 'Executive':
                group = Group.objects.get_or_create(name='Admins')[0]
            else:
                group = Group.objects.get_or_create(name='Salespersons')[0]
            user.groups.add(group)
            
            # Log activity
            ActivityLog.objects.create(
                user=request.user,
                action="User Updated",
                details=f"Updated user: {user.username} ({user.get_full_name()})"
            )
            
            messages.success(request, f'User {user.username} updated successfully!')
            return redirect('user_list')
    else:
        initial_data = {
            'phone': profile.phone,
            'department': profile.department,
            'national_id': profile.national_id,
            'join_date': profile.join_date,
            'gender': profile.gender,
        }
        form = UserEditForm(instance=user, initial=initial_data)
    
    return render(request, 'users/user_form.html', {
        'form': form,
        'title': 'Edit User',
        'user_obj': user
    })

@login_required
@user_passes_test(is_admin)
def user_toggle_active(request, user_id):
    """Activate or deactivate a user"""
    user = get_object_or_404(User, id=user_id)
    
    # Prevent admin from deactivating themselves
    if user.id == request.user.id:
        messages.error(request, 'You cannot deactivate your own account!')
        return redirect('user_list')
    
    user.is_active = not user.is_active
    user.save()
    
    status = "activated" if user.is_active else "deactivated"
    
    # Log activity
    ActivityLog.objects.create(
        user=request.user,
        action=f"User {status.capitalize()}",
        details=f"{status.capitalize()} user: {user.username}"
    )
    
    messages.success(request, f'User {user.username} has been {status}!')
    return redirect('user_list')

@login_required
@user_passes_test(is_admin)
def user_change_password(request, user_id):
    """Change user password"""
    user = get_object_or_404(User, id=user_id)
    
    if request.method == 'POST':
        form = UserPasswordChangeForm(request.POST)
        if form.is_valid():
            new_password = form.cleaned_data['new_password']
            user.set_password(new_password)
            user.save()
            
            # Log activity
            ActivityLog.objects.create(
                user=request.user,
                action="Password Changed",
                details=f"Changed password for user: {user.username}"
            )
            
            messages.success(request, f'Password for {user.username} changed successfully!')
            return redirect('user_list')
    else:
        form = UserPasswordChangeForm()
    
    return render(request, 'users/passwordchange.html', {
        'form': form,
        'user_obj': user
    })

@login_required
@user_passes_test(is_admin)
def user_change_role(request, user_id):
    """Change user role (department and group)"""
    user = get_object_or_404(User, id=user_id)
    
    if request.method == 'POST':
        new_department = request.POST.get('department')
        
        if new_department in ['Sales', 'Executive']:
            # Update profile department
            profile = user.userprofile
            old_department = profile.department
            profile.department = new_department
            profile.save()
            
            # Update groups
            user.groups.clear()
            if new_department == 'Executive':
                group = Group.objects.get_or_create(name='Admins')[0]
            else:
                group = Group.objects.get_or_create(name='Salespersons')[0]
            user.groups.add(group)
            
            # Log activity
            ActivityLog.objects.create(
                user=request.user,
                action="User Role Changed",
                details=f"Changed {user.username}'s role from {old_department} to {new_department}"
            )
            
            messages.success(request, f'Role changed for {user.username} to {new_department}!')
        else:
            messages.error(request, 'Invalid department selected!')
        
        return redirect('user_list')
    
    return render(request, 'users/role.html', {'user_obj': user})

@login_required
@user_passes_test(is_admin)
def user_detail(request, user_id):
    """View detailed user information"""
    user = get_object_or_404(User, id=user_id)
    profile = user.userprofile
    
    # Get user's recent activity
    recent_activities = ActivityLog.objects.filter(user=user).order_by('-timestamp')[:10]
    
    # Get user's statistics
    total_orders = user.orders_made.count()
    total_quotes = user.quotes_created.count()
    
    context = {
        'user_obj': user,
        'profile': profile,
        'recent_activities': recent_activities,
        'total_orders': total_orders,
        'total_quotes': total_quotes,
    }
    
    return render(request, 'users/detail.html', context) 


# ##################3

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.models import User
from django.db.models import Sum, Count, Q
from store.models import *


def _is_admin(user):
    return user.is_superuser or user.groups.filter(name='Admins').exists()


# ============================================================
# PRODUCTS REPORT
# ============================================================
@login_required
def product_report(request):
    qs = Product.objects.select_related('category').all()

    if request.GET.get('category'):
        qs = qs.filter(category_id=request.GET['category'])
    if request.GET.get('status'):
        qs = qs.filter(status=request.GET['status'])
    if request.GET.get('search'):
        q = request.GET['search']
        qs = qs.filter(Q(name__icontains=q) | Q(barcode__icontains=q))
    sf = request.GET.get('stock_filter')
    if sf == 'out':
        qs = qs.filter(mcdave_stock=0)
    elif sf == 'low':
        qs = qs.filter(mcdave_stock__gt=0, mcdave_stock__lt=10)
    elif sf == 'good':
        qs = qs.filter(mcdave_stock__gte=10)

    stats = {
        'total':        qs.count(),
        'available':    qs.filter(status='available').count(),
        'low_stock':    qs.filter(
            Q(mcdave_stock__gt=0, mcdave_stock__lt=10) |
            Q(kisii_stock__gt=0,  kisii_stock__lt=10) |
            Q(offshore_stock__gt=0, offshore_stock__lt=10)
        ).count(),
        'out_of_stock': qs.filter(mcdave_stock=0, kisii_stock=0, offshore_stock=0).count(),
        'categories':   Category.objects.count(),
        'total_units':  qs.aggregate(t=Sum('mcdave_stock'))['t'] or 0,
    }

    return render(request, 'summary/product.html', {
        'products':   qs,
        'categories': Category.objects.all().order_by('name'),
        'stats':      stats,
    })


# ============================================================
# CUSTOMERS REPORT
# ============================================================
@login_required
def customer_report(request):
    admin = _is_admin(request.user)
    qs = Customer.objects.select_related('sales_person').all()
    if not admin:
        qs = qs.filter(sales_person=request.user)

    if request.GET.get('category'):
        qs = qs.filter(default_category=request.GET['category'])
    if request.GET.get('salesperson') and admin:
        qs = qs.filter(sales_person_id=request.GET['salesperson'])
    if request.GET.get('search'):
        q = request.GET['search']
        qs = qs.filter(Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(phone_number__icontains=q))
    if request.GET.get('date_from'):
        qs = qs.filter(created_at__date__gte=request.GET['date_from'])

    # Annotate each customer
    customers = []
    total_revenue = total_paid_all = total_outstanding = 0
    for c in qs:
        agg = c.orders.aggregate(
            total_orders=Count('id'),
            total_spent=Sum('total_amount'),
            total_paid=Sum('amount_paid'),
        )
        spent = agg['total_spent'] or 0
        paid  = agg['total_paid'] or 0
        bal   = spent - paid

        # balance filter
        bf = request.GET.get('balance')
        if bf == 'outstanding' and bal <= 0:
            continue
        if bf == 'clear' and bal > 0:
            continue

        last = c.orders.order_by('-order_date').first()
        c.total_orders   = agg['total_orders'] or 0
        c.total_spent    = spent
        c.total_paid     = paid
        c.balance        = bal
        c.last_order_date = last.order_date if last else None
        customers.append(c)

        total_revenue    += spent
        total_paid_all   += paid
        total_outstanding += bal

    stats = {
        'total':       qs.count(),
        'active':      qs.filter(orders__isnull=False).distinct().count(),
        'total_revenue': total_revenue,
        'total_paid':  total_paid_all,
        'outstanding': total_outstanding,
        'wholesale':   qs.filter(default_category='wholesale').count(),
        'distributors': qs.filter(default_category='distributor').count(),
    }

    return render(request, 'summary/customer.html', {
        'customers':    customers,
        'salespersons': User.objects.filter(groups__name='Salespersons').order_by('first_name'),
        'stats':        stats,
        'is_admin':     admin,
    })


# ============================================================
# ORDERS REPORT
# ============================================================
@login_required
def order_report(request):
    admin = _is_admin(request.user)
    qs = Order.objects.select_related('customer', 'sales_person').order_by('-order_date')
    if not admin:
        qs = qs.filter(sales_person=request.user)

    if request.GET.get('store'):
        qs = qs.filter(store=request.GET['store'])
    if request.GET.get('paid_status'):
        qs = qs.filter(paid_status=request.GET['paid_status'])
    if request.GET.get('delivery_status'):
        qs = qs.filter(delivery_status=request.GET['delivery_status'])
    if request.GET.get('date_from'):
        qs = qs.filter(order_date__date__gte=request.GET['date_from'])
    if request.GET.get('date_to'):
        qs = qs.filter(order_date__date__lte=request.GET['date_to'])
    if request.GET.get('salesperson') and admin:
        qs = qs.filter(sales_person_id=request.GET['salesperson'])

    agg = qs.aggregate(revenue=Sum('total_amount'), collected=Sum('amount_paid'))
    revenue   = agg['revenue'] or 0
    collected = agg['collected'] or 0

    stats = {
        'total':           qs.count(),
        'total_revenue':   revenue,
        'collected':       collected,
        'outstanding':     revenue - collected,
        'pending_delivery': qs.filter(delivery_status='pending').count(),
        'with_fee':        qs.filter(delivery_fee__gt=0).count(),
    }

    return render(request, 'summary/report.html', {
        'orders':       qs,
        'salespersons': User.objects.filter(groups__name='Salespersons').order_by('first_name'),
        'stats':        stats,
        'is_admin':     admin,
    })


# ============================================================
# BULK ORDERS PAGE
# ============================================================
@login_required
def bulk_orders(request):
    admin = _is_admin(request.user)
    qs = Order.objects.select_related('customer', 'sales_person').order_by('-order_date')
    if not admin:
        qs = qs.filter(sales_person=request.user)

    if request.GET.get('store'):
        qs = qs.filter(store=request.GET['store'])
    if request.GET.get('paid_status'):
        qs = qs.filter(paid_status=request.GET['paid_status'])
    if request.GET.get('delivery_status'):
        qs = qs.filter(delivery_status=request.GET['delivery_status'])
    if request.GET.get('customer'):
        qs = qs.filter(customer_id=request.GET['customer'])
    if request.GET.get('date_from'):
        qs = qs.filter(order_date__date__gte=request.GET['date_from'])
    if request.GET.get('date_to'):
        qs = qs.filter(order_date__date__lte=request.GET['date_to'])

    customers_qs = Customer.objects.all()
    if not admin:
        customers_qs = customers_qs.filter(sales_person=request.user)

    return render(request, 'summary/orders.html', {
        'orders':    qs,
        'customers': customers_qs.order_by('first_name'),
        'is_admin':  admin,
    })


# ============================================================
# BULK ORDER ACTION (POST endpoint)
# ============================================================
@login_required
def bulk_order_action(request):
    if request.method != 'POST':
        return redirect('bulk_orders')

    admin = _is_admin(request.user)
    action  = request.POST.get('action', '')
    ids_raw = request.POST.get('order_ids', '')

    if not action or not ids_raw:
        messages.warning(request, 'No action or orders selected.')
        return redirect('bulk_orders')

    try:
        order_ids = [int(i.strip()) for i in ids_raw.split(',') if i.strip().isdigit()]
    except ValueError:
        messages.error(request, 'Invalid order IDs.')
        return redirect('bulk_orders')

    if not order_ids:
        messages.warning(request, 'No valid orders to update.')
        return redirect('bulk_orders')

    qs = Order.objects.filter(id__in=order_ids)
    if not admin:
        qs = qs.filter(sales_person=request.user)

    ACTION_MAP = {
        'paid_completed':    {'paid_status': 'completed'},
        'paid_pending':      {'paid_status': 'pending'},
        'paid_cancelled':    {'paid_status': 'cancelled'},
        'delivery_completed': {'delivery_status': 'completed'},
        'delivery_pending':   {'delivery_status': 'pending'},
        'delivery_returned':  {'delivery_status': 'returned'},
        'delivery_cancelled': {'delivery_status': 'cancelled'},
    }

    fields = ACTION_MAP.get(action)
    if not fields:
        messages.error(request, f'Unknown action: {action}')
        return redirect('bulk_orders')

    updated = qs.update(**fields)

    LABELS = {
        'paid_completed':    'Payment → Completed',
        'paid_pending':      'Payment → Pending',
        'paid_cancelled':    'Payment → Cancelled',
        'delivery_completed': 'Delivery → Completed',
        'delivery_pending':   'Delivery → Pending',
        'delivery_returned':  'Delivery → Returned',
        'delivery_cancelled': 'Delivery → Cancelled',
    }
    messages.success(request, f'✓ {LABELS.get(action, action)} applied to {updated} order(s).')
    return redirect('bulk_orders')
from django.db.models import Sum, Count, DecimalField, IntegerField, Q
from django.db.models.functions import Coalesce
from django.db.models.expressions import RawSQL
from decimal import Decimal
from django.utils import timezone
import datetime

# ============================================================
# PRODUCT DETAIL / ANALYTICS VIEW
# ============================================================
@login_required
def product_detail_sum(request, pk):
    product = get_object_or_404(Product, pk=pk)

    ZERO    = Decimal('0.00')
    DEF_INT = 0

    # ── Base queryset ────────────────────────────────────────
    items_qs = OrderItem.objects.filter(product=product).select_related(
        'order', 'order__customer', 'order__sales_person'
    )

    # ── Top-level sales figures ──────────────────────────────
    sales_agg = items_qs.aggregate(
        total_units_sold=Coalesce(Sum('quantity'),   DEF_INT, output_field=IntegerField()),
        total_revenue   =Coalesce(Sum('line_total'), ZERO,    output_field=DecimalField()),
        total_orders    =Count('order', distinct=True),
    )
    total_units_sold = sales_agg['total_units_sold']
    total_revenue    = sales_agg['total_revenue']
    total_orders     = sales_agg['total_orders']
    avg_unit_price   = (total_revenue / total_units_sold) if total_units_sold else ZERO

    # ── Revenue by order payment status ─────────────────────
    def rev_for_status(status):
        return items_qs.filter(order__paid_status=status).aggregate(
            v=Coalesce(Sum('line_total'), ZERO, output_field=DecimalField())
        )['v']

    rev_completed = rev_for_status('completed')
    rev_pending   = rev_for_status('pending')
    rev_partial   = rev_for_status('partially_paid')
    rev_cancelled = rev_for_status('cancelled')

    # ── Revenue by customer category ────────────────────────
    by_category = list(
        items_qs
        .values('order__customer_category')
        .annotate(
            units =Coalesce(Sum('quantity'),   DEF_INT, output_field=IntegerField()),
            rev   =Coalesce(Sum('line_total'), ZERO,    output_field=DecimalField()),
            orders=Count('order', distinct=True),
        )
        .order_by('-rev')
    )

    # ── Revenue by store ─────────────────────────────────────
    by_store = list(
        items_qs
        .values('order__store')
        .annotate(
            units =Coalesce(Sum('quantity'),   DEF_INT, output_field=IntegerField()),
            rev   =Coalesce(Sum('line_total'), ZERO,    output_field=DecimalField()),
            orders=Count('order', distinct=True),
        )
        .order_by('-rev')
    )

    # ── Revenue by salesperson ───────────────────────────────
    by_salesperson = list(
        items_qs
        .values(
            'order__sales_person__id',
            'order__sales_person__first_name',
            'order__sales_person__last_name',
            'order__sales_person__username',
        )
        .annotate(
            units =Coalesce(Sum('quantity'),   DEF_INT, output_field=IntegerField()),
            rev   =Coalesce(Sum('line_total'), ZERO,    output_field=DecimalField()),
            orders=Count('order', distinct=True),
        )
        .order_by('-rev')[:10]
    )

    # ── Monthly trend (last 12 months) ───────────────────────
    # DATE_FORMAT avoids MySQL tz-table requirement that TruncMonth needs
    twelve_months_ago = timezone.now() - datetime.timedelta(days=365)
    monthly_raw = (
        items_qs
        .filter(order__order_date__gte=twelve_months_ago)
        .values(month_str=RawSQL("DATE_FORMAT(store_order.order_date, '%%Y-%%m')", []))
        .annotate(
            units=Coalesce(Sum('quantity'),   DEF_INT, output_field=IntegerField()),
            rev  =Coalesce(Sum('line_total'), ZERO,    output_field=DecimalField()),
        )
        .order_by('month_str')
    )
    monthly_trend = list(monthly_raw)

    # ── Top customers for this product ───────────────────────
    top_customers = list(
        items_qs
        .values(
            'order__customer__id',
            'order__customer__first_name',
            'order__customer__last_name',
            'order__customer__default_category',
        )
        .annotate(
            units =Coalesce(Sum('quantity'),   DEF_INT, output_field=IntegerField()),
            rev   =Coalesce(Sum('line_total'), ZERO,    output_field=DecimalField()),
            orders=Count('order', distinct=True),
        )
        .order_by('-rev')[:10]
    )

    # ── Stock summary ────────────────────────────────────────
    total_stock = product.mcdave_stock + product.kisii_stock + product.offshore_stock

    # ── Recent stock movements ───────────────────────────────
    recent_movements = (
        StockMovement.objects
        .filter(product=product)
        .select_related('recorded_by', 'order', 'transfer')
        .order_by('-created_at')[:20]
    )

    # ── Recent orders containing this product ────────────────
    recent_orders = (
        Order.objects
        .filter(order_items__product=product)
        .distinct()
        .select_related('customer', 'sales_person')
        .order_by('-order_date')[:15]
    )

    # ── Pricing breakdown ────────────────────────────────────
    prices = [
        ('Factory',     product.factory_price),
        ('Distributor', product.distributor_price),
        ('Wholesale',   product.wholesale_price),
        ('Offshore',    product.offshore_price),
        ('Retail',      product.retail_price),
    ]

    # ── Chart data ───────────────────────────────────────────
    def fmt_month(ym):
        try:
            return datetime.datetime.strptime(ym, '%Y-%m').strftime('%b %Y')
        except Exception:
            return ym

    chart_labels  = [fmt_month(m['month_str']) for m in monthly_trend]
    chart_units   = [m['units'] for m in monthly_trend]
    chart_revenue = [float(m['rev']) for m in monthly_trend]

    return render(request, 'summary/productsum.html', {
        'product':          product,
        'prices':           prices,
        # totals
        'total_units_sold': total_units_sold,
        'total_revenue':    total_revenue,
        'total_orders':     total_orders,
        'avg_unit_price':   avg_unit_price,
        'total_stock':      total_stock,
        # revenue by status
        'rev_completed':    rev_completed,
        'rev_pending':      rev_pending,
        'rev_partial':      rev_partial,
        'rev_cancelled':    rev_cancelled,
        # breakdowns
        'by_category':      by_category,
        'by_store':         by_store,
        'by_salesperson':   by_salesperson,
        'top_customers':    top_customers,
        'monthly_trend':    monthly_trend,
        # lists
        'recent_movements': recent_movements,
        'recent_orders':    recent_orders,
        # chart
        'chart_labels':     chart_labels,
        'chart_units':      chart_units,
        'chart_revenue':    chart_revenue,
    })