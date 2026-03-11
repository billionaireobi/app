"""
API URL Configuration for Android App
Routes for all REST API endpoints
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router and register viewsets
router = DefaultRouter()

# ==================== Authentication ====================
router.register(r'auth/login', views.LoginView, basename='auth-login')
router.register(r'auth/logout', views.LogoutView, basename='auth-logout')
router.register(r'auth/register', views.RegistrationViewSet, basename='auth-register')
router.register(r'auth/password-reset', views.PasswordResetViewSet, basename='password-reset')
router.register(r'auth/login-session', views.LoginSessionViewSet, basename='login-session')

# ==================== User Management ====================
router.register(r'users/profile', views.UserProfileViewSet, basename='userprofile')

# ==================== Product Management ====================
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'products', views.ProductViewSet, basename='product')

# ==================== Customer Management ====================
router.register(r'customers', views.CustomerViewSet, basename='customer')

# ==================== Order Management ====================
router.register(r'orders', views.OrderViewSet, basename='order')
router.register(r'order-items', views.OrderItemViewSet, basename='orderitem')

# ==================== Quote Management ====================
router.register(r'quotes', views.QuoteViewSet, basename='quote')
router.register(r'quote-items', views.QuoteItemViewSet, basename='quoteitem')

# ==================== Payment Management ====================
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'mpesa-transactions', views.MPesaTransactionViewSet, basename='mpesatransaction')
router.register(r'buni-transactions', views.BuniTransactionViewSet, basename='bunitransaction')

# ==================== Activity Logging ====================
router.register(r'activity-logs', views.ActivityLogViewSet, basename='activitylog')

# ==================== Chat & Support ====================
router.register(r'chatbot-knowledge', views.ChatbotKnowledgeViewSet, basename='chatbotknowledge')

# ==================== Stock Management ====================
router.register(r'stock/movements', views.StockMovementViewSet, basename='stockmovement')
router.register(r'stock/transfers', views.StockTransferViewSet, basename='stocktransfer')
router.register(r'stock/transfer-items', views.StockTransferItemViewSet, basename='stocktransferitem')
router.register(r'stock/adjustments', views.StockAdjustmentViewSet, basename='stockadjustment')
router.register(r'stock/alerts', views.StockAlertViewSet, basename='stockalert')

# ==================== Purchase Orders ====================
router.register(r'purchase-orders', views.PurchaseOrderViewSet, basename='purchaseorder')
router.register(r'purchase-order-items', views.PurchaseOrderItemViewSet, basename='purchaseorderitem')

# ==================== Customer Feedback ====================
router.register(r'feedback', views.CustomerFeedbackViewSet, basename='customerfeedback')

# ==================== Internal Messaging ====================
router.register(r'messages', views.InternalMessageViewSet, basename='internalmessage')
router.register(r'notifications', views.NotificationViewSet, basename='notification')

# ==================== Territory/Beat Management ====================
router.register(r'beat-plans', views.BeatPlanViewSet, basename='beatplan')
router.register(r'beat-visits', views.BeatVisitViewSet, basename='beatvisit')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]
