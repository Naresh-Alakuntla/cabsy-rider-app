export const colors = {
  bg: {
    primary: '#FFFFFF',
    surface: '#F6F6F7',
    elevated: '#FFFFFF',
  },
  ink: {
    primary: '#0A0A0A',
    secondary: '#5A5A60',
    tertiary: '#9A9AA2',
  },
  accent: '#6C4BFF',
  accentPressed: '#4A2FCC',
  accentSoft: '#EFEAFF',
  onAccent: '#FFFFFF',
  cta: {
    primary: '#0A0A0A',
    primaryPressed: '#1F1F22',
    onPrimary: '#FFFFFF',
  },
  border: '#E6E6EA',
  surfaceMuted: '#F0F0F2',
  success: '#1FAD66',
  warning: '#F5A524',
  danger: '#E5484D',
  info: '#1E66F5',
  divider: 'rgba(10,10,10,0.08)',
  map: {
    overlay: 'rgba(255,255,255,0.92)',
    route: '#0A0A0A',
    routeAlt: '#6C4BFF',
    pinPickup: '#1FAD66',
    pinDrop: '#0A0A0A',
    pinDriver: '#6C4BFF',
  },
  shadow: {
    color: '#000000',
    soft: 'rgba(0,0,0,0.06)',
    medium: 'rgba(0,0,0,0.12)',
  },
} as const;

export type Colors = typeof colors;
