# store/signals.py
from django.db.models.signals import post_migrate, post_save, post_delete, pre_save
from django.dispatch import receiver, Signal
from django.contrib.auth.models import Group, Permission
from django.contrib.admin.models import LogEntry, CHANGE
from django.contrib.contenttypes.models import ContentType
from .models import UserProfile

# Custom signal fired when a new feedback is submitted
feedback_submitted = Signal()

# =====================================================
# GROUPS & PERMISSIONS
# =====================================================
@receiver(post_migrate)
def create_groups_and_permissions(sender, **kwargs):
    if sender.name != 'store':
        return
    admins_group, _ = Group.objects.get_or_create(name='Admins')
    Group.objects.get_or_create(name='Salespersons')
    try:
        content_type = ContentType.objects.get(app_label='store', model='userprofile')
        can_change_department = Permission.objects.get(
            codename='can_change_department', content_type=content_type
        )
        admins_group.permissions.add(can_change_department)
    except (ContentType.DoesNotExist, Permission.DoesNotExist) as e:
        print(f"Warning: Could not assign 'can_change_department' permission: {e}")


@receiver(post_save, sender=UserProfile)
def log_department_change(sender, instance, **kwargs):
    if hasattr(instance, '_original_department') and instance.department != instance._original_department:
        try:
            LogEntry.objects.create(
                user_id=instance.user.id,
                content_type_id=ContentType.objects.get_for_model(instance).id,
                object_id=instance.pk,
                object_repr=str(instance),
                action_flag=CHANGE,
                change_message=f"Department changed from {instance._original_department} to {instance.department}"
            )
        except Exception as e:
            print(f"Error logging department change: {e}")


@receiver(post_save, sender=UserProfile)
def set_original_department(sender, instance, **kwargs):
    instance._original_department = instance.department


# =====================================================
# NOTIFICATION HELPERS
# =====================================================
def _get_admin_users():
    """Return all active admin / superuser accounts."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        admin_group = Group.objects.get(name='Admins')
        return User.objects.filter(
            is_active=True
        ).filter(
            __import__('django.db.models', fromlist=['Q']).Q(is_superuser=True) |
            __import__('django.db.models', fromlist=['Q']).Q(groups=admin_group)
        ).distinct()
    except Group.DoesNotExist:
        return User.objects.filter(is_superuser=True, is_active=True)


def _notify_admins(event_type, title, body='', url='', exclude_user=None):
    """Bulk-create a notification for every admin."""
    from .models import Notification
    from django.db import models as _dm
    users = _get_admin_users()
    if exclude_user:
        users = users.exclude(pk=exclude_user.pk)
    Notification.objects.bulk_create([
        Notification(user=u, event_type=event_type, title=title, body=body, url=url)
        for u in users
    ])


def _notify_user(user, event_type, title, body='', url=''):
    """Create a notification for a single user."""
    from .models import Notification
    Notification.objects.create(
        user=user, event_type=event_type, title=title, body=body, url=url
    )


def _notify_all_active(event_type, title, body='', url='', exclude_user=None):
    """Broadcast notification to all active users."""
    from .models import Notification
    from django.contrib.auth import get_user_model
    User = get_user_model()
    users = User.objects.filter(is_active=True)
    if exclude_user:
        users = users.exclude(pk=exclude_user.pk)
    Notification.objects.bulk_create([
        Notification(user=u, event_type=event_type, title=title, body=body, url=url)
        for u in users
    ])


# =====================================================
# CUSTOMER FEEDBACK → CHAT ALERT + NOTIFICATION
# =====================================================
from .models import CustomerFeedback, InternalMessage


@receiver(post_save, sender=CustomerFeedback)
def feedback_to_chat(sender, instance, created, **kwargs):
    """Broadcast feedback alert to internal chat and create notifications."""
    if not created:
        return

    rating_stars = '⭐' * instance.rating
    msg_text = (
        f"📋 NEW FEEDBACK [{instance.get_feedback_type_display().upper()}] "
        f"from {instance.shop_name} "
        f"(Contact: {instance.contact_person or 'N/A'} | "
        f"📞 {instance.phone_number or 'N/A'}) -- "
        f"Rating: {rating_stars} ({instance.rating}/5) -- "
        f"\"{instance.comment[:120]}{'...' if len(instance.comment) > 120 else ''}\""
    )
    try:
        InternalMessage.objects.create(
            sender=instance.salesperson,
            recipient=None,
            message=msg_text,
            message_type='feedback_alert',
            feedback=instance,
        )
        feedback_submitted.send(sender=CustomerFeedback, instance=instance)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to create feedback chat alert: {e}")

    # Notify all admins
    try:
        sp_name = instance.salesperson.get_full_name() or instance.salesperson.username if instance.salesperson else 'Unknown'
        _notify_admins(
            event_type='feedback_new',
            title=f'New {instance.get_feedback_type_display()} feedback from {instance.shop_name}',
            body=f'By {sp_name} | Rating: {instance.rating}/5 | {instance.comment[:100]}',
            url=f'/feedback/{instance.pk}/',
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Notification error (feedback): {e}")


# =====================================================
# INTERNAL MESSAGE → NOTIFICATION
# =====================================================
@receiver(post_save, sender=InternalMessage)
def message_notification(sender, instance, created, **kwargs):
    """Notify message recipient(s) of a new chat message."""
    if not created or instance.message_type != 'user':
        return
    try:
        sender_name = instance.sender.get_full_name() or instance.sender.username if instance.sender else 'Someone'
        preview = instance.message[:80] if instance.message else f'[{instance.attach_type}]'

        if instance.recipient:
            # Direct message → notify only that person
            if instance.recipient != instance.sender:
                _notify_user(
                    user=instance.recipient,
                    event_type='message_new',
                    title=f'Message from {sender_name}',
                    body=preview,
                    url='/messages/',
                )
        else:
            # Broadcast → notify all active users except sender
            _notify_all_active(
                event_type='message_new',
                title=f'{sender_name} sent a message to Everyone',
                body=preview,
                url='/messages/',
                exclude_user=instance.sender,
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Notification error (message): {e}")


# =====================================================
# ORDER → NOTIFICATION
# =====================================================
from .models import Order


@receiver(post_save, sender=Order)
def order_notification(sender, instance, created, **kwargs):
    try:
        customer_name = str(instance.customer) if instance.customer else 'Unknown'
        url = f'/orders/{instance.id}/'
        if created:
            _notify_admins(
                event_type='order_created',
                title=f'New order #{instance.id} for {customer_name}',
                body=f'Store: {instance.store} | Status: {instance.get_paid_status_display()}',
                url=url,
            )
        else:
            _notify_admins(
                event_type='order_updated',
                title=f'Order #{instance.id} updated — {customer_name}',
                body=f'Delivery: {instance.get_delivery_status_display()} | Payment: {instance.get_paid_status_display()}',
                url=url,
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Notification error (order): {e}")


@receiver(post_delete, sender=Order)
def order_deleted_notification(sender, instance, **kwargs):
    try:
        customer_name = str(instance.customer) if instance.customer else 'Unknown'
        _notify_admins(
            event_type='order_deleted',
            title=f'Order #{instance.id} deleted — {customer_name}',
            body=f'Store: {instance.store}',
            url='/orders/',
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Notification error (order delete): {e}")


# =====================================================
# BEAT PLAN + BEAT VISIT → NOTIFICATION
# =====================================================
from .models import BeatPlan, BeatVisit


@receiver(post_save, sender=BeatPlan)
def beat_plan_notification(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        sp_name = instance.salesperson.get_full_name() or instance.salesperson.username
        _notify_admins(
            event_type='beat_plan_new',
            title=f'New beat plan — {sp_name} on {instance.day_of_week}',
            body=f'Customer: {instance.customer}',
            url='/beat/plans/',
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Notification error (beat plan): {e}")


@receiver(post_save, sender=BeatVisit)
def beat_visit_notification(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        sp_name = instance.salesperson.get_full_name() or instance.salesperson.username
        _notify_admins(
            event_type='beat_visit',
            title=f'Beat visit logged — {sp_name} visited {instance.customer}',
            body=f'Outcome: {instance.get_outcome_display()} | Date: {instance.visit_date}',
            url='/beat/overview/',
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Notification error (beat visit): {e}")


# =====================================================
# PAYMENT → NOTIFICATION
# =====================================================
from .models import Payment


@receiver(post_save, sender=Payment)
def payment_notification(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        _notify_admins(
            event_type='payment_new',
            title=f'New {instance.get_payment_method_display()} payment — KSh {instance.amount:,.0f}',
            body=f'Order #{instance.order.id} | Customer: {instance.order.customer}',
            url=f'/orders/{instance.order.id}/',
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Notification error (payment): {e}")


# =====================================================
# CUSTOMER CREATION → NOTIFICATION
# =====================================================
from .models import Customer


@receiver(post_save, sender=Customer)
def customer_notification(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        sp_name = instance.sales_person.get_full_name() or instance.sales_person.username if instance.sales_person else 'Admin'
        _notify_admins(
            event_type='general',
            title=f'New customer added — {instance.first_name} {instance.last_name or ""}',
            body=f'Category: {instance.get_default_category_display()} | By: {sp_name} | Phone: {instance.phone_number or "N/A"}',
            url=f'/customers/{instance.id}/',
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Notification error (customer): {e}")


# =====================================================
# LOGIN SESSION → NOTIFICATION
# =====================================================
from .models import LoginSession


@receiver(post_save, sender=LoginSession)
def login_session_notification(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        user_name = instance.user.get_full_name() or instance.user.username
        _notify_admins(
            event_type='login_new',
            title=f'{user_name} logged in',
            body=f'Time: {instance.login_at.strftime("%d %b %Y %H:%M")}',
            url='/auth/login-history/',
            exclude_user=instance.user,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Notification error (login): {e}")


# =====================================================
# PRODUCT STOCK CHANGE → NOTIFICATION
# =====================================================
from .models import Product


@receiver(pre_save, sender=Product)
def capture_product_stock(sender, instance, **kwargs):
    """Store old stock values so post_save can compare."""
    if instance.pk:
        try:
            old = Product.objects.get(pk=instance.pk)
            instance._old_mcdave_stock  = old.mcdave_stock
            instance._old_kisii_stock   = old.kisii_stock
            instance._old_offshore_stock = old.offshore_stock
        except Product.DoesNotExist:
            pass


@receiver(post_save, sender=Product)
def product_stock_notification(sender, instance, created, **kwargs):
    if created:
        return
    try:
        changes = []
        for store_label, attr in [('McDave', 'mcdave_stock'), ('MBS', 'kisii_stock'), ('NRB', 'offshore_stock')]:
            old_val = getattr(instance, f'_old_{attr}', None)
            new_val = getattr(instance, attr)
            if old_val is not None and old_val != new_val:
                changes.append(f'{store_label}: {old_val}→{new_val}')
        if changes:
            _notify_admins(
                event_type='stock_change',
                title=f'Stock updated — {instance.name}',
                body=' | '.join(changes),
                url='/products/',
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Notification error (stock): {e}")
