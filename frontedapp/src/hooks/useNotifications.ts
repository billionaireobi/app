import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUnreadNotifications, markNotificationRead } from '../api/notifications';
import type { Notification } from '../types';

const POLL_INTERVAL = 30000; // Poll every 30 seconds

export function useNotifications() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Fetch unread notifications
  const { data: unreadNotifications = [], refetch, isLoading } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: getUnreadNotifications,
    staleTime: 10000, // Cache for 10 seconds
    gcTime: 30000, // Keep in memory for 30 seconds
    retry: 1,
  });

  // Start polling for new notifications
  useEffect(() => {
    const poll = () => {
      refetch();
    };

    // Set up polling interval
    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetch]);

  const markAsRead = async (notificationId: number) => {
    try {
      await markNotificationRead(notificationId);
      // Refetch after marking as read
      refetch();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const unreadCount = unreadNotifications?.length || 0;

  return {
    unreadNotifications: unreadNotifications || [],
    unreadCount,
    isLoading,
    markAsRead,
    refetch,
  };
}
