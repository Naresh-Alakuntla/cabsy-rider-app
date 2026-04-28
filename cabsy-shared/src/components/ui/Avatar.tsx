import React, { useMemo } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { Body } from './Text';

export interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

const initialsFor = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) {
    return '';
  }
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 36 }) => {
  const initials = useMemo(() => initialsFor(name), [name]);

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  if (uri) {
    return (
      <View style={containerStyle}>
        <Image source={{ uri }} style={styles.image} />
      </View>
    );
  }

  return (
    <View style={containerStyle} accessibilityLabel={name}>
      <Body color="primary">{initials}</Body>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});
