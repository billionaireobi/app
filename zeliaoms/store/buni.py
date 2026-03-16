"""
Buni Payment API Service
Handles KCB and other bank payments through Buni platform.
"""
import requests
import logging
from decimal import Decimal
from django.conf import settings

logger = logging.getLogger(__name__)


def initiate_buni_payment(phone_number, amount, order_id, account_reference=None):
    """
    Initiate a Buni payment request.
    
    Args:
        phone_number (str): Customer phone number (format: 2547XXXXXXXX or 07XXXXXXXX)
        amount (Decimal|float|int): Amount to charge (KES)
        order_id (int): The order ID for reference
        account_reference (str, optional): Account reference shown to customer
        
    Returns:
        dict: API response containing transaction_id, status, payment_url etc.
        
    Raises:
        requests.RequestException: On network failure
        ValueError: If the API returns an error
    """
    api_key = settings.BUNI_API_KEY
    merchant_id = settings.BUNI_MERCHANT_ID
    base_url = settings.BUNI_BASE_URL
    
    # Validate credentials
    if api_key == 'your_buni_api_key_here':
        raise ValueError('Buni API key not configured. Update BUNI_API_KEY in settings.')
    
    # Format phone number
    phone = str(phone_number).strip().replace(' ', '').replace('-', '')
    if phone.startswith('+'):
        phone = phone[1:]
    if phone.startswith('0'):
        phone = '254' + phone[1:]
    if not phone.startswith('254'):
        phone = '254' + phone
    
    # Prepare payload
    int_amount = max(1, int(float(amount)))
    reference = account_reference or f'Order{order_id}'
    reference = reference[:50]  # Limit reference length
    
    payload = {
        'merchant_id': merchant_id,
        'amount': int_amount,
        'phone_number': phone,
        'callback_url': settings.BUNI_CALLBACK_URL,
        'reference': reference,
        'description': f'Payment for Order #{order_id}',
    }
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }
    
    url = f'{base_url}/v1/payments/initiate'
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        logger.info(f'Buni payment initiated for Order #{order_id}: {data}')
        return data
    except requests.RequestException as e:
        logger.error(f'Buni payment initiation failed for Order #{order_id}: {e}')
        raise


def query_buni_transaction(transaction_id):
    """
    Query the status of a Buni transaction.
    
    Args:
        transaction_id (str): The transaction ID from initiate_buni_payment
        
    Returns:
        dict: Transaction status response
    """
    api_key = settings.BUNI_API_KEY
    merchant_id = settings.BUNI_MERCHANT_ID
    base_url = settings.BUNI_BASE_URL
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }
    
    url = f'{base_url}/v1/payments/{transaction_id}/status'
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f'Buni status query failed for transaction {transaction_id}: {e}')
        raise
