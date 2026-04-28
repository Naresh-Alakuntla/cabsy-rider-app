import 'react-native-gesture-handler';
/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// FCM background message handler — REQUIRED for Android to deliver push when
// the app is killed/backgrounded. Must be registered at module top-level
// (before AppRegistry.registerComponent), not inside a component lifecycle.
setBackgroundMessageHandler(getMessaging(), async () => {
  // No-op: the system tray notification is rendered by FCM itself when the
  // payload includes a `notification` block. If we later need to act on
  // data-only payloads (e.g. silent ride-cancelled clean-ups) wire it here.
});

AppRegistry.registerComponent(appName, () => App);
