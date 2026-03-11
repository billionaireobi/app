"""
Admin configuration for API app
"""

from django.contrib import admin
from rest_framework.authtoken.models import Token


@admin.register(Token)
class TokenAdmin(admin.ModelAdmin):
    """Admin interface for API Tokens"""
    list_display = ['key', 'user', 'created']
    search_fields = ['user__username']
    list_filter = ['created']

