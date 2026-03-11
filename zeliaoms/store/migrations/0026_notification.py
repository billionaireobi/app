from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0025_internalmessage_attachments'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(
                    choices=[
                        ('feedback_new',  'New Feedback'),
                        ('message_new',   'New Message'),
                        ('order_created', 'Order Created'),
                        ('order_updated', 'Order Updated'),
                        ('order_deleted', 'Order Deleted'),
                        ('beat_visit',    'Beat Visit Logged'),
                        ('beat_plan_new', 'Beat Plan Created'),
                        ('stock_change',  'Stock Change'),
                        ('payment_new',   'New Payment'),
                        ('login_new',     'New Login'),
                        ('general',       'General'),
                    ],
                    default='general', max_length=20,
                )),
                ('title', models.CharField(max_length=255)),
                ('body', models.TextField(blank=True)),
                ('url', models.CharField(blank=True, max_length=500)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
