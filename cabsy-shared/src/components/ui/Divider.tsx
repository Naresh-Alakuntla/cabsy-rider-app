import React from 'react';
import { View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

export interface DividerProps {
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({ style }) => (
  <View
    style={[{ height: 1, backgroundColor: colors.divider, alignSelf: 'stretch' }, style]}
  />
);
