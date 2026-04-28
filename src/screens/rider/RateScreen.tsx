import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Avatar,
  Body,
  Button,
  Caption,
  Heading,
  RatingStars,
} from '@cabsy/shared';
import { colors } from '@cabsy/shared';
import { radius } from '@cabsy/shared';
import { spacing } from '@cabsy/shared';
import { typography } from '@cabsy/shared';
import * as apiRatings from '@cabsy/shared';
import { ApiError } from '@cabsy/shared';
import { useRideStore } from '@cabsy/shared';
import { useBidsStore } from '@cabsy/shared';
import type { RiderStackParamList } from './types';

type Props = NativeStackScreenProps<RiderStackParamList, 'Rate'>;

export default function RateScreen({ navigation }: Props): React.JSX.Element {
  const ride = useRideStore((s) => s.currentRide);
  const clearRide = useRideStore((s) => s.clearRide);
  const clearBids = useBidsStore((s) => s.clearBids);

  const [stars, setStars] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goHome = useCallback(() => {
    clearRide();
    clearBids();
    navigation.replace('Home');
  }, [clearRide, clearBids, navigation]);

  const onSubmit = useCallback(async () => {
    if (!ride || stars < 1 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiRatings.rateRide(ride.id, {
        stars,
        comment: comment.trim() ? comment.trim() : undefined,
      });
      goHome();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Couldn't submit your rating. Try again?");
      }
    } finally {
      setSubmitting(false);
    }
  }, [ride, stars, comment, submitting, goHome]);

  if (!ride) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.empty}>
          <Body color="secondary">No ride to rate.</Body>
          <View style={styles.gap} />
          <Button label="Done" onPress={goHome} />
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = stars >= 1 && !submitting;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Heading>How was the ride?</Heading>

        <View style={styles.driverBlock}>
          {/* TODO: pass driver name into ride store on assignment so we can show it here. */}
          <Avatar name="Driver" size={56} />
          <Caption color="secondary" style={styles.driverName}>
            Driver
          </Caption>
        </View>

        <View style={styles.starsBlock}>
          <RatingStars
            value={stars}
            onChange={setStars}
            mode="picker"
            size={36}
          />
        </View>

        <View style={styles.commentBlock}>
          <Caption color="secondary" style={styles.commentLabel}>
            Comment (optional)
          </Caption>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="What stood out?"
            placeholderTextColor={colors.ink.tertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.input}
            editable={!submitting}
            accessibilityLabel="Comment, optional"
          />
        </View>

        {error ? (
          <Body color="danger" style={styles.error}>
            {error}
          </Body>
        ) : null}

        <View style={styles.spacer} />

        <Button
          label="Submit"
          size="lg"
          fullWidth
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={submitting}
        />
        <Pressable
          onPress={goHome}
          accessibilityRole="button"
          accessibilityLabel="Skip rating"
          accessibilityState={{ disabled: submitting }}
          style={styles.skipBtn}
          hitSlop={8}
          disabled={submitting}
        >
          <Body color="secondary">Skip</Body>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  gap: {
    height: spacing.base,
  },
  driverBlock: {
    marginTop: spacing.xl,
    alignItems: 'flex-start',
  },
  driverName: {
    marginTop: spacing.sm,
  },
  starsBlock: {
    marginTop: spacing.xl,
  },
  commentBlock: {
    marginTop: spacing.xl,
  },
  commentLabel: {
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 96,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.base,
    color: colors.ink.primary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  error: {
    marginTop: spacing.md,
  },
  spacer: {
    flex: 1,
  },
  skipBtn: {
    marginTop: spacing.base,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
});
