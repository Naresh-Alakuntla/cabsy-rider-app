import type { Ride } from '../shared/types';
import { apiFetch } from './client';

interface Place {
  lat: number;
  lng: number;
  address: string;
}

interface CreateRideInput {
  pickup: Place;
  drop: Place;
}

interface CreateRideResponse {
  rideId: string;
  suggestedFare: number;
  biddingEndsAt: string;
}

interface RideResponse {
  ride: Ride;
}

export interface RideHistoryPage {
  rides: Ride[];
  nextCursor: string | null;
}

export function createRide(input: CreateRideInput): Promise<CreateRideResponse> {
  return apiFetch<CreateRideResponse>('/rides', {
    method: 'POST',
    body: input,
  });
}

export function getRide(rideId: string): Promise<RideResponse> {
  return apiFetch<RideResponse>(`/rides/${encodeURIComponent(rideId)}`, {
    method: 'GET',
  });
}

export function getRideHistory(
  cursor?: string,
  limit: number = 20,
): Promise<RideHistoryPage> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  const qs = params.toString();
  const path = qs ? `/rides/history?${qs}` : '/rides/history';
  return apiFetch<RideHistoryPage>(path, { method: 'GET' });
}
