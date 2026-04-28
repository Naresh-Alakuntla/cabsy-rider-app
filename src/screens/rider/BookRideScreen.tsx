import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Car, Lightning, UsersThree } from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Body,
  Button,
  Caption,
  IconButton,
  PlacesAutocompleteInput,
  Title,
} from '@cabsy/shared';
import { colors } from '@cabsy/shared';
import { radius } from '@cabsy/shared';
import { spacing } from '@cabsy/shared';
import * as apiRides from '@cabsy/shared';
import { ApiError } from '@cabsy/shared';
import { useRideStore } from '@cabsy/shared';
import { useBidsStore } from '@cabsy/shared';
import { useAuthStore } from '@cabsy/shared';
import {
  connectSocket,
  isSocketConnected,
  riderEvents,
} from '@cabsy/shared';
import {
  makeSessionToken,
  PlacesError,
  type PlaceDetails,
} from '@cabsy/shared';
import type { Ride } from '@cabsy/shared';
import type { RiderStackParamList } from './types';

type Props = NativeStackScreenProps<RiderStackParamList, 'Book'>;

const FALLBACK_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const PICKUP_DEFAULT_LABEL = 'Current location';
const MAX_RECENT_CHIPS = 5;

const SILVER_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
];

interface DropSelection {
  address: string;
  lat: number;
  lng: number;
}

interface CarClass {
  key: 'go' | 'premier' | 'xl';
  name: string;
  icon: React.ReactNode;
  description: string;
  multiplier: number;
  etaMin: number;
}

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

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function estimateFare(km: number): number {
  const base = 40;
  const perKm = 14;
  return Math.max(60, Math.round(base + perKm * km));
}

interface RecentDrop {
  address: string;
  lat: number;
  lng: number;
}

function uniqueRecentDrops(rides: Ride[], limit: number): RecentDrop[] {
  const seen = new Set<string>();
  const out: RecentDrop[] = [];
  for (const r of rides) {
    const key = r.dropAddress.trim().toLowerCase();
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    out.push({
      address: r.dropAddress,
      lat: r.dropLat,
      lng: r.dropLng,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export default function BookRideScreen({
  navigation,
}: Props): React.JSX.Element {
  const setRide = useRideStore((s) => s.setRide);
  const clearBids = useBidsStore((s) => s.clearBids);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [pickupCoord, setPickupCoord] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupResolved, setPickupResolved] = useState(false);

  const [dropAddress, setDropAddress] = useState('');
  const [dropSelection, setDropSelection] = useState<DropSelection | null>(
    null,
  );

  const [recentDrops, setRecentDrops] = useState<RecentDrop[]>([]);
  const [placesUnavailable, setPlacesUnavailable] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedClass, setSelectedClass] = useState<CarClass['key']>('go');

  const sessionToken = useMemo(() => makeSessionToken(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const granted = await ensureLocationPermission();
      if (!granted || cancelled) return;
      Geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setPickupCoord({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setPickupAddress((prev) =>
            prev.length === 0 ? PICKUP_DEFAULT_LABEL : prev,
          );
        },
        () => undefined,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await apiRides.getRideHistory(undefined, 20);
        if (cancelled) return;
        setRecentDrops(uniqueRecentDrops(page.rides, MAX_RECENT_CHIPS));
      } catch {
        // recent locations are convenience-only.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Frame the map around both points when both are set, otherwise around pickup.
  const region: Region = useMemo(() => {
    if (pickupCoord && dropSelection) {
      const midLat = (pickupCoord.lat + dropSelection.lat) / 2;
      const midLng = (pickupCoord.lng + dropSelection.lng) / 2;
      const dLat = Math.abs(pickupCoord.lat - dropSelection.lat) * 1.6 + 0.01;
      const dLng = Math.abs(pickupCoord.lng - dropSelection.lng) * 1.6 + 0.01;
      return {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: dLat,
        longitudeDelta: dLng,
      };
    }
    if (!pickupCoord) return FALLBACK_REGION;
    return {
      latitude: pickupCoord.lat,
      longitude: pickupCoord.lng,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }, [pickupCoord, dropSelection]);

  const distanceKm = useMemo(() => {
    if (!pickupCoord || !dropSelection) return null;
    return haversineKm(pickupCoord, dropSelection);
  }, [pickupCoord, dropSelection]);

  const carClasses: CarClass[] = useMemo(
    () => [
      {
        key: 'go',
        name: 'Cabsy Go',
        icon: <Car size={28} color={colors.ink.primary} weight="fill" />,
        description: 'Affordable, everyday rides',
        multiplier: 1,
        etaMin: 3,
      },
      {
        key: 'premier',
        name: 'Premier',
        icon: <Lightning size={28} color={colors.ink.primary} weight="fill" />,
        description: 'Newer cars, top-rated drivers',
        multiplier: 1.35,
        etaMin: 5,
      },
      {
        key: 'xl',
        name: 'Cabsy XL',
        icon: <UsersThree size={28} color={colors.ink.primary} weight="fill" />,
        description: 'Up to 6 seats',
        multiplier: 1.7,
        etaMin: 7,
      },
    ],
    [],
  );

  const fareFor = useCallback(
    (cc: CarClass): number => {
      if (distanceKm === null) return 0;
      return Math.round(estimateFare(distanceKm) * cc.multiplier);
    },
    [distanceKm],
  );

  const buttonLabel = useMemo(() => {
    if (!pickupCoord || !dropSelection) {
      return 'Find drivers';
    }
    const cc = carClasses.find((c) => c.key === selectedClass) ?? carClasses[0];
    const fare = fareFor(cc);
    return `Confirm ${cc.name} · ₹${fare}`;
  }, [pickupCoord, dropSelection, carClasses, selectedClass, fareFor]);

  const canSubmit =
    !!pickupCoord &&
    pickupAddress.trim().length > 0 &&
    !!dropSelection &&
    !placesUnavailable;

  const onPickupSelect = useCallback((place: PlaceDetails) => {
    setPickupCoord({ lat: place.lat, lng: place.lng });
    setPickupAddress(place.address);
    setPickupResolved(true);
  }, []);

  const onPickupChangeText = useCallback((text: string) => {
    setPickupAddress(text);
    if (text !== PICKUP_DEFAULT_LABEL) {
      setPickupResolved(false);
    }
  }, []);

  const onDropChangeText = useCallback(
    (text: string) => {
      setDropAddress(text);
      if (dropSelection && text !== dropSelection.address) {
        setDropSelection(null);
      }
    },
    [dropSelection],
  );

  const onDropSelect = useCallback((place: PlaceDetails) => {
    setDropSelection({
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    });
    setDropAddress(place.address);
  }, []);

  const onRecent = useCallback((recent: RecentDrop) => {
    setDropAddress(recent.address);
    setDropSelection({
      address: recent.address,
      lat: recent.lat,
      lng: recent.lng,
    });
  }, []);

  const onSubmit = useCallback(async () => {
    if (!pickupCoord || !dropSelection || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const pickupAddrFinal = pickupResolved
        ? pickupAddress.trim()
        : pickupAddress.trim().length > 0
          ? pickupAddress.trim()
          : PICKUP_DEFAULT_LABEL;

      const result = await apiRides.createRide({
        pickup: {
          lat: pickupCoord.lat,
          lng: pickupCoord.lng,
          address: pickupAddrFinal,
        },
        drop: {
          lat: dropSelection.lat,
          lng: dropSelection.lng,
          address: dropSelection.address,
        },
      });

      const stubRide: Ride = {
        id: result.rideId,
        riderId: '',
        pickupLat: pickupCoord.lat,
        pickupLng: pickupCoord.lng,
        pickupAddress: pickupAddrFinal,
        dropLat: dropSelection.lat,
        dropLng: dropSelection.lng,
        dropAddress: dropSelection.address,
        distanceKm: haversineKm(pickupCoord, dropSelection),
        durationMinutes: null,
        polyline: null,
        suggestedFare: result.suggestedFare,
        status: 'bidding',
        assignedDriverId: null,
        finalFare: null,
        biddingEndsAt: result.biddingEndsAt,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
      };
      setRide(stubRide);
      clearBids();

      if (accessToken && !isSocketConnected()) {
        connectSocket(accessToken);
      }
      try {
        await riderEvents.joinRide(result.rideId);
      } catch {
        // best-effort.
      }

      navigation.replace('Bid');
    } catch (e) {
      if (e instanceof PlacesError) {
        setError('Address search failed. Try again?');
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Couldn't create your ride. Try again?");
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    pickupCoord,
    pickupAddress,
    pickupResolved,
    dropSelection,
    submitting,
    setRide,
    clearBids,
    accessToken,
    navigation,
  ]);

  const onPlacesUnavailable = useCallback(() => {
    setPlacesUnavailable(true);
  }, []);

  const dropTypedWithoutResolution =
    dropAddress.trim().length > 0 && !dropSelection;

  return (
    <View style={styles.root}>
      <View style={styles.mapWrap}>
        <MapView
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={StyleSheet.absoluteFill}
          region={region}
          showsUserLocation={!!pickupCoord}
          toolbarEnabled={false}
          customMapStyle={SILVER_MAP_STYLE}
        >
          {pickupCoord ? (
            <Marker
              coordinate={{
                latitude: pickupCoord.lat,
                longitude: pickupCoord.lng,
              }}
              pinColor={colors.success}
            />
          ) : null}
          {dropSelection ? (
            <Marker
              coordinate={{
                latitude: dropSelection.lat,
                longitude: dropSelection.lng,
              }}
              pinColor={colors.ink.primary}
            />
          ) : null}
          {pickupCoord && dropSelection ? (
            <Polyline
              coordinates={[
                {
                  latitude: pickupCoord.lat,
                  longitude: pickupCoord.lng,
                },
                {
                  latitude: dropSelection.lat,
                  longitude: dropSelection.lng,
                },
              ]}
              strokeColor={colors.map.route}
              strokeWidth={4}
            />
          ) : null}
        </MapView>

        <SafeAreaView
          style={styles.mapOverlay}
          pointerEvents="box-none"
          edges={['top']}
        >
          <View style={styles.topRow}>
            <IconButton
              icon={
                <ArrowLeft
                  size={20}
                  color={colors.ink.primary}
                  weight="regular"
                />
              }
              onPress={navigation.goBack}
              accessibilityLabel="Back"
            />
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.sheet}>
        <SafeAreaView edges={['bottom']}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.handle} />

            <View style={styles.routeBox}>
              <View style={styles.routeMarkersCol}>
                <View style={styles.greenDot} />
                <View style={styles.routeConnector} />
                <View style={styles.darkSquare} />
              </View>
              <View style={styles.routeFieldsCol}>
                <PlacesAutocompleteInput
                  placeholder="Pickup"
                  value={pickupAddress}
                  onChangeText={onPickupChangeText}
                  onSelect={onPickupSelect}
                  sessionToken={sessionToken}
                  nearLat={pickupCoord?.lat}
                  nearLng={pickupCoord?.lng}
                  onUnavailable={onPlacesUnavailable}
                />
                <View style={styles.fieldGap} />
                <PlacesAutocompleteInput
                  placeholder="Where to?"
                  value={dropAddress}
                  onChangeText={onDropChangeText}
                  onSelect={onDropSelect}
                  sessionToken={sessionToken}
                  nearLat={pickupCoord?.lat}
                  nearLng={pickupCoord?.lng}
                  onUnavailable={onPlacesUnavailable}
                />
              </View>
            </View>

            {recentDrops.length > 0 && !dropSelection ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentRow}
              >
                {recentDrops.map((r) => (
                  <Pressable
                    key={r.address}
                    onPress={() => onRecent(r)}
                    style={({ pressed }) => [
                      styles.recentChip,
                      pressed ? styles.recentChipPressed : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${r.address} as drop`}
                  >
                    <Caption
                      color="primary"
                      numberOfLines={1}
                      style={styles.recentChipText}
                    >
                      {r.address}
                    </Caption>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {pickupCoord && dropSelection ? (
              <>
                <Title color="primary" style={styles.classesHeader}>
                  Choose a ride
                </Title>
                {carClasses.map((cc) => {
                  const isSelected = selectedClass === cc.key;
                  return (
                    <Pressable
                      key={cc.key}
                      onPress={() => setSelectedClass(cc.key)}
                      style={[
                        styles.classCard,
                        isSelected ? styles.classCardSelected : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${cc.name}, ${cc.etaMin} minutes away, ₹${fareFor(cc)}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={styles.classIconWrap}>{cc.icon}</View>
                      <View style={styles.classTextCol}>
                        <Body color="primary" style={styles.className}>
                          {cc.name}
                          <Caption color="secondary"> · {cc.etaMin} min</Caption>
                        </Body>
                        <Caption color="secondary" numberOfLines={1}>
                          {cc.description}
                        </Caption>
                      </View>
                      <Title color="primary" style={styles.classFare}>
                        ₹{fareFor(cc)}
                      </Title>
                    </Pressable>
                  );
                })}
              </>
            ) : null}

            {placesUnavailable ? (
              <Caption color="danger" style={styles.warning}>
                Address search not configured. Add Google Places API key.
              </Caption>
            ) : dropTypedWithoutResolution ? (
              <Caption color="secondary" style={styles.warning}>
                Pick a drop address from the suggestions to continue.
              </Caption>
            ) : null}
            {error ? (
              <Body color="danger" style={styles.error}>
                {error}
              </Body>
            ) : null}

            <View style={styles.ctaWrap}>
              <Button
                label={buttonLabel}
                size="lg"
                fullWidth
                variant="primary"
                onPress={onSubmit}
                disabled={!canSubmit || submitting}
                loading={submitting}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  mapWrap: {
    height: '38%',
    width: '100%',
    backgroundColor: colors.surfaceMuted,
  },
  mapOverlay: {
    flex: 1,
  },
  topRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    marginTop: -radius.sheet,
    paddingHorizontal: spacing.lg,
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
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: spacing.base,
  },
  routeMarkersCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    paddingVertical: 16,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  routeConnector: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  darkSquare: {
    width: 10,
    height: 10,
    backgroundColor: colors.ink.primary,
  },
  routeFieldsCol: {
    flex: 1,
  },
  fieldGap: {
    height: spacing.sm,
  },
  recentRow: {
    flexDirection: 'row',
    paddingBottom: spacing.base,
  },
  recentChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginRight: spacing.sm,
    maxWidth: 220,
  },
  recentChipPressed: {
    backgroundColor: '#E8E8EC',
  },
  recentChipText: {
    fontWeight: '500',
  },
  classesHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  classCardSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accentSoft,
  },
  classIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  classTextCol: {
    flex: 1,
  },
  className: {
    fontWeight: '600',
    fontSize: 16,
  },
  classFare: {
    fontWeight: '700',
  },
  warning: {
    marginTop: spacing.sm,
  },
  error: {
    marginTop: spacing.sm,
  },
  ctaWrap: {
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
  },
});
