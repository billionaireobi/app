
# from pathlib import Path
# import os
# # Build paths inside the project like this: BASE_DIR / 'subdir'.
# BASE_DIR = Path(__file__).resolve().parent.parent


# # Quick-start development settings - unsuitable for production
# # See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# # SECURITY WARNING: keep the secret key used in production secret!
# SECRET_KEY = 'django-insecure-6e2g4bbepso41tbfw#2d^va-$5u&+t0$q%mkoul7l%&h=05gbg'

# # SECURITY WARNING: don't run with debug turned on in production!
# # settings.py
# DEBUG = True

# # ALLOWED_HOSTS = [ "www.zeliaoms.mcdave.co.ke",
# #     "http://zeliaoms.mcdave.co.ke",]
# ALLOWED_HOSTS = [
#     "www.zeliaoms.mcdave.co.ke",
#     "zeliaoms.mcdave.co.ke",
# ]
# # Application definition

# INSTALLED_APPS = [
#     'django.contrib.admin',
#     'django.contrib.auth',
#     'django.contrib.contenttypes',
#     'django.contrib.sessions',
#     'django.contrib.messages',
#     'django.contrib.staticfiles',
    
#     'administration.apps.AdministrationConfig',
#     'widget_tweaks',
#     'crispy_forms',
#     'crispy_bootstrap5',
#     'store.apps.StoreConfig',
#     'rest_framework',
# ]
# CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
# CRISPY_TEMPLATE_PACK = "bootstrap5"

# MIDDLEWARE = [
#     'django.middleware.security.SecurityMiddleware',
#     'django.contrib.sessions.middleware.SessionMiddleware',
#     'django.middleware.common.CommonMiddleware',
#     'django.middleware.csrf.CsrfViewMiddleware',
#     'django.contrib.auth.middleware.AuthenticationMiddleware',
#     'django.contrib.messages.middleware.MessageMiddleware',
#     'django.middleware.clickjacking.XFrameOptionsMiddleware',
#     'whitenoise.middleware.WhiteNoiseMiddleware',
#     'django.middleware.gzip.GZipMiddleware',
# ]

# ROOT_URLCONF = 'zelia.urls'

# TEMPLATES = [
#     {
#         'BACKEND': 'django.template.backends.django.DjangoTemplates',
#         'DIRS': [os.path.join(BASE_DIR, 'templates')],
#         'APP_DIRS': True,
#         'OPTIONS': {
#             'context_processors': [
#                 'django.template.context_processors.request',
#                 'django.contrib.auth.context_processors.auth',
#                 'django.contrib.messages.context_processors.messages',
#             ],
#         },
#     },
# ]

# WSGI_APPLICATION = 'zelia.wsgi.application'


# # Database
# # https://docs.djangoproject.com/en/5.2/ref/settings/#databases
# import pymysql
# pymysql.install_as_MySQLdb()
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.mysql',
        
#         'NAME':'mcdaveco_backupoms', 
#         'USER': 'mcdaveco_mcdavecom',
#         'PASSWORD':'mcdave@2026#',
#         'PORT':'3306',
#         'HOST':'localhost',
#         'OPTIONS': {
#             'charset': 'utf8mb4',
            
#         },
#     }
# }

# # Password validation
# # https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

# AUTH_PASSWORD_VALIDATORS = [
#     {
#         'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
#     },
#     {
#         'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
#     },
# ]


# # Internationalization
# # https://docs.djangoproject.com/en/5.2/topics/i18n/

# LANGUAGE_CODE = 'en-us'

# TIME_ZONE = 'UTC'

# USE_I18N = True

# USE_TZ = True

# CACHES = {
#     'default': {
#         'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
#         'LOCATION': 'unique-snowflake',
#     }
# }
# # Static files (CSS, JavaScript, Images)
# # CACHES = {
# #     'default': {
# #         'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
# #         'LOCATION': '/home/mcdaveco/zeliaoms.mcdave.co.ke/cache',
# #     }
# # }
# # https://docs.djangoproject.com/en/5.2/howto/static-files/

# STATIC_URL = 'static/'
# # STATICFILES_DIRS = [
# #     os.path.join(BASE_DIR, 'static'),
# # ]
# STATIC_ROOT ='/home/mcdaveco/zeliaoms.mcdave.co.ke/static'
# STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
# # media
# MEDIA_URL = '/media/'
# MEDIA_ROOT ='/home/mcdaveco/zeliaoms.mcdave.co.ke/media'

# # Default primary key field type
# # https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

# DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
# # Redirect unauthenticated users to your custom login page
# LOGIN_URL = '/login/user/'
# LOGIN_REDIRECT_URL= "home/dashboard/"

# USE_TZ = True
# TIME_ZONE = 'Africa/Nairobi'  # or your preferred local timezone
# EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# EMAIL_HOST = "smtp.gmail.com"
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = 'mcdavezelia@gmail.com'
# EMAIL_HOST_PASSWORD = 'pvkpcjwuhltkgrlg'
# DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# PASSWORD_RESET_TIMEOUT = 3600

# # =====================================================
# # M-PESA DARAJA API SETTINGS
# # =====================================================
# # Change MPESA_ENV to 'production' when going live
# MPESA_ENV = 'sandbox'  # 'sandbox' or 'production'

# # Sandbox credentials (replace with production credentials when going live)
# MPESA_CONSUMER_KEY = 'your_consumer_key_here'
# MPESA_CONSUMER_SECRET = 'your_consumer_secret_here'

# # Your Paybill or Till Number
# MPESA_SHORTCODE = '174379'  # Sandbox test shortcode

# # Lipa Na M-Pesa passkey (from Daraja portal)
# MPESA_PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'  # Sandbox passkey

# # Must be a publicly accessible HTTPS URL for callbacks
# MPESA_CALLBACK_URL = 'https://zeliaoms.mcdave.co.ke/mpesa/callback/'

# # Transaction type: CustomerPayBillOnline (Paybill) or CustomerBuyGoodsOnline (Till)
# MPESA_TRANSACTION_TYPE = 'CustomerPayBillOnline'

from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-6e2g4bbepso41tbfw#2d^va-$5u&+t0$q%mkoul7l%&h=05gbg'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

_PRODUCTION_HOSTS = [
    'zeliaoms.mcdave.co.ke',
    'www.zeliaoms.mcdave.co.ke',
    'backup.mcdave.co.ke',
    'www.backup.mcdave.co.ke',
]

if DEBUG:
    # In development, allow any host so the dev server is reachable from any
    # phone/emulator on the LAN regardless of which IP the machine has been assigned.
    # ALLOWED_HOSTS = ['*'] is safe here because DEBUG=True is dev-only.
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = _PRODUCTION_HOSTS

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'administration.apps.AdministrationConfig',
    'widget_tweaks',
    'crispy_forms',
    'crispy_bootstrap5',
    'store.apps.StoreConfig',
    'rest_framework',
    'rest_framework.authtoken',
    'django_filters',
    'androidapk.apps.AndroidapkConfig',
]

CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'store.middleware.SessionTimeoutMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'zelia.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'zelia.wsgi.application'


# Database - SQLite for local development
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
USE_I18N = True
USE_TZ = True
TIME_ZONE = 'Africa/Nairobi'

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Static files
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Auth
LOGIN_URL = '/login/user/'
LOGIN_REDIRECT_URL = 'home/dashboard/'

# Email - console backend for local dev (prints emails to terminal)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

PASSWORD_RESET_TIMEOUT = 3600


# =====================================================
# BUNI API SETTINGS (KCB Payment Integration)
# =====================================================
# Buni enables direct bank payment processing through KCB and other banks.
# Update these with your actual Buni merchant credentials.
BUNI_API_KEY = 'eyJ4NXQiOiJaREEzWldJeU1UTTVabUptTnpNeU5UTXlabU13TVRZMU4ySTJORGhsT1dSaFpEWmpNakUwTkE9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJNY2RhdmVjb0BjYXJib24uc3VwZXIiLCJhcHBsaWNhdGlvbiI6eyJvd25lciI6Ik1jZGF2ZWNvIiwidGllclF1b3RhVHlwZSI6bnVsbCwidGllciI6IlVubGltaXRlZCIsIm5hbWUiOiJ6ZWxpYSIsImlkIjo0NTI4MywidXVpZCI6IjUxODRiMDkwLTEzNmMtNDRlNi04MDBlLTQwZjViNDdhNDlhMSJ9LCJpc3MiOiJodHRwczpcL1wvc2FuZGJveC5idW5pLmtjYmdyb3VwLmNvbVwvb2F1dGgyXC90b2tlbiIsInRpZXJJbmZvIjp7fSwia2V5dHlwZSI6IlBST0RVQ1RJT04iLCJwZXJtaXR0ZWRSZWZlcmVyIjoiIiwic3Vic2NyaWJlZEFQSXMiOltdLCJ0b2tlbl90eXBlIjoiYXBpS2V5IiwicGVybWl0dGVkSVAiOiIiLCJpYXQiOjE3NzM2ODIwODUsImp0aSI6IjM0OThlZjRkLWY5ZWMtNDhhNi05OGQ0LWM0YTI1NzhlODdlOSJ9.m6OH76ukeVHY2bv86C2ECfPsJLWLHs0Xyaf-x-eGRGRLA-PVykJ-QXt52v14vRwWshblTOQYa8bYuniKnQlkg6cjUUhiGIg3dnnZJtPuxmXMjwS3dvH2qp7Ao2Cc54WWYutOSZ0ZhntwZHXr10A4gGDg1w_DAYBHP33Iba8m_nwXs_vTr-ukf6Zir7stfx-quU3hCfxw8_Xcjp6Xl8IW85FXn26xXzEUnVEy-SUtCWg1EURLOfHweGt11XY1cDc-QEwx4S5tw-Dg42hJWauE_63JaEGOWqsZgZsXaTnfGFNT9hdOnE4BGKtUtQyLdNSED4vJdVHCJZ0mKs2k3OCfqw=='
BUNI_MERCHANT_ID = 'your_buni_merchant_id_here'  # TODO: update when received
BUNI_CONSUMER_KEY = 'SOouL1Pq3aPqCUwzgdcCcLQzLwUa'
BUNI_CONSUMER_SECRET = 'hEXigw7jEY4YIO934zJrZTBABcsa'
BUNI_BASE_URL = 'https://sandbox.buni.kcbgroup.com'  # or https://api.buni.kcbgroup.com for production
# Callback URL — must be a public HTTPS URL.
# Points to the mobile API handler so BuniTransaction records are updated.
BUNI_CALLBACK_URL = 'https://backup.mcdave.co.ke/api/buni-transactions/callback/'
# =====================================================
# M-PESA DARAJA API SETTINGS (hardcoded)
# =====================================================
MPESA_ENV = 'sandbox'
MPESA_CONSUMER_KEY = 'FnWrsxhzxLeTAb2GDAoowJiD2kQ0SIq1Oodk3ZM3ebcfZuDX'
MPESA_CONSUMER_SECRET = 'jSitnfZOmj0DtereT12eW8I4Wbls0QOH9nUyeeUAvuNKCeIHBFLdIatPR621Y2XG'
MPESA_SHORTCODE = '174379'
MPESA_PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
# Callback URL — must be a public HTTPS URL.
# Points to the mobile API handler so MPesaTransaction records are updated.
MPESA_CALLBACK_URL = 'https://backup.mcdave.co.ke/api/mpesa-transactions/callback/'
MPESA_TRANSACTION_TYPE = 'CustomerPayBillOnline'

if MPESA_ENV == 'sandbox':
    MPESA_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    MPESA_STK_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    MPESA_QUERY_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
else:
    MPESA_AUTH_URL = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    MPESA_STK_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    MPESA_QUERY_URL = 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'


# =====================================================
# DJANGO REST FRAMEWORK CONFIGURATION
# =====================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],

    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],

    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],

    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],

    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 15,
}
