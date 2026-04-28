import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { BidWithDriver } from '../../shared/types';
import { Avatar } from './Avatar';
import { RatingStars } from './RatingStars';
import { Body, Caption, Title } from './Text';

export interface BidRowProps {
  bid: BidWithDriver;
  isLowest: boolean;
  selected?: boolean;
  onPress?: () => void;
}

const ROW_MIN_HEIGHT = 84;
const PRESS_DURATION = 120;

const formatPrice = (amount: number): string => `₹${amount}`;

export const BidRow: React.FC<BidRowProps> = ({
  bid,
  isLowest,
  selected = false,
  onPress,
}) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: PRESS_DURATION,
      useNativeDriver: true,
    }).start();
  }, [overlayOpacity]);

  const handlePressOut = useCallback(() => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: PRESS_DURATION,
      useNativeDriver: true,
    }).start();
  }, [overlayOpacity]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${bid.driverName}, ${bid.vehicleModel}, ${bid.etaMinutes} minutes, ${formatPrice(bid.amount)}`}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.row, selected ? styles.selected : null]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.pressOverlay, { opacity: overlayOpacity }]}
      />
      <View style={styles.left}>
        <Avatar name={bid.driverName} size={44} />
        <View style={styles.identity}>
          <Body color="primary" numberOfLines={1} style={styles.name}>
            {bid.driverName}
          </Body>
          <View style={styles.ratingRow}>
            <RatingStars value={bid.driverRating} size={12} />
            <Caption color="secondary" style={styles.ratingValue}>
              {bid.driverRating.toFixed(1)} · {bid.vehicleModel} · {bid.etaMinutes} min
            </Caption>
          </View>
          {isLowest ? (
            <View style={styles.bestBadge}>
              <Caption color="accent" style={styles.bestBadgeText}>
                Best price
              </Caption>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        <Title color="primary" style={styles.price}>
          {formatPrice(bid.amount)}
        </Title>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.card,
    marginHorizontal: spacing.base,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    backgroundColor: colors.accentSoft,
  },
  pressOverlay: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.card,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  identity: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingValue: {
    marginLeft: spacing.xs,
  },
  bestBadge: {
    marginTop: 4,
    backgroundColor: colors.accentSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
  },
  bestBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  price: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
  },
});
