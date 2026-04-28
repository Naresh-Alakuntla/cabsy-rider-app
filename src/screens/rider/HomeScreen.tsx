import React, { useCallback, useEffect, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Briefcase,
  Clock,
  House,
  MagnifyingGlass,
  NavigationArrow,
  User as UserIcon,
} from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Body,
  Caption,
  IconButton,
  Title,
} from '@cabsy/shared';
import { colors } from '@cabsy/shared';
import { radius } from '@cabsy/shared';
import { spacing } from '@cabsy/shared';
import { useAuthStore } from '@cabsy/shared';
import type { RiderStackParamList } from './types';

type Props = NativeStackScreenProps<RiderStackParamList, 'Home'>;

type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

const FALLBACK_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Light/silver Google Maps style — desaturated palette so route polylines and
// purple driver pins stay visually dominant.
const SILVER_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
];

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

interface SavedPlace {
  key: string;
  label: string;
  icon: React.ReactNode;
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
    void logout();
  }, [logout]);

  const onWhereTo = useCallback(() => {
    navigation.navigate('Book');
  }, [navigation]);

  const onRecenter = useCallback(() => {
    if (status !== 'granted') return;
    Geolocation.getCurrentPosition(
      (pos) => {
        setRegion({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
    );
  }, [status]);

  const mapRegion = region ?? FALLBACK_REGION;

  const savedPlaces: SavedPlace[] = [
    {
      key: 'home',
      label: 'Home',
      icon: <House size={18} color={colors.ink.primary} weight="regular" />,
    },
    {
      key: 'work',
      label: 'Work',
      icon: <Briefcase size={18} color={colors.ink.primary} weight="regular" />,
    },
  ];

  const greetingName = user?.name?.split(' ')[0];

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
        customMapStyle={SILVER_MAP_STYLE}
      />

      <SafeAreaView
        style={styles.overlay}
        pointerEvents="box-none"
        edges={['top']}
      >
        <View style={styles.topBar} pointerEvents="box-none">
          <IconButton
            icon={<UserIcon size={20} color={colors.ink.primary} weight="regular" />}
            onPress={onProfile}
            accessibilityLabel="Profile"
          />
          <View pointerEvents="none" style={styles.topSpacer} />
          {status === 'granted' ? (
            <IconButton
              icon={
                <NavigationArrow
                  size={20}
                  color={colors.ink.primary}
                  weight="fill"
                />
              }
              onPress={onRecenter}
              accessibilityLabel="Recenter"
            />
          ) : null}
        </View>
      </SafeAreaView>

      <SafeAreaView
        edges={['bottom']}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {greetingName ? (
            <Title color="primary" style={styles.greeting}>
              {`Hi ${greetingName}, where to?`}
            </Title>
          ) : (
            <Title color="primary" style={styles.greeting}>
              Where are you going?
            </Title>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Where to"
            onPress={onWhereTo}
            style={({ pressed }) => [
              styles.searchBar,
              pressed ? styles.searchBarPressed : null,
            ]}
          >
            <MagnifyingGlass size={20} color={colors.ink.secondary} weight="regular" />
            <Body color="secondary" style={styles.searchText}>
              Where to?
            </Body>
            <View style={styles.laterPill}>
              <Clock size={14} color={colors.ink.primary} weight="regular" />
              <Caption color="primary" style={styles.laterText}>
                Now
              </Caption>
            </View>
          </Pressable>

          <View style={styles.savedRow}>
            {savedPlaces.map((p) => (
              <Pressable
                key={p.key}
                onPress={onWhereTo}
                accessibilityRole="button"
                accessibilityLabel={`Set ${p.label}`}
                style={({ pressed }) => [
                  styles.savedItem,
                  pressed ? styles.savedItemPressed : null,
                ]}
              >
                <View style={styles.savedIconWrap}>{p.icon}</View>
                <View style={styles.savedTextCol}>
                  <Body color="primary" style={styles.savedLabel}>
                    {p.label}
                  </Body>
                  <Caption color="secondary">Add address</Caption>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.promoCard}>
            <View style={styles.promoTextCol}>
              <Caption color="accent" style={styles.promoEyebrow}>
                Cabsy Bid
              </Caption>
              <Body color="primary" style={styles.promoTitle}>
                Set your price. Drivers compete.
              </Body>
            </View>
            <View style={styles.promoBadge}>
              <Caption color="onAccent" style={styles.promoBadgeText}>
                NEW
              </Caption>
            </View>
          </View>

          {status === 'denied' ? (
            <Caption color="secondary" style={styles.permissionNote}>
              Enable location to find rides nearby.
            </Caption>
          ) : null}
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
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  topSpacer: {
    flex: 1,
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5D5DA',
    marginBottom: spacing.base,
  },
  greeting: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    marginBottom: spacing.base,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.input,
    paddingHorizontal: spacing.base,
    height: 56,
  },
  searchBarPressed: {
    backgroundColor: '#E8E8EC',
  },
  searchText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
  },
  laterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  laterText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  savedRow: {
    flexDirection: 'row',
    marginTop: spacing.base,
  },
  savedItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.card,
  },
  savedItemPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  savedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  savedTextCol: {
    flex: 1,
  },
  savedLabel: {
    fontWeight: '600',
  },
  promoCard: {
    marginTop: spacing.base,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.card,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoTextCol: {
    flex: 1,
  },
  promoEyebrow: {
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  promoTitle: {
    marginTop: 4,
    fontWeight: '600',
  },
  promoBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.chip,
    marginLeft: spacing.sm,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  permissionNote: {
    marginTop: spacing.base,
    textAlign: 'center',
  },
});
