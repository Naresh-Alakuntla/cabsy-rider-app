import type { User } from '../shared/types';
import { apiFetch } from './client';

interface MeResponse {
  user: User;
}

export function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/me', { method: 'GET' });
}

export function patchMe(patch: { name?: string }): Promise<MeResponse> {
  return apiFetch<MeResponse>('/me', { method: 'PATCH', body: patch });
}

export function setFcmToken(token: string): Promise<void> {
  return apiFetch<void>('/me/fcm-token', {
    method: 'PATCH',
    body: { token },
  });
}
