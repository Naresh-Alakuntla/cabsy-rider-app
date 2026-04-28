// Firebase Auth requires google-services.json (Android) and GoogleService-Info.plist (iOS) — user must provision.
//
// Modular API (firebase-web v9+ style) — required by @react-native-firebase v22+.
// The old `auth()` namespaced API is deprecated and will be removed in the next major.
import {
  getAuth,
  getIdToken,
  signInWithPhoneNumber,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';

let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

export async function requestOtp(phoneE164: string): Promise<void> {
  confirmation = await signInWithPhoneNumber(getAuth(), phoneE164);
}

export async function verifyOtp(code: string): Promise<string> {
  if (!confirmation) {
    throw new Error('No OTP confirmation in flight. Request a code first.');
  }
  await confirmation.confirm(code);
  const user = getAuth().currentUser;
  if (!user) {
    throw new Error('Firebase verified but no current user.');
  }
  const idToken = await getIdToken(user);
  if (!idToken) {
    throw new Error('Firebase verified but no ID token available.');
  }
  confirmation = null;
  return idToken;
}

export function clearOtpFlow(): void {
  confirmation = null;
}
