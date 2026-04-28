import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Avatar,
  Body,
  Button,
  Caption,
  Display,
  RatingStars,
  Title,
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

const TAGS = [
  'Clean car',
  'Great music',
  'Safe driving',
  'On time',
  'Friendly',
  'Smooth ride',
];

export default function RateScreen({ navigation }: Props): React.JSX.Element {
  const ride = useRideStore((s) => s.currentRide);
  const driver = useRideStore((s) => s.driver);
  const clearRide = useRideStore((s) => s.clearRide);
  const clearBids = useBidsStore((s) => s.clearBids);

  const [stars, setStars] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goHome = useCallback(() => {
    clearRide();
    clearBids();
    navigation.replace('Home');
  }, [clearRide, clearBids, navigation]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const onSubmit = useCallback(async () => {
    if (!ride || stars < 1 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const tagsLine =
        selectedTags.size > 0 ? `Tags: ${[...selectedTags].join(', ')}` : '';
      const merged = [tagsLine, comment.trim()].filter(Boolean).join('\n');
      await apiRatings.rateRide(ride.id, {
        stars,
        comment: merged.length > 0 ? merged : undefined,
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
  }, [ride, stars, comment, selectedTags, submitting, goHome]);

  if (!ride) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.empty}>
          <Body color="secondary">No ride to rate.</Body>
          <View style={styles.gap} />
          <Button label="Done" variant="primary" onPress={goHome} />
        </View>
      </SafeAreaView>
    );
  }

  const driverName = driver?.name?.trim() || 'your driver';
  const canSubmit = stars >= 1 && !submitting;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.headerCol}>
          <Avatar name={driverName} size={96} />
          <Display color="primary" style={styles.heading}>
            How was your trip?
          </Display>
          <Caption color="secondary" style={styles.subhead}>
            with {driverName}
          </Caption>
        </View>

        <View style={styles.starsBlock}>
          <RatingStars
            value={stars}
            onChange={setStars}
            mode="picker"
            size={44}
          />
        </View>

        {stars > 0 ? (
          <View style={styles.tagsBlock}>
            <Title color="primary" style={styles.tagsHeader}>
              What stood out?
            </Title>
            <View style={styles.tagsRow}>
              {TAGS.map((tag) => {
                const selected = selectedTags.has(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${tag}${selected ? ', selected' : ''}`}
                    style={[
                      styles.tag,
                      selected ? styles.tagSelected : null,
                    ]}
                    hitSlop={4}
                  >
                    <Caption color={selected ? 'accent' : 'primary'} style={styles.tagText}>
                      {tag}
                    </Caption>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.commentBlock}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add a note (optional)"
            placeholderTextColor={colors.ink.tertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.input}
            editable={!submitting}
            selectionColor={colors.accent}
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
          variant="primary"
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
          <Caption color="secondary" style={styles.skipText}>
            Skip
          </Caption>
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
    paddingTop: spacing.lg,
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
  headerCol: {
    alignItems: 'center',
    marginTop: spacing.base,
  },
  heading: {
    marginTop: spacing.lg,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  subhead: {
    marginTop: 4,
  },
  starsBlock: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  tagsBlock: {
    marginTop: spacing.xl,
  },
  tagsHeader: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -4,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.chip,
    margin: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  tagText: {
    fontWeight: '600',
  },
  commentBlock: {
    marginTop: spacing.lg,
  },
  input: {
    minHeight: 88,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
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
  skipText: {
    fontWeight: '600',
  },
});
