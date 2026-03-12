import apiClient from './client';
import type { CustomerFeedback, FeedbackType, PaginatedResponse } from '../types';

// GET /api/feedback/?rating=&type=
export async function getFeedback(params?: {
  rating?: number;
  feedback_type?: FeedbackType;
  page?: number;
}): Promise<PaginatedResponse<CustomerFeedback>> {
  const { data } = await apiClient.get<PaginatedResponse<CustomerFeedback>>('feedback/', { params });
  return data;
}

// GET /api/feedback/{id}/
export async function getFeedbackDetail(id: number): Promise<CustomerFeedback> {
  const { data } = await apiClient.get<CustomerFeedback>(`feedback/${id}/`);
  return data;
}

// POST /api/feedback/submit_feedback/ - Submit customer feedback
export async function submitFeedback(payload: {
  customer_id: number;
  shop_name: string;
  contact_person: string;
  exact_location: string;
  phone_number: string;
  feedback_type: FeedbackType;
  rating: number;
  comment: string;
  photo_base64?: string;
  latitude?: number;
  longitude?: number;
}): Promise<CustomerFeedback> {
  const { data } = await apiClient.post<CustomerFeedback>('feedback/submit_feedback/', payload);
  return data;
}
