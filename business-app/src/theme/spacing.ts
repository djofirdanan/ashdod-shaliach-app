export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,

  // Semantic spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,

  // Component specific
  screenPadding: 20,
  cardPadding: 16,
  inputPadding: 14,
  buttonPaddingV: 14,
  buttonPaddingH: 24,

  // Border radius
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusFull: 9999,

  // Icon sizes
  iconSm: 16,
  iconMd: 24,
  iconLg: 32,
  iconXl: 48,
};

export type SpacingKey = keyof typeof spacing;
