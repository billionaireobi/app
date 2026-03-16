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

// POST /api/feedback/submit_feedback/
// Uses multipart/FormData so the photo is sent as a real file (avoids base64 overhead and nginx body-size limits).
export async function submitFeedback(payload: {
  customer_id: number;
  shop_name: string;
  contact_person: string;
  exact_location: string;
  phone_number: string;
  feedback_type: FeedbackType;
  rating: number;
  comment: string;
  photo_uri?: string;
  latitude?: number;
  longitude?: number;
}): Promise<CustomerFeedback> {
  const formData = new FormData();
  formData.append('customer_id', String(payload.customer_id));
  formData.append('shop_name', payload.shop_name);
  formData.append('contact_person', payload.contact_person);
  formData.append('exact_location', payload.exact_location);
  formData.append('phone_number', payload.phone_number);
  formData.append('feedback_type', payload.feedback_type);
  formData.append('rating', String(payload.rating));
  formData.append('comment', payload.comment);
  if (payload.latitude != null) formData.append('latitude', String(payload.latitude));
  if (payload.longitude != null) formData.append('longitude', String(payload.longitude));
  if (payload.photo_uri) {
    (formData as any).append('photo', {
      uri: payload.photo_uri,
      type: 'image/jpeg',
      name: `feedback_${Date.now()}.jpg`,
    });
  }
  const { data } = await apiClient.post<CustomerFeedback>('feedback/submit_feedback/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (d) => d,
  });
  return data;
}
