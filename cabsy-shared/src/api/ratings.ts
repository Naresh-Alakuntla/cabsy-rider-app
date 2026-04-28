import type { Rating } from '../shared/types';
import { apiFetch } from './client';

interface RateRideInput {
  stars: number;
  comment?: string;
}

interface RateRideResponse {
  rating: Rating;
}

export function rateRide(
  rideId: string,
  input: RateRideInput,
): Promise<RateRideResponse> {
  return apiFetch<RateRideResponse>(
    `/rides/${encodeURIComponent(rideId)}/rate`,
    {
      method: 'POST',
      body: input,
    },
  );
}
