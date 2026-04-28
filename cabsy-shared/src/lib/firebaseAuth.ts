// Firebase Auth requires google-services.json (Android) and GoogleService-Info.plist (iOS) — user must provision.
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

export async function requestOtp(phoneE164: string): Promise<void> {
  confirmation = await auth().signInWithPhoneNumber(phoneE164);
}

export async function verifyOtp(code: string): Promise<string> {
  if (!confirmation) {
    throw new Error('No OTP confirmation in flight. Request a code first.');
  }
  await confirmation.confirm(code);
  const idToken = await auth().currentUser?.getIdToken();
  if (!idToken) {
    throw new Error('Firebase verified but no ID token available.');
  }
  confirmation = null;
  return idToken;
}

export function clearOtpFlow(): void {
  confirmation = null;
}
