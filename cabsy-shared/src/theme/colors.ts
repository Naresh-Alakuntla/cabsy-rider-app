export const colors = {
  bg: {
    primary: '#0E1726',
    surface: '#18233A',
    elevated: '#1F2D47',
  },
  ink: {
    primary: '#F4EFE6',
    secondary: '#B8B5AD',
    tertiary: '#6E6B66',
  },
  accent: '#C9A961',
  accentPressed: '#B08F4D',
  success: '#6FA37F',
  warning: '#D4A14A',
  danger: '#C46A5C',
  divider: 'rgba(244,239,230,0.08)',
} as const;

export type Colors = typeof colors;
