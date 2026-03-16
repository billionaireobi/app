"""
Management command to recalculate totals for orders that have zero totals but contain items.
Usage: python manage.py recalculate_order_totals
"""

from django.core.management.base import BaseCommand
from store.models import Order
from decimal import Decimal


class Command(BaseCommand):
    help = "Recalculate order totals for orders with zero totals but containing items"

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Recalculate totals for ALL orders, not just those with zero totals',
        )
        parser.add_argument(
            '--order-id',
            type=int,
            help='Recalculate total for a specific order ID',
        )

    def handle(self, *args, **options):
        all_orders = options.get('all', False)
        order_id = options.get('order_id')

        if order_id:
            # Recalculate for specific order
            try:
                order = Order.objects.get(id=order_id)
                old_total = order.total_amount
                order.calculate_total()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Order #{order.id}: Updated total from {old_total} to {order.total_amount}'
                    )
                )
            except Order.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Order #{order_id} not found'))
            return

        if all_orders:
            # Recalculate for all orders
            orders = Order.objects.all()
            message = 'All orders'
        else:
            # Recalculate only for orders with zero total but items exist
            orders = Order.objects.filter(total_amount=0).exclude(order_items__isnull=True).distinct()
            message = 'Orders with zero totals but containing items'

        if not orders.exists():
            self.stdout.write(self.style.WARNING(f'No {message.lower()} found to update'))
            return

        updated_count = 0
        zero_to_nonzero = 0

        for order in orders:
            old_total = order.total_amount
            order.calculate_total()

            if old_total == 0 and order.total_amount > 0:
                zero_to_nonzero += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Order #{order.id}: {old_total} → {order.total_amount}')
                )
            elif old_total != order.total_amount:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠ Order #{order.id}: {old_total} → {order.total_amount}')
                )

            updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'\n✓ Processed {updated_count} {message.lower()}')
        )
        if zero_to_nonzero > 0:
            self.stdout.write(
                self.style.SUCCESS(f'✓ Fixed {zero_to_nonzero} orders with zero totals')
            )
