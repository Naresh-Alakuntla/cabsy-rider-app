import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { motion } from '../../theme/motion';
import {
  PushBannerMessage,
  subscribePushBanner,
} from '../../lib/pushBanner';
import { Body, Caption } from './Text';

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 4500;
const BANNER_HEIGHT_ESTIMATE = 76;
const SIDE_GUTTER = spacing.base;
const ENTER_FROM_TRANSLATE_Y = -80;

export interface PushBannerHostProps {
  onPress?: (msg: PushBannerMessage) => void;
}

interface BannerItemProps {
  message: PushBannerMessage;
  index: number;
  topOffset: number;
  onDismiss: (id: string) => void;
  onPress?: (msg: PushBannerMessage) => void;
}

const BannerItem: React.FC<BannerItemProps> = ({
  message,
  index,
  topOffset,
  onDismiss,
  onPress,
}) => {
  const translateY = useSharedValue(ENTER_FROM_TRANSLATE_Y);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    const cleanup = (): void => {
      onDismiss(message.id);
    };
    translateY.value = withTiming(ENTER_FROM_TRANSLATE_Y, {
      duration: motion.duration.state,
      easing: motion.easing.standard,
    });
    scale.value = withTiming(0.96, {
      duration: motion.duration.state,
      easing: motion.easing.standard,
    });
    opacity.value = withTiming(
      0,
      { duration: motion.duration.state, easing: motion.easing.standard },
      (finished) => {
        if (finished) runOnJS(cleanup)();
      },
    );
  }, [message.id, onDismiss, opacity, scale, translateY]);

  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: motion.duration.state,
      easing: motion.easing.standard,
    });
    opacity.value = withTiming(1, {
      duration: motion.duration.state,
      easing: motion.easing.standard,
    });
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [dismiss, opacity, translateY]);

  const handlePress = useCallback(() => {
    // TODO: route to a screen based on message.data (e.g. data.rideId).
    if (onPress) onPress(message);
    dismiss();
  }, [dismiss, message, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const stackedTop = topOffset + index * (BANNER_HEIGHT_ESTIMATE + spacing.sm);

  return (
    <Animated.View
      style={[styles.bannerWrap, { top: stackedTop }, animatedStyle]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="alert"
        accessibilityLabel={`${message.title}. ${message.body}`}
        // accessibilityLiveRegion is Android-only; iOS uses accessibilityRole="alert".
        accessibilityLiveRegion={
          Platform.OS === 'android' ? 'polite' : undefined
        }
        onPress={handlePress}
        style={styles.banner}
      >
        <Body color="primary" style={styles.title} numberOfLines={1}>
          {message.title}
        </Body>
        <Caption color="secondary" numberOfLines={2}>
          {message.body}
        </Caption>
      </Pressable>
    </Animated.View>
  );
};

export const PushBanner = BannerItem;

export const PushBannerHost: React.FC<PushBannerHostProps> = ({ onPress }) => {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<PushBannerMessage[]>([]);

  useEffect(() => {
    const unsub = subscribePushBanner((msg) => {
      setQueue((prev) => {
        if (prev.length < MAX_VISIBLE) {
          return [...prev, msg];
        }
        // Replace the tail so we never pile up infinite banners.
        return [...prev.slice(0, MAX_VISIBLE - 1), msg];
      });
    });
    return unsub;
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setQueue((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const topOffset = useMemo(
    () => insets.top + spacing.sm,
    [insets.top],
  );

  if (queue.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {queue.map((msg, idx) => (
        <BannerItem
          key={msg.id}
          message={msg}
          index={idx}
          topOffset={topOffset}
          onDismiss={handleDismiss}
          onPress={onPress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    left: SIDE_GUTTER,
    right: SIDE_GUTTER,
  },
  banner: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.divider,
    flexDirection: 'column',
  },
  title: {
    marginBottom: spacing.xs,
  },
});
