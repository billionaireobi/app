import apiClient from './client';
import type { Notification, PaginatedResponse } from '../types';

// GET /api/notifications/
export async function getNotifications(): Promise<PaginatedResponse<Notification>> {
  const { data } = await apiClient.get<PaginatedResponse<Notification>>('notifications/');
  return data;
}

// POST /api/notifications/mark_read/
export async function markNotificationsRead(ids: number[]): Promise<void> {
  await apiClient.post('notifications/mark_read/', { ids });
}

// POST /api/notifications/mark_all_read/
export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('notifications/mark_all_read/');
}

// Count of unread notifications
export async function getUnreadNotificationCount(): Promise<number> {
  const data = await getNotifications();
  const results = data.results ?? [];
  return results.filter((n) => !n.is_read).length;
}
