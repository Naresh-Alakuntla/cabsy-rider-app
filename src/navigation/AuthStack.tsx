import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  AuthStackParamList,
  LoginPhoneScreen,
  OtpVerifyScreen,
  colors,
} from '@cabsy/shared';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="LoginPhone"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg.primary },
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.ink.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="LoginPhone" component={LoginPhoneScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
    </Stack.Navigator>
  );
}
