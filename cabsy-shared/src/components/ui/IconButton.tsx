import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export type IconButtonVariant = 'default' | 'accent' | 'dark';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  variant?: IconButtonVariant;
  disabled?: boolean;
  size?: number;
  accessibilityLabel?: string;
}

const DEFAULT_SIZE = 44;
const PRESS_DURATION = 120;

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  variant = 'default',
  disabled = false,
  size = DEFAULT_SIZE,
  accessibilityLabel,
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

  let backgroundColor: string;
  let pressOverlayColor: string;
  let borderColor: string | undefined;
  switch (variant) {
    case 'accent':
      backgroundColor = colors.accent;
      pressOverlayColor = colors.accentPressed;
      break;
    case 'dark':
      backgroundColor = colors.cta.primary;
      pressOverlayColor = colors.cta.primaryPressed;
      break;
    case 'default':
    default:
      backgroundColor = colors.bg.elevated;
      pressOverlayColor = colors.surfaceMuted;
      borderColor = colors.border;
      break;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          ...(borderColor ? { borderWidth: 1, borderColor } : {}),
        },
        styles.shadow,
        disabled ? styles.disabled : null,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2 },
          { backgroundColor: pressOverlayColor, opacity: overlayOpacity },
        ]}
      />
      {icon}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
