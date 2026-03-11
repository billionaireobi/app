# API Setup & Installation Guide

## Prerequisites

- Python 3.8+
- Django 5.2+
- Django REST Framework
- django-filter library

## Installation Steps

### 1. Install Required Packages

```bash
pip install djangorestframework
pip install django-filter
pip install python-decouple  # For environment variables (optional)
```

Or install from requirements.txt:

```bash
pip install -r requirements.txt
```

### 2. Add to Django Settings (Already Done)

The project settings have been updated with:

```python
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'rest_framework.authtoken',
    'androidapk',
    # ...
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    # ... (see settings.py for full configuration)
}
```

### 3. Run Migrations

```bash
cd zeliaoms
python manage.py migrate
```

### 4. Create Superuser (if not exists)

```bash
python manage.py createsuperuser
```

### 5. Generate API Token for Users

Tokens are automatically created when a user logs in via the API. To manually create a token:

```bash
python manage.py shell

from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User

user = User.objects.get(username='your_username')
token, created = Token.objects.get_or_create(user=user)
print(token.key)
```

### 6. Test the API

Start the development server:

```bash
python manage.py runserver
```

Test login endpoint:

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'
```

## API Endpoints Summary

### Authentication
- `POST /api/auth/login/` - Login and get token
- `POST /api/auth/logout/` - Logout and invalidate token

### Users
- `GET /api/users/profile/me/` - Get current user profile
- `PUT /api/users/profile/update_profile/` - Update user profile

### Products
- `GET /api/products/` - List all products
- `GET /api/products/{id}/` - Get product details
- `GET /api/products/{id}/price_by_category/` - Get price for customer category
- `GET /api/products/low_stock/` - Get low stock products
- `GET /api/products/by_category/` - Get products by category

### Categories
- `GET /api/categories/` - List all categories

### Customers
- `GET /api/customers/` - List customers
- `POST /api/customers/` - Create new customer
- `GET /api/customers/{id}/` - Get customer details
- `GET /api/customers/{id}/orders/` - Get customer orders
- `GET /api/customers/{id}/quotes/` - Get customer quotes
- `GET /api/customers/by_category/` - Get customers by category

### Orders
- `POST /api/orders/create_order/` - Create new order
- `GET /api/orders/` - List orders
- `GET /api/orders/{id}/` - Get order details
- `PUT /api/orders/{id}/update_status/` - Update order status
- `GET /api/orders/{id}/items/` - Get order items
- `GET /api/orders/dashboard_stats/` - Get dashboard statistics

### Quotes
- `POST /api/quotes/create_quote/` - Create new quote
- `GET /api/quotes/` - List quotes
- `GET /api/quotes/{id}/` - Get quote details
- `PUT /api/quotes/{id}/update_status/` - Update quote status
- `POST /api/quotes/{id}/convert_to_order/` - Convert quote to order

### Payments
- `POST /api/payments/add_payment/` - Add payment to order
- `GET /api/payments/by_order/` - Get payments for order

### Activity & Support
- `GET /api/activity-logs/` - Get activity logs
- `GET /api/chatbot-knowledge/` - Get chatbot knowledge base

## Admin Panel Access

Access the admin panel to manage tokens and monitor API usage:

```
http://localhost:8000/secure-panel/shell/
```

Navigate to "Tokens" to view and manage API tokens for users.

## Production Deployment

### 1. Environment Settings

Create a `.env` file:

```
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DATABASE_URL=postgresql://user:password@localhost/dbname
```

### 2. Install Production Requirements

```bash
pip install gunicorn whitenoise psycopg2-binary
```

### 3. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

### 4. Configure CORS (if needed)

```bash
pip install django-cors-headers
```

Add to INSTALLED_APPS:
```python
INSTALLED_APPS = [
    # ...
    'corsheaders',
    # ...
]
```

Add to MIDDLEWARE (before CommonMiddleware):
```python
MIDDLEWARE = [
    # ...
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    # ...
]
```

Configure CORS settings:
```python
CORS_ALLOWED_ORIGINS = [
    "https://your-domain.com",
    "http://localhost:3000",
]
```

### 5. Use with Gunicorn

```bash
gunicorn zelia.wsgi:application --bind 0.0.0.0:8000
```

## Troubleshooting

### Issue: Import errors for androidapk

**Solution:** Ensure 'androidapk' is in INSTALLED_APPS in settings.py

### Issue: "No module named 'rest_framework'"

**Solution:** 
```bash
pip install djangorestframework
```

### Issue: Token not being created

**Solution:** Ensure 'rest_framework.authtoken' is in INSTALLED_APPS and migrations are run:
```bash
python manage.py migrate
```

### Issue: 404 errors on API endpoints

**Solution:** Verify API URLs are included in main urls.py:
```python
urlpatterns = [
    # ...
    path('api/', include('androidapk.urls')),
]
```

## Testing with Postman

1. Download and install [Postman](https://www.postman.com/downloads/)
2. Import the API collection from [API_DOCUMENTATION.md]
3. Set environment variables for `BASE_URL` and `TOKEN`
4. Test endpoints directly from Postman

## CLI Testing with cURL

### Login and Get Token

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }' | jq '.token'
```

### Use Token in Subsequent Requests

```bash
export TOKEN="<token_from_above>"

curl -X GET http://localhost:8000/api/products/ \
  -H "Authorization: Token $TOKEN"
```

## Performance Notes

- **Pagination:** Default 20 items per page (configurable)
- **Rate Limiting:** 1000 requests/hour for authenticated users
- **Filtering:** Supports Django ORM filters
- **Search:** Full text search on applicable fields
- **Ordering:** Sort by any field using ?ordering=field_name

## Next Steps

1. **Mobile App Integration:** Implement API client in your Android app
2. **Webhook Integration:** Set up webhooks for real-time updates
3. **Monitoring:** Implement API monitoring and logging
4. **Testing:** Write comprehensive API tests
5. **Documentation:** Generate API docs with OpenAPI/Swagger

---

**Documentation Generated:** March 10, 2026
**API Version:** 1.0
