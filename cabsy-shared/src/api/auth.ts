import type { User } from '../shared/types';
import { apiFetch, getRefreshToken, setTokens } from './client';

interface OtpRequestResponse {
  ok: true;
}

interface OtpVerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface RefreshResponse {
  accessToken: string;
}

export function otpRequest(phone: string): Promise<OtpRequestResponse> {
  return apiFetch<OtpRequestResponse>('/auth/otp/request', {
    method: 'POST',
    body: { phone },
    auth: false,
  });
}

export async function otpVerify(
  phone: string,
  firebaseIdToken: string,
): Promise<OtpVerifyResponse> {
  const result = await apiFetch<OtpVerifyResponse>('/auth/otp/verify', {
    method: 'POST',
    body: { phone, firebaseIdToken },
    auth: false,
  });
  await setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function refresh(): Promise<RefreshResponse> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  return apiFetch<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    auth: false,
  });
}
