// ============================================================
// CARD COMPONENT - אשדוד-שליח Courier App
// ============================================================

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: 'sm' | 'md' | 'lg' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  borderColor?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevation = 'md',
  padding = 'md',
  borderColor,
}) => {
  const cardStyle = [
    styles.card,
    elevation !== 'none' && Shadows[elevation],
    styles[`padding_${padding}`],
    borderColor && { borderWidth: 1.5, borderColor },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
  },
  padding_none: {},
  padding_sm: { padding: Spacing.sm },
  padding_md: { padding: Spacing.base },
  padding_lg: { padding: Spacing.xl },
});

export default Card;
