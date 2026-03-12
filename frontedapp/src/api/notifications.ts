import apiClient from './client';
import type { Notification, PaginatedResponse } from '../types';

// GET /api/notifications/
export async function getNotifications(params?: { page?: number }): Promise<PaginatedResponse<Notification>> {
  const { data } = await apiClient.get<PaginatedResponse<Notification>>('notifications/', { params });
  return data;
}

// GET /api/notifications/unread/
export async function getUnreadNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<Notification[]>('notifications/unread/');
  return data;
}

// POST /api/notifications/{id}/mark_read/
export async function markNotificationRead(id: number): Promise<Notification> {
  const { data } = await apiClient.post<Notification>(`notifications/${id}/mark_read/`);
  return data;
}

// POST /api/notifications/mark_all_read/
export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('notifications/mark_all_read/');
}

// Count of unread notifications
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const unread = await getUnreadNotifications();
    return unread.length;
  } catch {
    return 0;
  }
}

