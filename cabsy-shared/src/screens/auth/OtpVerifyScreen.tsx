import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Body,
  Button,
  Caption,
  Heading,
  Input,
  ScreenContainer,
} from '../../components/ui';
import { spacing } from '../../theme/spacing';
import { clearOtpFlow, requestOtp, verifyOtp } from '../../lib/firebaseAuth';
import * as apiAuth from '../../api/auth';
import { useAuthStore } from '../../store/auth';
import { useAppRole } from '../../lib/appRole';
import type { AuthStackParamList } from './types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

// TODO: replace single Input with a polished segmented 6-box code field.

export default function OtpVerifyScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const { phone } = route.params;
  const appRole = useAppRole();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clearOtpFlow();
    };
  }, []);

  const onChangeCode = (value: string) => {
    setCode(value.replace(/[^0-9]/g, ''));
  };

  const onVerify = async () => {
    setError(null);
    if (code.length !== 6) {
      setError('Code didn’t match. Check and retry.');
      return;
    }
    setVerifying(true);
    try {
      const idToken = await verifyOtp(code);
      const result = await apiAuth.otpVerify(phone, idToken);
      await useAuthStore.getState().login(
        { access: result.accessToken, refresh: result.refreshToken },
        result.user,
        appRole,
      );
      // For driver, the AuthStack still owns the post-OTP onboarding step;
      // for rider, RootNavigator's accessToken gate flips us to RiderStack.
      if (appRole === 'driver') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'DriverOnboarding' }],
        });
      }
    } catch {
      setError('Code didn’t match. Check and retry.');
    } finally {
      setVerifying(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setResending(true);
    try {
      await requestOtp(phone);
      try {
        await apiAuth.otpRequest(phone);
      } catch {
        // best-effort backend mirror
      }
    } catch {
      setError("Couldn't reach SMS service. Try again?");
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenContainer padded scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerBlock}>
          <Heading accessibilityRole="header">Enter the code</Heading>
          <Body color="secondary" style={styles.subhead}>
            We sent a 6-digit code to {phone}.
          </Body>
        </View>

        <View style={styles.inputBlock}>
          <Input
            value={code}
            onChangeText={onChangeCode}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            editable={!verifying}
            accessibilityLabel="Six digit verification code"
          />
        </View>

        <Button
          label="Verify"
          onPress={onVerify}
          variant="primary"
          size="lg"
          loading={verifying}
          disabled={code.length !== 6}
          fullWidth
        />

        {error ? (
          <Caption color="danger" style={styles.error}>
            {error}
          </Caption>
        ) : null}

        <View style={styles.spacer} />

        <Pressable
          onPress={onResend}
          disabled={resending || verifying}
          accessibilityRole="button"
          accessibilityLabel="Resend code"
          accessibilityState={{ disabled: resending || verifying, busy: resending }}
          hitSlop={spacing.md}
        >
          <Body color="accent">
            {resending ? 'Sending…' : 'Didn’t get it? Resend'}
          </Body>
        </Pressable>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    marginTop: spacing['2xl'],
    marginBottom: spacing.xl,
  },
  subhead: {
    marginTop: spacing.sm,
  },
  inputBlock: {
    marginBottom: spacing.lg,
  },
  error: {
    marginTop: spacing.md,
  },
  spacer: {
    height: spacing['3xl'],
  },
});
