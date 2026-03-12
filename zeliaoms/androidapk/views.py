"""
API Views and ViewSets for Android App
Provides REST API endpoints for mobile application
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q, Sum, Count
from django.utils import timezone
from decimal import Decimal

from store.models import (
    UserProfile, Category, Customer, Product, Order, 
    OrderItem, Quote, QuoteItem, Deal, Payment, 
    ActivityLog, LoginSession, ChatbotKnowledge, ChatMessage,
    StockMovement, StockTransfer, StockTransferItem, StockAdjustment, StockAlert,
    PurchaseOrder, PurchaseOrderItem, CustomerFeedback, InternalMessage, 
    Notification, MPesaTransaction, BuniTransaction, BeatPlan, BeatVisit
)
from administration.models import passwordreset

from .serializers import (
    UserSerializer, UserProfileSerializer, CategorySerializer,
    ProductSerializer, ProductListSerializer, CustomerSerializer,
    OrderSerializer, OrderDetailSerializer, OrderItemSerializer,
    QuoteSerializer, QuoteItemSerializer, DealSerializer,
    PaymentSerializer, ActivityLogSerializer, LoginSessionSerializer,
    ChatMessageSerializer, ChatBotKnowledgeSerializer,
    UserAuthSerializer, ProductPriceSerializer, DashboardStatsSerializer,
    StockMovementSerializer, StockTransferSerializer, StockTransferItemSerializer,
    StockAdjustmentSerializer, StockAlertSerializer, PurchaseOrderSerializer,
    PurchaseOrderItemSerializer, CustomerFeedbackSerializer, InternalMessageSerializer,
    NotificationSerializer, MPesaTransactionSerializer, BuniTransactionSerializer,
    BeatPlanSerializer, BeatVisitSerializer, PasswordResetSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)


# ==================== Authentication ====================

class LoginView(viewsets.ViewSet):
    """Handle user login and token generation"""
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def post(self, request):
        """Authenticate user and return token"""
        serializer = UserAuthSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        username = serializer.validated_data.get('username')
        password = serializer.validated_data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if not user:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            token, _ = Token.objects.get_or_create(user=user)
            
            # Ensure UserProfile exists - create if missing
            try:
                user_profile = UserProfile.objects.get(user=user)
            except UserProfile.DoesNotExist:
                # Auto-create profile if it doesn't exist
                from django.contrib.auth.models import Group
                if user.is_superuser:
                    user_profile = UserProfile.objects.create(user=user, department='Executive')
                    admin_group, _ = Group.objects.get_or_create(name='Admins')
                    user.groups.add(admin_group)
                else:
                    user_profile = UserProfile.objects.create(user=user, department='Sales')
                    sales_group, _ = Group.objects.get_or_create(name='Salespersons')
                    user.groups.add(sales_group)
            
            return Response({
                'token': token.key,
                'user': UserProfileSerializer(user_profile).data,
                'message': 'Login successful'
            })
        except Exception as e:
            return Response(
                {'error': f'Login failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LogoutView(viewsets.ViewSet):
    """Handle user logout"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]
    
    @action(detail=False, methods=['post'])
    def post(self, request):
        """Delete user token on logout"""
        Token.objects.filter(user=request.user).delete()
        return Response({'message': 'Logout successful'})


# ==================== User Management ====================

class UserProfileViewSet(viewsets.ModelViewSet):
    """ViewSet for User Profiles"""
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile"""
        try:
            profile = UserProfile.objects.get(user=request.user)
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['put'])
    def update_profile(self, request):
        """Update current user's profile"""
        try:
            profile = UserProfile.objects.get(user=request.user)
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# ==================== Product Management ====================

class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for Product Categories"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return all categories"""
        return Category.objects.all().order_by('name')


# ==================== Custom Pagination ====================

class MobileAppPagination(PageNumberPagination):
    """Custom pagination for mobile app - 15 items per page"""
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


# ==================== Product Management ====================

class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet for Products"""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = MobileAppPagination
    filterset_fields = ['category', 'status']
    search_fields = ['name', 'description', 'barcode']
    ordering_fields = ['name', 'created_at', 'retail_price']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Use lighter serializer for list view"""
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get products grouped by category"""
        category_id = request.query_params.get('category_id')
        if category_id:
            products = Product.objects.filter(category_id=category_id)
        else:
            products = Product.objects.all()
        
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def price_by_category(self, request, pk=None):
        """Get product price based on customer category with VAT options"""
        try:
            from decimal import Decimal
            product = self.get_object()
            category = request.query_params.get('category', 'wholesale')
            vat_variation = request.query_params.get('vat_variation', 'with_vat')
            
            VAT_RATE = Decimal('0.16')
            base_price = product.get_price_by_category(category)
            
            # Handle None or Decimal prices
            if base_price is None:
                base_price = Decimal('0')
            else:
                base_price = Decimal(str(base_price))
            
            price_with_vat = base_price * (1 + VAT_RATE) if base_price else 0
            price_without_vat = base_price
            
            return Response({
                'product_id': product.id,
                'product_name': product.name,
                'customer_category': category,
                'price_without_vat': float(price_without_vat),
                'price_with_vat': float(price_with_vat),
                'vat_variation': vat_variation,
                'selected_price': float(price_with_vat) if vat_variation == 'with_vat' else float(price_without_vat),
                'stock': {
                    'mcdave': product.mcdave_stock,
                    'kisii': product.kisii_stock,
                    'offshore': product.offshore_stock,
                    'total': product.mcdave_stock + product.kisii_stock + product.offshore_stock
                }
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to calculate price: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get products with low stock"""
        threshold = int(request.query_params.get('threshold', 10))
        products = Product.objects.filter(
            Q(mcdave_stock__lt=threshold) |
            Q(kisii_stock__lt=threshold) |
            Q(offshore_stock__lt=threshold)
        )
        
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)


# ==================== Customer Management ====================

class CustomerViewSet(viewsets.ModelViewSet):
    """ViewSet for Customers"""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = MobileAppPagination
    filterset_fields = ['default_category', 'sales_person']
    search_fields = ['first_name', 'last_name', 'phone_number', 'email']
    ordering_fields = ['first_name', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter customers by salesperson if not admin"""
        user = self.request.user
        if user.is_superuser or user.groups.filter(name='Admins').exists():
            return Customer.objects.all()
        # Salespersons can see their own customers + admin-created customers (sales_person is null)
        return Customer.objects.filter(Q(sales_person=user) | Q(sales_person__isnull=True))
    
    def create(self, request, *args, **kwargs):
        """Create a new customer"""
        try:
            # If admin, they can assign to any salesperson or leave unassigned
            # If salesperson, they can only create for themselves
            user = request.user
            is_admin = user.is_superuser or user.groups.filter(name='Admins').exists()
            
            data = request.data.copy()
            
            # If salesperson and no sales_person specified, assign to themselves
            if not is_admin and not data.get('sales_person'):
                data['sales_person'] = user.id
            
            serializer = self.get_serializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': f'Customer creation failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get customers grouped by category"""
        category = request.query_params.get('category')
        queryset = self.get_queryset()
        
        if category:
            queryset = queryset.filter(default_category=category)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def orders(self, request, pk=None):
        """Get customer's orders"""
        customer = self.get_object()
        orders = customer.orders.all().order_by('-created_at')
        
        serializer = OrderSerializer(orders, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def quotes(self, request, pk=None):
        """Get customer's quotes"""
        customer = self.get_object()
        quotes = customer.quotes.all().order_by('-created_at')
        
        serializer = QuoteSerializer(quotes, many=True, context={'request': request})
        return Response(serializer.data)


# ==================== Order Management ====================

class OrderItemViewSet(viewsets.ModelViewSet):
    """ViewSet for Order Items"""
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        order_id = self.request.query_params.get('order_id')
        if order_id:
            return OrderItem.objects.filter(order_id=order_id)
        return OrderItem.objects.all()


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet for Orders"""
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = MobileAppPagination
    filterset_fields = ['customer', 'delivery_status', 'paid_status', 'store']
    search_fields = ['id', 'customer__first_name', 'customer__phone_number']
    ordering_fields = ['order_date', 'created_at', 'total_amount']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.groups.filter(name='Admins').exists():
            return Order.objects.all().prefetch_related('order_items')
        return Order.objects.filter(sales_person=user).prefetch_related('order_items')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OrderDetailSerializer
        return OrderSerializer
    
    @action(detail=False, methods=['post'])
    def create_order(self, request):
        """Create new order with items"""
        order_data = request.data
        
        try:
            # Get customer to validate it exists and user has access
            customer_id = order_data.get('customer_id')
            if not customer_id:
                return Response(
                    {'error': 'customer_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            customer = Customer.objects.get(id=customer_id)
            
            # Validate stock availability BEFORE creating order
            store = order_data.get('store', 'mcdave').lower()
            stock_field = f'{store}_stock'
            
            for item in order_data.get('items', []):
                product = Product.objects.get(id=item['product_id'])
                quantity_ordered = item.get('quantity', 1)
                current_stock = getattr(product, stock_field, 0)
                
                if current_stock < quantity_ordered:
                    return Response(
                        {'error': f'Insufficient stock: {product.name} has {current_stock} units available, but {quantity_ordered} requested'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Check permissions - salesperson can only order for their own customers or admin customers
            user = request.user
            is_admin = user.is_superuser or user.groups.filter(name='Admins').exists()
            if not is_admin and customer.sales_person and customer.sales_person.id != user.id:
                return Response(
                    {'error': 'You do not have permission to create orders for this customer'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            customer_category = order_data.get('customer_category', customer.default_category or 'wholesale')
            vat_variation = order_data.get('vat_variation', 'with_vat')
            
            order = Order.objects.create(
                customer_id=customer_id,
                sales_person=request.user,
                customer_category=customer_category,
                vat_variation=vat_variation,
                address=order_data.get('address', customer.address or ''),
                phone=order_data.get('phone', customer.phone_number or ''),
                store=order_data.get('store', 'mcdave'),
                delivery_fee=Decimal(str(order_data.get('delivery_fee', 0)))
            )
            
            # Add order items with proper price selection
            from decimal import Decimal as D
            VAT_RATE = D('0.16')
            
            for item in order_data.get('items', []):
                product = Product.objects.get(id=item['product_id'])
                
                # Get price based on customer category
                base_price = product.get_price_by_category(customer_category)
                
                # Apply VAT if needed
                if vat_variation == 'with_vat':
                    unit_price = base_price * (1 + VAT_RATE)
                else:
                    unit_price = base_price
                
                # Use provided unit_price if explicitly given, otherwise use calculated
                if 'unit_price' in item and item['unit_price']:
                    unit_price = Decimal(str(item['unit_price']))
                else:
                    unit_price = Decimal(str(unit_price))
                
                quantity_ordered = item.get('quantity', 1)
                
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=quantity_ordered,
                    unit_price=unit_price,
                    variance=Decimal(str(item.get('variance', 0)))
                )
                
                # Decrement stock based on store location
                if hasattr(product, stock_field):
                    # Get current stock
                    current_stock = getattr(product, stock_field, 0)
                    new_stock = max(0, current_stock - quantity_ordered)
                    
                    # Update product stock
                    setattr(product, stock_field, new_stock)
                    product.save()
                    
                    # Create stock movement record for audit trail
                    from store.models import StockMovement
                    try:
                        StockMovement.objects.create(
                            product=product,
                            store=store,
                            movement_type='out',
                            quantity=-quantity_ordered,  # Negative for outgoing stock
                            previous_stock=current_stock,
                            new_stock=new_stock,
                            order=order,
                            reference_number=f"ORD-{order.id}",
                            notes=f"Order item stock deduction",
                            recorded_by=request.user
                        )
                    except Exception as e:
                        # Log error but continue - stock is already decremented
                        print(f"StockMovement creation error: {e}")
            
            order.calculate_total()
            
            # Create notifications for admins and the salesperson about new order
            admin_users = User.objects.filter(
                Q(is_superuser=True) | Q(groups__name='Admins')
            ).distinct()
            
            customer_name = order.customer.get_full_name() if hasattr(order.customer, 'get_full_name') else str(order.customer)
            
            # Get list of users to notify (admins + salesperson)
            users_to_notify = list(admin_users) + [request.user]
            # Remove duplicates if user is both admin and salesperson
            users_to_notify = list(set(users_to_notify))
            
            for user in users_to_notify:
                Notification.objects.create(
                    user=user,
                    event_type='order_created',
                    title=f'New Order #{order.id}',
                    body=f'Order from {customer_name} - KSh {order.total_amount:.2f}',
                    url=f'/orders/{order.id}/'
                )
            
            # Refresh order to ensure all calculated fields are current
            order.refresh_from_db()
            serializer = OrderDetailSerializer(order, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Customer.DoesNotExist:
            return Response(
                {'error': f'Customer not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Product.DoesNotExist as e:
            return Response(
                {'error': f'Product not found: {str(e)}'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Order creation failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, pk=None):
        """Delete an order"""
        try:
            order = self.get_object()
            order_id = order.id
            order_number = getattr(order, 'order_number', f'#{order_id}')
            order.delete()
            return Response(
                {'message': f'Order {order_number} deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to delete order: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post', 'put', 'patch'])
    def update_status(self, request, pk=None):
        """Update order delivery or payment status"""
        try:
            order = self.get_object()
            
            delivery_status = request.data.get('delivery_status')
            paid_status = request.data.get('paid_status')
            
            # Status mapping for frontend compatibility
            delivery_status_map = {
                'pending': 'pending',
                'in_transit': 'completed',
                'processing': 'completed',
                'shipped': 'completed',
                'delivered': 'completed',
                'completed': 'completed',
                'cancelled': 'cancelled',
                'returned': 'returned'
            }
            
            paid_status_map = {
                'pending': 'pending',
                'unpaid': 'pending',
                'partial': 'partially_paid',
                'partially_paid': 'partially_paid',
                'paid': 'completed',
                'completed': 'completed'
            }
            
            if delivery_status:
                mapped_status = delivery_status_map.get(delivery_status, delivery_status)
                valid_statuses = ['pending', 'completed', 'cancelled', 'returned']
                if mapped_status not in valid_statuses:
                    return Response(
                        {'error': f'Invalid delivery_status: {delivery_status}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                order.delivery_status = mapped_status
            
            if paid_status:
                mapped_status = paid_status_map.get(paid_status, paid_status)
                valid_statuses = ['pending', 'partially_paid', 'completed']
                if mapped_status not in valid_statuses:
                    return Response(
                        {'error': f'Invalid paid_status: {paid_status}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                order.paid_status = mapped_status
            
            order.save()
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Failed to update order status: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """Get order items"""
        order = self.get_object()
        items = order.order_items.all()
        serializer = OrderItemSerializer(items, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def download_receipt(self, request, pk=None):
        """Download order receipt as PDF"""
        try:
            from store.receipt_generator import generate_receipt_pdf
            from django.http import FileResponse
            
            order = self.get_object()
            pdf_buffer = generate_receipt_pdf(order)
            
            filename = f"Receipt-ORD-{order.id}.pdf"
            
            # Return PDF as downloadable file
            return FileResponse(
                pdf_buffer,
                as_attachment=True,
                filename=filename,
                content_type='application/pdf'
            )
        except Exception as e:
            return Response(
                {'error': f'Receipt generation failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get comprehensive dashboard statistics"""
        from datetime import timedelta
        
        user = request.user
        
        # Determine if user is admin
        is_admin = user.is_superuser or user.groups.filter(name='Admins').exists()
        
        # Set up queries based on user role
        if is_admin:
            orders = Order.objects.all()
            customers = Customer.objects.all()
        else:
            orders = Order.objects.filter(sales_person=user)
            customers = Customer.objects.filter(sales_person=user)
        
        # Date calculations
        today = timezone.now().date()
        this_month_start = today.replace(day=1)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
        last_month_end = this_month_start - timedelta(days=1)
        start_of_day = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
        end_of_day = start_of_day + timedelta(days=1)
        
        # Customer Metrics
        total_customers = customers.count()
        customers_this_month = customers.filter(created_at__gte=this_month_start).count()
        customers_last_month = customers.filter(
            created_at__gte=last_month_start, created_at__lte=last_month_end
        ).count()
        customer_percentage_change = (
            ((customers_this_month - customers_last_month) / customers_last_month * 100)
            if customers_last_month > 0 else 0
        )
        
        # Revenue Metrics
        total_revenue = orders.filter(paid_status='completed').aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0.00')
        
        revenue_this_month = orders.filter(
            order_date__gte=this_month_start, paid_status='completed'
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        
        revenue_last_month = orders.filter(
            order_date__gte=last_month_start, order_date__lte=last_month_end, 
            paid_status='completed'
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        
        revenue_percentage_change = (
            ((revenue_this_month - revenue_last_month) / revenue_last_month * 100)
            if revenue_last_month > 0 else 0
        )
        
        pending_revenue = orders.filter(
            order_date__gte=this_month_start, paid_status='pending'
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        
        # Order Metrics
        orders_today = orders.filter(
            order_date__gte=start_of_day, order_date__lt=end_of_day
        ).count()
        
        orders_yesterday = orders.filter(
            order_date__date=today - timedelta(days=1)
        ).count()
        
        orders_percentage_change = (
            ((orders_today - orders_yesterday) / orders_yesterday * 100)
            if orders_yesterday > 0 else 0
        )
        
        # Deals/Completed Orders
        total_deals = orders.filter(paid_status='completed').count()
        deals_this_month = orders.filter(
            order_date__gte=this_month_start, paid_status='completed'
        ).count()
        deals_last_month = orders.filter(
            order_date__gte=last_month_start, order_date__lte=last_month_end, 
            paid_status='completed'
        ).count()
        deals_percentage_change = (
            ((deals_this_month - deals_last_month) / deals_last_month * 100)
            if deals_last_month > 0 else 0
        )
        
        # Recent Orders
        recent_orders = orders.select_related('customer').prefetch_related(
            'order_items__product'
        ).order_by('-order_date')[:5]
        
        # Top Products
        total_units_sold = OrderItem.objects.filter(
            order__order_date__gte=this_month_start,
            order__in=orders
        ).aggregate(total=Sum('quantity'))['total'] or 1
        
        top_products = OrderItem.objects.filter(
            order__order_date__gte=this_month_start,
            order__in=orders
        ).values('product__name').annotate(
            total_units=Sum('quantity')
        ).order_by('-total_units')[:5]
        
        top_products_list = [
            {
                'product__name': item['product__name'],
                'total_units': item['total_units'],
                'percent': (item['total_units'] / total_units_sold * 100) if total_units_sold > 0 else 0
            }
            for item in top_products
        ]
        
        # Products Overview
        total_products = Product.objects.count()
        low_stock_alerts = Product.objects.filter(
            Q(mcdave_stock__lt=50) | Q(kisii_stock__lt=50) | Q(offshore_stock__lt=50)
        ).count()
        
        stats = {
            'total_customers': total_customers,
            'customers_this_month': customers_this_month,
            'customer_percentage_change': customer_percentage_change,
            'total_revenue': str(total_revenue),
            'revenue_this_month': str(revenue_this_month),
            'revenue_percentage_change': revenue_percentage_change,
            'pending_revenue': str(pending_revenue),
            'orders_today': orders_today,
            'orders_percentage_change': orders_percentage_change,
            'total_orders': orders.count(),
            'pending_orders': orders.filter(paid_status='pending').count(),
            'completed_orders': orders.filter(paid_status='completed').count(),
            'total_deals': total_deals,
            'deals_percentage_change': deals_percentage_change,
            'total_products': total_products,
            'low_stock_alerts': low_stock_alerts,
            'recent_orders': OrderDetailSerializer(recent_orders, many=True).data,
            'top_products': top_products_list,
        }
        
        return Response(stats)


# ==================== Quote Management ====================

class QuoteItemViewSet(viewsets.ModelViewSet):
    """ViewSet for Quote Items"""
    queryset = QuoteItem.objects.all()
    serializer_class = QuoteItemSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]


class QuoteViewSet(viewsets.ModelViewSet):
    """ViewSet for Quotes"""
    queryset = Quote.objects.all()
    serializer_class = QuoteSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['customer', 'status']
    search_fields = ['customer__first_name', 'id']
    ordering_fields = ['quote_date', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.groups.filter(name='Admins').exists():
            return Quote.objects.all().prefetch_related('quote_items')
        return Quote.objects.filter(sales_person=user).prefetch_related('quote_items')
    
    @action(detail=False, methods=['post'])
    def create_quote(self, request):
        """Create new quote with items"""
        quote_data = request.data
        
        try:
            quote = Quote.objects.create(
                customer_id=quote_data['customer_id'],
                sales_person=request.user,
                customer_category=quote_data.get('customer_category', 'wholesale'),
                vat_variation=quote_data.get('vat_variation', 'with_vat'),
                notes=quote_data.get('notes', '')
            )
            
            # Add quote items
            for item in quote_data.get('items', []):
                product = Product.objects.get(id=item['product_id'])
                QuoteItem.objects.create(
                    quote=quote,
                    product=product,
                    quantity=item['quantity'],
                    unit_price=Decimal(str(item.get('unit_price', product.wholesale_price))),
                    variance=Decimal(str(item.get('variance', 0)))
                )
            
            serializer = QuoteSerializer(quote, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def convert_to_order(self, request, pk=None):
        """Convert approved quote to order"""
        quote = self.get_object()
        
        if quote.status != 'approved':
            return Response(
                {'error': 'Quote must be approved before converting'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = quote.convert_to_order()
            serializer = OrderDetailSerializer(order, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['put'])
    def update_status(self, request, pk=None):
        """Update quote status"""
        quote = self.get_object()
        status_update = request.data.get('status')
        
        if status_update:
            quote.status = status_update
            quote.save()
        
        serializer = self.get_serializer(quote)
        return Response(serializer.data)


# ==================== Payment Management ====================

class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for Payments"""
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def add_payment(self, request):
        """Add payment to order"""
        try:
            order_id = request.data.get('order_id')
            if not order_id:
                return Response(
                    {'error': 'order_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify order exists
            from store.models import Order
            try:
                order = Order.objects.get(id=order_id)
            except Order.DoesNotExist:
                return Response(
                    {'error': f'Order {order_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            payment = Payment.objects.create(
                order=order,
                amount=Decimal(str(request.data.get('amount', 0))),
                payment_method=request.data.get('payment_method', 'cash'),
                payment_date=request.data.get('payment_date') or timezone.now(),
                reference_number=request.data.get('reference_number', ''),
                notes=request.data.get('notes', ''),
                recorded_by=request.user
            )
            
            # Update order payment tracking with proper Decimal handling
            # Ensure both values are Decimal for accurate comparison
            new_amount_paid = Decimal(str(order.amount_paid)) + payment.amount
            order.amount_paid = new_amount_paid
            order.update_paid_status()  # This will save the order with updated status
            
            # Create payment notification
            admin_users = User.objects.filter(
                Q(is_superuser=True) | Q(groups__name='Admins')
            ).distinct()
            
            for admin in admin_users:
                Notification.objects.create(
                    user=admin,
                    event_type='payment_new',
                    title=f'Payment Recorded - Order #{order.id}',
                    body=f'KSh {payment.amount:.2f} received',
                    url=f'/orders/{order.id}/'
                )
            
            # Return payment with updated order data in response
            payment_serializer = self.get_serializer(payment)
            response_data = {
                'payment': payment_serializer.data,
                'order_update': {
                    'id': order.id,
                    'paid_status': order.paid_status,
                    'amount_paid': float(order.amount_paid),
                    'total_amount': float(order.total_amount)
                }
            }
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def list(self, request, *args, **kwargs):
        """List payments - supports both 'order' and 'order_id' parameters"""
        try:
            # Accept both 'order' and 'order_id' query parameters
            order_id = request.query_params.get('order_id') or request.query_params.get('order')
            
            if order_id:
                try:
                    order_id = int(order_id)
                    queryset = self.queryset.filter(order_id=order_id)
                    serializer = self.get_serializer(queryset, many=True)
                    return Response(serializer.data)
                except ValueError:
                    return Response(
                        {'error': 'Invalid order_id parameter'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # If no order filter, return all payments
            return super().list(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def by_order(self, request):
        """Get payments for specific order"""
        order_id = request.query_params.get('order_id') or request.query_params.get('order')
        if order_id:
            try:
                payments = Payment.objects.filter(order_id=int(order_id))
                serializer = self.get_serializer(payments, many=True)
                return Response(serializer.data)
            except ValueError:
                return Response(
                    {'error': 'Invalid order_id parameter'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(
            {'error': 'order_id parameter required'},
            status=status.HTTP_400_BAD_REQUEST
        )


# ==================== Activity Logging ====================

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Activity Logs (Read-only)"""
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['user', 'action']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.groups.filter(name='Admins').exists():
            return ActivityLog.objects.all()
        return ActivityLog.objects.filter(user=user)


# ==================== Chat & Support ====================

class ChatbotKnowledgeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Chatbot Knowledge Base"""
    queryset = ChatbotKnowledge.objects.all()
    serializer_class = ChatBotKnowledgeSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    search_fields = ['question', 'answer', 'category']
    filtering_fields = ['category']


# ==================== Stock Management ====================

class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Stock Movements (Audit Trail)"""
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = MobileAppPagination
    filterset_fields = ['product', 'store', 'movement_type']
    search_fields = ['product__name', 'reference_number']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'])
    def by_product(self, request):
        """Get stock movements for specific product"""
        product_id = request.query_params.get('product_id')
        if product_id:
            movements = StockMovement.objects.filter(product_id=product_id).order_by('-created_at')
            serializer = self.get_serializer(movements, many=True)
            return Response(serializer.data)
        return Response({'error': 'product_id required'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def by_store(self, request):
        """Get stock movements for specific store"""
        store = request.query_params.get('store')
        if store:
            movements = StockMovement.objects.filter(store=store).order_by('-created_at')
            serializer = self.get_serializer(movements, many=True)
            return Response(serializer.data)
        return Response({'error': 'store parameter required'}, status=status.HTTP_400_BAD_REQUEST)


class StockTransferItemViewSet(viewsets.ModelViewSet):
    """ViewSet for Stock Transfer Items"""
    queryset = StockTransferItem.objects.all()
    serializer_class = StockTransferItemSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]


class StockTransferViewSet(viewsets.ModelViewSet):
    """ViewSet for Stock Transfers between stores"""
    queryset = StockTransfer.objects.all()
    serializer_class = StockTransferSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['from_store', 'to_store', 'status']
    search_fields = ['reference_number', 'from_store', 'to_store']
    ordering_fields = ['transfer_date', 'created_at']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['post'])
    def initiate_transfer(self, request):
        """Initiate new stock transfer"""
        try:
            transfer = StockTransfer.objects.create(
                from_store=request.data['from_store'],
                to_store=request.data['to_store'],
                initiated_by=request.user,
                notes=request.data.get('notes', '')
            )
            
            # Add items to transfer
            for item in request.data.get('items', []):
                StockTransferItem.objects.create(
                    transfer=transfer,
                    product_id=item['product_id'],
                    quantity=item['quantity']
                )
            
            serializer = self.get_serializer(transfer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def confirm_receipt(self, request, pk=None):
        """Confirm transfer receipt"""
        transfer = self.get_object()
        
        if transfer.status != 'in_transit':
            return Response(
                {'error': 'Transfer must be in transit to confirm receipt'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        transfer.status = 'completed'
        transfer.received_by = request.user
        transfer.received_date = timezone.now()
        transfer.save()
        
        serializer = self.get_serializer(transfer)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending transfers for current user's store"""
        store = request.query_params.get('store')
        if store:
            transfers = StockTransfer.objects.filter(to_store=store, status='in_transit')
            serializer = self.get_serializer(transfers, many=True)
            return Response(serializer.data)
        return Response({'error': 'store parameter required'}, status=status.HTTP_400_BAD_REQUEST)


class StockAdjustmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Stock Adjustments"""
    queryset = StockAdjustment.objects.all()
    serializer_class = StockAdjustmentSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['product', 'store', 'adjustment_type']
    search_fields = ['product__name', 'reason']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['post'])
    def adjust_stock(self, request):
        """Create stock adjustment"""
        try:
            product_id = request.data.get('product_id')
            store = request.data.get('store')
            new_quantity = request.data.get('new_quantity')
            reason = request.data.get('reason', 'other')
            notes = request.data.get('notes', '')
            
            if not product_id or not store or new_quantity is None:
                return Response(
                    {'error': 'product_id, store, and new_quantity are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            product = Product.objects.get(id=product_id)
            
            # Get current stock
            stock_field = f'{store}_stock'
            previous_quantity = getattr(product, stock_field, 0)
            adjustment_quantity = int(new_quantity) - int(previous_quantity)
            
            # Create adjustment record
            adjustment = StockAdjustment.objects.create(
                product=product,
                store=store,
                previous_quantity=previous_quantity,
                new_quantity=int(new_quantity),
                adjustment_quantity=adjustment_quantity,
                reason=reason,
                notes=notes,
                adjusted_by=request.user
            )
            
            # Update product stock
            setattr(product, stock_field, int(new_quantity))
            product.save()
            
            # Create stock movement record
            StockMovement.objects.create(
                product=product,
                store=store,
                movement_type='adjustment',
                quantity=abs(adjustment_quantity),
                previous_stock=previous_quantity,
                new_stock=int(new_quantity),
                reference_number=f"ADJ-{adjustment.id}",
                notes=f"Stock adjustment: {reason} - {notes}",
                recorded_by=request.user
            )
            
            serializer = self.get_serializer(adjustment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Product.DoesNotExist:
            return Response(
                {'error': f'Product with id {product_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StockAlertViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Stock Alerts"""
    queryset = StockAlert.objects.all()
    serializer_class = StockAlertSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['product', 'alert_type', 'is_resolved']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'])
    def unresolved(self, request):
        """Get unresolved alerts"""
        alerts = StockAlert.objects.filter(is_resolved=False).order_by('-created_at')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_resolved(self, request, pk=None):
        """Mark alert as resolved"""
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_date = timezone.now()
        alert.save()
        
        serializer = self.get_serializer(alert)
        return Response(serializer.data)


# ==================== Purchase Order Management ====================

class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    """ViewSet for Purchase Order Items"""
    queryset = PurchaseOrderItem.objects.all()
    serializer_class = PurchaseOrderItemSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """ViewSet for Purchase Orders"""
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['supplier', 'status', 'store']
    search_fields = ['po_number', 'supplier__name']
    ordering_fields = ['order_date', 'created_at', 'expected_delivery_date']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['post'])
    def create_purchase_order(self, request):
        """Create new purchase order"""
        try:
            po = PurchaseOrder.objects.create(
                supplier_id=request.data['supplier_id'],
                store=request.data.get('store', 'mcdave'),
                expected_delivery_date=request.data.get('expected_delivery_date'),
                notes=request.data.get('notes', ''),
                created_by=request.user
            )
            
            # Add items
            for item in request.data.get('items', []):
                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    product_id=item['product_id'],
                    quantity=item['quantity'],
                    unit_price=Decimal(str(item.get('unit_price', 0)))
                )
            
            po.calculate_total()
            serializer = self.get_serializer(po)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def receive_goods(self, request, pk=None):
        """Mark purchase order as received"""
        po = self.get_object()
        
        if po.status != 'pending':
            return Response(
                {'error': 'Only pending orders can be received'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update product stocks
            for item in po.po_items.all():
                product = item.product
                if po.store == 'mcdave':
                    product.mcdave_stock += item.quantity
                elif po.store == 'kisii':
                    product.kisii_stock += item.quantity
                elif po.store == 'offshore':
                    product.offshore_stock += item.quantity
                product.save()
            
            po.status = 'received'
            po.received_date = timezone.now()
            po.save()
            
            serializer = self.get_serializer(po)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending purchase orders"""
        orders = PurchaseOrder.objects.filter(status='pending').order_by('-created_at')
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)


# ==================== Feedback Management ====================

class CustomerFeedbackViewSet(viewsets.ModelViewSet):
    """ViewSet for Customer Feedback"""
    queryset = CustomerFeedback.objects.all()
    serializer_class = CustomerFeedbackSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['customer', 'feedback_type', 'rating']
    search_fields = ['customer__first_name', 'title']
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter feedback by salesperson if not admin"""
        user = self.request.user
        if user.is_superuser or user.groups.filter(name='Admins').exists():
            return CustomerFeedback.objects.all()
        return CustomerFeedback.objects.filter(salesperson=user)
    
    @action(detail=False, methods=['post'])
    def submit_feedback(self, request):
        """Submit new feedback with optional photo"""
        try:
            # Accept both customer_id and customer parameters
            customer_id = request.data.get('customer_id') or request.data.get('customer')
            if not customer_id:
                return Response(
                    {'error': 'customer_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            customer = Customer.objects.get(id=customer_id)
            
            # Use provided fields or fall back to customer data
            feedback = CustomerFeedback.objects.create(
                customer=customer,
                salesperson=request.user,
                shop_name=request.data.get('shop_name') or customer.first_name or '',
                contact_person=request.data.get('contact_person') or customer.contact_person or '',
                exact_location=request.data.get('exact_location') or customer.address or '',
                phone_number=request.data.get('phone_number') or customer.phone_number or '',
                feedback_type=request.data.get('feedback_type', 'quality'),
                rating=int(request.data.get('rating', 5)),
                comment=request.data.get('comment', ''),
                latitude=request.data.get('latitude'),
                longitude=request.data.get('longitude')
            )
            
            # Handle photo upload (either from FILES or base64 from data)
            if 'photo' in request.FILES:
                feedback.photo = request.FILES['photo']
                feedback.save()
            elif 'photo_base64' in request.data:
                import base64
                import uuid
                from django.core.files.base import ContentFile
                
                photo_base64 = request.data.get('photo_base64')
                if photo_base64:
                    try:
                        # Remove data URI prefix if present
                        if ',' in photo_base64:
                            photo_base64 = photo_base64.split(',')[1]
                        
                        # Decode base64
                        image_data = base64.b64decode(photo_base64)
                        filename = f'feedback_{uuid.uuid4()}.jpg'
                        feedback.photo.save(filename, ContentFile(image_data), save=True)
                    except Exception as e:
                        # Log but don't fail if photo processing fails
                        print(f"Photo upload error: {e}")
            
            # Create notification for admins
            admin_users = User.objects.filter(
                Q(is_superuser=True) | Q(groups__name='Admins')
            ).distinct()
            
            # Get list of users to notify (admins + salesperson who submitted feedback)
            users_to_notify = list(admin_users) + [request.user]
            # Remove duplicates if user is both admin and salesperson
            users_to_notify = list(set(users_to_notify))
            
            for user in users_to_notify:
                Notification.objects.create(
                    user=user,
                    event_type='feedback_new',
                    title=f'New Feedback from {feedback.shop_name}',
                    body=f'Rating: {feedback.rating}/5 - {feedback.get_feedback_type_display()}',
                    url=f'/feedback/{feedback.id}/'
                )
            
            serializer = self.get_serializer(feedback)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Customer.DoesNotExist:
            return Response(
                {'error': f'Customer with id {customer_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def by_rating(self, request):
        """Get feedback filtered by rating"""
        rating = request.query_params.get('rating')
        queryset = self.get_queryset()
        
        if rating:
            queryset = queryset.filter(rating=int(rating))
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get feedback by type"""
        feedback_type = request.query_params.get('type')
        queryset = self.get_queryset()
        
        if feedback_type:
            queryset = queryset.filter(feedback_type=feedback_type)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ==================== Internal Messaging ====================

class InternalMessageViewSet(viewsets.ModelViewSet):
    """ViewSet for Internal Messages between staff"""
    queryset = InternalMessage.objects.all()
    serializer_class = InternalMessageSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['sender', 'recipient', 'is_read']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get messages where user is sender or recipient"""
        user = self.request.user
        return InternalMessage.objects.filter(
            Q(sender=user) | Q(recipient=user)
        )
    
    @action(detail=False, methods=['post'])
    def send_message(self, request):
        """Send internal message"""
        try:
            recipient_id = request.data.get('recipient_id')  # Optional for broadcasts
            message_text = request.data.get('message')
            
            if not message_text:
                return Response(
                    {'error': 'message field is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Allow broadcast if recipient_id is None, otherwise validate recipient exists
            if recipient_id:
                try:
                    User.objects.get(id=recipient_id)
                except User.DoesNotExist:
                    return Response(
                        {'error': f'User with id {recipient_id} not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            message = InternalMessage.objects.create(
                sender=request.user,
                recipient_id=recipient_id,  # Can be None for broadcasts
                message=message_text
            )
            
            serializer = self.get_serializer(message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread messages for current user"""
        unread = InternalMessage.objects.filter(
            recipient=request.user,
            is_read=False
        ).order_by('-created_at')
        
        serializer = self.get_serializer(unread, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark message as read"""
        message = self.get_object()
        message.is_read = True
        message.save()
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def conversation(self, request):
        """Get conversation with specific user"""
        other_user_id = request.query_params.get('user_id')
        if not other_user_id:
            return Response(
                {'error': 'user_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        messages = InternalMessage.objects.filter(
            (Q(sender=request.user) & Q(recipient_id=other_user_id)) |
            (Q(sender_id=other_user_id) & Q(recipient=request.user))
        ).order_by('created_at')
        
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Notifications"""
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = MobileAppPagination
    filterset_fields = ['user', 'event_type', 'is_read']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get notifications for current user"""
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notifications"""
        unread = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).order_by('-created_at')
        
        serializer = self.get_serializer(unread, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({'message': 'All notifications marked as read'})


# ==================== Payment Processing ====================

class MPesaTransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for M-Pesa Transactions"""
    queryset = MPesaTransaction.objects.all()
    serializer_class = MPesaTransactionSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status']
    search_fields = ['transaction_id', 'phone_number']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'])
    def by_phone(self, request):
        """Get transactions for specific phone"""
        phone = request.query_params.get('phone')
        if phone:
            transactions = MPesaTransaction.objects.filter(phone_number=phone)
            serializer = self.get_serializer(transactions, many=True)
            return Response(serializer.data)
        return Response({'error': 'phone parameter required'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def stk_push(self, request):
        """Initiate STK push for given order/payment"""
        # minimal implementation, replicating store.views.mpesa_stk_push logic
        # expects order_id and phone_number
        data = request.data
        order_id = data.get('order_id')
        phone = data.get('phone_number')
        amount = data.get('amount')
        callback_url = data.get('callback_url')
        
        if not all([order_id, phone, amount, callback_url]):
            return Response({'error': 'order_id, phone_number, amount, callback_url are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # create pending transaction record
            txn = MPesaTransaction.objects.create(
                order_id=order_id,
                phone_number=phone,
                amount=Decimal(str(amount)),
                status='pending'
            )
            
            # Here we would call mpesa API (omitted) and update txn.checkout_request_id
            # For now just return txn data
            serializer = self.get_serializer(txn)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def callback(self, request):
        """Endpoint for MPesa callback from Safaricom"""
        # replicate store.views.mpesa_callback logic
        body = request.data
        # parse JSON for CheckoutRequestID and ResultCode
        try:
            result_code = body['Body']['stkCallback']['ResultCode']
            checkout_request_id = body['Body']['stkCallback']['CheckoutRequestID']
        except KeyError:
            return Response({'error': 'Malformed callback data'}, status=status.HTTP_400_BAD_REQUEST)
        
        txn = MPesaTransaction.objects.filter(checkout_request_id=checkout_request_id).first()
        if not txn:
            return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
        
        txn.result_code = result_code
        if result_code == 0:
            # successful
            txn.status = 'completed'
            # extract receipt number if available
            metadata = body['Body']['stkCallback'].get('CallbackMetadata', {}).get('Item', [])
            for item in metadata:
                if item.get('Name') == 'MpesaReceiptNumber':
                    txn.mpesa_receipt_number = item.get('Value')
        else:
            txn.status = 'failed'
        txn.save()
        
        # if order exists, create a Payment object similar to store.views
        try:
            order = txn.order
            if txn.status == 'completed':
                Payment.objects.create(
                    order=order,
                    amount=txn.amount,
                    payment_method='mpesa',
                    reference_number=txn.mpesa_receipt_number or ''
                )
                order.amount_paid += txn.amount
                order.update_paid_status()
        except Exception:
            pass
        
        return Response({'message': 'Callback processed'})


class BuniTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Buni Payment Transactions"""
    queryset = BuniTransaction.objects.all()
    serializer_class = BuniTransactionSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status']
    search_fields = ['transaction_id', 'phone_number']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'])
    def by_phone(self, request):
        """Get transactions for specific phone"""
        phone = request.query_params.get('phone')
        if phone:
            transactions = BuniTransaction.objects.filter(phone_number=phone)
            serializer = self.get_serializer(transactions, many=True)
            return Response(serializer.data)
        return Response({'error': 'phone parameter required'}, status=status.HTTP_400_BAD_REQUEST)


# ==================== Territory/Beat Management ====================

class BeatVisitViewSet(viewsets.ModelViewSet):
    """ViewSet for Beat Visits"""
    queryset = BeatVisit.objects.all()
    serializer_class = BeatVisitSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['beat_plan', 'salesperson', 'visit_status']
    search_fields = ['beat_plan__name']
    ordering_fields = ['visit_date', 'created_at']
    ordering = ['-visit_date']
    
    def get_queryset(self):
        """Filter visits by salesperson if not admin"""
        user = self.request.user
        if user.is_superuser or user.groups.filter(name='Admins').exists():
            return BeatVisit.objects.all()
        return BeatVisit.objects.filter(salesperson=user)
    
    @action(detail=False, methods=['post'])
    def log_visit(self, request):
        """Log a beat visit"""
        try:
            visit = BeatVisit.objects.create(
                beat_plan_id=request.data['beat_plan_id'],
                customer_id=request.data.get('customer_id'),
                salesperson=request.user,
                latitude=request.data.get('latitude'),
                longitude=request.data.get('longitude'),
                notes=request.data.get('notes', ''),
                visit_status='completed'
            )
            
            serializer = self.get_serializer(visit)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def by_date(self, request):
        """Get visits for specific date"""
        visit_date = request.query_params.get('date')
        queryset = self.get_queryset()
        
        if visit_date:
            queryset = queryset.filter(visit_date__date=visit_date)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's visits"""
        queryset = self.get_queryset()
        today_visits = queryset.filter(visit_date__date=timezone.now().date())
        
        serializer = self.get_serializer(today_visits, many=True)
        return Response(serializer.data)


class BeatPlanViewSet(viewsets.ModelViewSet):
    """ViewSet for Beat Plans"""
    queryset = BeatPlan.objects.all()
    serializer_class = BeatPlanSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['salesperson', 'status']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter plans by salesperson if not admin"""
        user = self.request.user
        if user.is_superuser or user.groups.filter(name='Admins').exists():
            return BeatPlan.objects.all()
        return BeatPlan.objects.filter(salesperson=user)
    
    @action(detail=False, methods=['post'])
    def create_plan(self, request):
        """Create new beat plan"""
        try:
            plan = BeatPlan.objects.create(
                name=request.data['name'],
                salesperson_id=request.data.get('salesperson_id', request.user.id),
                description=request.data.get('description', ''),
                status='active'
            )
            
            serializer = self.get_serializer(plan)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def visits(self, request, pk=None):
        """Get all visits for this beat plan"""
        plan = self.get_object()
        visits = BeatVisit.objects.filter(beat_plan=plan).order_by('-visit_date')
        
        serializer = BeatVisitSerializer(visits, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['put'])
    def update_status(self, request, pk=None):
        """Update beat plan status"""
        plan = self.get_object()
        new_status = request.data.get('status')
        
        if new_status:
            plan.status = new_status
            plan.save()
        
        serializer = self.get_serializer(plan)
        return Response(serializer.data)


# ==================== Authentication - Password Reset ====================

class PasswordResetViewSet(viewsets.ViewSet):
    """ViewSet for Password Reset Flow"""
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def request_reset(self, request):
        """Request password reset token"""
        serializer = PasswordResetRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid email'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email = serializer.validated_data['email']
        
        try:
            user = User.objects.get(email=email)
            # Create password reset token
            reset_token = passwordreset.objects.create(user=user)
            
            # In production, send email with reset link
            # For now, return token (in real app, send via email)
            return Response({
                'message': 'Password reset token generated',
                'token': str(reset_token.reset_token),
                'email': email
            })
        except User.DoesNotExist:
            # Don't reveal if email exists for security
            return Response({
                'message': 'If email exists, reset token will be sent'
            })
    
    @action(detail=False, methods=['post'])
    def validate_token(self, request):
        """Validate password reset token"""
        token = request.data.get('token')
        
        if not token:
            return Response(
                {'error': 'Token required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reset = passwordreset.objects.get(reset_token=token)
            
            if reset.is_expired():
                reset.delete()
                return Response(
                    {'error': 'Token has expired'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({'message': 'Token is valid'})
        except passwordreset.DoesNotExist:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def confirm_reset(self, request):
        """Confirm password reset with new password"""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        try:
            reset = passwordreset.objects.get(reset_token=token)
            
            if reset.is_expired():
                reset.delete()
                return Response(
                    {'error': 'Token has expired'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update user password
            user = reset.user
            user.set_password(new_password)
            user.save()
            
            # Delete used token
            reset.delete()
            
            return Response({'message': 'Password reset successfully'})
        except passwordreset.DoesNotExist:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )


# ==================== Login Session ====================

class LoginSessionViewSet(viewsets.ViewSet):
    """Save login GPS coordinates for audit trail (mirrors web save_login_session)."""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def save(self, request):
        """Record login GPS + device info + optional photo."""
        try:
            login_session = LoginSession.objects.create(
                user=request.user,
                latitude=request.data.get('latitude'),
                longitude=request.data.get('longitude'),
                ip_address=request.META.get('REMOTE_ADDR', ''),
                device_info=request.META.get('HTTP_USER_AGENT', ''),
            )
            
            # Handle login photo (either from FILES or base64 from data)
            if 'login_photo' in request.FILES:
                login_session.login_photo = request.FILES['login_photo']
                login_session.save()
            elif 'photo_uri' in request.data or 'photo_base64' in request.data:
                import base64
                import uuid
                from django.core.files.base import ContentFile
                
                photo_base64 = request.data.get('photo_base64') or request.data.get('photo_uri')
                if photo_base64:
                    try:
                        # Remove data URI prefix if present
                        if ',' in photo_base64:
                            photo_base64 = photo_base64.split(',')[1]
                        
                        # Decode base64
                        image_data = base64.b64decode(photo_base64)
                        filename = f'login_{uuid.uuid4()}.jpg'
                        login_session.login_photo.save(filename, ContentFile(image_data), save=True)
                    except Exception as e:
                        # Log but don't fail if photo processing fails
                        print(f"Login photo error: {e}")
            
            return Response({'message': 'Login session saved'})
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


# ==================== User Registration ====================

class RegistrationViewSet(viewsets.ViewSet):
    """ViewSet for User Registration"""
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        """Register new user"""
        try:
            user = User.objects.create_user(
                username=request.data['username'],
                email=request.data['email'],
                password=request.data['password'],
                first_name=request.data.get('first_name', ''),
                last_name=request.data.get('last_name', '')
            )
            
            # Create user profile
            UserProfile.objects.create(
                user=user,
                phone=request.data.get('phone', ''),
                role=request.data.get('role', 'salesperson'),
                store=request.data.get('store', 'mcdave')
            )
            
            # Create token
            token, _ = Token.objects.get_or_create(user=user)
            
            return Response({
                'message': 'User registered successfully',
                'token': token.key,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
