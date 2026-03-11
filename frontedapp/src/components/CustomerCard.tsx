import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Colors, FontSize, Spacing } from '../constants/colors';
import type { Customer } from '../types';

interface CustomerCardProps {
  customer: Customer;
  onPress: () => void;
}

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const initials = `${customer.first_name.charAt(0)}${customer.last_name.charAt(0)}`.toUpperCase();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>
              {customer.first_name} {customer.last_name}
            </Text>
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.phone}>{customer.phone_number}</Text>
            </View>
            {customer.address ? (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.address} numberOfLines={1}>
                  {customer.address}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.right}>
            <Badge label={customer.default_category} variant="primary" />
            <Ionicons name="chevron-forward" size={16} color={Colors.gray400} style={styles.chevron} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phone: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  chevron: {
    marginTop: Spacing.xs,
  },
});
