import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing } from '../constants/colors';
import type { Notification } from '../types';

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
  onDismiss: () => void;
}

export function NotificationItem({ notification, onPress, onDismiss }: NotificationItemProps) {
  const getIcon = (eventType: string) => {
    const iconMap: Record<string, string> = {
      feedback_new: 'chatbubble',
      message_new: 'mail',
      order_created: 'cart',
      order_updated: 'pencil',
      order_deleted: 'trash',
      beat_visit: 'location',
      beat_plan_new: 'calendar',
      stock_change: 'cube',
      payment_new: 'cash',
      login_new: 'lock-closed',
      general: 'notifications',
    };
    return iconMap[eventType] || 'notifications';
  };

  const getIconColor = (eventType: string) => {
    const colorMap: Record<string, string> = {
      order_created: Colors.primary,
      payment_new: Colors.success,
      feedback_new: Colors.info,
      message_new: Colors.info,
      stock_change: Colors.warning,
      order_deleted: Colors.error,
    };
    return colorMap[eventType] || Colors.primary;
  };

  const timeAgo = getTimeAgo(notification.created_at);

  return (
    <TouchableOpacity
      style={[styles.container, !notification.is_read && styles.unread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getIconColor(notification.event_type) + '20' }]}>
        <Ionicons name={getIcon(notification.event_type) as any} size={20} color={getIconColor(notification.event_type)} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={styles.timestamp}>{timeAgo}</Text>
      </View>

      {!notification.is_read && <View style={styles.dot} />}

      <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
        <Ionicons name="close" size={18} color={Colors.gray500} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  unread: {
    backgroundColor: Colors.primarySurface,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  timestamp: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: Spacing.md,
  },
  closeButton: {
    padding: Spacing.xs,
  },
});
