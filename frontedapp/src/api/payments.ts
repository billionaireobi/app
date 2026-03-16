import apiClient from './client';
import type { Payment, AddPaymentPayload, MPesaTransaction, BuniTransaction } from '../types';

export interface AddPaymentResponse {
  payment: Payment;
  order_update: {
    id: number;
    paid_status: string;
    amount_paid: number;
    total_amount: number;
  };
}

// POST /api/payments/add_payment/
export async function addPayment(payload: AddPaymentPayload): Promise<AddPaymentResponse> {
  const { data } = await apiClient.post<AddPaymentResponse>('payments/add_payment/', payload);
  return data;
}

// GET /api/payments/?order={id}
export async function getOrderPayments(orderId: number): Promise<Payment[]> {
  const { data } = await apiClient.get<Payment[]>('payments/', { params: { order: orderId } });
  return data;
}

// ── M-Pesa ────────────────────────────────────────────────────────────────────

// POST /api/mpesa-transactions/stk_push/
export async function initiateSTKPush(payload: {
  order_id: number;
  phone_number: string;
  amount: number;
}): Promise<MPesaTransaction> {
  const { data } = await apiClient.post<MPesaTransaction>(
    'mpesa-transactions/stk_push/',
    payload,
  );
  return data;
}

// GET /api/mpesa-transactions/{id}/check_status/
export async function checkMPesaStatus(transactionId: number): Promise<MPesaTransaction> {
  const { data } = await apiClient.get<MPesaTransaction>(
    `mpesa-transactions/${transactionId}/check_status/`,
  );
  return data;
}

// ── KCB Buni ──────────────────────────────────────────────────────────────────

// POST /api/buni-transactions/initiate/
export async function initiateBuniPayment(payload: {
  order_id: number;
  phone_number: string;
  amount: number;
}): Promise<BuniTransaction> {
  const { data } = await apiClient.post<BuniTransaction>(
    'buni-transactions/initiate/',
    payload,
  );
  return data;
}

// GET /api/buni-transactions/{id}/check_status/
export async function checkBuniStatus(transactionId: number): Promise<BuniTransaction> {
  const { data } = await apiClient.get<BuniTransaction>(
    `buni-transactions/${transactionId}/check_status/`,
  );
  return data;
}
