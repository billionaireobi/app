
from django.db import models
import datetime
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from django.utils import timezone
from decimal import Decimal
from django.contrib.auth.models import User
import os
from django.db.models.signals import post_save 
from django.core.validators import RegexValidator

from PIL import Image as PILImage

# creating user profile model
# models.py
from django.dispatch import receiver
from django.contrib.auth.models import Group

class UserProfile(models.Model):
    DEPARTMENT_CHOICES = [
        ('Sales', 'Sales'),
        ('Executive', 'Executive'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    date_modified = models.DateTimeField(auto_now=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES, blank=True, null=True)
    national_id = models.CharField(max_length=20, blank=True, null=True)
    join_date = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return self.user.username

    def is_admin(self):
        return self.user.is_superuser or self.user.groups.filter(name='Admins').exists()

    def is_salesperson(self):
        return self.user.groups.filter(name='Salespersons').exists()
    
    class Meta:
        permissions = [
            ("can_change_department", "Can change department field"),
        ]

@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        if instance.is_superuser:
            profile = UserProfile.objects.create(user=instance, department='Executive')
            group = Group.objects.get_or_create(name='Admins')[0]
            instance.groups.add(group)
        else:
            profile = UserProfile.objects.create(user=instance, department='Sales')
            group = Group.objects.get_or_create(name='Salespersons')[0]
            instance.groups.add(group)
# models.py

class Category(models.Model):
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    description = models.CharField(max_length=255, default='', blank=True, null=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Customer(models.Model):
    CATEGORY_CHOICES = [
        ('', 'select category'),
        ('factory', 'Factory Customer'),
        ('distributor', 'Distributor Customer'),
        ('wholesale', 'Wholesale Customer'),
        ('Towns', 'Towns Customer'),
        ('Retail customer', 'Retail customer'),
    ]
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    phone_number = models.CharField(
        
        blank=True,
        null=True,
        max_length=50,
        validators=[RegexValidator(
            r'^\+?\d{10,14}$',
            'Phone number must be 10-14 digits, starting with 0 or +'
        )]
    )
    email = models.EmailField(null=True, blank=True)
    sales_person = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    address = models.CharField(max_length=100, default='', blank=True, null=True)
    default_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='wholesale')
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f'{self.first_name}'

    def get_full_name(self):
        return f"{self.first_name}"

    def format_phone_number(self):
        """
        Formats the phone number to ensure it has a leading zero for 10-digit numbers
        or corrects decimal formats. Returns the formatted phone number or None if invalid.
        """
        if not self.phone_number:
            return None

        phone = self.phone_number.strip()
        try:
            # Case 1: Decimal format (e.g., '700000.0')
            if '.' in phone and phone.replace('.', '').isdigit():
                phone_int = int(float(phone))
                phone_str = str(phone_int)
                if len(phone_str) == 10:
                    return f"0{phone_str}"
                return phone_str

            # Case 2: Numeric string without leading zero (e.g., '741484426')
            if phone.isdigit() and len(phone) == 10:
                return f"0{phone}"

            # Case 3: Already correct or international (e.g., '0741484426', '+254741484426')
            if phone.startswith('0') or phone.startswith('+'):
                return phone

            # Case 4: Invalid format
            return None
        except (ValueError, TypeError):
            return None

class Product(models.Model):
    name = models.CharField(unique=True, max_length=100)
    description = models.CharField(max_length=255, default='', blank=True, null=True)
    category = models.ForeignKey('Category', on_delete=models.CASCADE, default=1)
    image = models.ImageField(upload_to='uploads/products/', blank=True, null=True, max_length=255)

    STATUS_CHOICES = [
        ('available', 'Available'),
        ('not_available', 'Not Available'),
        ('limited', 'Limited Deal'),
        ('offer', 'In Offer'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')

    factory_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Base price before markups")
    distributor_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Base price before markups")
    wholesale_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Base price before markups")
    offshore_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Base price before markups")
    barcode = models.CharField(max_length=100, unique=True, blank=True, null=True, help_text="Unique barcode for the product")
    retail_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Retail price for all customers")
    mcdave_stock = models.PositiveIntegerField(default=0, help_text="Stock at McDave Store")
    kisii_stock = models.PositiveIntegerField(default=0, help_text="Stock at offshore store MBS")
    # use kisii as the offshore mombasa but never changed the naming
    offshore_stock = models.PositiveIntegerField(default=0, help_text="Stock at Offshore Store NRB")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.image and hasattr(self.image, 'file'):  # Check if image is uploaded
            try:
                img = PILImage.open(self.image)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                max_size = (800, 800)
                img.thumbnail(max_size, PILImage.LANCZOS)
                img_io = BytesIO()
                img.save(img_io, format='JPEG', quality=70)
                filename = os.path.basename(self.image.name)
                self.image = ContentFile(img_io.getvalue(), name=filename)
            except Exception as e:
                print(f"Error processing image: {e}")
        super().save(*args, **kwargs)

    def get_price_by_category(self, customer_category):
        """
        Get the appropriate price for a product based on customer category.
        Returns the price without VAT.
        """
        price_map = {
            'factory': self.factory_price,
            'distributor': self.distributor_price,
            'wholesale': self.wholesale_price,
            'Wholesale': self.wholesale_price,
            'offshore': self.offshore_price,
            'Retail customer': self.retail_price,
            'Towns': self.retail_price,
        }
        return price_map.get(customer_category, self.wholesale_price)
    
    def calculate_price_with_vat(self, base_price, vat_variation='with_vat', vat_rate=Decimal('0.16')):
        """
        Calculate final price with or without VAT.
        """
        if vat_variation == 'with_vat':
            return base_price * (1 + vat_rate)
        return base_price

    def __str__(self):
        return self.name
# Quote Model
# Add VAT_RATE constant (assume 16% VAT; can be moved to settings.py)
VAT_RATE = Decimal('0.16')

# Update Quote Model to include customer_category and vat_variation
class Quote(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent to Client'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('converted', 'Converted to Order'),
    ]
    CATEGORY_CHOICES = [
        ('factory', 'Factory Customer'),
        ('distributor', 'Distributor Customer'),
        ('wholesale', 'Wholesale Customer'),
        ('Retail customer', 'Retail customer'),
        ('Towns', 'Towns Customer'),
    ]
    VAT_CHOICES = [
        ('with_vat', 'With VAT'),
        ('without_vat', 'Without VAT'),
    ]
    
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='quotes')
    sales_person = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quotes_created')
    quote_date = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True, null=True, help_text="Additional notes for the quote")
    customer_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='wholesale')
    vat_variation = models.CharField(max_length=20, choices=VAT_CHOICES, default='with_vat')

    def __str__(self):
        return f"Quote #{self.id} for {self.customer.get_full_name()}"

    def save(self, *args, **kwargs):
        if self.customer:
            self.customer_category = self.customer.default_category
        super().save(*args, **kwargs)

    def calculate_total(self):
        total = sum(item.line_total for item in self.quote_items.all())
        self.total_amount = total
        self.save()
        return total

    def convert_to_order(self):
        if self.status != 'approved':
            raise ValueError("Quote must be approved before converting to order")
        
        # Create new order
        order = Order.objects.create(
            customer=self.customer,
            sales_person=self.sales_person,
            customer_category=self.customer_category,
            vat_variation=self.vat_variation,
            address=self.customer.address,
            phone=self.customer.phone_number,
            store='mcdave',  # Default, can be modified
            total_amount=self.total_amount,
            quote=self  # Link the order to this quote
        )

        # Convert quote items to order items
        for quote_item in self.quote_items.all():
            OrderItem.objects.create(
                order=order,
                product=quote_item.product,
                quantity=quote_item.quantity,
                unit_price=quote_item.unit_price,
                line_total=quote_item.line_total,
                variance=quote_item.variance
            )

        # Update quote status
        self.status = 'converted'
        self.save()
        return order

# QuoteItem remains the same
class QuoteItem(models.Model):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='quote_items')
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    variance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Adjustment amount added to or subtracted from unit price"
    )

    def save(self, *args, **kwargs):
        self.line_total = (self.unit_price + self.variance) * self.quantity
        super().save(*args, **kwargs)
        self.quote.calculate_total()
# Update Order model to reference Quote
class Order(models.Model):
    PAID_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('partially_paid', 'Partially Paid'),
        ('cancelled', 'Cancelled'),
    ]
    CATEGORY_CHOICES = [
        ('factory', 'Factory Customer'),
        ('distributor', 'Distributor Customer'),
        ('wholesale', 'Wholesale Customer'),
        ('Retail customer', 'Retail customer'),
        ('Towns', 'Towns Customer'),
        
    ]
    VAT_CHOICES = [
        ('with_vat', 'With VAT'),
        ('without_vat', 'Without VAT'),
    ]
    DELIVERY_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('returned', 'Returned'),
        ('cancelled', 'Cancelled'),
    ]
    STORE_CHOICES = [
        ('mcdave', 'McDave Store'),
        ('kisii', 'Mombasa Store'),
        ('offshore', 'Offshore Store'),
    ]
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='orders')
    sales_person = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders_made")
    customer_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='wholesale')
    vat_variation = models.CharField(max_length=20, choices=VAT_CHOICES, default='with_vat')
    address = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    order_date = models.DateTimeField(default=timezone.now)
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS_CHOICES, default='pending')
    paid_status = models.CharField(max_length=20, choices=PAID_STATUS_CHOICES, default='pending')
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(default=timezone.now)
    store = models.CharField(max_length=20, choices=STORE_CHOICES, default='mcdave')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quote = models.ForeignKey(Quote, on_delete=models.SET_NULL, null=True, blank=True, related_name='derived_orders')
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Delivery fee to be added to the order total")

    # Salesperson's live GPS location at time of order creation
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    location_address = models.CharField(max_length=500, blank=True, null=True, help_text="GPS-captured location of salesperson at order time")

    def __str__(self):
        try:
            customer_name = getattr(self.customer, 'get_full_name', lambda: None)()
            if customer_name:
                return f"Order #{self.id} by {customer_name}"
            else:
                return f"Order #{self.id} (Customer info missing)"
        except Exception:
            return f"Order #{self.id} (Error fetching customer)"

    def calculate_total(self):
        total = sum(item.line_total for item in self.order_items.all())
        self.total_amount = total
        self.save()
        return total
    def __str__(self):
        quote_info = f" from Quote #{self.quote.id}" if self.quote else ""
        try:
            customer_name = getattr(self.customer, 'get_full_name', lambda: None)()
            if customer_name:
                return f"Order #{self.id} by {customer_name}{quote_info}"
            else:
                return f"Order #{self.id} (Customer info missing){quote_info}"
        except Exception:
            return f"Order #{self.id} (Error fetching customer){quote_info}"
    def get_balance(self):
        """Calculate remaining balance"""
        return self.total_amount - self.amount_paid
    
    def update_paid_status(self):
        """Automatically update paid status based on amount paid"""
        if self.amount_paid >= self.total_amount:
            self.paid_status = 'completed'
        elif self.amount_paid > 0:
            self.paid_status = 'partially_paid'
        else:
            self.paid_status = 'pending'
        self.save()

from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator
class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    variance = models.DecimalField(max_digits=10, decimal_places=2, default=0,validators=[
            MinValueValidator(Decimal('-50.00')),
            MaxValueValidator(Decimal('50.00'))
        ], help_text="Additional amount added to unit price")

    original_quantity = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        # Store original quantity on first save
        if not self.pk:
            self.original_quantity = self.quantity
        super().save(*args, **kwargs)


class Deal(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    deal_value = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(default=timezone.now)

    original_quantity = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        # Store original quantity on first save
        if not self.pk:
            self.original_quantity = self.quantity
        super().save(*args, **kwargs)
        

# NEW: Payment tracking model
class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('mpesa', 'M-Pesa'),
        ('buni', 'Buni (KCB)'),
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('card', 'Card'),
    ]
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')
    payment_date = models.DateTimeField(default=timezone.now)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Payment #{self.id} - Order #{self.order.id} - {self.amount}"
    
    class Meta:
        ordering = ['-payment_date']


from django.db import models
import datetime
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from django.utils import timezone
from decimal import Decimal
from django.contrib.auth.models import User
import os
from django.db.models.signals import post_save, pre_delete
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.contrib.auth.models import Group
from django.core.validators import RegexValidator


# Adding ActivityLog model here
class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = "Activity Logs"

    def __str__(self):
        return f"{self.user} - {self.action} at {self.timestamp}"

# Signal handlers for logging
@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    ip_address = request.META.get('REMOTE_ADDR')
    ActivityLog.objects.create(user=user, action="User Logged In", details=f"IP Address: {ip_address}")

@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    ActivityLog.objects.create(user=user, action="User Logged Out")

@receiver(post_save, sender=Order)
def log_order_action(sender, instance, created, **kwargs):
    if created:
        ActivityLog.objects.create(
            user=instance.sales_person,
            action="Order Created",
            details=f"Order ID: {instance.id}, Customer: {instance.customer.get_full_name()}, Total: Ksh{instance.total_amount:.2f}"
        )
    else:
        ActivityLog.objects.create(
            user=instance.sales_person,
            action="Order Updated",
            details=f"Order ID: {instance.id}, Customer: {instance.customer.get_full_name()}, Total: ksh{instance.total_amount:.2f}"
        )

@receiver(pre_delete, sender=Order)
def log_order_deletion(sender, instance, **kwargs):
    ActivityLog.objects.create(
        user=instance.sales_person,
        action="Order Deleted",
        details=f"Order ID: {instance.id}, Customer: {instance.customer.get_full_name()}"
    )
    
 
 
 
# =====================================================
# STOCK MANAGEMENT MODELS - NEW TABLES (No alterations to existing)
# =====================================================

class StockMovement(models.Model):
    """
    Tracks all stock movements - both inbound and outbound.
    Links to orders for automatic tracking when orders are created/fulfilled.
    """
    MOVEMENT_TYPE_CHOICES = [
        ('in', 'Stock In'),
        ('out', 'Stock Out'),
        ('adjustment', 'Adjustment'),
        ('transfer_in', 'Transfer In'),
        ('transfer_out', 'Transfer Out'),
        ('return', 'Customer Return'),
        ('damage', 'Damaged/Write-off'),
    ]

    STORE_CHOICES = [
        ('mcdave', 'McDave Store'),
        ('kisii', 'Mombasa Store'),
        ('offshore', 'Offshore Store'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements')
    store = models.CharField(max_length=20, choices=STORE_CHOICES)
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantity = models.IntegerField(help_text="Positive for in, negative for out")
    previous_stock = models.PositiveIntegerField(default=0, help_text="Stock level before this movement")
    new_stock = models.PositiveIntegerField(default=0, help_text="Stock level after this movement")

    # Optional links to related records
    order = models.ForeignKey('Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_movements')
    transfer = models.ForeignKey('StockTransfer', on_delete=models.SET_NULL, null=True, blank=True, related_name='movements')

    reference_number = models.CharField(max_length=100, blank=True, null=True, help_text="External reference (PO number, delivery note, etc.)")
    notes = models.TextField(blank=True, null=True)

    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='stock_movements_recorded')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'store']),
            models.Index(fields=['movement_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.get_movement_type_display()} - {self.product.name} ({self.quantity}) @ {self.get_store_display()}"

    def save(self, *args, **kwargs):
        # Get current stock before saving
        if not self.pk:
            if self.store == 'mcdave':
                self.previous_stock = self.product.mcdave_stock
            elif self.store == 'kisii':
                self.previous_stock = self.product.kisii_stock
            elif self.store == 'offshore':
                self.previous_stock = self.product.offshore_stock

            self.new_stock = max(0, self.previous_stock + self.quantity)

        super().save(*args, **kwargs)


class StockTransfer(models.Model):
    """
    Handles stock transfers between stores.
    Creates two StockMovement records (transfer_out and transfer_in).
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_transit', 'In Transit'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    STORE_CHOICES = [
        ('mcdave', 'McDave Store'),
        ('kisii', 'Mombasa Store'),
        ('offshore', 'Offshore Store'),
    ]

    from_store = models.CharField(max_length=20, choices=STORE_CHOICES)
    to_store = models.CharField(max_length=20, choices=STORE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    transfer_date = models.DateTimeField(default=timezone.now)
    completed_date = models.DateTimeField(blank=True, null=True)

    notes = models.TextField(blank=True, null=True)

    initiated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='transfers_initiated')
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfers_received')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Transfer #{self.id}: {self.get_from_store_display()} -> {self.get_to_store_display()}"

    def get_total_items(self):
        return self.items.aggregate(total=models.Sum('quantity'))['total'] or 0


class StockTransferItem(models.Model):
    """Individual items in a stock transfer."""
    transfer = models.ForeignKey(StockTransfer, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ['transfer', 'product']

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"


class StockAdjustment(models.Model):
    """
    Manual stock adjustments with audit trail.
    For corrections, damage write-offs, found stock, etc.
    """
    REASON_CHOICES = [
        ('count_correction', 'Physical Count Correction'),
        ('damage', 'Damaged Goods'),
        ('expired', 'Expired Products'),
        ('found', 'Found Stock'),
        ('theft', 'Theft/Loss'),
        ('system_error', 'System Error Correction'),
        ('other', 'Other'),
    ]

    STORE_CHOICES = [
        ('mcdave', 'McDave Store'),
        ('kisii', 'Mombasa Store'),
        ('offshore', 'Offshore Store'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_adjustments')
    store = models.CharField(max_length=20, choices=STORE_CHOICES)

    previous_quantity = models.PositiveIntegerField()
    new_quantity = models.PositiveIntegerField()
    adjustment_quantity = models.IntegerField(help_text="Positive for increase, negative for decrease")

    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    notes = models.TextField(blank=True, null=True, help_text="Detailed explanation for the adjustment")

    adjusted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='stock_adjustments')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_adjustments_approved')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Adjustment: {self.product.name} ({self.adjustment_quantity:+d}) @ {self.get_store_display()}"


class StockAlert(models.Model):
    """
    Stock level alerts for low stock, out of stock, etc.
    """
    ALERT_TYPE_CHOICES = [
        ('low_stock', 'Low Stock'),
        ('out_of_stock', 'Out of Stock'),
        ('overstock', 'Overstock'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('acknowledged', 'Acknowledged'),
        ('resolved', 'Resolved'),
    ]

    STORE_CHOICES = [
        ('mcdave', 'McDave Store'),
        ('kisii', 'Mombasa Store'),
        ('offshore', 'Offshore Store'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_alerts')
    store = models.CharField(max_length=20, choices=STORE_CHOICES)
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    current_stock = models.PositiveIntegerField()
    threshold = models.PositiveIntegerField(default=10, help_text="Stock level that triggered alert")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_alerts')
    acknowledged_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_alert_type_display()}: {self.product.name} @ {self.get_store_display()}"


class PurchaseOrder(models.Model):
    """
    Purchase orders for restocking inventory.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('ordered', 'Ordered'),
        ('partial', 'Partially Received'),
        ('received', 'Fully Received'),
        ('cancelled', 'Cancelled'),
    ]

    STORE_CHOICES = [
        ('mcdave', 'McDave Store'),
        ('kisii', 'Mombasa Store'),
        ('offshore', 'Offshore Store'),
    ]

    po_number = models.CharField(max_length=50, unique=True)
    store = models.CharField(max_length=20, choices=STORE_CHOICES)
    supplier_name = models.CharField(max_length=200)
    supplier_contact = models.CharField(max_length=100, blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    order_date = models.DateField(default=timezone.now)
    expected_delivery = models.DateField(blank=True, null=True)
    received_date = models.DateField(blank=True, null=True)

    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='purchase_orders_created')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_orders_approved')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PO #{self.po_number} - {self.supplier_name}"

    def calculate_total(self):
        total = sum(item.line_total for item in self.items.all())
        self.total_amount = total
        self.save()
        return total


class PurchaseOrderItem(models.Model):
    """Individual items in a purchase order."""
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    quantity_ordered = models.PositiveIntegerField(default=1)
    quantity_received = models.PositiveIntegerField(default=0)

    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.line_total = self.quantity_ordered * self.unit_cost
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} x {self.quantity_ordered}"


# =====================================================
# CHATBOT MODEL
# =====================================================

class ChatMessage(models.Model):
    """
    Stores chatbot conversation history for users.
    """
    SENDER_CHOICES = [
        ('user', 'User'),
        ('bot', 'Bot'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    message = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.get_sender_display()}: {self.message[:50]}..."


class ChatbotKnowledge(models.Model):
    """
    Knowledge base for the chatbot - stores Q&A pairs and system info.
    """
    CATEGORY_CHOICES = [
        ('general', 'General'),
        ('orders', 'Orders'),
        ('products', 'Products'),
        ('customers', 'Customers'),
        ('stock', 'Stock Management'),
        ('reports', 'Reports'),
        ('account', 'Account/Profile'),
        ('help', 'Help/Support'),
    ]

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    keywords = models.TextField(help_text="Comma-separated keywords that trigger this response")
    question = models.TextField(help_text="Example question or topic")
    answer = models.TextField(help_text="The bot's response")

    is_active = models.BooleanField(default=True)
    priority = models.PositiveIntegerField(default=0, help_text="Higher priority responses are matched first")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', 'category']
        verbose_name_plural = "Chatbot Knowledge Base"

    def __str__(self):
        return f"[{self.category}] {self.question[:50]}..."


# =====================================================
# CUSTOMER FEEDBACK MODEL
# =====================================================

class CustomerFeedback(models.Model):
    FEEDBACK_TYPE_CHOICES = [
        ('quality', 'Product Quality'),
        ('pricing', 'Pricing'),
        ('payments', 'Payments'),
        ('delivery_time', 'Delivery Time'),
    ]
    RATING_CHOICES = [
        (1, '1 - Very Poor'),
        (2, '2 - Poor'),
        (3, '3 - Average'),
        (4, '4 - Good'),
        (5, '5 - Excellent'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='feedbacks')
    salesperson = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='feedbacks_collected')

    # Customer details (denormalized for quick access)
    shop_name = models.CharField(max_length=200, help_text="Customer shop name")
    contact_person = models.CharField(max_length=200, blank=True, null=True, help_text="Contact person name")
    exact_location = models.CharField(max_length=500, help_text="Exact shop location/directions")
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_TYPE_CHOICES)
    rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES, default=3)
    comment = models.TextField()

    # Camera-only photo with watermark (enforced on frontend)
    photo = models.ImageField(upload_to='feedback_photos/%Y/%m/', blank=True, null=True, max_length=255)

    # Geolocation (captured at time of feedback)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback from {self.shop_name} ({self.get_feedback_type_display()}) - {self.get_rating_display()}"


# =====================================================
# INTERNAL MESSAGING / MINI CHAT
# =====================================================

class InternalMessage(models.Model):
    MESSAGE_TYPE_CHOICES = [
        ('user', 'User Message'),
        ('feedback_alert', 'Customer Feedback Alert'),
        ('system', 'System Notification'),
    ]
    ATTACH_TYPE_CHOICES = [
        ('text', 'Text'),
        ('file', 'File'),
        ('image', 'Image'),
        ('location', 'Location'),
        ('contact', 'Contact'),
    ]

    sender = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_internal_messages'
    )
    # null recipient = broadcast to all users
    recipient = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_internal_messages'
    )
    message = models.TextField(blank=True)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES, default='user')
    attach_type = models.CharField(max_length=10, choices=ATTACH_TYPE_CHOICES, default='text')
    is_read = models.BooleanField(default=False)
    feedback = models.ForeignKey(
        CustomerFeedback, on_delete=models.SET_NULL, null=True, blank=True
    )
    # Attachment (file / image)
    attachment = models.FileField(upload_to='chat_attachments/%Y/%m/', blank=True, null=True)
    attachment_name = models.CharField(max_length=255, blank=True)
    # Location sharing
    latitude  = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    location_label = models.CharField(max_length=300, blank=True)
    # Contact sharing
    contact_name  = models.CharField(max_length=200, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        sender_name = self.sender.username if self.sender else 'System'
        return f"[{self.get_message_type_display()}] {sender_name}: {self.message[:50]}"


# =====================================================
# NOTIFICATION MODEL
# =====================================================

class Notification(models.Model):
    EVENT_TYPE_CHOICES = [
        ('feedback_new',  'New Feedback'),
        ('message_new',   'New Message'),
        ('order_created', 'Order Created'),
        ('order_updated', 'Order Updated'),
        ('order_deleted', 'Order Deleted'),
        ('beat_visit',    'Beat Visit Logged'),
        ('beat_plan_new', 'Beat Plan Created'),
        ('stock_change',  'Stock Change'),
        ('payment_new',   'New Payment'),
        ('login_new',     'New Login'),
        ('general',       'General'),
    ]
    EVENT_ICONS = {
        'feedback_new':  '📋',
        'message_new':   '💬',
        'order_created': '🛒',
        'order_updated': '✏️',
        'order_deleted': '🗑️',
        'beat_visit':    '📍',
        'beat_plan_new': '📅',
        'stock_change':  '📦',
        'payment_new':   '💰',
        'login_new':     '🔐',
        'general':       '🔔',
    }

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES, default='general')
    title      = models.CharField(max_length=255)
    body       = models.TextField(blank=True)
    url        = models.CharField(max_length=500, blank=True)
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.event_type} → {self.user.username}: {self.title[:50]}'

    @property
    def icon(self):
        return self.EVENT_ICONS.get(self.event_type, '🔔')


# =====================================================
# M-PESA TRANSACTION MODEL
# =====================================================

class MPesaTransaction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('timeout', 'Timeout'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='mpesa_transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    phone_number = models.CharField(max_length=15, help_text="Phone number STK was sent to")

    # Daraja API response fields
    checkout_request_id = models.CharField(max_length=200, blank=True, null=True, unique=True)
    merchant_request_id = models.CharField(max_length=200, blank=True, null=True)
    mpesa_receipt_number = models.CharField(max_length=100, blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    result_code = models.CharField(max_length=10, blank=True, null=True)
    result_description = models.TextField(blank=True, null=True)

    initiated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='mpesa_initiations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"MPesa #{self.id} - Order #{self.order.id} - KSh{self.amount} - {self.status}"


# =====================================================
# BUNI TRANSACTION MODEL (KCB & other bank payments)
# =====================================================

class BuniTransaction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('timeout', 'Timeout'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='buni_transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    phone_number = models.CharField(max_length=15, help_text="Phone number payment was sent to")

    # Buni API response fields
    transaction_id = models.CharField(max_length=200, blank=True, null=True, unique=True)
    payment_url = models.URLField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    result_code = models.CharField(max_length=10, blank=True, null=True)
    result_description = models.TextField(blank=True, null=True)

    initiated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='buni_initiations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Buni #{self.id} - Order #{self.order.id} - KSh{self.amount} - {self.status}"


# =====================================================
# LOGIN SESSION (LIVE PHOTO + LOCATION)
# =====================================================

class LoginSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_sessions')
    login_photo = models.ImageField(upload_to='login_photos/%Y/%m/', blank=True, null=True, max_length=255)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    ip_address = models.CharField(max_length=45, blank=True, null=True)
    login_at = models.DateTimeField(auto_now_add=True)
    device_info = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        ordering = ['-login_at']

    def __str__(self):
        return f"{self.user.username} login at {self.login_at}"



# =====================================================================
# DAILY BEAT  — structured route planning for salespersons
# =====================================================================

class BeatPlan(models.Model):
    """A customer assigned to a salesperson on a recurring day of the week."""
    DAY_CHOICES = [
        ('Monday',    'Monday'),
        ('Tuesday',   'Tuesday'),
        ('Wednesday', 'Wednesday'),
        ('Thursday',  'Thursday'),
        ('Friday',    'Friday'),
        ('Saturday',  'Saturday'),
    ]
    salesperson = models.ForeignKey(User, on_delete=models.CASCADE, related_name='beat_plans')
    customer    = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='beat_plans')
    day_of_week = models.CharField(max_length=10, choices=DAY_CHOICES)
    notes       = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['day_of_week', 'customer__first_name']
        unique_together = ('salesperson', 'customer', 'day_of_week')

    def __str__(self):
        return f"{self.salesperson.username} -> {self.customer} on {self.day_of_week}"


class BeatVisit(models.Model):
    """Record of a salesperson's actual visit/call on a given day."""
    OUTCOME_CHOICES = [
        ('order_placed',  'Order Placed'),
        ('follow_up',     'Follow-Up Required'),
        ('no_contact',    'No Contact / Closed'),
        ('info_gathered', 'Info Gathered'),
        ('declined',      'Declined / Not Interested'),
    ]
    plan        = models.ForeignKey(BeatPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name='visits')
    salesperson = models.ForeignKey(User, on_delete=models.CASCADE, related_name='beat_visits')
    customer    = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='beat_visits')
    order       = models.ForeignKey('Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='beat_visits')
    visit_date  = models.DateField()
    outcome     = models.CharField(max_length=20, choices=OUTCOME_CHOICES)
    notes       = models.TextField(blank=True)
    latitude    = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude   = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-visit_date', '-created_at']

    def __str__(self):
        return f"{self.salesperson.username} visited {self.customer} on {self.visit_date}"
