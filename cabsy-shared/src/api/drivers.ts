import type { Driver } from '../shared/types';
import { apiFetch } from './client';

interface OnboardDriverInput {
  licenseNo: string;
  vehicleNo: string;
  vehicleModel: string;
}

interface OnboardDriverResponse {
  driver: Driver;
}

export interface EarningsDto {
  todayPaise: number;
  todayRides: number;
  todayMinutesOnline: number;
  weekPaise: number;
  weekRides: number;
}

interface EarningsResponse {
  earnings: EarningsDto;
}

export function onboardDriver(
  input: OnboardDriverInput,
): Promise<OnboardDriverResponse> {
  return apiFetch<OnboardDriverResponse>('/drivers/onboard', {
    method: 'POST',
    body: input,
  });
}

export function getEarnings(): Promise<EarningsResponse> {
  return apiFetch<EarningsResponse>('/drivers/me/earnings', { method: 'GET' });
}
