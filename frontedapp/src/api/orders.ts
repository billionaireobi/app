import apiClient from './client';
import type {
  Order,
  OrderItem,
  CreateOrderPayload,
  DashboardStats,
  PaginatedResponse,
  OrderPaidStatus,
  OrderDeliveryStatus,
} from '../types';

// GET /api/orders/dashboard_stats/
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>('orders/dashboard_stats/');
  return data;
}

// GET /api/orders/?paid_status=&delivery_status=&store=&search=
export async function getOrders(params?: {
  paid_status?: OrderPaidStatus;
  delivery_status?: OrderDeliveryStatus;
  store?: string;
  search?: string;
  page?: number;
}): Promise<PaginatedResponse<Order>> {
  const { data } = await apiClient.get<PaginatedResponse<Order>>('orders/', { params });
  return data;
}

// GET /api/orders/{id}/
export async function getOrder(id: number): Promise<Order> {
  const { data } = await apiClient.get<Order>(`orders/${id}/`);
  return data;
}

// GET /api/orders/{id}/items/
export async function getOrderItems(id: number): Promise<OrderItem[]> {
  const { data } = await apiClient.get<OrderItem[]>(`orders/${id}/items/`);
  return data;
}

// POST /api/orders/create_order/
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data } = await apiClient.post<Order>('orders/create_order/', payload);
  return data;
}

// POST /api/orders/{id}/update_status/
export async function updateOrderStatus(
  id: number,
  payload: { paid_status?: OrderPaidStatus; delivery_status?: OrderDeliveryStatus },
): Promise<Order> {
  const { data } = await apiClient.post<Order>(`orders/${id}/update_status/`, payload);
  return data;
}

// DELETE /api/orders/{id}/
export async function deleteOrder(id: number): Promise<void> {
  await apiClient.delete(`orders/${id}/`);
}
// GET /api/orders/{id}/download_receipt/ - Download receipt PDF to device and share
export async function downloadReceiptToDevice(id: number): Promise<void> {
  const FileSystem = require('expo-file-system/legacy');
  const Sharing = require('expo-sharing');

  // Use apiClient so the auth interceptor handles the token automatically
  const response = await apiClient.get(`orders/${id}/download_receipt/`, {
    responseType: 'arraybuffer',
  });

  // Convert ArrayBuffer to base64
  const uint8 = new Uint8Array(response.data as ArrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  const filePath = `${FileSystem.cacheDirectory}order-${id}.pdf`;
  await FileSystem.writeAsStringAsync(filePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/pdf',
      dialogTitle: `Receipt – Order #${id}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}