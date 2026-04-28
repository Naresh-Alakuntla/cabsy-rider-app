import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarBlank, MapPin } from 'phosphor-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Body,
  Caption,
  Display,
  Skeleton,
  Title,
} from '@cabsy/shared';
import { colors } from '@cabsy/shared';
import { radius } from '@cabsy/shared';
import { spacing } from '@cabsy/shared';
import * as apiRides from '@cabsy/shared';
import { ApiError } from '@cabsy/shared';
import type { Ride, RideStatus } from '@cabsy/shared';
import type { RiderStackParamList } from './types';

type Props = NativeStackScreenProps<RiderStackParamList, 'History'>;

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusLabel(status: RideStatus): string {
  switch (status) {
    case 'searching':
      return 'Searching';
    case 'bidding':
      return 'Bidding';
    case 'assigned':
      return 'Assigned';
    case 'started':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';
  }
}

function statusColor(status: RideStatus): { bg: string; fg: 'success' | 'danger' | 'secondary' | 'accent' } {
  switch (status) {
    case 'completed':
      return { bg: 'rgba(31,173,102,0.12)', fg: 'success' };
    case 'cancelled':
    case 'expired':
      return { bg: 'rgba(229,72,77,0.10)', fg: 'danger' };
    case 'started':
    case 'assigned':
      return { bg: colors.accentSoft, fg: 'accent' };
    default:
      return { bg: colors.surfaceMuted, fg: 'secondary' };
  }
}

interface RideRowProps {
  ride: Ride;
  expanded: boolean;
  onToggle: () => void;
}

function RideRow({ ride, expanded, onToggle }: RideRowProps): React.JSX.Element {
  const fare = ride.finalFare ?? ride.suggestedFare;
  const status = statusLabel(ride.status);
  const sc = statusColor(ride.status);
  const rowLabel = `Ride from ${ride.pickupAddress} to ${ride.dropAddress}, ${formatDate(
    ride.createdAt,
  )}, fare rupees ${fare}, status ${status.toLowerCase()}`;

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={rowLabel}
      accessibilityHint={expanded ? 'Collapses details' : 'Expands details'}
      accessibilityState={{ expanded }}
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.cardHeader}>
        <Caption color="secondary" style={styles.dateRow}>
          <CalendarBlank size={12} color={colors.ink.secondary} weight="regular" />
          {`  ${formatDate(ride.createdAt)} · ${formatTime(ride.createdAt)}`}
        </Caption>
        <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
          <Caption color={sc.fg} style={styles.statusChipText}>
            {status}
          </Caption>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routeMarkersCol}>
          <View style={styles.greenDot} />
          <View style={styles.routeConnector} />
          <View style={styles.darkSquare} />
        </View>
        <View style={styles.routeText}>
          <Body color="primary" numberOfLines={1} style={styles.addrPrimary}>
            {ride.pickupAddress}
          </Body>
          <View style={styles.gap6} />
          <Body color="primary" numberOfLines={1} style={styles.addrPrimary}>
            {ride.dropAddress}
          </Body>
        </View>
      </View>

      <View style={styles.fareRow}>
        <Caption color="secondary">{`${ride.distanceKm.toFixed(1)} km`}</Caption>
        <Title color="primary" style={styles.fare}>{`₹${fare}`}</Title>
      </View>

      {expanded ? (
        <View style={styles.expanded}>
          {ride.completedAt ? (
            <Caption color="secondary">
              Completed {formatDate(ride.completedAt)} · {formatTime(ride.completedAt)}
            </Caption>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function HistoryScreen(_props: Props): React.JSX.Element {
  const [state, setState] = useState<LoadState>('idle');
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchingRef = useRef(false);

  const load = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const res = await apiRides.getRideHistory();
      setRides(res.rides);
      setNextCursor(res.nextCursor);
      setState('ready');
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Couldn't load your rides. Try again?");
      }
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current) return;
    if (!nextCursor) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    try {
      const res = await apiRides.getRideHistory(nextCursor);
      setRides((prev) => [...prev, ...res.rides]);
      setNextCursor(res.nextCursor);
    } catch {
      // Silently keep cursor for retry on next scroll.
    } finally {
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [nextCursor]);

  const onToggle = useCallback((id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  const skeletons = useMemo(() => [0, 1, 2, 3], []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Display color="primary" style={styles.title}>
          Activity
        </Display>
        <Caption color="secondary" style={styles.subtitle}>
          Your past rides
        </Caption>
      </View>

      {state === 'loading' || state === 'idle' ? (
        <View style={styles.skeletonList}>
          {skeletons.map((k) => (
            <View key={k} style={styles.skeletonItem}>
              <Skeleton height={20} width="60%" />
              <View style={styles.skeletonGap} />
              <Skeleton height={16} width="40%" />
            </View>
          ))}
        </View>
      ) : state === 'error' ? (
        <View style={styles.centered}>
          <Body color="secondary" style={styles.centeredLine}>
            {error ?? "Couldn't load your rides."}
          </Body>
          <Pressable
            onPress={load}
            accessibilityRole="button"
            accessibilityLabel="Retry loading ride history"
            hitSlop={8}
          >
            <Caption color="accent">Try again</Caption>
          </Pressable>
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <MapPin size={28} color={colors.ink.tertiary} weight="regular" />
          </View>
          <Body color="secondary" style={styles.emptyLine}>
            Your rides will appear here.
          </Body>
        </View>
      ) : (
        <FlashList
          data={rides}
          keyExtractor={(item) => item.id}
          estimatedItemSize={156}
          extraData={expandedId}
          renderItem={({ item }) => (
            <RideRow
              ride={item}
              expanded={item.id === expandedId}
              onToggle={() => onToggle(item.id)}
            />
          )}
          onEndReached={() => {
            void loadMore();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.ink.secondary} />
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  centeredLine: {
    marginBottom: spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  emptyLine: {
    textAlign: 'center',
  },
  skeletonList: {
    paddingHorizontal: spacing.lg,
  },
  skeletonItem: {
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skeletonGap: {
    height: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  card: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  cardPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.chip,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  routeMarkersCol: {
    width: 16,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  routeConnector: {
    width: 2,
    height: 18,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  darkSquare: {
    width: 8,
    height: 8,
    backgroundColor: colors.ink.primary,
  },
  routeText: {
    flex: 1,
  },
  addrPrimary: {
    fontSize: 14,
    fontWeight: '500',
  },
  gap6: {
    height: 6,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fare: {
    fontWeight: '700',
  },
  expanded: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footer: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
});
