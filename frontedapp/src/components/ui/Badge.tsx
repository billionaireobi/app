import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantMap: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: Colors.primarySurface, text: Colors.primaryDark },
  success: { bg: Colors.successSurface, text: Colors.success },
  warning: { bg: Colors.warningSurface, text: Colors.warning },
  error: { bg: Colors.errorSurface, text: Colors.error },
  info: { bg: Colors.infoSurface, text: Colors.info },
  neutral: { bg: Colors.gray100, text: Colors.gray700 },
};

export function Badge({ label, variant = 'neutral', dot = false }: BadgeProps) {
  const colors = variantMap[variant];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      {dot && <View style={[styles.dot, { backgroundColor: colors.text }]} />}
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

// Utility to map order/delivery status → badge variant
export function getOrderStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'completed':
    case 'delivered':
      return 'success';
    case 'partially_paid':
    case 'in_transit':
      return 'info';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'error';
    default:
      return 'neutral';
  }
}

export function formatOrderStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
