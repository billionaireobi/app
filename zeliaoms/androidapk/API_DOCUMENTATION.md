# ZELIA Android App API Documentation

## Overview
The ZELIA Android API is a comprehensive REST API built with Django REST Framework (DRF) that provides backend services for the mobile application. It leverages the existing store models and business logic while providing modern API endpoints for mobile clients.

## Base URL
```
http://localhost:8000/api/
```

For production:
```
https://zeliaoms.mcdave.co.ke/api/
```

## Authentication
All endpoints (except login) require Token Authentication. The token is obtained by logging in and must be sent in the `Authorization` header for all subsequent requests.

### Header Format
```
Authorization: Token <your_token_here>
```

---

## API Endpoints

### 1. Authentication Endpoints

#### Login
**Endpoint:** `POST /api/auth/login/`

**Request Body:**
```json
{
    "username": "your_username",
    "password": "your_password"
}
```

**Response (Success - 200):**
```json
{
    "token": "abc123def456xyz789",
    "user": {
        "id": 1,
        "user": {
            "id": 1,
            "username": "john_doe",
            "email": "john@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "is_staff": false,
            "is_superuser": false
        },
        "date_modified": "2026-03-10T15:30:00Z",
        "phone": "0741484426",
        "department": "Sales",
        "national_id": "12345678",
        "join_date": "2025-01-15",
        "gender": "M",
        "is_admin": false,
        "is_salesperson": true
    },
    "message": "Login successful"
}
```

#### Logout
**Endpoint:** `POST /api/auth/logout/`

**Headers Required:** `Authorization: Token <your_token>`

**Response (Success - 200):**
```json
{
    "message": "Logout successful"
}
```

---

### 2. User Profile Management

#### Get Current User Profile
**Endpoint:** `GET /api/users/profile/me/`

**Headers:** `Authorization: Token <your_token>`

**Response:**
```json
{
    "id": 1,
    "user": {...},
    "date_modified": "2026-03-10T15:30:00Z",
    "phone": "0741484426",
    "department": "Sales",
    "national_id": "12345678",
    "join_date": "2025-01-15",
    "gender": "M",
    "is_admin": false,
    "is_salesperson": true
}
```

#### Update User Profile
**Endpoint:** `PUT /api/users/profile/update_profile/`

**Headers:** `Authorization: Token <your_token>`

**Request Body:**
```json
{
    "phone": "0700123456",
    "gender": "F"
}
```

---

### 3. Product Management

#### List All Products
**Endpoint:** `GET /api/products/`

**Query Parameters:**
- `page`: Page number (default: 1)
- `category`: Filter by category ID
- `status`: Filter by status (available, limited, offer, not_available)
- `search`: Search by name, description, or barcode
- `ordering`: Order by field (name, created_at, retail_price)

**Response:**
```json
{
    "count": 150,
    "next": "http://localhost:8000/api/products/?page=2",
    "previous": null,
    "results": [
        {
            "id": 1,
            "name": "Product A",
            "description": "High quality product",
            "category": 1,
            "category_name": "Electronics",
            "image": "http://localhost:8000/media/uploads/products/image.jpg",
            "status": "available",
            "retail_price": "5000.00",
            "mcdave_stock": 50,
            "kisii_stock": 30,
            "offshore_stock": 20,
            "total_stock": 100,
            "created_at": "2025-01-15T10:00:00Z",
            "updated_at": "2026-03-10T15:30:00Z"
        }
    ]
}
```

#### Get Product Details
**Endpoint:** `GET /api/products/{id}/`

#### Get Price by Category
**Endpoint:** `GET /api/products/{id}/price_by_category/?category=wholesale`

**Query Parameters:**
- `category`: wholesale, factory, distributor, offshore, retail

**Response:**
```json
{
    "product_id": 1,
    "product_name": "Product A",
    "customer_category": "wholesale",
    "price": 4500.00,
    "stock": {
        "mcdave": 50,
        "kisii": 30,
        "offshore": 20,
        "total": 100
    }
}
```

#### Get Low Stock Products
**Endpoint:** `GET /api/products/low_stock/?threshold=10`

#### Products by Category
**Endpoint:** `GET /api/products/by_category/?category_id=1`

---

### 4. Category Management

#### List All Categories
**Endpoint:** `GET /api/categories/`

**Response:**
```json
{
    "count": 5,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 1,
            "name": "Electronics",
            "description": "Electronic devices and components",
            "created_at": "2025-01-15T10:00:00Z",
            "updated_at": "2026-03-10T15:30:00Z"
        }
    ]
}
```

---

### 5. Customer Management

#### List All Customers (With Filters)
**Endpoint:** `GET /api/customers/`

**Query Parameters:**
- `page`: Page number
- `default_category`: Filter by customer category
- `sales_person`: Filter by sales person ID
- `search`: Search by name, phone, or email
- `ordering`: Order by first_name or created_at

**Response:**
```json
{
    "count": 25,
    "results": [
        {
            "id": 1,
            "first_name": "Jane",
            "last_name": "Smith",
            "phone_number": "+254741484426",
            "formatted_phone": "0741484426",
            "email": "jane@example.com",
            "sales_person": 1,
            "sales_person_name": "John Doe",
            "address": "Nairobi, Kenya",
            "default_category": "wholesale",
            "updated_at": "2026-03-10T15:30:00Z",
            "created_at": "2025-01-15T10:00:00Z"
        }
    ]
}
```

#### Create Customer
**Endpoint:** `POST /api/customers/`

**Request Body:**
```json
{
    "first_name": "Alice",
    "last_name": "Johnson",
    "phone_number": "0700123456",
    "email": "alice@example.com",
    "address": "Mombasa",
    "default_category": "retail"
}
```

#### Get Customer Orders
**Endpoint:** `GET /api/customers/{id}/orders/`

#### Get Customer Quotes
**Endpoint:** `GET /api/customers/{id}/quotes/`

#### Customers by Category
**Endpoint:** `GET /api/customers/by_category/?category=wholesale`

---

### 6. Order Management

#### Create Order
**Endpoint:** `POST /api/orders/create_order/`

**Request Body:**
```json
{
    "customer_id": 1,
    "customer_category": "wholesale",
    "vat_variation": "with_vat",
    "address": "Delivery Address",
    "phone": "0741484426",
    "store": "mcdave",
    "delivery_fee": 500.00,
    "items": [
        {
            "product_id": 1,
            "quantity": 10,
            "unit_price": 4500.00,
            "variance": 0.00
        },
        {
            "product_id": 2,
            "quantity": 5,
            "unit_price": 2000.00,
            "variance": 100.00
        }
    ]
}
```

**Response (Success - 201):**
```json
{
    "id": 1,
    "customer": 1,
    "customer_name": "Jane Smith",
    "sales_person": 1,
    "sales_person_name": "John Doe",
    "customer_category": "wholesale",
    "vat_variation": "with_vat",
    "address": "Nairobi",
    "phone": "0741484426",
    "order_date": "2026-03-10T15:30:00Z",
    "delivery_status": "pending",
    "paid_status": "pending",
    "store": "mcdave",
    "total_amount": "47500.00",
    "amount_paid": "0.00",
    "balance": 47500.00,
    "delivery_fee": "500.00",
    "latitude": null,
    "longitude": null,
    "location_address": null,
    "quote": null,
    "order_items": [
        {
            "id": 1,
            "product": 1,
            "product_name": "Product A",
            "quantity": 10,
            "unit_price": "4500.00",
            "variance": "0.00",
            "line_total": "45000.00"
        }
    ],
    "created_at": "2026-03-10T15:30:00Z",
    "updated_at": "2026-03-10T15:30:00Z"
}
```

#### List Orders
**Endpoint:** `GET /api/orders/`

**Query Parameters:**
- `customer`: Filter by customer ID
- `delivery_status`: pending, completed, returned, cancelled
- `paid_status`: pending, completed, partially_paid, cancelled
- `store`: mcdave, kisii, offshore

#### Get Order Details
**Endpoint:** `GET /api/orders/{id}/`

#### Update Order Status
**Endpoint:** `PUT /api/orders/{id}/update_status/`

**Request Body:**
```json
{
    "delivery_status": "completed",
    "paid_status": "partially_paid"
}
```

#### Get Order Items
**Endpoint:** `GET /api/orders/{id}/items/`

#### Dashboard Statistics
**Endpoint:** `GET /api/orders/dashboard_stats/`

**Response:**
```json
{
    "total_orders": 45,
    "total_revenue": 250000.00,
    "pending_orders": 12,
    "completed_orders": 33,
    "total_customers": 25,
    "total_products": 150
}
```

---

### 7. Quote Management

#### Create Quote
**Endpoint:** `POST /api/quotes/create_quote/`

**Request Body:**
```json
{
    "customer_id": 1,
    "customer_category": "wholesale",
    "vat_variation": "with_vat",
    "notes": "Special pricing for bulk order",
    "items": [
        {
            "product_id": 1,
            "quantity": 20,
            "unit_price": 4200.00,
            "variance": 0.00
        }
    ]
}
```

#### List Quotes
**Endpoint:** `GET /api/quotes/`

**Query Parameters:**
- `customer`: Filter by customer ID
- `status`: draft, sent, approved, rejected, converted

#### Get Quote Details
**Endpoint:** `GET /api/quotes/{id}/`

#### Update Quote Status
**Endpoint:** `PUT /api/quotes/{id}/update_status/`

**Request Body:**
```json
{
    "status": "approved"
}
```

#### Convert Quote to Order
**Endpoint:** `POST /api/quotes/{id}/convert_to_order/`

---

### 8. Payment Management

#### Add Payment
**Endpoint:** `POST /api/payments/add_payment/`

**Request Body:**
```json
{
    "order_id": 1,
    "amount": 25000.00,
    "payment_method": "cash",
    "transaction_id": "TXN123456"
}
```

**Response:**
```json
{
    "id": 1,
    "order": 1,
    "order_id": 1,
    "amount": "25000.00",
    "payment_method": "cash",
    "transaction_id": "TXN123456",
    "status": "completed",
    "created_at": "2026-03-10T15:30:00Z"
}
```

#### Get Payments by Order
**Endpoint:** `GET /api/payments/by_order/?order_id=1`

---

### 9. Activity Logging

#### Get Activity Logs
**Endpoint:** `GET /api/activity-logs/`

**Query Parameters:**
- `user`: Filter by user ID
- `action`: Filter by action type
- `ordering`: Order by timestamp

---

### 10. Authentication (Administration)

#### Register New User
**Endpoint:** `POST /api/auth/register/`

**Request Body:**
```json
{
    "username": "john",
    "email": "john@example.com",
    "password": "securepass",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "0712345678",
    "role": "salesperson",
    "store": "mcdave"
}
```

#### Password Reset Flow
- **Request Reset Token:** `POST /api/auth/password-reset/request_reset/`
  - Body: `{ "email": "john@example.com" }`
- **Validate Token:** `POST /api/auth/password-reset/validate_token/`
  - Body: `{ "token": "uuid-token-here" }`
- **Confirm Reset:** `POST /api/auth/password-reset/confirm_reset/`
  - Body: `{ "token": "uuid-token", "new_password": "newpass" }`

---

### 11. Stock Management

#### View Stock Movements
**Endpoint:** `GET /api/stock/movements/`

**Query Parameters:**
- `product_id` – filter by product
- `store` – filter by store (`mcdave`, `kisii`, `offshore`)

#### View Stock Transfers
**Endpoint:** `GET /api/stock/transfers/`

#### Initiate Transfer
**Endpoint:** `POST /api/stock/transfers/initiate_transfer/`

**Body:**
```json
{
    "from_store": "mcdave",
    "to_store": "kisii",
    "items": [{"product_id": 5, "quantity": 10}],
    "notes": "Transfer to secondary location"
}
```

#### Confirm Receipt
**Endpoint:** `POST /api/stock/transfers/{id}/confirm_receipt/`

#### Stock Adjustments
**Endpoint:** `POST /api/stock/adjustments/adjust_stock/`

**Stock Alerts**
- `/api/stock/alerts/` – view alerts
- `/api/stock/alerts/{id}/mark_resolved/` – resolve alert

---

### 12. Purchase Orders

#### Create Purchase Order
**Endpoint:** `POST /api/purchase-orders/create_purchase_order/`

#### Receive Goods
**Endpoint:** `POST /api/purchase-orders/{id}/receive_goods/`

#### List Pending Orders
**Endpoint:** `GET /api/purchase-orders/pending/`

---

### 13. Customer Feedback

#### Submit Feedback
**Endpoint:** `POST /api/feedback/submit_feedback/`

#### Filter by Rating or Type
Endpoints available: `/api/feedback/by_rating/`, `/api/feedback/by_type/`

---

### 14. Internal Messaging & Notifications

- `GET /api/messages/` – list user's messages
- `POST /api/messages/send_message/` – send new message
- `GET /api/messages/unread/` – unread messages
- `POST /api/messages/{id}/mark_read/` – mark a message read
- `GET /api/messages/conversation/?user_id=3` – get chat history

Notifications:

- `GET /api/notifications/unread/`
- `POST /api/notifications/{id}/mark_read/`
- `POST /api/notifications/mark_all_read/`

---

### 15. Territory / Beat Management

#### Beat Plans
- `GET /api/beat-plans/`
- `POST /api/beat-plans/create_plan/`
- `GET /api/beat-plans/{id}/visits/`
- `PUT /api/beat-plans/{id}/update_status/`

#### Beat Visits
- `GET /api/beat-visits/`
- `POST /api/beat-visits/log_visit/`
- `GET /api/beat-visits/by_date/?date=2026-03-10`
- `GET /api/beat-visits/today/`

---

### 16. M-Pesa Transactions

#### STK Push
**Endpoint:** `POST /api/mpesa-transactions/stk_push/`

**Callback**
**Endpoint:** `POST /api/mpesa-transactions/callback/`

#### Query by Phone
`GET /api/mpesa-transactions/by_phone/?phone=0712345678`

---

### 17. ChatBot Knowledge Base

#### Search Knowledge Base
**Endpoint:** `GET /api/chatbot-knowledge/`

**Query Parameters:**
- `search`: Search questions and answers
- `category`: Filter by category

---

## Error Responses

All errors follow this format:

```json
{
    "status": "error",
    "code": 400,
    "message": "An error occurred",
    "details": {
        "field_name": ["Error message"]
    }
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## Rate Limiting

API requests are rate-limited as follows:

- **Anonymous users:** 100 requests per hour
- **Authenticated users:** 1000 requests per hour

---

## Pagination

List endpoints support pagination with these parameters:

- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20)

Example:
```
GET /api/orders/?page=2&page_size=50
```

---

## Best Practices

1. **Always include Authorization header** for authenticated endpoints
2. **Use HTTPS** in production
3. **Implement retry logic** for network failures
4. **Cache responses** appropriately on the client
5. **Handle rate limiting** gracefully with exponential backoff
6. **Validate inputs** before sending to API
7. **Keep tokens secure** - never expose in logs or error messages

---

## Implementation Examples

### Python (Requests)
```python
import requests

BASE_URL = "http://localhost:8000/api"
TOKEN = "your_token_here"

def get_orders():
    headers = {"Authorization": f"Token {TOKEN}"}
    response = requests.get(f"{BASE_URL}/orders/", headers=headers)
    return response.json()

def create_order(order_data):
    headers = {"Authorization": f"Token {TOKEN}"}
    response = requests.post(f"{BASE_URL}/orders/create_order/", 
                            json=order_data, headers=headers)
    return response.json()
```

### JavaScript (Fetch)
```javascript
const BASE_URL = "http://localhost:8000/api";
const TOKEN = "your_token_here";

async function getOrders() {
    const response = await fetch(`${BASE_URL}/orders/`, {
        headers: {"Authorization": `Token ${TOKEN}`}
    });
    return response.json();
}

async function createOrder(orderData) {
    const response = await fetch(`${BASE_URL}/orders/create_order/`, {
        method: "POST",
        headers: {
            "Authorization": `Token ${TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(orderData)
    });
    return response.json();
}
```

---

## Support & Troubleshooting

For issues or questions:
1. Check this documentation
2. Review error messages and status codes
3. Check server logs for detailed error info
4. Contact the development team

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-10 | Initial API release |

---

**Last Updated:** March 10, 2026
