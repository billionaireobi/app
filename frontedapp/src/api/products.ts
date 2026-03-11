import apiClient from './client';
import type { Category, Product, ProductListItem, PaginatedResponse, CustomerCategory } from '../types';

// GET /api/categories/
export async function getCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<PaginatedResponse<Category>>('categories/');
  return data.results ?? (data as unknown as Category[]);
}

// GET /api/products/?search=&category=&status=
export async function getProducts(params?: {
  search?: string;
  category?: number;
  status?: string;
  page?: number;
}): Promise<PaginatedResponse<ProductListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<ProductListItem>>('products/', { params });
  return data;
}

// GET /api/products/{id}/
export async function getProduct(id: number): Promise<Product> {
  const { data } = await apiClient.get<Product>(`products/${id}/`);
  return data;
}

// GET /api/products/{id}/price_by_category/?category=factory&vat_variation=with_vat
export async function getProductPriceByCategory(
  id: number,
  category: CustomerCategory,
  vatVariation?: 'with_vat' | 'without_vat',
): Promise<{ 
  product_id: number; 
  product_name: string; 
  customer_category: string;
  price_without_vat: number;
  price_with_vat: number;
  vat_variation: string;
  selected_price: number;
  stock: { mcdave: number; kisii: number; offshore: number; total: number };
}> {
  const params: any = { category };
  if (vatVariation) {
    params.vat_variation = vatVariation;
  }
  const { data } = await apiClient.get(`products/${id}/price_by_category/`, { params });
  return data;
}

// GET /api/products/low_stock/
export async function getLowStockProducts(): Promise<ProductListItem[]> {
  const { data } = await apiClient.get<ProductListItem[]>('products/low_stock/');
  return data;
}

// POST /api/products/
export async function createProduct(payload: Partial<Product>): Promise<Product> {
  const { data } = await apiClient.post<Product>('products/', payload);
  return data;
}

// PUT /api/products/{id}/
export async function updateProduct(id: number, payload: Partial<Product>): Promise<Product> {
  const { data } = await apiClient.patch<Product>(`products/${id}/`, payload);
  return data;
}
