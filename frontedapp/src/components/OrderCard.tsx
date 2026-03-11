import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Card } from './ui/Card';
import { Badge, getOrderStatusVariant, formatOrderStatus } from './ui/Badge';
import { Colors, FontSize, Spacing } from '../constants/colors';
import type { Order } from '../types';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const balance = parseFloat(order.total_amount) - parseFloat(order.amount_paid);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.orderId}>Order #{order.id}</Text>
            <Text style={styles.customer}>{order.customer_name ?? `Customer ${order.customer}`}</Text>
          </View>
          <Badge
            label={formatOrderStatus(order.paid_status)}
            variant={getOrderStatusVariant(order.paid_status)}
            dot
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Total</Text>
            <Text style={styles.infoValue}>KSh {parseFloat(order.total_amount).toLocaleString()}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Paid</Text>
            <Text style={[styles.infoValue, { color: Colors.success }]}>
              KSh {parseFloat(order.amount_paid).toLocaleString()}
            </Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Balance</Text>
            <Text style={[styles.infoValue, balance > 0 ? { color: Colors.error } : { color: Colors.success }]}>
              KSh {balance.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Ionicons name="storefront-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.footerText}>{order.store.toUpperCase()}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="car-outline" size={12} color={Colors.textSecondary} />
            <Badge
              label={formatOrderStatus(order.delivery_status)}
              variant={getOrderStatusVariant(order.delivery_status)}
            />
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.footerText}>
              {format(new Date(order.order_date), 'dd MMM yyyy')}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  orderId: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  customer: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  infoBlock: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
