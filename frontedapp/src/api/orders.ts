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
// GET /api/orders/{id}/download_receipt/ - Download receipt as PDF
export async function downloadOrderReceipt(id: number): Promise<Blob> {
  const { data } = await apiClient.get(`orders/${id}/download_receipt/`, {
    responseType: 'blob',
  });
  return data;
}

// Helper function to trigger receipt download
export async function downloadAndViewReceipt(id: number, orderId?: string): Promise<void> {
  try {
    const blob = await downloadOrderReceipt(id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt-ORD-${orderId || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download receipt:', error);
    throw error;
  }
}