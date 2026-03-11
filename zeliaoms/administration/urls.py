# from django.urls import path
# from . import views
# from django.contrib.auth import views as auth_views

# urlpatterns = [
#     path('register/user/', views.sign_up_user, name='registeruser'),
#       # Adjust as needed
#     path('activate/<uidb64>/<token>/', views.activate_user, name='activate'),
#     path('forgetpassword/', views.forgetpassword, name='forgetpassword'),
#     path('passwordreset/<uuid:reset_id>/', views.passwordresetsent, name='passwordreset'),
#     path('resetpassword/<uuid:reset_id>/', views.resetpassword, name='resetpassword'),
#     path('passwordreset_complete/', auth_views.PasswordResetCompleteView.as_view(template_name='auth/passwordreset_complete.html'), name='password_reset_complete'),
# ]
from django.urls import path
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('register/user/', views.sign_up_user, name='registeruser'),
    path('activate/<uidb64>/<token>/', views.activate_user, name='activate'),
    # Password reset request form
    path('forgetpassword/', views.forgetpassword, name='forgetpassword'),
    
    # The actual password reset form (this is what the email link should point to)
    path('resetpassword/<uuid:reset_id>/', views.resetpassword, name='resetpassword'),
    
    # Password reset sent confirmation - OPTIONAL (remove if not needed)
    path('passwordreset-sent/<uuid:reset_id>/', views.passwordresetsent, name='passwordreset_sent'),
    
    # Password reset complete page
    path('passwordreset-complete/', auth_views.PasswordResetCompleteView.as_view(
        template_name='auth/passwordreset_complete.html'
    ), name='password_reset_complete'),
    
    
    
    path('quotes/create/', views.create_quote, name='create_quote'),
    path('quotes/<int:quote_id>/', views.quote_detail, name='quote_detail'),
    path('quotes/<int:quote_id>/approve/', views.approve_quote, name='approve_quote'),
    path('quotes/<int:quote_id>/convert/', views.convert_quote_to_order, name='convert_quote_to_order'),
    path('quotes/<int:quote_id>/delete/', views.delete_quote, name='delete_quote'),
    path('quotes/<int:quote_id>/download/', views.download_quote_pdf, name='download_quote_pdf'),
    path('quotes/', views.quote_list, name='quote_list'),
    path('api/customers/search/', views.customer_search, name='customer_search'),
    path('api/customers/<int:customer_id>/', views.customer_detail, name='customer_detail'),
    path('api/products/search/', views.product_search, name='product_search'),
    path('api/products/<int:product_id>/price/', views.product_price, name='product_price'),
    
    path('users/list', views.user_list, name='user_list'),
    path('create/', views.user_create, name='user_create'),
    path('<int:user_id>/edit/', views.user_edit, name='user_edit'),
    path('<int:user_id>/toggle-active/', views.user_toggle_active, name='user_toggle_active'),
    path('<int:user_id>/change-password/', views.user_change_password, name='user_change_password'),
    path('<int:user_id>/change-role/', views.user_change_role, name='user_change_role'),
    path('<int:user_id>/', views.user_detail, name='user_detail'),
    
    
    
    path('reports/products/',      views.product_report,    name='product_report'),
    path('reports/customers/',     views.customer_report,   name='customer_report'),
    path('reports/orders/',        views.order_report,      name='order_report'),
    path('reports/bulk-actions/',  views.bulk_orders,       name='bulk_orders'),
    path('orders/bulk-action/',    views.bulk_order_action, name='bulk_order_action'),
    path('reports/products/<int:pk>/', views.product_detail_sum, name='product_detail_sum'),
]