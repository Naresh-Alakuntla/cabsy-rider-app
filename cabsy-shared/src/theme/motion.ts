import { Easing } from 'react-native-reanimated';

export const motion = {
  duration: {
    state: 200,
    screen: 350,
    bid: 200,
    price: 120,
  },
  easing: {
    standard: Easing.out(Easing.ease),
  },
} as const;

export type Motion = typeof motion;
