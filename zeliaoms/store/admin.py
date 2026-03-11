from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Product, Category, Order, Customer, Deal, OrderItem, UserProfile


admin.site.register(Product)
admin.site.register(Category)
admin.site.register(Order)
admin.site.register(Customer)
admin.site.register(Deal)
admin.site.register(OrderItem)
admin.site.register(UserProfile)


class ProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    fk_name = 'user'


class UserAdmin(BaseUserAdmin):
    inlines = [ProfileInline]


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


admin.site.site_header = "Zelia Order System"
admin.site.site_title = "Zelia Admin Portal"
admin.site.index_title = "Welcome to Zelia Order Management"
