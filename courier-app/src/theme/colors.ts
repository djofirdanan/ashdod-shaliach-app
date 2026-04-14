// ============================================================
// COLORS - אשדוד-שליח Courier App Theme
// ============================================================

export const Colors = {
  // Primary brand colors
  primary: '#1A73E8',
  primaryDark: '#1557B0',
  primaryLight: '#4A90D9',
  primaryUltraLight: '#E8F0FE',

  // Secondary
  secondary: '#FF6B35',
  secondaryDark: '#E55A25',
  secondaryLight: '#FF8C5A',

  // Status colors (courier-specific)
  available: '#00C853',
  availableLight: '#E8F5E9',
  availableDark: '#00952B',

  busy: '#FF8F00',
  busyLight: '#FFF3E0',
  busyDark: '#E65100',

  offline: '#9E9E9E',
  offlineLight: '#F5F5F5',
  offlineDark: '#616161',

  // Action colors
  accept: '#00C853',
  acceptDark: '#00952B',
  decline: '#F44336',
  declineDark: '#C62828',

  // Earnings gold
  gold: '#FFB300',
  goldLight: '#FFF8E1',
  goldDark: '#FF8F00',

  // Urgency / countdown
  countdown: '#FF5722',
  countdownWarning: '#FF9800',

  // Background
  background: '#F8F9FA',
  backgroundDark: '#ECEFF1',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F5F5',

  // Map overlay
  heatLow: 'rgba(255, 235, 59, 0.4)',
  heatMedium: 'rgba(255, 152, 0, 0.5)',
  heatHigh: 'rgba(244, 67, 54, 0.6)',

  // Text
  textPrimary: '#212121',
  textSecondary: '#757575',
  textTertiary: '#BDBDBD',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',

  // Border
  border: '#E0E0E0',
  borderLight: '#F5F5F5',
  borderFocus: '#1A73E8',

  // Shadows
  shadowColor: '#000000',

  // Chat
  chatBubbleSelf: '#1A73E8',
  chatBubbleOther: '#F5F5F5',
  chatTextSelf: '#FFFFFF',
  chatTextOther: '#212121',

  // Emergency
  emergency: '#D32F2F',
  emergencyLight: '#FFCDD2',

  // Success / Error / Warning / Info
  success: '#43A047',
  successLight: '#E8F5E9',
  error: '#E53935',
  errorLight: '#FFEBEE',
  warning: '#FB8C00',
  warningLight: '#FFF3E0',
  info: '#039BE5',
  infoLight: '#E1F5FE',

  // Navigation
  tabBarActive: '#1A73E8',
  tabBarInactive: '#9E9E9E',
  tabBarBackground: '#FFFFFF',

  // Gradients (used as arrays)
  gradientPrimary: ['#1A73E8', '#1557B0'] as [string, string],
  gradientAvailable: ['#00C853', '#00952B'] as [string, string],
  gradientBusy: ['#FF8F00', '#E65100'] as [string, string],
  gradientGold: ['#FFB300', '#FF8F00'] as [string, string],
  gradientDark: ['#263238', '#37474F'] as [string, string],

  // Overlay
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.2)',
  overlayDark: 'rgba(0,0,0,0.75)',

  // Transparent
  transparent: 'transparent',

  // White / Black
  white: '#FFFFFF',
  black: '#000000',
};

export default Colors;
