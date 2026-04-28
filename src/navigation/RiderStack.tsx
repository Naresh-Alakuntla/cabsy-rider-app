import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RiderHomeScreen from '../screens/rider/HomeScreen';
import RiderBookScreen from '../screens/rider/BookRideScreen';
import RiderBidScreen from '../screens/rider/BidScreen';
import RiderTrackingScreen from '../screens/rider/TrackingScreen';
import RiderHistoryScreen from '../screens/rider/HistoryScreen';
import RiderRateScreen from '../screens/rider/RateScreen';
import { colors, typography } from '@cabsy/shared';
import type { RiderStackParamList } from './types';

const Stack = createNativeStackNavigator<RiderStackParamList>();

export function RiderStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        contentStyle: { backgroundColor: colors.bg.primary },
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.ink.primary,
        headerTitleStyle: {
          color: colors.ink.primary,
          fontSize: typography.title.fontSize,
          fontWeight: typography.title.fontWeight,
        },
        headerShadowVisible: false,
        headerBackTitle: '',
      }}
    >
      <Stack.Screen
        name="Home"
        component={RiderHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Book"
        component={RiderBookScreen}
        options={{ title: 'Book a ride' }}
      />
      <Stack.Screen
        name="Bid"
        component={RiderBidScreen}
        options={{ title: 'Choose your driver' }}
      />
      <Stack.Screen
        name="Tracking"
        component={RiderTrackingScreen}
        options={{ title: 'On the way' }}
      />
      <Stack.Screen
        name="History"
        component={RiderHistoryScreen}
        options={{ title: 'History' }}
      />
      <Stack.Screen
        name="Rate"
        component={RiderRateScreen}
        options={{ title: 'Rate your ride' }}
      />
    </Stack.Navigator>
  );
}
