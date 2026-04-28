import {create} from 'zustand';
import type {BidWithDriver, RideBidUpdatePayload} from '../shared/types';

const sortByAmountAsc = (bids: BidWithDriver[]): BidWithDriver[] =>
  [...bids].sort((a, b) => a.amount - b.amount);

export interface BidsState {
  rideId: string | null;
  bids: BidWithDriver[];
  setBids: (rideId: string, bids: BidWithDriver[]) => void;
  applyBidUpdate: (payload: RideBidUpdatePayload) => void;
  clearBids: () => void;
}

export const useBidsStore = create<BidsState>()((set, get) => ({
  rideId: null,
  bids: [],

  setBids: (rideId, bids) =>
    set({
      rideId,
      bids: sortByAmountAsc(bids),
    }),

  applyBidUpdate: payload => {
    if (get().rideId !== payload.rideId) {
      return;
    }
    set({bids: sortByAmountAsc(payload.bids)});
  },

  clearBids: () => set({rideId: null, bids: []}),
}));
