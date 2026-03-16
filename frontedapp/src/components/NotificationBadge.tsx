import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
}

export function NotificationBadge({ count, size = 'medium' }: NotificationBadgeProps) {
  if (count === 0) return null;

  const sizes = {
    small: { width: 18, height: 18, fontSize: 10 },
    medium: { width: 24, height: 24, fontSize: 12 },
    large: { width: 32, height: 32, fontSize: 14 },
  };

  const style = sizes[size];

  return (
    <View
      style={[
        styles.badge,
        {
          width: style.width,
          height: style.height,
          borderRadius: style.width / 2,
        },
      ]}
    >
      <Text style={[styles.badgeText, { fontSize: style.fontSize }]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -5,
    right: -5,
  },
  badgeText: {
    color: Colors.white,
    fontWeight: '700',
  },
});
