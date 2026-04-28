import type { LinkingOptions } from '@react-navigation/native';

import type { AuthStackParamList } from '@cabsy/shared';
import type { RiderStackParamList } from '../screens/rider/types';

// Root is a tagged union: at runtime the active stack is decided by the
// auth gate in RootNavigator.
export type RootStackParamList = AuthStackParamList | RiderStackParamList;

export type { AuthStackParamList, RiderStackParamList };

// TODO: deep linking — flesh out screens map once routes stabilize.
export const linking: LinkingOptions<Record<string, object | undefined>> = {
  prefixes: ['cabsy://'],
  config: {
    screens: {},
  },
};
