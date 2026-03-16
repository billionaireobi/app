# Internal Messages & Order Creation Fixes - March 15, 2026

## Issues Found and Fixed

### 🔴 Issue 1: InternalMessageSerializer Null Reference Error
**Location:** `zeliaoms/androidapk/serializers.py` - `InternalMessageSerializer`

**Problem:**
- `sender_name` was using `CharField(source='sender.get_full_name', read_only=True)` which crashes with `AttributeError` when `sender` is `None`
- `recipient_name` had the same issue; broadcasts have `recipient=None` by design
- The `allow_null=True` parameter only allows null in the output, it doesn't handle the method call on a None object

**Example Error:**
```
AttributeError: 'NoneType' object has no attribute 'get_full_name'
```

**Fix Applied:**
Changed from `CharField` with source accessor to `SerializerMethodField` with safe null handling:

```python
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
```

**Impact:**
- ✅ Messages with `sender=None` (system messages) now serialize correctly
- ✅ Broadcast messages with `recipient=None` no longer crash
- ✅ sender_name and recipient_name return None when appropriate (safe for frontend display)
- ✅ Uses same safe pattern as the Customer Creation fix

---

### ✅ Issue 2: Order Creation Error Handling (Verified Working)
**Location:** `zeliaoms/androidapk/views.py` - `OrderViewSet.create_order()`

**Status:** Already Correctly Implemented

The backend order creation endpoint properly:
- ✅ Validates all required fields (customer_id, address, phone, items)
- ✅ Checks stock availability before creating order
- ✅ Returns structured error responses with HTTP status codes
- ✅ Handles exceptions with descriptive error messages
- ✅ Creates notifications for admins and salespeople

**Error Response Structure:**
```python
# Validation errors
{'error': 'customer_id is required'}  # HTTP 400

# Authorization errors  
{'error': 'You do not have permission to create orders for this customer'}  # HTTP 403

# Not found errors
{'error': 'Customer not found'}  # HTTP 404
{'error': 'Product not found: ...'}  # HTTP 404

# Stock errors
{'error': 'Insufficient stock: Product X has N units available, but Y requested'}  # HTTP 400

# Generic errors
{'error': 'Order creation failed: ...'}  # HTTP 400
```

**Frontend Integration:**
The embedded error handling in `frontedapp/app/(tabs)/orders/create.tsx` works correctly:
- ✅ apiClient interceptor normalizes error responses
- ✅ Error message is extracted from response data
- ✅ Toast displays normalized message to user
- ✅ Detailed error data available via `error.data` if needed

---

## Testing Recommendations

### Message Center Testing:
```bash
# Test 1: Broadcast message (recipient = None)
POST /api/messages/
{
  "sender": 1,
  "recipient": null,
  "message": "Test broadcast",
  "message_type": "user"
}

# Expected: sender_name returns user's full name, recipient_name returns None

# Test 2: Direct message
POST /api/messages/
{
  "sender": 1,  
  "recipient": 2,
  "message": "Test direct",
  "message_type": "user"
}

# Expected: Both sender_name and recipient_name are populated
```

### Order Creation Testing:
```bash
# Test with valid data
POST /api/orders/create_order/
{
  "customer_id": 1,
  "address": "123 Main St",
  "phone": "+254700000000",
  "store": "mcdave",
  "items": [
    {
      "product_id": 1,
      "quantity": 10,
      "unit_price": 100.00
    }
  ]
}

# Expected: Order created, notifications sent to admins and salesperson

# Test with insufficient stock
POST /api/orders/create_order/
{
  "customer_id": 1,
  "address": "123 Main St",
  "phone": "+254700000000",
  "store": "mcdave",
  "items": [
    {
      "product_id": 1,
      "quantity": 99999
    }
  ]
}

# Expected: HTTP 400 with error about insufficient stock
```

---

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `zeliaoms/androidapk/serializers.py` | InternalMessageSerializer - Changed sender_name and recipient_name from CharField to SerializerMethodField with safe null handling | ✅ FIXED |
| `zeliaoms/androidapk/views.py` | OrderViewSet.create_order() | ✅ VERIFIED WORKING |
| `frontedapp/app/(tabs)/orders/create.tsx` | Order creation error handling | ✅ VERIFIED WORKING |
| `frontedapp/app/(tabs)/more.tsx` | Message center rendering | ✅ VERIFIED WORKING |

---

## Pattern Applied

This fix follows the same safe null-handling pattern established in the Customer Creation fix:
- **Problem:** Using `CharField(source='obj.method', read_only=True)` crashes when obj is None
- **Solution:** Use `SerializerMethodField` with explicit null checking logic
- **Benefit:** Allows None values to be properly serialized, improving API reliability

---

## Related Fixes

This is part of a series of pre-deployment bug fixes:
1. **Customer Creation Fix** - Serializer null handling (COMPLETED)
2. **Receipt Generation Fix** - Model method call safety (COMPLETED)  
3. **Notification System Fix** - Polling implementation and types (COMPLETED)
4. **Message & Order Fixes** - THIS DOCUMENT (COMPLETED)

---

## Deployment Checklist Items

- [x] InternalMessageSerializer updated with SerializerMethodField methods
- [x] Error response structure verified for order creation
- [x] Frontend error handling verified for order creation
- [x] Message rendering will handle None values correctly
- [x] Broadcast messages (recipient=None) will serialize correctly
- [x] System messages (sender=None) will serialize correctly

---

## Notes

- The fixes ensure graceful handling of edge cases where sender/recipient can be None
- Frontend should already handle None values in message display (uses optional chaining)
- Order creation provides detailed error feedback through existing apiClient interceptor
- All changes follow existing code patterns and don't introduce new dependencies
