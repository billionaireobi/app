import apiClient from './client';
import type { LoginCredentials, LoginResponse, UserProfile } from '../types';

// POST /api/auth/login/post/
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('auth/login/post/', credentials);
  return data;
}

// POST /api/auth/logout/post/
export async function logout(): Promise<void> {
  await apiClient.post('auth/logout/post/');
}

// GET /api/users/profile/me/
export async function getMyProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>('users/profile/me/');
  return data;
}

// PUT /api/users/profile/update_profile/
export async function updateProfile(payload: Partial<UserProfile['user']> & {
  phone?: string;
  department?: string;
}): Promise<UserProfile> {
  const { data } = await apiClient.put<UserProfile>('users/profile/update_profile/', payload);
  return data;
}

// POST /api/auth/password-reset/request/
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('auth/password-reset/request/', { email });
  return data;
}

// POST /api/auth/password-reset/confirm/
export async function confirmPasswordReset(payload: {
  token: string;
  new_password: string;
}): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('auth/password-reset/confirm/', payload);
  return data;
}
