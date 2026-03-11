from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0024_beatplan_beatvisit'),
    ]

    operations = [
        migrations.AddField(
            model_name='internalmessage',
            name='attach_type',
            field=models.CharField(
                choices=[
                    ('text', 'Text'), ('file', 'File'), ('image', 'Image'),
                    ('location', 'Location'), ('contact', 'Contact'),
                ],
                default='text', max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='internalmessage',
            name='attachment',
            field=models.FileField(blank=True, null=True, upload_to='chat_attachments/%Y/%m/'),
        ),
        migrations.AddField(
            model_name='internalmessage',
            name='attachment_name',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='internalmessage',
            name='latitude',
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='internalmessage',
            name='longitude',
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='internalmessage',
            name='location_label',
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name='internalmessage',
            name='contact_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='internalmessage',
            name='contact_phone',
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AlterField(
            model_name='internalmessage',
            name='message',
            field=models.TextField(blank=True),
        ),
    ]
