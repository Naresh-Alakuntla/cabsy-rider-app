import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { BidWithDriver } from '../../shared/types';
import { Avatar } from './Avatar';
import { RatingStars } from './RatingStars';
import { Body, Caption, Price } from './Text';

export interface BidRowProps {
  bid: BidWithDriver;
  isLowest: boolean;
  selected?: boolean;
  onPress?: () => void;
}

const ROW_MIN_HEIGHT = 72;
const STRIPE_WIDTH = 2;
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
      style={[
        styles.row,
        selected ? styles.selected : null,
      ]}
    >
      {isLowest ? <View style={styles.stripe} /> : null}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.pressOverlay, { opacity: overlayOpacity }]}
      />
      <View style={styles.left}>
        <Avatar name={bid.driverName} size={36} />
        <View style={styles.identity}>
          <Body color="primary" numberOfLines={1}>
            {bid.driverName}
          </Body>
          <View style={styles.ratingRow}>
            <RatingStars value={bid.driverRating} size={12} />
            <Caption color="secondary" style={styles.ratingValue}>
              {bid.driverRating.toFixed(1)}
            </Caption>
          </View>
        </View>
      </View>

      <View style={styles.middle}>
        <Caption color="secondary" numberOfLines={1}>
          {`${bid.vehicleModel} · ${bid.etaMinutes} min`}
        </Caption>
      </View>

      <View style={styles.right}>
        <Price>{formatPrice(bid.amount)}</Price>
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
    backgroundColor: colors.bg.primary,
  },
  selected: {
    backgroundColor: colors.bg.surface,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: STRIPE_WIDTH,
    backgroundColor: colors.accent,
  },
  pressOverlay: {
    backgroundColor: colors.divider,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  identity: {
    marginLeft: spacing.md,
    maxWidth: 120,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingValue: {
    marginLeft: spacing.xs,
  },
  middle: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
});
