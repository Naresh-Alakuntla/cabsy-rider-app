import React, { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChatCircle,
  Phone,
  ShareNetwork,
  ShieldCheck,
} from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Avatar,
  Body,
  Button,
  Caption,
  IconButton,
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

  const onMessageDriver = useCallback(() => {
    if (!driver?.phone) return;
    void Linking.openURL(`sms:${driver.phone}`);
  }, [driver]);

  const onShareTrip = useCallback(() => {
    // Stub — full Share is deferred. No-op so the icon is tappable in the prototype.
  }, []);

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
      ? 'On the way to drop'
      : ride.status === 'completed'
        ? 'Trip complete'
        : 'Driver on the way';

  const subhead =
    ride.status === 'started'
      ? 'Enjoy your ride'
      : ride.status === 'completed'
        ? 'Hope you had a great trip'
        : `${driver?.name?.split(' ')[0] ?? 'Driver'} is heading to pickup`;

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
        customMapStyle={SILVER_MAP_STYLE}
      >
        <Marker
          coordinate={{ latitude: ride.pickupLat, longitude: ride.pickupLng }}
          pinColor={colors.success}
          title="Pickup"
        />
        <Marker
          coordinate={{ latitude: ride.dropLat, longitude: ride.dropLng }}
          pinColor={colors.ink.primary}
          title="Drop"
        />
        {driverPos ? (
          <>
            <Marker
              coordinate={{ latitude: driverPos.lat, longitude: driverPos.lng }}
              pinColor={colors.accent}
              title="Driver"
            />
            <Polyline
              coordinates={[
                { latitude: driverPos.lat, longitude: driverPos.lng },
                { latitude: ride.pickupLat, longitude: ride.pickupLng },
              ]}
              strokeColor={colors.map.route}
              strokeWidth={4}
            />
          </>
        ) : null}
      </MapView>

      <SafeAreaView
        style={styles.topOverlay}
        pointerEvents="box-none"
        edges={['top']}
      >
        <View style={styles.topRow}>
          <IconButton
            icon={<ArrowLeft size={20} color={colors.ink.primary} weight="regular" />}
            onPress={() => navigation.replace('Home')}
            accessibilityLabel="Back"
          />
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Caption color="primary" style={styles.statusText}>
              {headline}
            </Caption>
          </View>
          <View style={styles.topSpacer} />
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {isCompleted ? (
            <>
              <Title color="primary" style={styles.headline}>
                {headline}
              </Title>
              <Caption color="secondary" style={styles.sub}>
                {subhead}
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
                variant="primary"
                fullWidth
                onPress={onPaidInCash}
              />
            </>
          ) : (
            <>
              <Title color="primary" style={styles.headline}>
                {headline}
              </Title>
              <Caption color="secondary" style={styles.sub}>
                {subhead}
              </Caption>

              <View style={styles.driverRow}>
                <Avatar name={driverName} size={48} />
                <View style={styles.driverInfo}>
                  <Body color="primary" style={styles.driverName} numberOfLines={1}>
                    {driverName}
                  </Body>
                  <Caption color="secondary" numberOfLines={1}>
                    {vehicleLine}
                  </Caption>
                </View>
                {driver?.vehicleNo ? (
                  <View style={styles.plateChip}>
                    <Caption color="primary" style={styles.plateText}>
                      {driver.vehicleNo}
                    </Caption>
                  </View>
                ) : null}
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={onCallDriver}
                  disabled={!driver?.phone}
                  accessibilityRole="button"
                  accessibilityLabel="Call driver"
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed ? styles.actionBtnPressed : null,
                    !driver?.phone ? styles.actionBtnDisabled : null,
                  ]}
                  hitSlop={6}
                >
                  <Phone size={18} color={colors.ink.primary} weight="regular" />
                  <Caption color="primary" style={styles.actionLabel}>
                    Call
                  </Caption>
                </Pressable>
                <Pressable
                  onPress={onMessageDriver}
                  disabled={!driver?.phone}
                  accessibilityRole="button"
                  accessibilityLabel="Message driver"
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed ? styles.actionBtnPressed : null,
                    !driver?.phone ? styles.actionBtnDisabled : null,
                  ]}
                  hitSlop={6}
                >
                  <ChatCircle size={18} color={colors.ink.primary} weight="regular" />
                  <Caption color="primary" style={styles.actionLabel}>
                    Message
                  </Caption>
                </Pressable>
                <Pressable
                  onPress={onShareTrip}
                  accessibilityRole="button"
                  accessibilityLabel="Share trip"
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed ? styles.actionBtnPressed : null,
                  ]}
                  hitSlop={6}
                >
                  <ShareNetwork size={18} color={colors.ink.primary} weight="regular" />
                  <Caption color="primary" style={styles.actionLabel}>
                    Share
                  </Caption>
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
                <View style={styles.bottomActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Safety center"
                    style={({ pressed }) => [
                      styles.safetyChip,
                      pressed ? styles.safetyChipPressed : null,
                    ]}
                    hitSlop={6}
                  >
                    <ShieldCheck size={14} color={colors.ink.primary} weight="regular" />
                    <Caption color="primary" style={styles.safetyText}>
                      Safety
                    </Caption>
                  </Pressable>
                  <Pressable
                    onPress={onCancel}
                    disabled={cancelling}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel ride"
                    accessibilityState={{ disabled: cancelling, busy: cancelling }}
                    style={styles.cancelBtn}
                    hitSlop={8}
                  >
                    <Caption color="danger" style={styles.cancelText}>
                      {cancelling ? 'Cancelling…' : 'Cancel ride'}
                    </Caption>
                  </Pressable>
                </View>
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
  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginHorizontal: spacing.sm,
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  statusText: {
    flex: 1,
    fontWeight: '600',
  },
  topSpacer: {
    width: 44,
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
  headline: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
  },
  sub: {
    marginTop: 2,
    marginBottom: spacing.base,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  driverInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  driverName: {
    fontWeight: '600',
    fontSize: 16,
  },
  plateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.chip,
  },
  plateText: {
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.base,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.button,
    paddingVertical: spacing.sm + 2,
    marginHorizontal: 4,
  },
  actionBtnPressed: {
    backgroundColor: '#E8E8EC',
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionLabel: {
    marginLeft: 6,
    fontWeight: '600',
  },
  fareRow: {
    marginTop: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorLine: {
    marginTop: spacing.sm,
  },
  bottomActions: {
    marginTop: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  safetyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  safetyChipPressed: {
    backgroundColor: '#E8E8EC',
  },
  safetyText: {
    marginLeft: 4,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontWeight: '600',
  },
});
