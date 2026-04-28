import React, { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone } from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Body,
  Button,
  Caption,
  Heading,
  Micro,
  Price,
  Title,
} from '@cabsy/shared';
import { colors } from '@cabsy/shared';
import { radius } from '@cabsy/shared';
import { spacing } from '@cabsy/shared';
import { useSocketEvent } from '@cabsy/shared';
import { riderEvents } from '@cabsy/shared';
import { useRideStore } from '@cabsy/shared';
import { useBidsStore } from '@cabsy/shared';
import { ServerEvents } from '@cabsy/shared';
import type {
  DriverLocationBroadcastPayload,
  RideCancelledPayload,
  RideCompletedPayload,
  RideStartedPayload,
} from '@cabsy/shared';
import type { RiderStackParamList } from './types';

type Props = NativeStackScreenProps<RiderStackParamList, 'Tracking'>;

interface DriverPos {
  lat: number;
  lng: number;
}

export default function TrackingScreen({ navigation }: Props): React.JSX.Element {
  const ride = useRideStore((s) => s.currentRide);
  const driver = useRideStore((s) => s.driver);
  const clearRide = useRideStore((s) => s.clearRide);
  const clearBids = useBidsStore((s) => s.clearBids);
  const applyCancelled = useRideStore((s) => s.applyCancelled);
  const applyStarted = useRideStore((s) => s.applyStarted);
  const applyCompleted = useRideStore((s) => s.applyCompleted);

  const [driverPos, setDriverPos] = useState<DriverPos | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSocketEvent<DriverLocationBroadcastPayload>(
    ServerEvents.DriverLocationUpdate,
    (payload) => {
      if (!ride || payload.rideId !== ride.id) return;
      setDriverPos({ lat: payload.lat, lng: payload.lng });
    },
  );

  useSocketEvent<RideCancelledPayload>(
    ServerEvents.RideCancelled,
    (payload) => {
      if (!ride || payload.rideId !== ride.id) return;
      applyCancelled(payload);
    },
  );

  useSocketEvent<RideStartedPayload>(ServerEvents.RideStarted, (payload) => {
    if (!ride || payload.rideId !== ride.id) return;
    applyStarted(payload);
  });

  useSocketEvent<RideCompletedPayload>(ServerEvents.RideCompleted, (payload) => {
    if (!ride || payload.rideId !== ride.id) return;
    applyCompleted(payload);
  });

  const onCancel = useCallback(async () => {
    if (!ride || cancelling) return;
    setError(null);
    setCancelling(true);
    try {
      await riderEvents.cancelRide(ride.id);
      clearRide();
      clearBids();
      navigation.replace('Home');
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Couldn't cancel right now. Try again?";
      setError(message);
    } finally {
      setCancelling(false);
    }
  }, [ride, cancelling, clearRide, clearBids, navigation]);

  const onCallDriver = useCallback(() => {
    if (!driver?.phone) return;
    void Linking.openURL(`tel:${driver.phone}`);
  }, [driver]);

  const onPaidInCash = useCallback(() => {
    navigation.replace('Rate');
  }, [navigation]);

  if (!ride) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.empty}>
          <Body color="secondary">No active ride.</Body>
          <View style={styles.spacer} />
          <Button label="Find drivers" onPress={() => navigation.replace('Home')} />
        </SafeAreaView>
      </View>
    );
  }

  const region: Region = {
    latitude: driverPos?.lat ?? ride.pickupLat,
    longitude: driverPos?.lng ?? ride.pickupLng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  const fare = ride.finalFare ?? ride.suggestedFare;
  const isCompleted = ride.status === 'completed';

  const headline =
    ride.status === 'started'
      ? 'Trip in progress'
      : ride.status === 'completed'
        ? 'Trip complete'
        : 'Driver on the way';

  const driverName = driver?.name?.trim() || 'Driver';
  const vehicleLine = driver
    ? `${driver.vehicleModel} · ${driver.vehicleNo}`
    : 'Vehicle details loading';

  return (
    <View style={styles.root}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        region={region}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={{ latitude: ride.pickupLat, longitude: ride.pickupLng }}
          pinColor={colors.accent}
          title="Pickup"
        />
        {driverPos ? (
          <Marker
            coordinate={{ latitude: driverPos.lat, longitude: driverPos.lng }}
            title="Driver"
          />
        ) : null}
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none" edges={['top', 'bottom']}>
        <View />
        <View style={styles.card}>
          {isCompleted ? (
            <>
              <Heading accessibilityRole="header">{headline}</Heading>
              <Caption color="secondary" style={styles.eta}>
                Confirm cash payment to your driver
              </Caption>

              <View style={styles.fareRow}>
                <Micro color="secondary">Total</Micro>
                <Price accessibilityLabel={`Total rupees ${fare}`}>{`₹${fare}`}</Price>
              </View>

              <View style={styles.spacer} />
              <Button
                label={`Paid in cash · ₹${fare}`}
                accessibilityLabel={`Mark as paid in cash, rupees ${fare}`}
                size="lg"
                fullWidth
                onPress={onPaidInCash}
              />
            </>
          ) : (
            <>
              <Heading accessibilityRole="header">{headline}</Heading>
              {ride.status === 'assigned' ? (
                <Caption
                  color="secondary"
                  style={styles.eta}
                  accessibilityLabel={`${driverName} is on the way to pickup`}
                >
                  {driverName} is on the way
                </Caption>
              ) : null}

              <View style={styles.driverRow}>
                <View style={styles.driverInfo}>
                  <Title accessibilityLabel={`Driver ${driverName}`}>{driverName}</Title>
                  <Caption
                    color="secondary"
                    accessibilityLabel={
                      driver
                        ? `Vehicle ${driver.vehicleModel}, plate ${driver.vehicleNo}`
                        : 'Vehicle details loading'
                    }
                  >
                    {vehicleLine}
                  </Caption>
                </View>
                <Pressable
                  onPress={onCallDriver}
                  accessibilityRole="button"
                  accessibilityLabel="Call driver"
                  style={styles.callBtn}
                  hitSlop={8}
                  disabled={!driver?.phone}
                >
                  <Phone size={20} color={colors.ink.primary} weight="regular" />
                </Pressable>
              </View>

              <View style={styles.fareRow}>
                <Micro color="secondary">Fare</Micro>
                <Price accessibilityLabel={`Fare rupees ${fare}`}>{`₹${fare}`}</Price>
              </View>

              {error ? (
                <Body color="danger" style={styles.errorLine}>
                  {error}
                </Body>
              ) : null}

              {ride.status === 'assigned' ? (
                <Pressable
                  onPress={onCancel}
                  disabled={cancelling}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel ride"
                  accessibilityState={{ disabled: cancelling, busy: cancelling }}
                  style={styles.cancelBtn}
                  hitSlop={8}
                >
                  <Body color="danger">{cancelling ? 'Cancelling…' : 'Cancel ride'}</Body>
                </Pressable>
              ) : null}
            </>
          )}
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  spacer: {
    height: spacing.base,
  },
  card: {
    margin: spacing.lg,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  eta: {
    marginTop: spacing.xs,
  },
  driverRow: {
    marginTop: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverInfo: {
    flexShrink: 1,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    marginTop: spacing.base,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  errorLine: {
    marginTop: spacing.sm,
  },
  fareRow: {
    marginTop: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
