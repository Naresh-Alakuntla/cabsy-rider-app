import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Body, Title } from './Text';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'tertiary';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  fullWidth?: boolean;
  // Override the screen-reader announcement when the visible label uses
  // glyphs (₹) or shorthand that don't read well aloud.
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const HEIGHT: Record<ButtonSize, number> = {
  md: 48,
  lg: 56,
};

const PRESS_DURATION = 120;

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  leadingIcon,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const isInteractive = !loading && !disabled;
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

  let backgroundColor: string;
  let pressOverlayColor: string;
  let labelColor: string;
  let borderColor: string | undefined;

  switch (variant) {
    case 'primary':
      backgroundColor = colors.cta.primary;
      pressOverlayColor = colors.cta.primaryPressed;
      labelColor = colors.cta.onPrimary;
      break;
    case 'accent':
      backgroundColor = colors.accent;
      pressOverlayColor = colors.accentPressed;
      labelColor = colors.onAccent;
      break;
    case 'secondary':
      backgroundColor = colors.bg.elevated;
      pressOverlayColor = colors.surfaceMuted;
      labelColor = colors.ink.primary;
      borderColor = colors.border;
      break;
    case 'tertiary':
      backgroundColor = 'transparent';
      pressOverlayColor = colors.surfaceMuted;
      labelColor = colors.accent;
      break;
  }

  const baseStyle: ViewStyle = {
    height: HEIGHT[size],
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.4 : 1,
    overflow: 'hidden',
    backgroundColor,
    ...(borderColor
      ? { borderWidth: 1, borderColor }
      : {}),
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      onPress={isInteractive ? onPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={size === 'md' ? 6 : 0}
      style={[baseStyle, fullWidth && styles.fullWidth]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: pressOverlayColor, opacity: overlayOpacity },
        ]}
      />
      {loading ? (
        <ActivityIndicator size="small" color={labelColor} />
      ) : (
        <>
          {leadingIcon ? <View style={styles.icon}>{leadingIcon}</View> : null}
          {size === 'lg' ? (
            <Title style={[styles.label, { color: labelColor }]}>{label}</Title>
          ) : (
            <Body style={[styles.mdLabel, { color: labelColor }]}>{label}</Body>
          )}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    fontWeight: typography.button.fontWeight,
    letterSpacing: typography.button.letterSpacing,
  },
  mdLabel: {
    fontWeight: typography.button.fontWeight,
    letterSpacing: typography.button.letterSpacing,
    fontSize: typography.button.fontSize,
    lineHeight: typography.button.lineHeight,
  },
});
