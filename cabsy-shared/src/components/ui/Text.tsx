import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// Screen readers announce "Rs" or "rupees" inconsistently for the bare ₹
// glyph, so derive a spelled-out label by default. Consumers can still pass
// an explicit `accessibilityLabel` to override.
function deriveRupeeLabel(children: React.ReactNode): string | undefined {
  if (typeof children === 'string') {
    const match = children.match(/^₹\s*([\d,]+(?:\.\d+)?)\s*$/);
    if (match) return `Rupees ${match[1]}`;
  }
  return undefined;
}

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'success'
  | 'danger';

export interface ThemedTextProps extends RNTextProps {
  color?: TextColor;
}

const colorFor = (token: TextColor): string => {
  switch (token) {
    case 'primary':
      return colors.ink.primary;
    case 'secondary':
      return colors.ink.secondary;
    case 'tertiary':
      return colors.ink.tertiary;
    case 'accent':
      return colors.accent;
    case 'success':
      return colors.success;
    case 'danger':
      return colors.danger;
  }
};

const toMutable = (style: {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  fontVariant?: readonly string[];
  letterSpacing?: number;
}): TextStyle => ({
  fontSize: style.fontSize,
  lineHeight: style.lineHeight,
  fontWeight: style.fontWeight,
  ...(style.fontVariant
    ? { fontVariant: [...style.fontVariant] as TextStyle['fontVariant'] }
    : {}),
  ...(style.letterSpacing !== undefined
    ? { letterSpacing: style.letterSpacing }
    : {}),
});

const makeVariant = (
  variantStyle: TextStyle,
  defaultColor: TextColor = 'primary',
): React.FC<ThemedTextProps> => {
  const Component: React.FC<ThemedTextProps> = ({
    color = defaultColor,
    style,
    ...rest
  }) => (
    <RNText
      {...rest}
      style={StyleSheet.compose(
        StyleSheet.compose(variantStyle, { color: colorFor(color) }),
        style,
      )}
    />
  );
  return Component;
};

export const Display = makeVariant(toMutable(typography.displayXl));
export const Heading = makeVariant(toMutable(typography.heading));
export const Title = makeVariant(toMutable(typography.title));
export const Body = makeVariant(toMutable(typography.body));
export const Caption = makeVariant(toMutable(typography.caption), 'secondary');
export const Micro = makeVariant(
  { ...toMutable(typography.micro), textTransform: 'uppercase' },
  'secondary',
);

// Price renders monetary values: display-lg, tabular figures, accent by default.
const PriceBase = makeVariant(toMutable(typography.displayLg), 'accent');

// Price wraps the base variant so it can derive a screen-reader-friendly
// label (e.g. "₹240" → "Rupees 240") and announce as text, not a button.
export const Price: React.FC<ThemedTextProps> = ({
  accessibilityLabel,
  accessibilityRole,
  children,
  ...rest
}) => (
  <PriceBase
    {...rest}
    accessibilityRole={accessibilityRole ?? 'text'}
    accessibilityLabel={accessibilityLabel ?? deriveRupeeLabel(children)}
  >
    {children}
  </PriceBase>
);
