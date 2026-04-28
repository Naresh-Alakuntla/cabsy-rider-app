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

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
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
  md: 44,
  lg: 56,
};

const PRESS_DURATION = 120;

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
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

  const baseStyle: ViewStyle = {
    height: HEIGHT[size],
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
    overflow: 'hidden',
  };

  let backgroundColor: string;
  let pressOverlayColor: string;

  switch (variant) {
    case 'primary':
      backgroundColor = colors.accent;
      pressOverlayColor = colors.accentPressed;
      break;
    case 'secondary':
      backgroundColor = colors.bg.surface;
      pressOverlayColor = colors.divider;
      break;
    case 'tertiary':
      backgroundColor = 'transparent';
      pressOverlayColor = colors.divider;
      break;
  }

  const labelColorStyle =
    variant === 'primary' ? styles.primaryLabel : styles.lightLabel;

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
      style={[baseStyle, { backgroundColor }, fullWidth && styles.fullWidth]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: pressOverlayColor, opacity: overlayOpacity },
        ]}
      />
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.bg.primary : colors.ink.primary}
        />
      ) : (
        <>
          {leadingIcon ? <View style={styles.icon}>{leadingIcon}</View> : null}
          {size === 'lg' ? (
            <Title style={labelColorStyle}>{label}</Title>
          ) : (
            <Body style={[styles.mdLabel, labelColorStyle]}>{label}</Body>
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
  mdLabel: {
    fontWeight: typography.title.fontWeight,
  },
  primaryLabel: {
    color: colors.bg.primary,
  },
  lightLabel: {
    color: colors.ink.primary,
  },
});
