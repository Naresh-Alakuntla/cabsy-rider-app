import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'phosphor-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export type RatingStarsMode = 'display' | 'picker';

export interface RatingStarsProps {
  value: number;
  mode?: RatingStarsMode;
  size?: number;
  onChange?: (value: number) => void;
  max?: number;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  value,
  mode = 'display',
  size = 14,
  onChange,
  max = 5,
}) => {
  const items: number[] = [];
  for (let i = 1; i <= max; i++) {
    items.push(i);
  }

  return (
    <View style={styles.row} accessibilityLabel={`${value} of ${max} stars`}>
      {items.map((i) => {
        const filled = i <= Math.round(value);
        const star = (
          <Star
            size={size}
            weight={filled ? 'fill' : 'regular'}
            color={filled ? colors.ink.primary : '#D5D5DA'}
          />
        );
        if (mode === 'picker') {
          return (
            <Pressable
              key={i}
              onPress={() => onChange?.(i)}
              hitSlop={6}
              style={styles.pickerStar}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${i} star${i === 1 ? '' : 's'}`}
            >
              {star}
            </Pressable>
          );
        }
        return (
          <View key={i} style={styles.displayStar}>
            {star}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayStar: {
    marginRight: 2,
  },
  pickerStar: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
});
