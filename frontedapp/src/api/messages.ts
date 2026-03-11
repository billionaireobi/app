import apiClient from './client';
import type { InternalMessage, PaginatedResponse } from '../types';

// GET /api/messages/
export async function getMessages(): Promise<PaginatedResponse<InternalMessage>> {
  const { data } = await apiClient.get<PaginatedResponse<InternalMessage>>('messages/');
  return data;
}

// GET /api/messages/unread/
export async function getUnreadMessages(): Promise<InternalMessage[]> {
  const { data } = await apiClient.get<InternalMessage[]>('messages/unread/');
  return data;
}

// GET /api/messages/conversation/?user={id}
export async function getConversation(userId: number): Promise<InternalMessage[]> {
  const { data } = await apiClient.get<InternalMessage[]>('messages/conversation/', {
    params: { user: userId },
  });
  return data;
}

// POST /api/messages/send_message/
export async function sendMessage(payload: {
  receiver_id?: number | null;
  message: string;
}): Promise<InternalMessage> {
  // Only send receiver_id if explicitly provided, allow null for broadcasts
  const sendData = {
    message: payload.message,
    ...(payload.receiver_id !== undefined && { receiver_id: payload.receiver_id }),
  };
  const { data } = await apiClient.post<InternalMessage>('messages/send_message/', sendData);
  return data;
}

// POST /api/messages/mark_read/
export async function markMessagesRead(ids: number[]): Promise<void> {
  await apiClient.post('messages/mark_read/', { ids });
}

// GET /api/messages/unread/ (count only)
export async function getUnreadCount(): Promise<number> {
  const messages = await getUnreadMessages();
  return Array.isArray(messages) ? messages.length : 0;
}
