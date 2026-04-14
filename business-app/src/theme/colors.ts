export const colors = {
  primary: '#6C63FF',
  primaryLight: '#A29BFE',
  primaryDark: '#5A52D5',
  secondary: '#FF6584',
  success: '#00B894',
  successLight: '#55EFC4',
  warning: '#FDCB6E',
  warningLight: '#FFF3CD',
  error: '#E17055',
  errorLight: '#FFE0D9',
  info: '#74B9FF',

  background: '#F8F9FE',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  cardBackground: '#FFFFFF',

  textPrimary: '#2D3748',
  textSecondary: '#718096',
  textTertiary: '#A0AEC0',
  textOnPrimary: '#FFFFFF',

  border: '#E2E8F0',
  borderLight: '#F0F4F8',
  divider: '#EDF2F7',

  // Status colors
  statusPending: '#FDCB6E',
  statusSearching: '#74B9FF',
  statusAccepted: '#A29BFE',
  statusPickedUp: '#6C63FF',
  statusInTransit: '#00CEC9',
  statusDelivered: '#00B894',
  statusCancelled: '#E17055',
  statusFailed: '#E17055',

  // Package type colors
  typeRegular: '#74B9FF',
  typeExpress: '#FDCB6E',
  typeFragile: '#FF6584',
  typeVip: '#6C63FF',

  // Gradients (as arrays for use in LinearGradient)
  gradientPrimary: ['#6C63FF', '#A29BFE'],
  gradientSecondary: ['#FF6584', '#FDCB6E'],
  gradientSuccess: ['#00B894', '#55EFC4'],
  gradientDark: ['#2D3748', '#4A5568'],

  // Dark mode
  darkBackground: '#1A1B2E',
  darkSurface: '#252636',
  darkSurfaceElevated: '#2D2E42',
  darkText: '#E2E8F0',
  darkTextSecondary: '#A0AEC0',
  darkBorder: '#3D3E52',

  // Shadows
  shadowColor: '#6C63FF',

  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',

  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

export type ColorKey = keyof typeof colors;
