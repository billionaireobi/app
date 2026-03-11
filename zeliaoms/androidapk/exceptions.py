"""
Custom Exception Handlers for API
Provides consistent error responses across the API
"""

from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Custom exception handler to provide consistent error responses
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        response.data = {
            'status': 'error',
            'code': response.status_code,
            'message': 'An error occurred',
            'details': response.data
        }
    else:
        response = Response({
            'status': 'error',
            'code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'Internal server error',
            'details': str(exc)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return response
