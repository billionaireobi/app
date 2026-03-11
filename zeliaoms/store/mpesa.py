"""
M-Pesa Daraja API Service
Handles STK Push (Lipa Na M-Pesa Online) integration.
"""
import requests
import base64
import logging
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_base_url():
    if getattr(settings, 'MPESA_ENV', 'sandbox') == 'production':
        return 'https://api.safaricom.co.ke'
    return 'https://sandbox.safaricom.co.ke'


def get_mpesa_token():
    """
    Fetches OAuth access token from Daraja API.
    Returns the access token string, or raises an exception on failure.
    """
    consumer_key = settings.MPESA_CONSUMER_KEY
    consumer_secret = settings.MPESA_CONSUMER_SECRET

    credentials = f"{consumer_key}:{consumer_secret}"
    encoded = base64.b64encode(credentials.encode()).decode('utf-8')

    url = f"{_get_base_url()}/oauth/v1/generate?grant_type=client_credentials"
    headers = {"Authorization": f"Basic {encoded}"}

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        token = response.json().get('access_token')
        if not token:
            raise ValueError("No access_token in Daraja response")
        return token
    except requests.RequestException as e:
        logger.error(f"M-Pesa token fetch failed: {e}")
        raise


def format_phone(phone_number):
    """
    Normalises a Kenyan phone number to the 254XXXXXXXXX format required by Daraja.
    Accepts: 0712345678, +254712345678, 254712345678
    """
    phone = str(phone_number).strip().replace(' ', '').replace('-', '')
    if phone.startswith('+'):
        phone = phone[1:]
    if phone.startswith('0'):
        phone = '254' + phone[1:]
    if not phone.startswith('254'):
        phone = '254' + phone
    return phone


def initiate_stk_push(phone_number, amount, order_id, account_reference=None):
    """
    Sends an STK Push request to the customer's phone.

    Args:
        phone_number (str): Customer's phone number (any Kenyan format).
        amount (Decimal|float|int): Amount to charge (must be a whole number for M-Pesa).
        order_id (int): The order ID being paid.
        account_reference (str, optional): Account reference shown on customer's phone.

    Returns:
        dict: Daraja API response payload containing:
              - MerchantRequestID
              - CheckoutRequestID
              - ResponseCode  ('0' means success)
              - ResponseDescription
              - CustomerMessage

    Raises:
        requests.RequestException: On network failure.
        ValueError: If the API returns an error response.
    """
    token = get_mpesa_token()

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    shortcode = str(settings.MPESA_SHORTCODE)
    passkey = settings.MPESA_PASSKEY

    # Generate password: Base64(Shortcode + Passkey + Timestamp)
    raw_password = f"{shortcode}{passkey}{timestamp}"
    password = base64.b64encode(raw_password.encode()).decode('utf-8')

    formatted_phone = format_phone(phone_number)
    int_amount = max(1, int(float(amount)))  # M-Pesa requires integers ≥ 1

    reference = account_reference or f"Order{order_id}"
    # Limit reference to 12 characters (Daraja limit)
    reference = reference[:12]

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": getattr(settings, 'MPESA_TRANSACTION_TYPE', 'CustomerPayBillOnline'),
        "Amount": int_amount,
        "PartyA": formatted_phone,
        "PartyB": shortcode,
        "PhoneNumber": formatted_phone,
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": reference,
        "TransactionDesc": f"Payment for Order #{order_id}",
    }

    url = f"{_get_base_url()}/mpesa/stkpush/v1/processrequest"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        logger.info(f"STK Push initiated for Order #{order_id}: {data}")
        return data
    except requests.RequestException as e:
        logger.error(f"STK Push failed for Order #{order_id}: {e}")
        raise


def query_stk_status(checkout_request_id):
    """
    Queries the status of an STK Push transaction.

    Args:
        checkout_request_id (str): The CheckoutRequestID from initiate_stk_push.

    Returns:
        dict: Daraja query response.
    """
    token = get_mpesa_token()

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    shortcode = str(settings.MPESA_SHORTCODE)
    passkey = settings.MPESA_PASSKEY

    raw_password = f"{shortcode}{passkey}{timestamp}"
    password = base64.b64encode(raw_password.encode()).decode('utf-8')

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id,
    }

    url = f"{_get_base_url()}/mpesa/stkpushquery/v1/query"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"STK status query failed: {e}")
        raise
