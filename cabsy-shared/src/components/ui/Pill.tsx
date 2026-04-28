import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { Caption } from './Text';

export type PillVariant = 'online' | 'offline' | 'idle' | 'accent' | 'success' | 'danger';

export interface PillProps {
  label: string;
  dot?: PillVariant;
  variant?: PillVariant;
  selected?: boolean;
}

const dotColorFor = (variant: PillVariant): string => {
  switch (variant) {
    case 'online':
    case 'success':
      return colors.success;
    case 'offline':
      return colors.ink.tertiary;
    case 'idle':
      return colors.warning;
    case 'accent':
      return colors.accent;
    case 'danger':
      return colors.danger;
  }
};

export const Pill: React.FC<PillProps> = ({ label, dot, variant, selected = false }) => {
  const dotVariant = dot ?? variant;

  const containerStyle: ViewStyle = {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.chip,
    backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
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
      <Caption color={selected ? 'accent' : 'primary'}>{label}</Caption>
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
