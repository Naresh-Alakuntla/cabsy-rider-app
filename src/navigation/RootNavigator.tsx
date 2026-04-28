import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

import {
  AppRoleProvider,
  colors,
  connectSocket,
  disconnectSocket,
  registerFCM,
  setupForegroundHandler,
  typography,
  useAuthStore,
} from '@cabsy/shared';

import { AuthStack } from './AuthStack';
import { RiderStack } from './RiderStack';
import { linking } from './types';

// Kick hydration off as soon as the module loads so storage I/O overlaps with
// React's first render. The store guards against double hydration internally.
void useAuthStore.getState().hydrate();

function BootSplash(): React.JSX.Element {
  return (
    <View style={styles.splash}>
      <Text style={styles.wordmark}>Cabsy</Text>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function RootNavigator(): React.JSX.Element {
  const hydrated = useAuthStore(state => state.hydrated);
  const accessToken = useAuthStore(state => state.accessToken);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }
    connectSocket(accessToken);
    return () => {
      disconnectSocket();
    };
  }, [accessToken]);

  // Push registration is best-effort: if Firebase isn't configured (no
  // google-services.json / GoogleService-Info.plist) the call throws at
  // module init. We swallow and continue rather than crash the app.
  useEffect(() => {
    if (!accessToken) return;
    let unsub: (() => void) | null = null;
    try {
      void registerFCM().catch((err) => {
        console.log('[push] registerFCM failed', err);
      });
      unsub = setupForegroundHandler();
    } catch (err) {
      console.log('[push] not configured', err);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [accessToken]);

  if (!hydrated) {
    return <BootSplash />;
  }

  const content = accessToken ? <RiderStack /> : <AuthStack />;

  return (
    <AppRoleProvider role="rider">
      <NavigationContainer linking={linking}>{content}</NavigationContainer>
    </AppRoleProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.primary,
    gap: 24,
  },
  wordmark: {
    color: colors.ink.primary,
    fontSize: typography.heading.fontSize,
    lineHeight: typography.heading.lineHeight,
    fontWeight: typography.heading.fontWeight,
  },
});
