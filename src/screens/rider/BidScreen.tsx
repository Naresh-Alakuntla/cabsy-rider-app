import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { FlashList } from '@shopify/flash-list';
import Animated, {
  Easing,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  BidRow,
  Body,
  Button,
  Caption,
  Heading,
} from '@cabsy/shared';
import { colors } from '@cabsy/shared';
import { motion } from '@cabsy/shared';
import { radius } from '@cabsy/shared';
import { spacing } from '@cabsy/shared';
import {
  riderEvents,
} from '@cabsy/shared';
import { useSocketEvent } from '@cabsy/shared';
import { useRideStore } from '@cabsy/shared';
import { useBidsStore } from '@cabsy/shared';
import { ServerEvents } from '@cabsy/shared';
import type {
  BidWithDriver,
  RideAssignedPayload,
  RideBidUpdatePayload,
  RideCancelledPayload,
  RideExpiredPayload,
} from '@cabsy/shared';
import type { RiderStackParamList } from './types';

type Props = NativeStackScreenProps<RiderStackParamList, 'Bid'>;

const SHEET_TOP_FRACTION = 0.7;
const EMPTY_GRACE_MS = 8000;

const sortAsc = (bids: BidWithDriver[]): BidWithDriver[] =>
  [...bids].sort((a, b) => a.amount - b.amount);

interface CountdownBarProps {
  endsAt: string;
}

function CountdownBar({ endsAt }: CountdownBarProps): React.JSX.Element {
  const progress = useSharedValue(1);

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const now = Date.now();
    const total = Math.max(1, end - now);
    progress.value = 1;
    progress.value = withTiming(0, {
      duration: total,
      easing: Easing.linear,
    });
  }, [endsAt, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, progress.value) * 100}%`,
  }));

  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityLabel="Bidding window remaining"
    >
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

function PulsingPickupPin(): React.JSX.Element {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.pulseDot, animatedStyle]} />
  );
}

interface BidListItemProps {
  bid: BidWithDriver;
  isLowest: boolean;
  expanded: boolean;
  accepting: boolean;
  onToggle: () => void;
  onAccept: () => void;
}

function BidListItem({
  bid,
  isLowest,
  expanded,
  accepting,
  onToggle,
  onAccept,
}: BidListItemProps): React.JSX.Element {
  return (
    <Animated.View
      entering={SlideInDown.duration(motion.duration.bid)}
      style={styles.itemContainer}
    >
      <BidRow
        bid={bid}
        isLowest={isLowest}
        selected={expanded}
        onPress={onToggle}
      />
      {expanded ? (
        <View style={styles.expanded}>
          <View style={styles.expandedMeta}>
            <Caption
              color="secondary"
              accessibilityLabel={`Driver arriving in ${bid.etaMinutes} minutes, 42 completed rides`}
            >
              {`${bid.etaMinutes} min to pickup · 42 rides`}
            </Caption>
          </View>
          <Button
            label={`Accept ₹${bid.amount}`}
            accessibilityLabel={`Accept fare of rupees ${bid.amount}`}
            size="lg"
            fullWidth
            onPress={onAccept}
            loading={accepting}
            disabled={accepting}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

export default function BidScreen({ navigation }: Props): React.JSX.Element {
  const ride = useRideStore((s) => s.currentRide);
  const applyAssignment = useRideStore((s) => s.applyAssignment);
  const applyExpired = useRideStore((s) => s.applyExpired);
  const applyCancelled = useRideStore((s) => s.applyCancelled);

  const storeBids = useBidsStore((s) => s.bids);
  const applyBidUpdate = useBidsStore((s) => s.applyBidUpdate);

  // Local ordered list — appended in arrival order so existing rows do not
  // jump around when a new lower bid lands. Sort only on explicit user action.
  const [orderedBids, setOrderedBids] = useState<BidWithDriver[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmptyGrace, setShowEmptyGrace] = useState(true);
  const [terminal, setTerminal] = useState<
    | { kind: 'expired'; reason: RideExpiredPayload['reason'] }
    | { kind: 'cancelled' }
    | null
  >(null);

  const mountedAt = useRef(Date.now());

  useEffect(() => {
    const t = setTimeout(() => setShowEmptyGrace(false), EMPTY_GRACE_MS);
    return () => clearTimeout(t);
  }, []);

  // Reflect new bids from the store into local ordered list, preserving order.
  useEffect(() => {
    setOrderedBids((prev) => {
      const seen = new Set(prev.map((b) => b.id));
      const additions = storeBids.filter((b) => !seen.has(b.id));
      const updatedExisting = prev.map(
        (b) => storeBids.find((sb) => sb.id === b.id) ?? b,
      );
      // Drop locally-tracked bids that no longer exist server-side.
      const stillPresentIds = new Set(storeBids.map((b) => b.id));
      const trimmed = updatedExisting.filter((b) => stillPresentIds.has(b.id));
      return [...trimmed, ...additions];
    });
  }, [storeBids]);

  // Socket wiring: bid updates go through the store, navigation events fire here.
  useSocketEvent<RideBidUpdatePayload>(ServerEvents.RideBidUpdate, (payload) => {
    applyBidUpdate(payload);
  });

  useSocketEvent<RideAssignedPayload>(ServerEvents.RideAssigned, (payload) => {
    applyAssignment(payload);
    navigation.replace('Tracking');
  });

  useSocketEvent<RideExpiredPayload>(ServerEvents.RideExpired, (payload) => {
    applyExpired(payload);
    setTerminal({ kind: 'expired', reason: payload.reason });
  });

  useSocketEvent<RideCancelledPayload>(ServerEvents.RideCancelled, (payload) => {
    applyCancelled(payload);
    setTerminal({ kind: 'cancelled' });
  });

  const lowestId = useMemo(() => {
    if (orderedBids.length === 0) return null;
    let lowest = orderedBids[0];
    for (const b of orderedBids) {
      if (b.amount < lowest.amount) lowest = b;
    }
    return lowest.id;
  }, [orderedBids]);

  const onSortByLowest = useCallback(() => {
    setOrderedBids((prev) => sortAsc(prev));
  }, []);

  const onToggle = useCallback(
    (bidId: string) => {
      setExpandedId((cur) => (cur === bidId ? null : bidId));
    },
    [],
  );

  const onAccept = useCallback(
    async (bid: BidWithDriver) => {
      if (!ride) return;
      setError(null);
      setAcceptingId(bid.id);
      try {
        await riderEvents.acceptBid(ride.id, bid.id);
        // Navigation happens on RideAssigned via useSocketEvent above; if the
        // server delivers the event before our ack returns, that's fine.
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Couldn't accept that bid. Try again?";
        setError(message);
      } finally {
        setAcceptingId(null);
      }
    },
    [ride],
  );

  const onTryAgain = useCallback(() => {
    navigation.replace('Book');
  }, [navigation]);

  if (!ride) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.centered}>
          <Body color="secondary">No active ride.</Body>
          <View style={styles.tryAgainSpacer} />
          <Button label="Find drivers" onPress={onTryAgain} />
        </SafeAreaView>
      </View>
    );
  }

  const region: Region = {
    latitude: ride.pickupLat,
    longitude: ride.pickupLng,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  const stillEmpty = orderedBids.length === 0;
  const showSentNote = stillEmpty && (showEmptyGrace || (Date.now() - mountedAt.current < EMPTY_GRACE_MS));

  return (
    <View style={styles.root}>
      <View style={styles.mapWrap}>
        <MapView
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          pointerEvents="none"
          toolbarEnabled={false}
        >
          <Marker
            coordinate={{ latitude: ride.pickupLat, longitude: ride.pickupLng }}
            pinColor={colors.accent}
          />
          <Circle
            center={{ latitude: ride.pickupLat, longitude: ride.pickupLng }}
            radius={1500}
            strokeColor={colors.accent}
            strokeWidth={1}
            fillColor="rgba(201,169,97,0.08)"
          />
        </MapView>

        {stillEmpty ? (
          <View pointerEvents="none" style={styles.pulseAnchor}>
            <PulsingPickupPin />
          </View>
        ) : null}
      </View>

      <View style={styles.sheet}>
        <SafeAreaView style={styles.sheetInner} edges={['bottom']}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderRow}>
              <Heading>Choose your driver</Heading>
              {orderedBids.length > 1 ? (
                <Pressable
                  onPress={onSortByLowest}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Sort bids by lowest fare"
                >
                  <Caption color="accent">Sort by lowest</Caption>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.progressWrap}>
              <CountdownBar endsAt={ride.biddingEndsAt} />
            </View>
          </View>

          {terminal?.kind === 'expired' ? (
            <View style={styles.centeredBlock}>
              <Body color="secondary" style={styles.terminalLine}>
                No drivers available.
              </Body>
              <Button label="Try again" onPress={onTryAgain} />
            </View>
          ) : terminal?.kind === 'cancelled' ? (
            <View style={styles.centeredBlock}>
              <Body color="secondary" style={styles.terminalLine}>
                Ride cancelled.
              </Body>
              <Button label="Find drivers" onPress={onTryAgain} />
            </View>
          ) : showSentNote ? (
            <View style={styles.centeredBlock}>
              <Body color="secondary">Sent to nearby drivers</Body>
            </View>
          ) : (
            <FlashList
              data={orderedBids}
              keyExtractor={(item) => item.id}
              estimatedItemSize={84}
              extraData={{ expandedId, acceptingId, lowestId }}
              renderItem={({ item }) => (
                <BidListItem
                  bid={item}
                  isLowest={item.id === lowestId}
                  expanded={item.id === expandedId}
                  accepting={acceptingId === item.id}
                  onToggle={() => onToggle(item.id)}
                  onAccept={() => onAccept(item)}
                />
              )}
              contentContainerStyle={styles.listContent}
            />
          )}

          {error ? (
            <Body color="danger" style={styles.errorLine}>
              {error}
            </Body>
          ) : null}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  centeredBlock: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  terminalLine: {
    marginBottom: spacing.base,
  },
  tryAgainSpacer: {
    height: spacing.base,
  },
  mapWrap: {
    height: `${(1 - SHEET_TOP_FRACTION) * 100}%`,
    overflow: 'hidden',
  },
  pulseAnchor: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    opacity: 0.7,
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
    marginTop: -radius.sheet,
  },
  sheetInner: {
    flex: 1,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressWrap: {
    marginTop: spacing.md,
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.divider,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.accent,
  },
  listContent: {
    paddingBottom: spacing['2xl'],
  },
  itemContainer: {
    backgroundColor: colors.bg.primary,
  },
  expanded: {
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
    paddingTop: spacing.sm,
  },
  expandedMeta: {
    marginBottom: spacing.md,
  },
  errorLine: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
