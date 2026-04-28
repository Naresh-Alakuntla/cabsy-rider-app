import React, { useCallback, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Caption, Price } from './Text';
import { colors } from '../../theme/colors';
import { motion } from '../../theme/motion';
import { spacing } from '../../theme/spacing';

export interface BidSliderProps {
  floor: number;
  ceiling: number;
  suggested: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}

const TRACK_HEIGHT = 4;
const TRACK_RADIUS = 2;
const THUMB_SIZE = 28;
const THUMB_RADIUS = THUMB_SIZE / 2;
const RING_WIDTH = 4;
const TICK_HEIGHT = 8;
const TICK_HEIGHT_CENTER = 12;
const TICK_WIDTH = 1;
const GUTTER = 24;

// Snap-on-release tolerance is 3 step-units (≈ ₹3 when caller passes paise
// or ₹3 when caller passes rupees with step=1) — visual hint, not magnetism.
const SNAP_TOLERANCE_STEPS = 3;

const clamp = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, n));

const quantize = (n: number, step: number): number =>
  Math.round(n / step) * step;

const toRupees = (minor: number, step: number): string => {
  // When step is paise (>=100), divide by 100; otherwise the caller is
  // already passing rupees and we render as-is.
  const rupees = step >= 100 ? minor / 100 : minor;
  return `₹${rupees}`;
};

export function BidSlider({
  floor,
  ceiling,
  suggested,
  value,
  onChange,
  step = 100,
}: BidSliderProps): React.JSX.Element {
  const disabled = floor >= ceiling;
  const range = Math.max(1, ceiling - floor);

  const [trackWidth, setTrackWidth] = useState<number>(0);
  const usableWidth = Math.max(0, trackWidth - THUMB_SIZE);

  const valueToPx = useCallback(
    (v: number): number => {
      if (range <= 0 || usableWidth <= 0) return 0;
      const ratio = (clamp(v, floor, ceiling) - floor) / range;
      return ratio * usableWidth;
    },
    [ceiling, floor, range, usableWidth],
  );

  const pxToValue = useCallback(
    (px: number): number => {
      if (usableWidth <= 0) return floor;
      const ratio = clamp(px, 0, usableWidth) / usableWidth;
      const raw = floor + ratio * range;
      return clamp(quantize(raw, step), floor, ceiling);
    },
    [ceiling, floor, range, step, usableWidth],
  );

  const thumbX = useSharedValue<number>(0);
  const dragStartX = useSharedValue<number>(0);
  const pressed = useSharedValue<number>(0);

  // Sync thumb position when external value/layout changes (and we're not dragging).
  React.useEffect(() => {
    const target = valueToPx(value);
    thumbX.value = withTiming(target, {
      duration: motion.duration.state,
      easing: Easing.out(Easing.ease),
    });
  }, [thumbX, valueToPx, value]);

  const snapPoints = useMemo(() => {
    const lower = clamp(quantize(suggested * 0.9, step), floor, ceiling);
    const center = clamp(quantize(suggested, step), floor, ceiling);
    const upper = clamp(quantize(suggested * 1.1, step), floor, ceiling);
    return { lower, center, upper };
  }, [ceiling, floor, step, suggested]);

  const tolerance = step * SNAP_TOLERANCE_STEPS;

  const commitChange = useCallback(
    (next: number) => {
      if (next !== value) onChange(next);
    },
    [onChange, value],
  );

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled && usableWidth > 0)
        .onBegin(() => {
          dragStartX.value = thumbX.value;
          pressed.value = withTiming(1, {
            duration: motion.duration.state,
            easing: Easing.out(Easing.ease),
          });
        })
        .onUpdate((e) => {
          const next = clamp(dragStartX.value + e.translationX, 0, usableWidth);
          thumbX.value = next;
        })
        .onEnd(() => {
          const released = pxToValue(thumbX.value);
          let snapped = released;
          const candidates = [
            snapPoints.lower,
            snapPoints.center,
            snapPoints.upper,
          ];
          let bestDelta = Number.POSITIVE_INFINITY;
          for (const cand of candidates) {
            const d = Math.abs(cand - released);
            if (d < bestDelta && d <= tolerance) {
              bestDelta = d;
              snapped = cand;
            }
          }
          thumbX.value = withTiming(valueToPx(snapped), {
            duration: motion.duration.state,
            easing: Easing.out(Easing.ease),
          });
          runOnJS(commitChange)(snapped);
        })
        .onFinalize(() => {
          pressed.value = withTiming(0, {
            duration: motion.duration.state,
            easing: Easing.out(Easing.ease),
          });
        }),
    [
      commitChange,
      disabled,
      dragStartX,
      pressed,
      pxToValue,
      snapPoints.center,
      snapPoints.lower,
      snapPoints.upper,
      thumbX,
      tolerance,
      usableWidth,
      valueToPx,
    ],
  );

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
    borderWidth: pressed.value * RING_WIDTH,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value + THUMB_RADIUS,
  }));

  const tooltipStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  // Snap-tick offsets (px) along the track interior.
  const tickOffsets = useMemo(() => {
    return {
      lower: valueToPx(snapPoints.lower) + THUMB_RADIUS,
      center: valueToPx(snapPoints.center) + THUMB_RADIUS,
      upper: valueToPx(snapPoints.upper) + THUMB_RADIUS,
    };
  }, [snapPoints.lower, snapPoints.center, snapPoints.upper, valueToPx]);

  const containerStyle: ViewStyle = {
    paddingHorizontal: GUTTER,
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <View style={containerStyle}>
      <View style={styles.tooltipRow}>
        <Animated.View style={[styles.tooltip, tooltipStyle]}>
          <Price accessibilityLabel={`Bid ${toRupees(value, step)}`}>
            {toRupees(value, step)}
          </Price>
        </Animated.View>
      </View>

      <View style={styles.ticksRow} pointerEvents="none">
        {trackWidth > 0 ? (
          <>
            <View
              style={[
                styles.tick,
                { left: tickOffsets.lower, height: TICK_HEIGHT },
              ]}
            />
            <View
              style={[
                styles.tick,
                {
                  left: tickOffsets.center,
                  height: TICK_HEIGHT_CENTER,
                },
              ]}
            />
            <View
              style={[
                styles.tick,
                { left: tickOffsets.upper, height: TICK_HEIGHT },
              ]}
            />
          </>
        ) : null}
      </View>

      <GestureDetector gesture={pan}>
        <View
          style={styles.trackArea}
          onLayout={onTrackLayout}
          accessibilityRole="adjustable"
          accessibilityLabel="Bid amount"
          accessibilityValue={{
            min: floor,
            max: ceiling,
            now: value,
            text: toRupees(value, step),
          }}
          accessibilityState={{ disabled }}
        >
          <View style={styles.track} />
          <Animated.View style={[styles.fill, fillStyle]} />
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>

      <View style={styles.labelRow}>
        <Caption color="tertiary">{toRupees(floor, step)}</Caption>
        <Caption color="tertiary">{toRupees(ceiling, step)}</Caption>
      </View>

      <View style={styles.snapLabelRow} pointerEvents="none">
        {trackWidth > 0 ? (
          <>
            <Caption
              color="tertiary"
              style={[
                styles.snapLabel,
                { left: tickOffsets.lower },
              ]}
            >
              -10%
            </Caption>
            <Caption
              color="tertiary"
              style={[
                styles.snapLabel,
                { left: tickOffsets.center },
              ]}
            >
              Suggested
            </Caption>
            <Caption
              color="tertiary"
              style={[
                styles.snapLabel,
                { left: tickOffsets.upper },
              ]}
            >
              +10%
            </Caption>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipRow: {
    height: 44,
    justifyContent: 'flex-end',
    marginBottom: spacing.xs,
  },
  tooltip: {
    position: 'absolute',
    left: 0,
    width: THUMB_SIZE,
    alignItems: 'center',
    // Center the rendered Price (much wider than the thumb) over the thumb.
    marginLeft: -40,
    paddingHorizontal: 44,
  },
  ticksRow: {
    height: TICK_HEIGHT_CENTER,
    justifyContent: 'flex-end',
  },
  tick: {
    position: 'absolute',
    bottom: 0,
    width: TICK_WIDTH,
    backgroundColor: colors.ink.tertiary,
    marginLeft: -TICK_WIDTH / 2,
  },
  trackArea: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_RADIUS,
    backgroundColor: colors.bg.elevated,
    marginHorizontal: THUMB_RADIUS,
  },
  fill: {
    position: 'absolute',
    left: THUMB_RADIUS,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_RADIUS,
    backgroundColor: colors.accent,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    backgroundColor: colors.accent,
    borderColor: colors.ink.primary,
    shadowColor: colors.bg.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  snapLabelRow: {
    height: 18,
    marginTop: spacing.xs,
  },
  snapLabel: {
    position: 'absolute',
    top: 0,
    transform: [{ translateX: -32 }],
    width: 64,
    textAlign: 'center',
  },
});
