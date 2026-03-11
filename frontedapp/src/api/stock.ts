import apiClient from './client';
import type {
  StockMovement,
  StockTransfer,
  StockAdjustment,
  StockAlert,
  StoreLocation,
  PaginatedResponse,
} from '../types';

// GET /api/stock/movements/?product=&store=
export async function getStockMovements(params?: {
  product?: number;
  store?: StoreLocation;
  page?: number;
}): Promise<PaginatedResponse<StockMovement>> {
  const { data } = await apiClient.get<PaginatedResponse<StockMovement>>('stock/movements/', { params });
  return data;
}

// GET /api/stock/transfers/
export async function getStockTransfers(): Promise<PaginatedResponse<StockTransfer>> {
  const { data } = await apiClient.get<PaginatedResponse<StockTransfer>>('stock/transfers/');
  return data;
}

// GET /api/stock/transfers/pending/
export async function getPendingTransfers(): Promise<StockTransfer[]> {
  const { data } = await apiClient.get<StockTransfer[]>('stock/transfers/pending/');
  return data;
}

// POST /api/stock/transfers/
export async function createStockTransfer(payload: {
  from_store: StoreLocation;
  to_store: StoreLocation;
  items: { product: number; quantity: number }[];
}): Promise<StockTransfer> {
  const { data } = await apiClient.post<StockTransfer>('stock/transfers/', payload);
  return data;
}

// POST /api/stock/transfers/{id}/confirm_receipt/
export async function confirmStockTransfer(id: number): Promise<StockTransfer> {
  const { data } = await apiClient.post<StockTransfer>(`stock/transfers/${id}/confirm_receipt/`);
  return data;
}

// POST /api/stock/adjustments/
export async function createStockAdjustment(payload: {
  product: number;
  store: StoreLocation;
  quantity_change: number;
  reason: string;
}): Promise<StockAdjustment> {
  const { data } = await apiClient.post<StockAdjustment>('stock/adjustments/', payload);
  return data;
}

// GET /api/stock/alerts/
export async function getStockAlerts(): Promise<StockAlert[]> {
  const { data } = await apiClient.get<StockAlert[]>('stock/alerts/');
  return data;
}
