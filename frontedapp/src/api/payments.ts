import apiClient from './client';
import type { Payment, AddPaymentPayload, MPesaTransaction } from '../types';

// POST /api/payments/
export async function addPayment(payload: AddPaymentPayload): Promise<Payment> {
  const { data } = await apiClient.post<Payment>('payments/', payload);
  return data;
}

// GET /api/payments/?order={id}
export async function getOrderPayments(orderId: number): Promise<Payment[]> {
  const { data } = await apiClient.get<Payment[]>('payments/', { params: { order: orderId } });
  return data;
}

// POST /api/mpesa-transactions/stk_push/
export async function initiateSTKPush(payload: {
  order: number;
  phone_number: string;
  amount: number;
}): Promise<MPesaTransaction> {
  const { data } = await apiClient.post<MPesaTransaction>('mpesa-transactions/stk_push/', payload);
  return data;
}

// GET /api/mpesa-transactions/{id}/check_status/
export async function checkMPesaStatus(transactionId: number): Promise<MPesaTransaction> {
  const { data } = await apiClient.get<MPesaTransaction>(
    `mpesa-transactions/${transactionId}/check_status/`,
  );
  return data;
}
