from django import forms
from .models import *
from django.forms import inlineformset_factory
from decimal import Decimal, InvalidOperation
from django.utils import timezone
import pytz
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm, UserChangeForm, SetPasswordForm
from django import forms 
from datetime import date
from django.core.exceptions import ValidationError
from django.db.models import Q

from PIL import Image as PILImage

# update password form
class UpdatePasswordForm(SetPasswordForm):
    class Meta:
        model=User
        fields=('new_password1','new_password2')
    
    def __init__(self, *args, **kwargs):
        super(UpdatePasswordForm,self).__init__(*args, **kwargs)
       
        
        self.fields["new_password1"].widget.attrs['class']='form-control form-control-lg'
        self.fields["new_password1"].widget.attrs['placeholder']='password1'
        self.fields["new_password1"].widget.attrs['autocomplete']='off'
        self.fields["new_password1"].widget.attrs['id']='signup-password' 
        self.fields["new_password1"].label='Password'
        self.fields["new_password1"].help_text=( '<ul class="form-text text-muted small">'
            '<li>Your password can\'t be too similar to your other personal information.</li>'
            '<li>Your password must contain at least 8 characters.</li>'
            '<li>Your password can\'t be a commonly used password.</li>'
            '<li>Your password can\'t be entirely numeric.</li>'
            '</ul>')
        
        self.fields["new_password2"].widget.attrs['class']='form-control form-control-lg'
        self.fields["new_password2"].widget.attrs['placeholder']='confirm password'
        self.fields["new_password2"].widget.attrs['autocomplete']='off'
        self.fields["new_password2"].widget.attrs['id']='signup-confirmpassword'
        self.fields["new_password2"].label='Confirm Password'
        self.fields["new_password2"].help_text=('<span class="form-text text-muted">'
            '<small>Enter the same password as before for verification.</small>'
            '</span>')

#user info form
# forms.py
class UserInfoForm(forms.ModelForm):
    phone = forms.CharField(
        label="Phone:",
        widget=forms.TextInput(attrs={
            'class': 'form-control form-control-lg',
            'placeholder': 'Phone',
            'autocomplete': 'off',
            'id': 'phone'
        }),
        required=False
    )
    department = forms.ChoiceField(
        label="Department",
        choices=[('Executive', 'Executive'), ('Sales', 'Sales')],
        widget=forms.Select(attrs={
            'class': 'form-control form-control-lg',
            'placeholder': 'Department',
            'autocomplete': 'off',
            'id': 'department'
        }),
        required=True
    )
    national_id = forms.CharField(
        label="National ID:",
        widget=forms.TextInput(attrs={
            'class': 'form-control form-control-lg',
            'placeholder': 'ID',
            'autocomplete': 'off',
            'id': 'id'
        }),
        required=True
    )
    join_date = forms.DateField(
        label="Join Date:",
        widget=forms.DateInput(attrs={
            'class': 'form-control form-control-lg',
            'placeholder': 'Join Date',
            'autocomplete': 'off',
            'id': 'join_date'
        }),
        required=True
    )
    gender = forms.ChoiceField(
        label="Gender",
        choices=[('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')],
        widget=forms.Select(attrs={
            'class': 'form-control form-control-lg',
            'placeholder': 'Gender',
            'autocomplete': 'off',
            'id': 'gender'
        }),
        required=True
    )

    class Meta:
        model = UserProfile
        fields = ('phone', 'department', 'national_id', 'join_date', 'gender')

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        if user and not user.has_perm('store.can_change_department'):
            self.fields['department'].disabled = True

    def clean_department(self):
        department = self.cleaned_data.get('department')
        user = getattr(self.instance, 'user', None)
        if user and not user.has_perm('store.can_change_department'):
            if department != self.instance.department:
                raise ValidationError("You are not authorized to change the department.")
        return department

    def clean_join_date(self):
        join_date = self.cleaned_data.get("join_date")
        if join_date and join_date > date.today():
            raise ValidationError("Join Date cannot be in the future.")
        return join_date
     

# update profile form
class UpdateUserForm(UserChangeForm):
    # hide password field
    password=None
    # rest of the fields
    first_name=forms.CharField(
        label="First Name",
        max_length=100,
        widget=forms.TextInput(attrs={'class':'form-control form-control-lg',
                                                                    'placeholder':'First Name',
                                                                    'autocomplete':'off',
                                                                    'id':'update-firstname'}))
    last_name=forms.CharField(
        label="Last Name", 
        max_length=100,
        widget=forms.TextInput(attrs={'class':'form-control form-control-lg',
                                                                        'placeholder':'Last Name',
                                                                        'autocomplete':'off',
                                                                        'id':'update-lastname'}))
    email=forms.EmailField(
        label="Email",
        widget=forms.TextInput(attrs={'class':'form-control form-control-lg',
                                                                  'placeholder':'Email',
                                                                  'autocomplete':'off',
                                                                  'id':'update-lastname'}))
    class Meta:
        model=User
        fields=('username','first_name','last_name','email')
    
    def __init__(self, *args, **kwargs):
        super(UpdateUserForm,self).__init__(*args, **kwargs)
        self.fields["username"].widget.attrs['class']='form-control form-control-lg'
        self.fields["username"].widget.attrs['placeholder']='User Name'
        self.fields["username"].widget.attrs['autocomplete']='off'
        self.fields["username"].widget.attrs['id']='update-lastname'
        self.fields["username"].label='User Name'
        self.fields["username"].help_text =(
            '<span class="form-text text-muted">'
            '<small>Required. 150 characters or fewer. Only letters, digits, and @/./+/-/_ allowed.</small>'
            '</span>')
        
        self.fields["email"].widget.attrs['class']='form-control form-control-lg'
        self.fields["email"].widget.attrs['placeholder']='Email'
        self.fields["email"].widget.attrs['autocomplete']='off'
        self.fields["email"].widget.attrs['id']='update-email'
        self.fields["email"].label='Email'
        self.fields["email"].help_text =(
            '<span class="form-text text-muted">'
            '<small>Required. 150 characters or fewer. Only letters, digits, and @/./+/-/_ allowed.</small>'
            '</span>')
        
        self.fields["first_name"].widget.attrs['class']='form-control form-control-lg'
        self.fields["first_name"].widget.attrs['placeholder']='First Name'
        self.fields["first_name"].widget.attrs['autocomplete']='off'
        self
    



class CategoryForm(forms.ModelForm):
    name = forms.CharField(
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Category name',
            'id': 'categoryName'
        }),
        label='Category Name'
    )
    description = forms.CharField(
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Category description',
            'id': 'categoryDescription'
        }),
        label='Category Description'
    )
    
    class Meta:
        model = Category
        fields = ['name', 'description']


class ProductForm(forms.ModelForm):
    name = forms.CharField(
        required=True,
        widget=forms.TextInput(attrs={
            "placeholder": "Product Name",
            "class": "form-control",
            "id": "productName"
        }),
        label="Name"
    )

    category = forms.ModelChoiceField(
        queryset=Product._meta.get_field('category').related_model.objects.all(),
        required=True,
        widget=forms.Select(attrs={
            "class": "form-control",
            "id": "productCategory"
        }),
        label="Category"
    )

    description = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            "placeholder": "Product Description",
            "class": "form-control",
            "id": "productDescription",
            "rows": 4,
        }),
        label="Description"
    )

    status = forms.ChoiceField(
        choices=Product.STATUS_CHOICES,
        required=True,
        widget=forms.Select(attrs={
            "class": 'form-control',
            "id": "productStatus"
        }),
        label="Status"
    )
    barcode=forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            "placeholder": "Barcode",
            "class": "form-control",
            "id": "productBarcode"
        }),
        label="Barcode"
    )
    
    factory_price = forms.DecimalField(
        required=True,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            "placeholder": "0.00",
            "class": "form-control",
            "id": "productFactoryPrice"
        }),
        label="Factory Price"
    )

    distributor_price = forms.DecimalField(
        required=True,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            "placeholder": "0.00",
            "class": "form-control",
            "id": "productDistributorPrice"
        }),
        label="Distributor Price"
    )

    wholesale_price = forms.DecimalField(
        required=True,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            "placeholder": "0.00",
            "class": "form-control",
            "id": "productWholesalePrice"
        }),
        label="Wholesale Price"
    )

    offshore_price = forms.DecimalField(
        required=True,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            "placeholder": "0.00",
            "class": "form-control",
            "id": "productOffshorePrice"
        }),
        label="Towns Price"
    )
    retail_price = forms.DecimalField(
        required=True,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            "placeholder": "0.00",
            "class": "form-control",
            "id": "productRetailPrice"
        }),
        label="Retail Price"
    )

    mcdave_stock = forms.IntegerField(
        required=True,
        min_value=0,
        widget=forms.NumberInput(attrs={
            "placeholder": "0",
            "class": "form-control",
            "id": "mcdaveStock"
        }),
        label="McDave Stock"
    )

    kisii_stock = forms.IntegerField(
        required=True,
        min_value=0,
        widget=forms.NumberInput(attrs={
            "placeholder": "0",
            "class": "form-control",
            "id": "kisiiStock"
        }),
        label="Mombasa Stock"
    )

    offshore_stock = forms.IntegerField(
        required=True,
        min_value=0,
        widget=forms.NumberInput(attrs={
            "placeholder": "0",
            "class": "form-control",
            "id": "offshoreStock"
        }),
        label="Offshore Stock"
    )

    image = forms.ImageField(
        required=False,
        widget=forms.ClearableFileInput(attrs={
            "class": "form-control-file",
            "id": "productImage"
        }),
        label="Image"
    )

    class Meta:
        model = Product
        fields = [
            'name',
            'category',
            'barcode',
            'description',
            'status',
            'factory_price',
            'distributor_price',
            'wholesale_price',
            'offshore_price',
            'retail_price',
            'mcdave_stock',
            'kisii_stock',
            'offshore_stock',
            'image',
        ]

class CustomerForm(forms.ModelForm):
    first_name = forms.CharField(
        required=True,
        widget=forms.TextInput(attrs={
            "class": "form-control",
            "placeholder": "Shop Name"
        }),
        label="Shop Name"
    )

    last_name = forms.CharField(
        required=True,
        widget=forms.TextInput(attrs={
            "class": "form-control",
            "placeholder": "Contact Person"
        }),
        label="Contact Person"
    )

    # email = forms.EmailField(
    #     required=False,
    #     widget=forms.EmailInput(attrs={
    #         "class": "form-control",
    #         "placeholder": "Email Address"
    #     }),
    #     label="Email"
    # )

    phone_number = forms.CharField(
        required=True,
        widget=forms.TextInput(attrs={
            "class": "form-control",
            'pattern': r'^\+?\d{10,14}$',
            "placeholder": "Phone Number"
        }),
        label="Phone Number"
    )

    address = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            "class": "form-control",
            "placeholder": "Customer location"
        }),
        label="Location"
    )

    CATEGORY_CHOICES = Customer.CATEGORY_CHOICES
    default_category = forms.ChoiceField(
        choices=Customer.CATEGORY_CHOICES,
        widget=forms.Select(attrs={
            "class": "form-control"
        }),
        label="Category"
    )

    created_at = forms.DateTimeField(
        required=False,
        widget=forms.DateTimeInput(attrs={
            "class": "form-control",
            "type": "datetime-local",
            "placeholder": "Created At"
        }),
        label="Created At",
        initial=lambda: timezone.localtime().replace(microsecond=0, tzinfo=None)
    )

    class Meta:
        model = Customer
        fields = ['first_name', 'last_name','phone_number', 'address', 'default_category', 'created_at']

    def save(self, commit=True, user=None):
        instance = super().save(commit=False)
        if user and not user.userprofile.is_admin():
            instance.sales_person = user
        if commit:
            instance.save()
        return instance
    def clean_phone_number(self):
        phone = self.cleaned_data.get('phone_number')
        if phone:
            customer = Customer(phone_number=phone)
            formatted = customer.format_phone_number()
            if not formatted:
                raise forms.ValidationError("Invalid phone number format")
            return formatted
        return phone
# class CustomerImportForm(forms.Form):
#     excel_file = forms.FileField(
#         label="Upload Excel File",
#         widget=forms.FileInput(attrs={
#             "class": "form-control",
#             "accept": ".xlsx,.xls"
#         })
#     )
class OrderForm(forms.ModelForm):
    customer = forms.ModelChoiceField(
        queryset=Customer.objects.all(),
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'id_customer'}),
        empty_label='Select a customer',
        required=True
    )
    store = forms.ChoiceField(
        choices=Order.STORE_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'id_store'}),
        required=True
    )
    customer_category = forms.ChoiceField(
        choices=Order.CATEGORY_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'id_customer_category'}),
        required=True
    )
    address = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Delivery Address'})
    )
    phone = forms.CharField(
        max_length=15,
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Contact Phone'})
    )
    vat_variation = forms.ChoiceField(
        choices=Order.VAT_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'id_vat_variation'}),
        required=True,
        initial='with_vat'
    )
    paid_status = forms.ChoiceField(
        choices=Order.PAID_STATUS_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'}),
        initial='pending'
    )
    delivery_status = forms.ChoiceField(
        choices=Order.DELIVERY_STATUS_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'}),
        initial='pending'
    )
    delivery_fee = forms.DecimalField(
        required=False,
        max_digits=10,
        decimal_places=2,
        initial=Decimal('0.00'),
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': '0.00',
            'step': '0.01',
            'min': '0'
        }),
        label="Delivery Fee"
    )
    order_date = forms.DateTimeField(
        required=True,
        widget=forms.DateTimeInput(attrs={
            "class": "form-control",
            "type": "datetime-local",
            "placeholder": "Order Date",
        }),
        label="Order Date",
        initial=lambda: timezone.localtime().replace(microsecond=0, tzinfo=None)
    )

    class Meta:
        model = Order
        fields = ['customer', 'store', 'customer_category', 'vat_variation', 'address', 'phone', 'paid_status', 'delivery_status', 'delivery_fee', 'order_date']

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

        if user and not user.userprofile.is_admin():
            # Salespersons can select their own customers or universal customers (sales_person=None)
            self.fields['customer'].queryset = Customer.objects.filter(
                Q(sales_person=user) | Q(sales_person__isnull=True)
            )
        else:
            # Admins can select all customers
            self.fields['customer'].queryset = Customer.objects.all()

        if self.instance and hasattr(self.instance, 'customer') and self.instance.customer:
            customer = self.instance.customer
            self.fields['customer_category'].initial = customer.default_category
            # DO NOT populate address from stored customer data - always use live GPS location from form input
            # self.fields['address'].initial = customer.address
            self.fields['phone'].initial = customer.phone_number
class OrderStatusForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = ['delivery_status', 'paid_status']
class OrderItemForm(forms.ModelForm):
    line_total = forms.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        widget=forms.NumberInput(
            attrs={
                'class': 'form-control line-total',
                'readonly': 'readonly',
                'step': '0.01'
            }
        )
    )
    product = forms.ModelChoiceField(
        queryset=Product.objects.all(),
        widget=forms.Select(attrs={'class': 'form-select d-none product-select'}),
        required=True
    )
    variance = forms.DecimalField(
    max_digits=10,
    decimal_places=2,
    required=False,
    min_value=Decimal('-50.00'),   # New: Min value
    max_value=Decimal('50.00'),    # New: Max value
    widget=forms.NumberInput(
        attrs={
            'class': 'form-control variance-input',
            'type': 'number',
            'step': '0.01',
            'min': '-50',     # HTML5 min
            'max': '50',      # HTML5 max
            'placeholder': 'e.g. -25.50'
        }
    )
)

    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'unit_price', 'variance', 'line_total']
        widgets = {
            'product': forms.Select(attrs={'class': 'form-select d-none product-select', 'required': True}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control quantity-input', 'min': '1', 'required': True, 'type': 'number'}),
            'unit_price': forms.NumberInput(attrs={'class': 'form-control unit-price', 'readonly': 'readonly', 'step': '0.01', 'type': 'number'}),
            'variance': forms.NumberInput(attrs={
    'class': 'form-control variance-input',
    'min': '-50',
    'max': '50',
    'step': '0.01',
    'type': 'number',
    'placeholder': '-50 to 50'
}),
            'line_total': forms.NumberInput(attrs={'class': 'form-control line-total', 'readonly': 'readonly'})
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['product'].queryset = Product.objects.all()
        self.fields['unit_price'].required = False
        self.fields['variance'].required = False

        if self.instance.pk:
            self.fields['line_total'].initial = self.instance.line_total
            self.fields['variance'].initial = self.instance.variance

    def clean(self):
        cleaned_data = super().clean()
        product = cleaned_data.get('product')
        quantity = cleaned_data.get('quantity')
        variance = cleaned_data.get('variance')
        store = None

        # Get the store from the parent order form
        if self.instance and hasattr(self.instance, 'order') and self.instance.order:
            store = self.instance.order.store
        elif 'form-0-store' in self.data:  # Adjusted to match formset naming
            store = self.data['form-0-store']

        if product and quantity and store:
            stock_field = f"{store}_stock"
            try:
                stock = getattr(product, stock_field)
                if quantity <= 0:
                    raise forms.ValidationError("Quantity must be greater than zero")
                if quantity > stock:
                    raise forms.ValidationError(f"Not enough stock available in {store} store. Only {stock} units left.")
            except AttributeError:
                raise forms.ValidationError(f"Invalid store {store} for stock checking.")

        # Ensure variance is non-negative
        if variance is not None:
            if variance < Decimal('-50') or variance > Decimal('50'):
                raise forms.ValidationError("Variance must be between -50 and 50.")
        # Round unit_price, variance, and line_total to 2 decimal places
        unit_price = cleaned_data.get('unit_price')
        if unit_price is not None:
            try:
                cleaned_data['unit_price'] = round(Decimal(str(unit_price)), 2)
            except (ValueError, TypeError, ValidationError):
                cleaned_data['unit_price'] = Decimal('0.00')

        if variance is not None:
            try:
                cleaned_data['variance'] = round(Decimal(str(variance)), 2)
            except (ValueError, TypeError, ValidationError):
                cleaned_data['variance'] = Decimal('0.00')

        line_total = cleaned_data.get('line_total')
        if line_total is not None:
            try:
                cleaned_data['line_total'] = round(Decimal(str(line_total)), 2)
            except (ValueError, TypeError, ValidationError):
                cleaned_data['line_total'] = Decimal('0.00')

        return cleaned_data

OrderItemFormSet = inlineformset_factory(
    parent_model=Order,
    model=OrderItem,
    form=OrderItemForm,
    extra=0,  # Single initial row
    can_delete=True,
    min_num=1,
    validate_min=True,
    max_num=30
)



# added more forms below if needed


class PaymentForm(forms.ModelForm):
    class Meta:
        model = Payment
        fields = ['amount', 'payment_method', 'payment_date', 'reference_number', 'notes']
        widgets = {
            'amount': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01',
                'min': '0'
            }),
            'payment_method': forms.Select(attrs={'class': 'form-select'}),
            'payment_date': forms.DateTimeInput(attrs={
                'class': 'form-control',
                'type': 'datetime-local'
            }),
            'reference_number': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'e.g., M-Pesa code, cheque number'
            }),
            'notes': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Additional payment notes'
            }),
        }
    
    def __init__(self, *args, **kwargs):
        self.order = kwargs.pop('order', None)
        super().__init__(*args, **kwargs)
        self.fields['payment_date'].initial = timezone.localtime().replace(microsecond=0, tzinfo=None)
        
        if self.order:
            remaining_balance = self.order.get_balance()
            self.fields['amount'].widget.attrs['max'] = str(remaining_balance)
            self.fields['amount'].help_text = f'Remaining balance: {remaining_balance:.2f}'
    
    def clean_amount(self):
        amount = self.cleaned_data.get('amount')
        if amount <= 0:
            raise forms.ValidationError("Payment amount must be greater than zero.")
        
        if self.order:
            remaining_balance = self.order.get_balance()
            if amount > remaining_balance:
                raise forms.ValidationError(
                    f"Payment amount cannot exceed remaining balance of {remaining_balance:.2f}"
                )
        
        return amount

class OrderEditForm(forms.ModelForm):
    """Form for editing order details and items"""
    customer = forms.ModelChoiceField(
        queryset=Customer.objects.all(),
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'id_customer'}),
        required=True
    )
    store = forms.ChoiceField(
        choices=Order.STORE_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select trigger-update', 'id': 'id_store'}),
        required=True
    )
    customer_category = forms.ChoiceField(
        choices=Order.CATEGORY_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select trigger-update', 'id': 'id_customer_category'}),
        required=True
    )
    address = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Delivery Address'})
    )
    phone = forms.CharField(
        max_length=15,
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Contact Phone'})
    )
    vat_variation = forms.ChoiceField(
        choices=Order.VAT_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select trigger-update', 'id': 'id_vat_variation'}),
        required=True
    )
    paid_status = forms.ChoiceField(
        choices=Order.PAID_STATUS_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'}),
        required=True
    )
    delivery_status = forms.ChoiceField(
        choices=Order.DELIVERY_STATUS_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'}),
        required=True
    )
    order_date = forms.DateTimeField(
        required=True,
        widget=forms.DateTimeInput(attrs={
            "class": "form-control",
            "type": "datetime-local"
        })
    )
    delivery_fee = forms.DecimalField(
        required=False,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': '0.00',
            'step': '0.01',
            'min': '0'
        }),
        label="Delivery Fee"
    )


    class Meta:
        model = Order
        fields = ['customer', 'store', 'customer_category', 'vat_variation', 
                  'address', 'phone', 'paid_status', 'delivery_status','delivery_fee', 'order_date']

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

        if user and not user.userprofile.is_admin():
            self.fields['customer'].queryset = Customer.objects.filter(
                Q(sales_person=user) | Q(sales_person__isnull=True)
            )


class OrderItemEditForm(forms.ModelForm):
    """Form for editing order items"""
    line_total = forms.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control line-total',
            'readonly': 'readonly',
            'step': '0.01'
        })
    )
    product = forms.ModelChoiceField(
        queryset=Product.objects.all(),
        widget=forms.Select(attrs={'class': 'form-select product-select'}),
        required=True
    )
    variance = forms.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        min_value=Decimal('-50.00'),
        max_value=Decimal('50.00'),
        widget=forms.NumberInput(attrs={
            'class': 'form-control variance-input',
            'type': 'number',
            'step': '0.01',
            'min': '-50',
            'max': '50',
            'placeholder': 'e.g. -25.50'
        })
    )

    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'unit_price', 'variance', 'line_total']
        widgets = {
            'quantity': forms.NumberInput(attrs={
                'class': 'form-control quantity-input',
                'min': '1',
                'required': True,
                'type': 'number'
            }),
            'unit_price': forms.NumberInput(attrs={
                'class': 'form-control unit-price',
                'readonly': 'readonly',
                'step': '0.01',
                'type': 'number'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['unit_price'].required = False
        self.fields['variance'].required = False
        self.fields['line_total'].required = False

        if self.instance.pk:
            self.fields['line_total'].initial = self.instance.line_total or Decimal('0.00')
            self.fields['variance'].initial = self.instance.variance or Decimal('0.00')
            self.fields['unit_price'].initial = self.instance.unit_price or Decimal('0.00')

    def clean(self):
        cleaned_data = super().clean()
        product = cleaned_data.get('product')
        quantity = cleaned_data.get('quantity')
        variance = cleaned_data.get('variance', Decimal('0.00'))
        
        # Skip validation if this item is marked for deletion
        if cleaned_data.get('DELETE', False):
            return cleaned_data
        
        # Get store from parent formset instance
        store = None
        if hasattr(self, 'instance') and self.instance.order_id:
            # Existing item with order already set
            store = self.instance.order.store
        elif hasattr(self, 'parent_instance') and self.parent_instance:
            # New item being added to existing order via formset
            store = self.parent_instance.store

        if not product:
            raise forms.ValidationError("Product is required.")
        if not quantity or quantity <= 0:
            raise forms.ValidationError("Quantity must be greater than zero.")

        # Check stock availability (accounting for original quantity if editing)
        if product and quantity and store:
            stock_field = f"{store}_stock"
            try:
                current_stock = getattr(product, stock_field, 0)
                original_quantity = getattr(self.instance, 'original_quantity', 0) if self.instance.pk else 0
                available_stock = current_stock + original_quantity
                
                if quantity > available_stock:
                    raise forms.ValidationError(
                        f"Not enough stock available in {store} store. "
                        f"Only {available_stock} units available."
                    )
            except AttributeError:
                raise forms.ValidationError(f"Invalid store {store} for stock checking.")

        if variance is not None:
            if variance < Decimal('-50') or variance > Decimal('50'):
                raise forms.ValidationError("Variance must be between -50 and 50.")

        unit_price = cleaned_data.get('unit_price', Decimal('0.00'))
        cleaned_data['unit_price'] = round(Decimal(str(unit_price)), 2)
        cleaned_data['variance'] = round(Decimal(str(variance)), 2)
        cleaned_data['line_total'] = round(
            Decimal(str(quantity)) * (Decimal(str(unit_price)) + Decimal(str(variance))), 2
        )

        return cleaned_data


# Formset for editing order items
OrderItemEditFormSet = inlineformset_factory(
    parent_model=Order,
    model=OrderItem,
    form=OrderItemEditForm,
    extra=0,
    can_delete=True,
    min_num=1,
    validate_min=True,
    max_num=12
)


# =====================================================
# CUSTOMER FEEDBACK FORM
# =====================================================

class CustomerFeedbackForm(forms.ModelForm):
    class Meta:
        model = CustomerFeedback
        fields = [
            'customer', 'shop_name', 'contact_person', 'exact_location',
            'phone_number', 'feedback_type', 'rating', 'comment', 'photo',
            'latitude', 'longitude',
        ]
        widgets = {
            'customer': forms.Select(attrs={'class': 'form-select'}),
            'shop_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Shop / Business Name'}),
            'contact_person': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Contact person name'}),
            'exact_location': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'e.g., Moi Avenue, Next to Barclays Bank, Ground Floor',
            }),
            'phone_number': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '07xxxxxxxx'}),
            'feedback_type': forms.Select(attrs={'class': 'form-select'}),
            'rating': forms.Select(attrs={'class': 'form-select'}),
            'comment': forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'placeholder': 'Describe the feedback in detail...'}),
            # photo is handled by a hidden input populated by the camera JS
            'photo': forms.HiddenInput(),
            'latitude': forms.HiddenInput(),
            'longitude': forms.HiddenInput(),
        }

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        # All salespersons can give feedback for any customer
        self.fields['customer'].queryset = Customer.objects.all().order_by('first_name')
        self.fields['customer'].required = True
        self.fields['feedback_type'].required = True
        self.fields['comment'].required = True
        self.fields['exact_location'].required = True

    def clean_photo(self):
        # photo is optional; if provided it's the base64-encoded camera capture
        return self.cleaned_data.get('photo')


# =====================================================
# INTERNAL MESSAGE FORM
# =====================================================

class InternalMessageForm(forms.ModelForm):
    class Meta:
        model = InternalMessage
        fields = ['recipient', 'message']
        widgets = {
            'recipient': forms.Select(attrs={'class': 'form-select'}),
            'message': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 2,
                'placeholder': 'Type a message...',
                'id': 'chat-message-input',
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['recipient'].queryset = User.objects.filter(is_active=True).order_by('first_name', 'username')
        self.fields['recipient'].required = False
        self.fields['recipient'].empty_label = 'Everyone (Broadcast)'
        self.fields['message'].required = True


# =====================================================
# M-PESA STK PUSH FORM
# =====================================================

class MPesaSTKForm(forms.Form):
    phone_number = forms.CharField(
        max_length=15,
        widget=forms.TextInput(attrs={
            'class': 'form-control form-control-lg',
            'placeholder': '07xxxxxxxx or 01xxxxxxxx',
            'autocomplete': 'off',
        }),
        label='M-Pesa Phone Number',
        help_text='Enter the customer phone number to receive the STK push.',
    )
    amount = forms.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=1,
        widget=forms.NumberInput(attrs={
            'class': 'form-control form-control-lg',
            'placeholder': '0.00',
            'step': '0.01',
        }),
        label='Amount to Charge (KSh)',
        help_text='You may enter a partial amount.',
    )

    def clean_phone_number(self):
        phone = self.cleaned_data['phone_number'].strip().replace(' ', '').replace('-', '')
        # Accept 07xxxxxxxx, 01xxxxxxxx, 254xxxxxxxx, +254xxxxxxxx
        if phone.startswith('+'):
            phone = phone[1:]
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        if not (phone.startswith('254') and len(phone) == 12 and phone.isdigit()):
            raise forms.ValidationError(
                'Enter a valid Kenyan phone number (07xxxxxxxx or 01xxxxxxxx).'
            )
        return phone
