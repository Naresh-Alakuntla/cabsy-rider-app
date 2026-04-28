import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Body,
  Caption,
  Heading,
  Pill,
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
  return d.toLocaleString();
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

interface RideRowProps {
  ride: Ride;
  expanded: boolean;
  onToggle: () => void;
}

function RideRow({ ride, expanded, onToggle }: RideRowProps): React.JSX.Element {
  const fare = ride.finalFare ?? ride.suggestedFare;
  const status = statusLabel(ride.status);
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
      style={[styles.row, expanded ? styles.rowExpanded : null]}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rowHeaderLeft}>
          <Title numberOfLines={1}>{ride.pickupAddress}</Title>
          <Caption color="secondary" numberOfLines={1}>
            {`→ ${ride.dropAddress}`}
          </Caption>
          <Caption color="tertiary" style={styles.rowDate}>
            {formatDate(ride.createdAt)}
          </Caption>
        </View>
        <View style={styles.rowHeaderRight}>
          <Title accessibilityLabel={`Rupees ${fare}`}>{`₹${fare}`}</Title>
          <View style={styles.statusPill}>
            <Pill label={status} />
          </View>
        </View>
      </View>
      {expanded ? (
        <View style={styles.expanded}>
          <Caption
            color="secondary"
            accessibilityLabel={`Distance ${ride.distanceKm.toFixed(1)} kilometres`}
          >
            {`Distance: ${ride.distanceKm.toFixed(1)} km`}
          </Caption>
          {ride.completedAt ? (
            <Caption color="secondary" style={styles.expandedLine}>
              {`Completed ${formatDate(ride.completedAt)}`}
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
      // Silently keep the cursor so the user can scroll again to retry.
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
        <Heading>Your rides</Heading>
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
          <Body color="secondary">Your rides will appear here.</Body>
        </View>
      ) : (
        <FlashList
          data={rides}
          keyExtractor={(item) => item.id}
          estimatedItemSize={96}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  centeredLine: {
    marginBottom: spacing.md,
  },
  skeletonList: {
    paddingHorizontal: spacing.lg,
  },
  skeletonItem: {
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  skeletonGap: {
    height: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  row: {
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowExpanded: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.card,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.base,
    marginVertical: spacing.xs,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  rowHeaderLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rowHeaderRight: {
    alignItems: 'flex-end',
  },
  rowDate: {
    marginTop: spacing.xs,
  },
  statusPill: {
    marginTop: spacing.xs,
  },
  expanded: {
    marginTop: spacing.md,
  },
  expandedLine: {
    marginTop: spacing.xs,
  },
  footer: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
});
