import { apiFetch } from '@/lib/fetch';
import type { LoginResponse } from '@/types';

export interface QrInitiateResponse {
  code: string;
  expiresIn: number;
}

export type QrStatus = 'pending' | 'authorized' | 'expired';

export interface QrStatusResponse {
  status: QrStatus;
  user?: LoginResponse['user'];
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export async function qrInitiate(): Promise<QrInitiateResponse> {
  return apiFetch<QrInitiateResponse>('/api/auth/qr/initiate', {
    method: 'POST',
  });
}

export async function qrPollStatus(code: string): Promise<QrStatusResponse> {
  return apiFetch<QrStatusResponse>('/api/auth/qr/status', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function qrAuthorize(code: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/api/auth/qr/authorize', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
