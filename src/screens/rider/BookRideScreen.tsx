import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Body,
  Button,
  Caption,
  IconButton,
  Pill,
  PlacesAutocompleteInput,
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

interface DropSelection {
  address: string;
  lat: number;
  lng: number;
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

  // One Places session per booking session — billed as a single autocomplete
  // session rather than per-keystroke when the same token covers details.
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
          // Default the pickup label to "Current location"; the user can tap
          // the field and replace it with a real address via Places.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await apiRides.getRideHistory(undefined, 20);
        if (cancelled) return;
        setRecentDrops(uniqueRecentDrops(page.rides, MAX_RECENT_CHIPS));
      } catch {
        // Recent locations are a convenience; failure is silent.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const region: Region = useMemo(() => {
    if (!pickupCoord) return FALLBACK_REGION;
    return {
      latitude: pickupCoord.lat,
      longitude: pickupCoord.lng,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }, [pickupCoord]);

  // Per master prompt §5/§14: never compute distance or fare on the frontend.
  // The server returns the real suggestedFare after createRide.
  const buttonLabel = 'Find drivers';

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
    // Once the user edits the pickup field, the GPS coordinate is no longer
    // authoritative for the address — require Places resolution before submit
    // unless the field is reset to the default label.
    if (text !== PICKUP_DEFAULT_LABEL) {
      setPickupResolved(false);
    }
  }, []);

  const onDropChangeText = useCallback((text: string) => {
    setDropAddress(text);
    if (dropSelection && text !== dropSelection.address) {
      setDropSelection(null);
    }
  }, [dropSelection]);

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
      // Pickup uses GPS coords by default; if the user picked a Places result
      // for the pickup field, those coords are already in `pickupCoord`.
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

      // Seed the ride store with what we know now; the BidScreen will hydrate
      // the rest from getRide if it ever needs the full record.
      const stubRide: Ride = {
        id: result.rideId,
        riderId: '',
        pickupLat: pickupCoord.lat,
        pickupLng: pickupCoord.lng,
        pickupAddress: pickupAddrFinal,
        dropLat: dropSelection.lat,
        dropLng: dropSelection.lng,
        dropAddress: dropSelection.address,
        // Backend computes the canonical distance/duration/polyline via Google
        // Directions during createRide. BidScreen hydrates this from getRide
        // when it needs the real values.
        distanceKm: 0,
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
        // Joining is best-effort here; BidScreen mounts listeners regardless
        // and the server will retry-deliver via the user room on reconnect.
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

  // The PlacesAutocompleteInput surfaces a `NO_KEY` PlacesError visually and
  // calls `onUnavailable` so we can also gate the submit button at the screen
  // level. Once flipped, the user is warned and the ride cannot be submitted
  // with stub coordinates.
  const onPlacesUnavailable = useCallback(() => {
    setPlacesUnavailable(true);
  }, []);

  const dropTypedWithoutResolution =
    dropAddress.trim().length > 0 && !dropSelection;

  return (
    <View style={styles.root}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        region={region}
        showsUserLocation={!!pickupCoord}
        toolbarEnabled={false}
      >
        {pickupCoord ? (
          <Marker
            coordinate={{
              latitude: pickupCoord.lat,
              longitude: pickupCoord.lng,
            }}
            pinColor={colors.accent}
          />
        ) : null}
      </MapView>

      <SafeAreaView
        style={styles.overlay}
        pointerEvents="box-none"
        edges={['top', 'bottom']}
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

        <View style={styles.card}>
          <PlacesAutocompleteInput
            label="Pickup"
            placeholder="Pickup address"
            value={pickupAddress}
            onChangeText={onPickupChangeText}
            onSelect={onPickupSelect}
            sessionToken={sessionToken}
            nearLat={pickupCoord?.lat}
            nearLng={pickupCoord?.lng}
            onUnavailable={onPlacesUnavailable}
          />
          <View style={styles.spacer} />
          <PlacesAutocompleteInput
            label="Drop"
            placeholder="Where to?"
            value={dropAddress}
            onChangeText={onDropChangeText}
            onSelect={onDropSelect}
            sessionToken={sessionToken}
            nearLat={pickupCoord?.lat}
            nearLng={pickupCoord?.lng}
            onUnavailable={onPlacesUnavailable}
          />

          {recentDrops.length > 0 ? (
            <View style={styles.recentBlock}>
              <Caption color="secondary" style={styles.recentLabel}>
                Recent
              </Caption>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentRow}
              >
                {recentDrops.map((r) => (
                  <Pressable
                    key={r.address}
                    onPress={() => onRecent(r)}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${r.address} as drop`}
                    style={styles.recentItem}
                    hitSlop={4}
                  >
                    <Pill label={r.address} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        <View style={styles.bottom}>
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
          <Button
            label={buttonLabel}
            size="lg"
            fullWidth
            onPress={onSubmit}
            disabled={!canSubmit || submitting}
            loading={submitting}
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
  topRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    padding: spacing.base,
  },
  spacer: {
    height: spacing.md,
  },
  recentBlock: {
    marginTop: spacing.base,
  },
  recentLabel: {
    marginBottom: spacing.sm,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentItem: {
    marginRight: spacing.sm,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  warning: {
    marginBottom: spacing.sm,
  },
  error: {
    marginBottom: spacing.sm,
  },
});
