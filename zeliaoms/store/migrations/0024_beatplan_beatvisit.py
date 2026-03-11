from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0023_customerfeedback_internalmessage_loginsession_mpesatransaction_order_location'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='BeatPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day_of_week', models.CharField(choices=[('Monday', 'Monday'), ('Tuesday', 'Tuesday'), ('Wednesday', 'Wednesday'), ('Thursday', 'Thursday'), ('Friday', 'Friday'), ('Saturday', 'Saturday')], max_length=10)),
                ('notes', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='beat_plans', to='store.customer')),
                ('salesperson', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='beat_plans', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['day_of_week', 'customer__first_name'],
                'unique_together': {('salesperson', 'customer', 'day_of_week')},
            },
        ),
        migrations.CreateModel(
            name='BeatVisit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('visit_date', models.DateField()),
                ('outcome', models.CharField(choices=[('order_placed', 'Order Placed'), ('follow_up', 'Follow-Up Required'), ('no_contact', 'No Contact / Closed'), ('info_gathered', 'Info Gathered'), ('declined', 'Declined / Not Interested')], max_length=20)),
                ('notes', models.TextField(blank=True)),
                ('latitude', models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='beat_visits', to='store.customer')),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='beat_visits', to='store.order')),
                ('plan', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='visits', to='store.beatplan')),
                ('salesperson', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='beat_visits', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-visit_date', '-created_at'],
            },
        ),
    ]
