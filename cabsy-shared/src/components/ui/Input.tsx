import React, { useState } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Caption, Micro } from './Text';

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  leadingIcon?: React.ReactNode;
  onBlur?: () => void;
  onFocus?: () => void;
  editable?: boolean;
  // Used when no visible `label` is rendered (e.g. login phone field).
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  secureTextEntry,
  autoFocus,
  maxLength,
  leadingIcon,
  onBlur,
  onFocus,
  editable = true,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const [focused, setFocused] = useState(false);

  let borderColor: string = colors.border;
  let borderWidth = 1;
  if (error) {
    borderColor = colors.danger;
    borderWidth = 1.5;
  } else if (focused) {
    borderColor = colors.accent;
    borderWidth = 1.5;
  }

  const fieldStyle: ViewStyle = {
    borderColor,
    backgroundColor: colors.bg.elevated,
    borderWidth,
    borderRadius: radius.input,
    paddingHorizontal: spacing.base,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
  };

  return (
    <View>
      {label ? (
        <Micro color="secondary" style={styles.label}>
          {label}
        </Micro>
      ) : null}
      <View style={fieldStyle}>
        {leadingIcon ? <View style={styles.leading}>{leadingIcon}</View> : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.ink.tertiary}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoFocus={autoFocus}
          maxLength={maxLength}
          editable={editable}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          selectionColor={colors.accent}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint}
        />
      </View>
      {error ? (
        <Caption color="danger" style={styles.error}>
          {error}
        </Caption>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs,
  },
  leading: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.ink.primary,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.fontWeight,
    padding: 0,
  },
  error: {
    marginTop: spacing.xs,
  },
});
