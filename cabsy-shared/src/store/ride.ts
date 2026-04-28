import {create} from 'zustand';
import type {
  Ride,
  RideAssignedPayload,
  RideCancelledPayload,
  RideCompletedPayload,
  RideExpiredPayload,
  RideStartedPayload,
} from '../shared/types';

// We carry the assigned driver's enriched profile in-memory only — the rider
// tracking screen needs name + phone + plate without an extra round-trip.
export type AssignedDriver = RideAssignedPayload['driver'];

export interface RideState {
  currentRide: Ride | null;
  driver: AssignedDriver | null;
  setRide: (ride: Ride) => void;
  clearRide: () => void;
  applyAssignment: (payload: RideAssignedPayload) => void;
  applyStarted: (payload: RideStartedPayload) => void;
  applyCompleted: (payload: RideCompletedPayload) => void;
  applyCancelled: (payload: RideCancelledPayload) => void;
  applyExpired: (payload: RideExpiredPayload) => void;
}

export const useRideStore = create<RideState>()(set => ({
  currentRide: null,
  driver: null,

  setRide: ride => set({currentRide: ride}),

  clearRide: () => set({currentRide: null, driver: null}),

  applyAssignment: payload =>
    set(state => {
      if (!state.currentRide || state.currentRide.id !== payload.ride.id) {
        return state;
      }
      return {
        currentRide: {
          ...state.currentRide,
          status: 'assigned',
          assignedDriverId: payload.bid.driverId,
          finalFare: payload.bid.amount,
        },
        driver: payload.driver,
      };
    }),

  applyStarted: payload =>
    set(state => {
      if (!state.currentRide || state.currentRide.id !== payload.rideId) {
        return state;
      }
      return {
        currentRide: {
          ...state.currentRide,
          status: 'started',
          startedAt: payload.startedAt,
        },
      };
    }),

  applyCompleted: payload =>
    set(state => {
      if (!state.currentRide || state.currentRide.id !== payload.rideId) {
        return state;
      }
      return {
        currentRide: {
          ...state.currentRide,
          status: 'completed',
          completedAt: payload.completedAt,
          finalFare: payload.finalFare,
        },
      };
    }),

  applyCancelled: payload =>
    set(state => {
      if (!state.currentRide || state.currentRide.id !== payload.rideId) {
        return state;
      }
      return {
        currentRide: {
          ...state.currentRide,
          status: 'cancelled',
        },
      };
    }),

  applyExpired: payload =>
    set(state => {
      if (!state.currentRide || state.currentRide.id !== payload.rideId) {
        return state;
      }
      return {
        currentRide: {
          ...state.currentRide,
          status: 'expired',
        },
      };
    }),
}));
