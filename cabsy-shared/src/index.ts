// Barrel re-exports for ergonomic single-import usage from apps.

export * from './api';
export * from './socket';
export * from './shared/events';
export * from './shared/types';
export * from './shared/schemas';
export * from './theme';
export * from './components/ui';
export * from './lib/firebaseAuth';
export * from './lib/push';
export * from './lib/pushBanner';
export * from './lib/appRole';
export * from './lib/places';

// `store` would re-export AuthTokens, which collides with shared/types.AuthTokens
// (different shape: store uses {access, refresh} for the in-memory tuple while
// shared/types uses the wire-shape {accessToken, refreshToken}). Re-export the
// store members explicitly to avoid the ambiguity.
export {
  useAuthStore,
  useRideStore,
  useBidsStore,
} from './store';
export type {
  AuthState,
  AuthTokens as StoreAuthTokens,
  RideState,
  BidsState,
} from './store';

// Auth screens are shared (LoginPhone + OtpVerify), exported as defaults.
export { default as LoginPhoneScreen } from './screens/auth/LoginPhoneScreen';
export { default as OtpVerifyScreen } from './screens/auth/OtpVerifyScreen';
export type { AuthStackParamList } from './screens/auth/types';
