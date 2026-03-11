import apiClient from './client';
import type { Customer, Order, PaginatedResponse } from '../types';

// GET /api/customers/?search=&category=
export async function getCustomers(params?: {
  search?: string;
  category?: string;
  page?: number;
}): Promise<PaginatedResponse<Customer>> {
  const { data } = await apiClient.get<PaginatedResponse<Customer>>('customers/', { params });
  return data;
}

// GET /api/customers/{id}/
export async function getCustomer(id: number): Promise<Customer> {
  const { data } = await apiClient.get<Customer>(`customers/${id}/`);
  return data;
}

// GET /api/customers/{id}/orders/
export async function getCustomerOrders(id: number): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>(`customers/${id}/orders/`);
  return data;
}

// POST /api/customers/
export async function createCustomer(payload: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
  const { data } = await apiClient.post<Customer>('customers/', payload);
  return data;
}

// PATCH /api/customers/{id}/
export async function updateCustomer(id: number, payload: Partial<Customer>): Promise<Customer> {
  const { data } = await apiClient.patch<Customer>(`customers/${id}/`, payload);
  return data;
}

// DELETE /api/customers/{id}/
export async function deleteCustomer(id: number): Promise<void> {
  await apiClient.delete(`customers/${id}/`);
}
