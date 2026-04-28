import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { Caption } from './Text';

export type PillVariant = 'online' | 'offline' | 'idle';

export interface PillProps {
  label: string;
  dot?: PillVariant;
  variant?: PillVariant;
}

const dotColorFor = (variant: PillVariant): string => {
  switch (variant) {
    case 'online':
      return colors.accent;
    case 'offline':
      return colors.ink.tertiary;
    case 'idle':
      return colors.warning;
  }
};

export const Pill: React.FC<PillProps> = ({ label, dot, variant }) => {
  const dotVariant = dot ?? variant;

  const containerStyle: ViewStyle = {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    backgroundColor: colors.bg.surface,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  };

  return (
    <View style={containerStyle}>
      {dotVariant ? (
        <View
          style={[styles.dot, { backgroundColor: dotColorFor(dotVariant) }]}
        />
      ) : null}
      <Caption color="primary">{label}</Caption>
    </View>
  );
};

const styles = StyleSheet.create({
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
});
