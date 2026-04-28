import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Body,
  Button,
  Caption,
  Display,
  Heading,
  Input,
  ScreenContainer,
} from '../../components/ui';
import { spacing } from '../../theme/spacing';
import { requestOtp } from '../../lib/firebaseAuth';
import * as apiAuth from '../../api/auth';
import type { AuthStackParamList } from './types';

type Props = NativeStackScreenProps<AuthStackParamList, 'LoginPhone'>;

const E164_RE = /^\+[1-9]\d{7,14}$/;

function normalizeToE164(raw: string): string | null {
  const trimmed = raw.replace(/\s+/g, '');
  if (!E164_RE.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export default function LoginPhoneScreen({
  navigation,
}: Props): React.JSX.Element {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const e164 = normalizeToE164(phone);
    if (!e164) {
      setError('Enter a valid phone number with country code.');
      return;
    }
    setLoading(true);
    try {
      await requestOtp(e164);
      try {
        await apiAuth.otpRequest(e164);
      } catch {
        // backend mirror is best-effort; Firebase already sent the code
      }
      navigation.navigate('OtpVerify', { phone: e164 });
    } catch {
      setError("Couldn't reach SMS service. Try again?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer padded scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Display style={styles.brand} accessibilityRole="header">
          Cabsy
        </Display>

        <View style={styles.headerBlock}>
          <Heading accessibilityRole="header">Sign in</Heading>
          <Body color="secondary" style={styles.subhead}>
            Enter your phone number to continue.
          </Body>
        </View>

        <View style={styles.inputBlock}>
          <Input
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 90000 00000"
            keyboardType="phone-pad"
            editable={!loading}
            accessibilityLabel="Phone number with country code"
            accessibilityHint="Used to send a one-time code by SMS"
          />
        </View>

        <Button
          label="Continue"
          onPress={onSubmit}
          variant="primary"
          size="lg"
          loading={loading}
          disabled={phone.trim().length === 0}
          fullWidth
        />

        {error ? (
          <Caption color="danger" style={styles.error}>
            {error}
          </Caption>
        ) : null}

        <View style={styles.spacer} />

        <Caption color="tertiary" style={styles.terms}>
          By continuing you agree to our terms.
        </Caption>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brand: {
    marginTop: spacing['2xl'],
    marginBottom: spacing['3xl'],
  },
  headerBlock: {
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
  terms: {
    marginTop: spacing.lg,
  },
});
