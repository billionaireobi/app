"""
API Serializers for Android App
Handles serialization of store models for REST API endpoints
"""

from rest_framework import serializers
from store.models import (
    UserProfile, Category, Customer, Product, Order, 
    OrderItem, Quote, QuoteItem, Deal, Payment, 
    ActivityLog, LoginSession, ChatbotKnowledge, ChatMessage,
    StockMovement, StockTransfer, StockTransferItem, StockAdjustment, StockAlert,
    PurchaseOrder, PurchaseOrderItem, CustomerFeedback, InternalMessage, Notification,
    MPesaTransaction, BuniTransaction, BeatPlan, BeatVisit
)
from administration.models import passwordreset
from django.contrib.auth.models import User


class UserSerializer(serializers.ModelSerializer):
    """Serialize Django User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser']
        read_only_fields = ['id']


class UserProfileSerializer(serializers.ModelSerializer):
    """Serialize User Profile with user details"""
    user = UserSerializer(read_only=True)
    is_admin = serializers.SerializerMethodField()
    is_salesperson = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'date_modified', 'phone', 'department', 
            'national_id', 'join_date', 'gender', 'is_admin', 'is_salesperson'
        ]
        read_only_fields = ['id', 'date_modified']
    
    def get_is_admin(self, obj):
        return obj.is_admin()
    
    def get_is_salesperson(self, obj):
        return obj.is_salesperson()


class CategorySerializer(serializers.ModelSerializer):
    """Serialize Product Categories"""
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductSerializer(serializers.ModelSerializer):
    """Serialize Products with full details"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_url = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'category', 'category_name', 
            'image', 'image_url', 'status', 'factory_price', 'distributor_price',
            'wholesale_price', 'offshore_price', 'retail_price', 'barcode',
            'mcdave_stock', 'kisii_stock', 'offshore_stock', 'total_stock',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None
    
    def get_total_stock(self, obj):
        """Calculate total stock across all stores"""
        return (obj.mcdave_stock or 0) + (obj.kisii_stock or 0) + (obj.offshore_stock or 0)


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight Product serializer for list views"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_url = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'barcode', 'category_name', 'status', 'image', 'image_url',
            'retail_price', 'factory_price', 'distributor_price', 'wholesale_price', 'offshore_price',
            'mcdave_stock', 'kisii_stock', 'offshore_stock', 'total_stock'
        ]
    
    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None
    
    def get_total_stock(self, obj):
        total = (obj.mcdave_stock or 0) + (obj.kisii_stock or 0) + (obj.offshore_stock or 0)
        return total if total > 0 else 0


class CustomerSerializer(serializers.ModelSerializer):
    """Serialize Customers"""
    sales_person_name = serializers.SerializerMethodField()
    formatted_phone = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = [
            'id', 'first_name', 'last_name', 'phone_number', 'formatted_phone',
            'email', 'sales_person', 'sales_person_name', 'address', 
            'default_category', 'updated_at', 'created_at'
        ]
        read_only_fields = ['id', 'updated_at', 'created_at', 'formatted_phone', 'sales_person_name']
    
    def get_formatted_phone(self, obj):
        return obj.format_phone_number()
    
    def get_sales_person_name(self, obj):
        """Get sales person name safely, handling None values"""
        if obj.sales_person:
            return obj.sales_person.get_full_name()
        return None
    
    def validate_phone_number(self, value):
        """Validate phone number format"""
        if not value:
            return value
        
        # Remove common separators
        import re
        cleaned = re.sub(r'[\s\-().]', '', str(value))
        digits = re.sub(r'\D', '', cleaned)
        
        if len(digits) < 9:
            raise serializers.ValidationError(
                'Phone number must contain at least 9 digits. Example: 0700000000'
            )
        if len(digits) > 15:
            raise serializers.ValidationError(
                'Phone number cannot have more than 15 digits'
            )
        
        return value
    
    def validate_first_name(self, value):
        """Validate first name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError('First name is required')
        return value.strip()


class OrderItemSerializer(serializers.ModelSerializer):
    """Serialize Order Items"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'order', 'product', 'product_name', 'product_image',
            'quantity', 'unit_price', 'variance', 'line_total', 'original_quantity'
        ]
        read_only_fields = ['id', 'line_total', 'original_quantity']
    
    def get_product_image(self, obj):
        request = self.context.get('request')
        if obj.product.image and request:
            return request.build_absolute_uri(obj.product.image.url)
        return None


class OrderSerializer(serializers.ModelSerializer):
    """Serialize Orders with items"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    sales_person_name = serializers.CharField(source='sales_person.get_full_name', read_only=True)
    order_items = OrderItemSerializer(many=True, read_only=True)
    balance = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'customer_name', 'sales_person', 'sales_person_name',
            'customer_category', 'vat_variation', 'address', 'phone', 'order_date',
            'delivery_status', 'paid_status', 'store', 'total_amount', 'amount_paid',
            'balance', 'delivery_fee', 'latitude', 'longitude', 'location_address',
            'quote', 'order_items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'order_items', 'balance']
    
    def get_balance(self, obj):
        return float(obj.get_balance())


class OrderDetailSerializer(OrderSerializer):
    """Extended Order serializer with additional details"""
    pass


class QuoteItemSerializer(serializers.ModelSerializer):
    """Serialize Quote Items"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    
    class Meta:
        model = QuoteItem
        fields = [
            'id', 'quote', 'product', 'product_name', 'product_image',
            'quantity', 'unit_price', 'variance', 'line_total'
        ]
        read_only_fields = ['id', 'line_total']
    
    def get_product_image(self, obj):
        request = self.context.get('request')
        if obj.product.image and request:
            return request.build_absolute_uri(obj.product.image.url)
        return None


class QuoteSerializer(serializers.ModelSerializer):
    """Serialize Quotes with items"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    sales_person_name = serializers.CharField(source='sales_person.get_full_name', read_only=True)
    quote_items = QuoteItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Quote
        fields = [
            'id', 'customer', 'customer_name', 'sales_person', 'sales_person_name',
            'quote_date', 'expiry_date', 'status', 'total_amount', 'notes',
            'customer_category', 'vat_variation', 'quote_items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'quote_items']


class DealSerializer(serializers.ModelSerializer):
    """Serialize Deals"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = Deal
        fields = [
            'id', 'customer', 'customer_name', 'product', 'product_name',
            'quantity', 'deal_price', 'original_quantity', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    """Serialize Payments"""
    order_id = serializers.IntegerField(write_only=True, required=False)
    order_number = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'order_id', 'order_number', 'amount', 'payment_method',
            'payment_date', 'reference_number', 'notes', 'recorded_by', 'created_at'
        ]
        read_only_fields = ['id', 'order', 'recorded_by', 'created_at']
    
    def get_order_number(self, obj):
        return f"#{obj.order.id}" if obj.order else None
    
    def create(self, validated_data):
        order_id = validated_data.pop('order_id', None)
        if order_id:
            validated_data['order_id'] = order_id
        return super().create(validated_data)


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serialize Activity Logs"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_name', 'action', 'description',
            'timestamp', 'ip_address', 'user_agent'
        ]
        read_only_fields = ['id', 'timestamp']


class LoginSessionSerializer(serializers.ModelSerializer):
    """Serialize Login Sessions"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = LoginSession
        fields = [
            'id', 'user', 'user_name', 'login_time', 'logout_time',
            'device_info', 'latitude', 'longitude', 'login_photo',
            'ip_address'
        ]
        read_only_fields = ['id', 'login_time', 'logout_time']


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serialize Chat Messages"""
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'user', 'message', 'response', 'is_from_bot',
            'timestamp', 'session_id'
        ]
        read_only_fields = ['id', 'timestamp', 'response']


class ChatBotKnowledgeSerializer(serializers.ModelSerializer):
    """Serialize Chatbot Knowledge Base"""
    class Meta:
        model = ChatbotKnowledge
        fields = [
            'id', 'question', 'answer', 'category', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserAuthSerializer(serializers.Serializer):
    """Serializer for user authentication"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    token = serializers.CharField(read_only=True)
    user = UserProfileSerializer(read_only=True)


class ProductPriceSerializer(serializers.Serializer):
    """Serializer to get product prices by customer category"""
    product_id = serializers.IntegerField()
    customer_category = serializers.CharField()
    quantity = serializers.IntegerField(default=1)
    customer_id = serializers.IntegerField(required=False)


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for comprehensive dashboard statistics"""
    # Customer metrics
    total_customers = serializers.IntegerField()
    customers_this_month = serializers.IntegerField()
    customer_percentage_change = serializers.FloatField()
    
    # Revenue metrics
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    revenue_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)
    revenue_percentage_change = serializers.FloatField()
    pending_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    # Order metrics
    orders_today = serializers.IntegerField()
    orders_percentage_change = serializers.FloatField()
    total_orders = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    
    # Deals
    total_deals = serializers.IntegerField()
    deals_percentage_change = serializers.FloatField()
    
    # Products
    total_products = serializers.IntegerField()
    low_stock_alerts = serializers.IntegerField()
    
    # Recent orders
    recent_orders = OrderDetailSerializer(many=True, read_only=True)
    
    # Top products
    top_products = serializers.ListField(child=serializers.DictField())


# ==================== Stock Management Serializers ====================

class StockMovementSerializer(serializers.ModelSerializer):
    """Serialize stock movements"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'store', 'movement_type', 'quantity',
            'previous_stock', 'new_stock', 'order', 'transfer', 'reference_number',
            'notes', 'recorded_by', 'recorded_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'previous_stock', 'new_stock']


class StockTransferItemSerializer(serializers.ModelSerializer):
    """Serialize stock transfer items"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = StockTransferItem
        fields = [
            'id', 'transfer', 'product', 'product_name', 'quantity_transferred'
        ]
        read_only_fields = ['id']


class StockTransferSerializer(serializers.ModelSerializer):
    """Serialize stock transfers"""
    items = StockTransferItemSerializer(source='stock_transfer_items', many=True, read_only=True)
    
    class Meta:
        model = StockTransfer
        fields = [
            'id', 'from_store', 'to_store', 'status', 'transfer_date', 'completed_date',
            'notes', 'created_by', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StockAdjustmentSerializer(serializers.ModelSerializer):
    """Serialize stock adjustments"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    adjusted_by_name = serializers.CharField(source='adjusted_by.get_full_name', read_only=True)
    
    class Meta:
        model = StockAdjustment
        fields = [
            'id', 'product', 'product_name', 'store', 'adjustment_quantity',
            'previous_quantity', 'new_quantity', 'reason', 'notes',
            'adjusted_by', 'adjusted_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'previous_quantity', 'new_quantity']


class StockAlertSerializer(serializers.ModelSerializer):
    """Serialize stock alerts"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = StockAlert
        fields = [
            'id', 'product', 'product_name', 'store', 'alert_type',
            'threshold', 'current_stock', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# ==================== Purchase Order Serializers ====================

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Serialize purchase order items"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'purchase_order', 'product', 'product_name', 'quantity',
            'unit_price', 'line_total'
        ]
        read_only_fields = ['id', 'line_total']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """Serialize purchase orders"""
    supplier_name = serializers.CharField(source='supplier', read_only=True)
    items = PurchaseOrderItemSerializer(source='purchase_order_items', many=True, read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'supplier', 'supplier_name', 'po_number', 'po_date', 'delivery_date',
            'status', 'total_amount', 'notes', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ==================== Deal Serializer ====================

class DealSerializer(serializers.ModelSerializer):
    """Serialize Deals"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = Deal
        fields = [
            'id', 'customer', 'customer_name', 'product', 'product_name',
            'quantity', 'deal_price', 'original_quantity', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# ==================== Customer Feedback Serializer ====================

class CustomerFeedbackSerializer(serializers.ModelSerializer):
    """Serialize customer feedback"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    salesperson_name = serializers.CharField(source='salesperson.get_full_name', read_only=True)
    photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerFeedback
        fields = [
            'id', 'customer', 'customer_name', 'salesperson', 'salesperson_name',
            'shop_name', 'contact_person', 'exact_location', 'phone_number',
            'feedback_type', 'rating', 'comment', 'photo', 'photo_url',
            'latitude', 'longitude', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return None


# ==================== Internal Messaging Serializers ====================

class InternalMessageSerializer(serializers.ModelSerializer):
    """Serialize internal messages"""
    sender_name = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    
    class Meta:
        model = InternalMessage
        fields = [
            'id', 'sender', 'sender_name', 'recipient', 'recipient_name',
            'message', 'message_type', 'attach_type', 'is_read',
            'feedback', 'attachment', 'attachment_name',
            'latitude', 'longitude', 'location_label',
            'contact_name', 'contact_phone', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'sender_name', 'recipient_name']
    
    def get_sender_name(self, obj):
        """Safely handle None sender (for system messages)"""
        if obj.sender:
            return obj.sender.get_full_name()
        return None
    
    def get_recipient_name(self, obj):
        """Safely handle None recipient (for broadcast messages)"""
        if obj.recipient:
            return obj.recipient.get_full_name()
        return None


# ==================== Notification Serializer ====================

class NotificationSerializer(serializers.ModelSerializer):
    """Serialize notifications"""
    icon = serializers.CharField(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'event_type', 'title', 'body', 'url',
            'is_read', 'icon', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'icon']


# ==================== Payment Serializers ====================

class MPesaTransactionSerializer(serializers.ModelSerializer):
    """Serialize M-Pesa transactions"""
    order_id = serializers.IntegerField(read_only=True)
    initiated_by_name = serializers.CharField(source='initiated_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = MPesaTransaction
        fields = [
            'id', 'order', 'order_id', 'amount', 'phone_number',
            'checkout_request_id', 'merchant_request_id', 'mpesa_receipt_number',
            'status', 'result_code', 'result_description',
            'initiated_by', 'initiated_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'checkout_request_id']


class BuniTransactionSerializer(serializers.ModelSerializer):
    """Serialize Buni transactions"""
    order_id = serializers.IntegerField(read_only=True)
    initiated_by_name = serializers.CharField(source='initiated_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = BuniTransaction
        fields = [
            'id', 'order', 'order_id', 'amount', 'phone_number',
            'transaction_id', 'payment_url', 'status', 'result_code',
            'result_description', 'initiated_by', 'initiated_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'transaction_id', 'payment_url']


# ==================== Beat/Territory Serializers ====================

class BeatPlanSerializer(serializers.ModelSerializer):
    """Serialize beat plans"""
    salesperson_name = serializers.CharField(source='salesperson.get_full_name', read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    
    class Meta:
        model = BeatPlan
        fields = [
            'id', 'salesperson', 'salesperson_name', 'customer', 'customer_name',
            'day_of_week', 'notes', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class BeatVisitSerializer(serializers.ModelSerializer):
    """Serialize beat visits"""
    salesperson_name = serializers.CharField(source='salesperson.get_full_name', read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    plan_day = serializers.CharField(source='plan.day_of_week', read_only=True, allow_null=True)
    
    class Meta:
        model = BeatVisit
        fields = [
            'id', 'plan', 'plan_day', 'salesperson', 'salesperson_name',
            'customer', 'customer_name', 'order', 'visit_date', 'outcome',
            'notes', 'latitude', 'longitude', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# ==================== Password Reset Serializer ====================

class PasswordResetSerializer(serializers.ModelSerializer):
    """Serialize password reset tokens"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = passwordreset
        fields = [
            'id', 'user', 'user_email', 'reset_id', 'created_when', 'is_expired'
        ]
        read_only_fields = ['id', 'reset_id', 'created_when']
    
    def get_is_expired(self, obj):
        return obj.is_expired()


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    reset_id = serializers.UUIDField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    completed_orders = serializers.IntegerField()
    total_customers = serializers.IntegerField()
    total_products = serializers.IntegerField()
