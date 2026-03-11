from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),  # Root path, assuming index view exists
    # Auth
    path('login/user/', views.login_user, name='loginuser'),
    
     path('accounts/user/', views.accounts, name='account'),
    path('logout/user/', views.logout_user, name='logoutuser'),
    # End auth
    path('home/', views.home, name='home'),  # Redirects to appropriate dashboard based on role
    path('management/dashboard/', views.admin_dashboard, name='admin_dashboard'),
      # Admin dashboard
    path('salesperson/dashboard/', views.salesperson_dashboard, name='salesperson_dashboard'),  # Salesperson dashboard
    path('products/', views.productsline, name='products'),  # View products (accessible to both roles)
    path('product/<int:pk>/', views.product_detail, name='product_detail'),  # View product details (accessible to both roles)
    path('product/add/', views.add_product, name='addproduct'),  # Add product (admin only, restricted in view)
    path('product/update/<int:pk>/', views.product_update, name='productupdate'),  # Update product (admin only, restricted in view)
    path('product/delete/<int:pk>/', views.delete_product, name='delete_product'),  # Delete product (admin only, restricted in view)
    path('product/import/', views.import_products, name='import_products'),  # Import products (admin only, restricted in view)
    path('category/add/', views.add_category, name='addcategory'),  # Add category (admin only, restricted in view)
    path('order/create/', views.create_order, name='create_order'),
    path('customer/details/', views.get_customer_details, name='get_customer_details'),
    path('product/price/', views.get_product_price, name='get_product_price'),
    path('search-customers/', views.search_customers, name='search_customers'),
    path('search-products/', views.search_products, name='search_products'),
    path('orders/list/', views.order_list, name='order_list'),
    # Customer-related URLs
    path('customers/list/', views.customers_list, name='customers_list'),
    path('customers/add/', views.add_customer, name='add_customer'),
    path('customers/delete/<int:pk>/', views.delete_customer, name='delete_customer'),
    path('customers/edit/<int:pk>/', views.edit_customer, name='edit_customer'),
    path('customer/<int:pk>/', views.customer_detail_view, name='customer_detail-view'),
    # addeditional API endpoints
    path('api/product-details-edit/', views.get_product_details_for_edit, name='get_product_details_for_edit'),
    
    path('orders/<int:order_id>/add-payment/', views.add_payment, name='add_payment'),
    path('payments/<int:payment_id>/delete/', views.delete_payment, name='delete_payment'),
    # Order management URLs
    path('orders/<int:order_id>/', views.order_detail, name='order_detail'),
    path('orders/<int:order_id>/edit/', views.edit_order, name='edit_order'),
    path('orders/<int:order_id>/delete/', views.delete_order, name='delete_order'),
    path('get-product/', views.get_product_price, name='get_product'),
    # Reports
    path('analytics/', views.analytics_view, name='analytics'),
    path('sales-report/', views.sales_report_view, name='sales_report'),
    # User profiles
    path('update_info/user/', views.update_info_profile, name='update_info'),
    path('update_user/profile/', views.update_user_profile, name='update_user'),
    path('update_password/user/', views.update_password, name='update_password'),
    
    path('customers/import/', views.import_customers, name='import_customers'),
    path('analytics/report/', views.analytics_report, name='analytics_report'),
    path('activity/logs/', views.activity_logs_view, name='activitylogs'),
    path('api/products/<int:pk>/', views.get_product, name='get_product'),
   # Stock Management URLs
    path('stock/', views.stock_dashboard, name='stock_dashboard'),
    path('stock/list/', views.stock_list, name='stock_list'),
    path('stock/adjustment/', views.stock_adjustment, name='stock_adjustment'),
    path('stock/receive/', views.stock_receive, name='stock_receive'),
    path('stock/transfer/', views.stock_transfer_create, name='stock_transfer_create'),
    path('stock/transfers/', views.stock_transfer_list, name='stock_transfer_list'),
    path('stock/transfer/<int:transfer_id>/complete/', views.stock_transfer_complete, name='stock_transfer_complete'),
    path('stock/movements/', views.stock_movement_history, name='stock_movement_history'),
    path('api/product-stock/', views.get_product_stock, name='get_product_stock'),

    # Chatbot URLs
    path('chat/', views.chatbot_view, name='chatbot'),
    path('chat/send/', views.chatbot_send, name='chatbot_send'),
    path('chat/clear/', views.chatbot_clear, name='chatbot_clear'),
    # confirm
    path("confirm-password/", views.confirm_password, name="confirm_password"),
    path('reports/customer-statements/', views.customer_statements_view, name='customer_statements'),

    # ── Customer Feedback ─────────────────────────────────────────────
    path('feedback/', views.feedback_list, name='feedback_list'),
    path('feedback/add/', views.add_feedback, name='add_feedback'),
    path('feedback/metrics/', views.salesperson_feedback_metrics, name='salesperson_feedback_metrics'),
    path('feedback/<int:pk>/', views.feedback_detail, name='feedback_detail'),
    path('api/customer-feedback-info/', views.get_customer_for_feedback, name='customer_feedback_info'),

    # ── Internal Mini Chat ────────────────────────────────────────────
    path('messages/', views.internal_chat, name='internal_chat'),
    path('messages/send/', views.send_internal_message, name='send_internal_message'),
    path('messages/poll/', views.poll_messages, name='poll_messages'),
    path('api/unread-count/', views.unread_count_api, name='unread_count_api'),

    # ── Notifications ─────────────────────────────────────────────────
    path('notifications/',             views.notification_list,        name='notification_list'),
    path('notifications/json/',        views.notifications_json,       name='notifications_json'),
    path('notifications/mark-read/',   views.mark_notifications_read,  name='mark_notifications_read'),

    # ── M-Pesa STK Push ───────────────────────────────────────────────
    path('orders/<int:order_id>/mpesa/', views.mpesa_stk_push, name='mpesa_stk_push'),
    path('mpesa/status/<int:txn_id>/', views.mpesa_check_status, name='mpesa_check_status'),
    path('mpesa/callback/', views.mpesa_callback, name='mpesa_callback'),

    # ── Login Session (live photo + location) ─────────────────────────
    path('auth/save-login-session/', views.save_login_session, name='save_login_session'),
    path('auth/login-history/', views.login_history, name='login_history'),
    path('auth/check-user-type/', views.check_user_type, name='check_user_type'),

    # ── Daily Beat ────────────────────────────────────────────────────
    path('beat/', views.beat_today, name='beat_today'),
    path('beat/plans/', views.beat_plans, name='beat_plans'),
    path('beat/plans/create/', views.beat_plan_create, name='beat_plan_create'),
    path('beat/visit/<int:plan_id>/log/', views.beat_log_visit, name='beat_log_visit'),
    path('beat/overview/', views.beat_overview, name='beat_overview'),
]