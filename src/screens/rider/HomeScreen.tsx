import React, { useCallback, useEffect, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User as UserIcon } from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Avatar, Body, Button, IconButton } from '@cabsy/shared';
import { colors } from '@cabsy/shared';
import { spacing } from '@cabsy/shared';
import { useAuthStore } from '@cabsy/shared';
import type { RiderStackParamList } from './types';

type Props = NativeStackScreenProps<RiderStackParamList, 'Home'>;

type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

const FALLBACK_REGION: Region = {
  // Bengaluru fallback when permission denied or geolocation fails.
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const result = await Geolocation.requestAuthorization('whenInUse');
    return result === 'granted';
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export default function HomeScreen({ navigation }: Props): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [region, setRegion] = useState<Region | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('requesting');
      const granted = await ensureLocationPermission();
      if (cancelled) return;
      if (!granted) {
        setStatus('denied');
        return;
      }
      Geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setRegion({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
          setStatus('granted');
        },
        () => {
          if (cancelled) return;
          setStatus('error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onProfile = useCallback(() => {
    // Stub: full Profile screen deferred. Logging out is the only action for now.
    void logout();
  }, [logout]);

  const onWhereTo = useCallback(() => {
    navigation.navigate('Book');
  }, [navigation]);

  const mapRegion = region ?? FALLBACK_REGION;

  return (
    <View style={styles.root}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={mapRegion}
        region={region ?? undefined}
        showsUserLocation={status === 'granted'}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none" edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <IconButton
            icon={<UserIcon size={20} color={colors.ink.primary} weight="regular" />}
            onPress={onProfile}
            accessibilityLabel="Profile"
          />
          {user?.name ? (
            <View style={styles.greeting}>
              <Avatar name={user.name} size={32} />
            </View>
          ) : null}
        </View>

        <View style={styles.bottom}>
          {status === 'denied' ? (
            <Body color="secondary" style={styles.permissionNote}>
              Enable location to find rides nearby.
            </Body>
          ) : null}
          <Button
            label="Where to?"
            size="lg"
            fullWidth
            onPress={onWhereTo}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  greeting: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  permissionNote: {
    marginBottom: spacing.md,
  },
});
