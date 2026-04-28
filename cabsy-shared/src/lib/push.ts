import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { setFcmToken } from '../api/users';
import { publishPushMessage } from './pushBanner';

// Request user permission. iOS requires explicit auth; Android 13+ requires
// POST_NOTIFICATIONS at runtime — RNFirebase handles both via requestPermission.
async function ensurePermission(): Promise<boolean> {
  try {
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

let unsubTokenRefresh: (() => void) | null = null;

export async function registerFCM(): Promise<void> {
  const granted = await ensurePermission();
  if (!granted) {
    console.log('[push] permission not granted');
    return;
  }

  // On iOS the APNs token must be ready before getToken resolves; RNFirebase
  // awaits it internally, but if the bundle ID/entitlements aren't set up the
  // call throws — we catch and continue.
  try {
    const token = await messaging().getToken();
    if (token) {
      await setFcmToken(token).catch((err: unknown) => {
        console.log('[push] failed to register token with backend', err);
      });
    }
  } catch (err) {
    console.log('[push] getToken failed', err);
  }

  if (unsubTokenRefresh) {
    unsubTokenRefresh();
    unsubTokenRefresh = null;
  }
  unsubTokenRefresh = messaging().onTokenRefresh((next) => {
    void setFcmToken(next).catch(() => undefined);
  });

  if (Platform.OS === 'ios') {
    // No-op: iOS automatically registers for remote messages when the app
    // initializes Firebase. Kept here as the documented hook point for any
    // future provisional-auth or APNs-specific behaviour.
  }
}

export function setupForegroundHandler(): () => void {
  // Foreground FCM messages are surfaced via the in-app banner bus (PushBannerHost).
  const unsub = messaging().onMessage(async (msg) => {
    const title = msg.notification?.title;
    const body = msg.notification?.body;
    if (title && body) {
      const data = msg.data as Record<string, string> | undefined;
      publishPushMessage({ title, body, data });
    }
  });
  return unsub;
}
