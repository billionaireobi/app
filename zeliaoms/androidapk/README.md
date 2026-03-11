# Android APK API Backend

A comprehensive REST API backend built with Django REST Framework for the ZELIA Android mobile application.

## 📋 Overview

This app provides a modern REST API interface to the existing ZELIA e-commerce system, enabling mobile applications to:

- Authenticate users securely with token-based authentication
- Browse products and categories
- Manage customer information
- Create and manage orders
- Generate and manage quotes
- Process payments
- Track activity and logs
- Access chatbot knowledge base

## 🚀 Features

### Authentication & Security
- Token-based authentication (DRF TokenAuthentication)
- Role-based access control (Admin, Salesperson)
- Rate limiting (100 req/hr for anonymous, 1000 req/hr for authenticated)
- Automatic token generation on login

### Product Management
- List products with filtering and search
- Get prices based on customer category
- Track stock across multiple stores
- Low stock alerts

### Customer Management
- Create and manage customer records
- Search and filter customers
- View customer order history
- View customer quotes

### Order Processing
- Create orders with line items
- Track order and payment status
- Calculate totals with VAT
- Location tracking integration
- Delivery fee support

### Quote Management
- Create quotations
- Convert approved quotes to orders
- Quote item management
- Status tracking

### Payment Processing
- Record payments
- Multiple payment methods support
- Transaction tracking
- Automatic status updates

### Reporting & Analytics
- Dashboard statistics
- Activity logging
- User action tracking
- Performance metrics

## 📁 Project Structure

```
androidapk/
├── views.py              # API ViewSets and Views
├── serializers.py        # DRF Serializers for all models
├── urls.py              # API URL routing
├── exceptions.py        # Custom exception handlers
├── admin.py             # Django admin configuration
├── apps.py              # App configuration
├── test_api.py          # API testing script
├── API_DOCUMENTATION.md # Complete API documentation
└── SETUP_GUIDE.md       # Installation & setup instructions
```

## 🔧 Installation

### 1. Install Dependencies

```bash
pip install djangorestframework
pip install django-filter
```

### 2. Update Django Settings

The project settings have been automatically updated with:
- `androidapk` app registration
- REST Framework configuration
- Token authentication setup

### 3. Run Migrations

```bash
python manage.py migrate
```

### 4. Create a Superuser

```bash
python manage.py createsuperuser
```

### 5. Generate Token for Users

Tokens are created automatically when users login. To manually create:

```bash
python manage.py shell
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
user = User.objects.get(username='your_username')
token, created = Token.objects.get_or_create(user=user)
print(token.key)
```

## 🌐 API Endpoints

### Base URL
```
http://localhost:8000/api/
```

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **AUTH** | | |
| POST | `/auth/login/` | Login and get token |
| POST | `/auth/logout/` | Logout and invalidate token |
| **USERS** | | |
| GET | `/users/profile/me/` | Get current user profile |
| PUT | `/users/profile/update_profile/` | Update user profile |
| **PRODUCTS** | | |
| GET | `/products/` | List products |
| GET | `/products/{id}/` | Get product details |
| GET | `/products/{id}/price_by_category/` | Get price for category |
| GET | `/products/low_stock/` | Get low stock items |
| **CATEGORIES** | | |
| GET | `/categories/` | List categories |
| **CUSTOMERS** | | |
| GET | `/customers/` | List customers |
| POST | `/customers/` | Create customer |
| GET | `/customers/{id}/` | Get customer details |
| GET | `/customers/{id}/orders/` | Get customer orders |
| GET | `/customers/{id}/quotes/` | Get customer quotes |
| **ORDERS** | | |
| POST | `/orders/create_order/` | Create order |
| GET | `/orders/` | List orders |
| GET | `/orders/{id}/` | Get order details |
| PUT | `/orders/{id}/update_status/` | Update order status |
| GET | `/orders/dashboard_stats/` | Get statistics |
| **QUOTES** | | |
| POST | `/quotes/create_quote/` | Create quote |
| GET | `/quotes/` | List quotes |
| POST | `/quotes/{id}/convert_to_order/` | Convert to order |
| **PAYMENTS** | | |
| POST | `/payments/add_payment/` | Add payment |
| GET | `/payments/by_order/` | Get order payments |

## 🔐 Authentication

All endpoints require token authentication (except login):

```bash
curl -X GET http://localhost:8000/api/products/ \
  -H "Authorization: Token your_token_here"
```

## 📚 Documentation

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference with examples
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Installation and deployment guide

## 🧪 Testing

### Run API Tests

```bash
python androidapk/test_api.py
```

### Using Postman

1. Import API collection from [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
2. Set `BASE_URL` environment variable
3. Save token from login response
4. Test endpoints

### Using cURL

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Get token from response
# Use in subsequent requests
curl -X GET http://localhost:8000/api/products/ \
  -H "Authorization: Token YOUR_TOKEN"
```

## 🔑 Key Classes

### ViewSets

| ViewSet | Description |
|---------|-------------|
| `LoginView` | Handle user authentication |
| `UserProfileViewSet` | User profile management |
| `ProductViewSet` | Product catalog API |
| `CustomerViewSet` | Customer management |
| `OrderViewSet` | Order processing |
| `QuoteViewSet` | Quote management |
| `PaymentViewSet` | Payment handling |
| `ActivityLogViewSet` | Activity tracking |

### Serializers

All models have corresponding serializers:
- `UserProfileSerializer`
- `ProductSerializer` / `ProductListSerializer`
- `CustomerSerializer`
- `OrderSerializer` / `OrderDetailSerializer`
- `QuoteSerializer`
- `PaymentSerializer`
- And more...

## 🛡️ Security Features

- **Token Authentication:** Stateless API authentication
- **Rate Limiting:** Prevent abuse
- **CORS Support:** (Can be configured)
- **Custom Exception Handler:** Consistent error responses
- **Role-Based Access:** Admin vs Salesperson permissions

## 📊 Performance

- **Pagination:** Default 20 items per page
- **Filtering:** Efficient database queries
- **Search:** Full-text search on applicable fields
- **Ordering:** Sort results by any field
- **Select Related:** Optimized queries for nested data

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Import Error | Ensure 'androidapk' in INSTALLED_APPS |
| No module 'rest_framework' | Run `pip install djangorestframework` |
| Token not created | Run `python manage.py migrate` |
| 404 on API endpoints | Check API URLs in main urls.py |
| Authentication Failed | Verify token format in header |

## 📝 Example Requests

### Login
```json
POST /api/auth/login/
{
    "username": "john_doe",
    "password": "password123"
}
```

### Create Order
```json
POST /api/orders/create_order/
{
    "customer_id": 1,
    "customer_category": "wholesale",
    "items": [
        {
            "product_id": 1,
            "quantity": 10,
            "unit_price": 4500.00
        }
    ]
}
```

### Add Payment
```json
POST /api/payments/add_payment/
{
    "order_id": 1,
    "amount": 25000.00,
    "payment_method": "cash"
}
```

## 🚀 Deployment

### Production Checklist

- [ ] Set `DEBUG = False` in settings
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Use PostgreSQL instead of SQLite
- [ ] Set strong `SECRET_KEY`
- [ ] Enable HTTPS/CORS
- [ ] Configure static/media files
- [ ] Set up logging
- [ ] Enable monitoring

## 📞 Support & Contributions

For issues or improvements:
1. Review documentation
2. Check existing tests
3. Create detailed bug reports
4. Submit pull requests

## 📜 License

Proprietary - ZELIA OMS

## 👥 Team

- **Backend API:** Senior Developer
- **Android Integration:** Mobile Developer
- **QA & Testing:** QA Engineer

---

**Version:** 1.0.0  
**Last Updated:** March 10, 2026  
**Status:** ✅ Ready for Production
