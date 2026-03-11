# Generated manually 2026-03-07

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0022_chatbotknowledge_chatmessage_purchaseorder_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [

        # ── Add GPS fields to Order ──────────────────────────────────────
        migrations.AddField(
            model_name='order',
            name='latitude',
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='longitude',
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='location_address',
            field=models.CharField(
                blank=True, max_length=500, null=True,
                help_text='GPS-captured location of salesperson at order time',
            ),
        ),

        # ── CustomerFeedback ─────────────────────────────────────────────
        migrations.CreateModel(
            name='CustomerFeedback',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('shop_name', models.CharField(help_text='Customer shop name', max_length=200)),
                ('contact_person', models.CharField(blank=True, max_length=200, null=True, help_text='Contact person name')),
                ('exact_location', models.CharField(help_text='Exact shop location/directions', max_length=500)),
                ('phone_number', models.CharField(blank=True, max_length=20, null=True)),
                ('feedback_type', models.CharField(
                    choices=[
                        ('quality', 'Product Quality'),
                        ('pricing', 'Pricing'),
                        ('payments', 'Payments'),
                        ('delivery_time', 'Delivery Time'),
                    ],
                    max_length=20,
                )),
                ('rating', models.PositiveSmallIntegerField(
                    choices=[(1, '1 - Very Poor'), (2, '2 - Poor'), (3, '3 - Average'), (4, '4 - Good'), (5, '5 - Excellent')],
                    default=3,
                )),
                ('comment', models.TextField()),
                ('photo', models.ImageField(blank=True, max_length=255, null=True, upload_to='feedback_photos/%Y/%m/')),
                ('latitude', models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='feedbacks',
                    to='store.customer',
                )),
                ('salesperson', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='feedbacks_collected',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['-created_at']},
        ),

        # ── InternalMessage ──────────────────────────────────────────────
        migrations.CreateModel(
            name='InternalMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message', models.TextField()),
                ('message_type', models.CharField(
                    choices=[
                        ('user', 'User Message'),
                        ('feedback_alert', 'Customer Feedback Alert'),
                        ('system', 'System Notification'),
                    ],
                    default='user',
                    max_length=20,
                )),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('feedback', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='store.customerfeedback',
                )),
                ('recipient', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='received_internal_messages',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('sender', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sent_internal_messages',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['created_at']},
        ),

        # ── MPesaTransaction ─────────────────────────────────────────────
        migrations.CreateModel(
            name='MPesaTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('phone_number', models.CharField(help_text='Phone number STK was sent to', max_length=15)),
                ('checkout_request_id', models.CharField(blank=True, max_length=200, null=True, unique=True)),
                ('merchant_request_id', models.CharField(blank=True, max_length=200, null=True)),
                ('mpesa_receipt_number', models.CharField(blank=True, max_length=100, null=True)),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('success', 'Success'),
                        ('failed', 'Failed'),
                        ('cancelled', 'Cancelled'),
                        ('timeout', 'Timeout'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('result_code', models.CharField(blank=True, max_length=10, null=True)),
                ('result_description', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('initiated_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='mpesa_initiations',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('order', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='mpesa_transactions',
                    to='store.order',
                )),
            ],
            options={'ordering': ['-created_at']},
        ),

        # ── LoginSession ─────────────────────────────────────────────────
        migrations.CreateModel(
            name='LoginSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('login_photo', models.ImageField(blank=True, max_length=255, null=True, upload_to='login_photos/%Y/%m/')),
                ('latitude', models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True)),
                ('ip_address', models.CharField(blank=True, max_length=45, null=True)),
                ('login_at', models.DateTimeField(auto_now_add=True)),
                ('device_info', models.CharField(blank=True, max_length=500, null=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='login_sessions',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['-login_at']},
        ),
    ]
