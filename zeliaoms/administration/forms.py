from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError
import dns.resolver

class SignUpForm(UserCreationForm):
    first_name = forms.CharField(
        label="First Name",
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': 'form-control form-control-lg',
            'placeholder': 'First Name',
            'autocomplete': 'off',
            'id': 'signup-firstname'
        })
    )
    last_name = forms.CharField(
        label="Last Name",
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': 'form-control form-control-lg',
            'placeholder': 'Last Name',
            'autocomplete': 'off',
            'id': 'signup-lastname'
        })
    )
    email = forms.EmailField(
        required=True,
        label="Email",
        help_text='<span class="form-text text-muted"><small>Enter a valid email address. You will receive an activation link.</small></span>',
        widget=forms.TextInput(attrs={
            'class': 'form-control form-control-lg',
            'placeholder': 'Email',
            'autocomplete': 'off',
            'id': 'signup-email'
        })
    )

    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'password1', 'password2')

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if not email:
            raise ValidationError("Email is required.")

        # Check if email is already registered
        if User.objects.filter(email=email).exists():
            raise ValidationError("An account with this email already exists.")

        # Validate email format
        validator = EmailValidator()
        try:
            validator(email)
        except ValidationError:
            raise ValidationError("Invalid email format.")

        # Check if domain has a valid MX record
        domain = email.split('@')[1]
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            if not mx_records:
                raise ValidationError("The email domain does not have a valid mail server.")
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.Timeout):
            raise ValidationError("The email domain is invalid or does not accept emails.")
        except Exception as e:
            raise ValidationError(f"Error verifying email domain: {str(e)}")

        return email

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].widget.attrs.update({
            'class': 'form-control form-control-lg',
            'placeholder': 'Username',
            'autocomplete': 'off',
            'id': 'signup-username'
        })
        self.fields["username"].label = 'Username'
        self.fields["username"].help_text = (
            '<span class="form-text text-muted">'
            '<small>Required. 150 characters or fewer. Letters, digits, and @/./+/-/_ only.</small>'
            '</span>'
        )

        self.fields["password1"].widget.attrs.update({
            'class': 'form-control form-control-lg',
            'placeholder': 'Password',
            'autocomplete': 'off',
            'id': 'signup-password'
        })
        self.fields["password1"].label = 'Password'
        self.fields["password1"].help_text = (
            '<ul class="form-text text-muted small">'
            '<li>Your password can\'t be too similar to your other personal information.</li>'
            '<li>Your password must contain at least 8 characters.</li>'
            '<li>Your password can\'t be a commonly used password.</li>'
            '<li>Your password can\'t be entirely numeric.</li>'
            '</ul>'
        )

        self.fields["password2"].widget.attrs.update({
            'class': 'form-control form-control-lg',
            'placeholder': 'Confirm Password',
            'autocomplete': 'off',
            'id': 'signup-confirmpassword'
        })
        self.fields["password2"].label = 'Confirm Password'
        self.fields["password2"].help_text = (
            '<span class="form-text text-muted">'
            '<small>Enter the same password as before for verification.</small>'
            '</span>'
        )
        
        
from django import forms
from django.forms import inlineformset_factory
from store.models import Quote, QuoteItem, Customer, Product

class QuoteForm(forms.ModelForm):
    customer = forms.ModelChoiceField(
        queryset=Customer.objects.all(),
        required=True,
        widget=forms.Select(attrs={
            "class": "form-control",
            "id": "quoteCustomer"
        }),
        label="Customer"
    )

    customer_category = forms.ChoiceField(
        choices=Quote.CATEGORY_CHOICES,
        required=True,
        widget=forms.Select(attrs={
            "class": "form-control",
            "id": "quoteCustomerCategory"
        }),
        label="Customer Category"
    )

    vat_variation = forms.ChoiceField(
        choices=Quote.VAT_CHOICES,
        required=True,
        widget=forms.Select(attrs={
            "class": "form-control",
            "id": "quoteVatVariation"
        }),
        label="VAT Variation"
    )

    expiry_date = forms.DateTimeField(
        required=False,
        widget=forms.DateTimeInput(attrs={
            "class": "form-control",
            "id": "quoteExpiryDate",
            "type": "datetime-local"
        }),
        label="Expiry Date"
    )

    notes = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={
            "placeholder": "Additional notes for the quote",
            "class": "form-control",
            "id": "quoteNotes",
            "rows": 4
        }),
        label="Notes"
    )

    class Meta:
        model = Quote
        fields = ['customer', 'customer_category', 'vat_variation', 'expiry_date', 'notes']

class QuoteItemForm(forms.ModelForm):
    product = forms.ModelChoiceField(
        queryset=Product.objects.all(),
        required=True,
        widget=forms.Select(attrs={
            "class": "form-control product-select",
            "id": "quoteItemProduct"
        }),
        label="Product"
    )

    quantity = forms.IntegerField(
        required=True,
        min_value=1,
        widget=forms.NumberInput(attrs={
            "placeholder": "1",
            "class": "form-control quantity-input",
            "id": "quoteItemQuantity"
        }),
        label="Quantity"
    )

    unit_price = forms.DecimalField(
        required=True,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            "placeholder": "0.00",
            "class": "form-control unit-price-input",
            "id": "quoteItemUnitPrice"
        }),
        label="Unit Price"
    )

    variance = forms.DecimalField(
        required=False,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={
            "placeholder": "0.00",
            "class": "form-control variance-input",
            "id": "quoteItemVariance"
        }),
        label="Variance"
    )

    class Meta:
        model = QuoteItem
        fields = ['product', 'quantity', 'unit_price', 'variance']

QuoteItemFormSet = inlineformset_factory(
    Quote,
    QuoteItem,
    form=QuoteItemForm,
    fields=['product', 'quantity', 'unit_price', 'variance'],
    extra=6,
    can_delete=True
)



# forms.py - Add these forms to your existing forms.py file

from django import forms
from django.contrib.auth.models import User
from store.models import *
from django.core.exceptions import ValidationError

class UserCreationForm(forms.ModelForm):
    """Form for creating new users with profile information"""
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Password'
        }),
        min_length=6,
        help_text="Password must be at least 6 characters long"
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Confirm Password'
        }),
        label="Confirm Password"
    )
    
    # Profile fields
    phone = forms.CharField(
        max_length=20,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Phone Number'
        })
    )
    department = forms.ChoiceField(
        choices=UserProfile.DEPARTMENT_CHOICES,
        widget=forms.Select(attrs={'class': 'form-control'}),
        required=True
    )
    national_id = forms.CharField(
        max_length=20,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'National ID'
        })
    )
    join_date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        })
    )
    gender = forms.ChoiceField(
        choices=[
            ('', 'Select Gender'),
            ('Male', 'Male'),
            ('Female', 'Female'),
            ('Other', 'Other')
        ],
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'is_active']
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Username'
            }),
            'first_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'First Name'
            }),
            'last_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Last Name'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form-control',
                'placeholder': 'Email'
            }),
            'is_active': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
        }

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')

        if password and confirm_password and password != confirm_password:
            raise ValidationError("Passwords do not match!")

        return cleaned_data

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if User.objects.filter(username=username).exists():
            raise ValidationError("Username already exists!")
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email and User.objects.filter(email=email).exists():
            raise ValidationError("Email already exists!")
        return email


class UserEditForm(forms.ModelForm):
    """Form for editing existing users"""
    # Profile fields
    phone = forms.CharField(
        max_length=20,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Phone Number'
        })
    )
    department = forms.ChoiceField(
        choices=UserProfile.DEPARTMENT_CHOICES,
        widget=forms.Select(attrs={'class': 'form-control'}),
        required=True
    )
    national_id = forms.CharField(
        max_length=20,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'National ID'
        })
    )
    join_date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        })
    )
    gender = forms.ChoiceField(
        choices=[
            ('', 'Select Gender'),
            ('Male', 'Male'),
            ('Female', 'Female'),
            ('Other', 'Other')
        ],
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'is_active']
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Username'
            }),
            'first_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'First Name'
            }),
            'last_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Last Name'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form-control',
                'placeholder': 'Email'
            }),
            'is_active': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make username readonly for editing
        self.fields['username'].widget.attrs['readonly'] = True

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            # Exclude current user from email uniqueness check
            users_with_email = User.objects.filter(email=email).exclude(pk=self.instance.pk)
            if users_with_email.exists():
                raise ValidationError("Email already exists!")
        return email


class UserPasswordChangeForm(forms.Form):
    """Form for changing user password by admin"""
    new_password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'New Password'
        }),
        min_length=6,
        help_text="Password must be at least 6 characters long"
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Confirm Password'
        }),
        label="Confirm New Password"
    )

    def clean(self):
        cleaned_data = super().clean()
        new_password = cleaned_data.get('new_password')
        confirm_password = cleaned_data.get('confirm_password')

        if new_password and confirm_password and new_password != confirm_password:
            raise ValidationError("Passwords do not match!")

        return cleaned_data