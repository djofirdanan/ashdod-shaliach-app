// ============================================================
// AVATAR COMPONENT - אשדוד-שליח Courier App
// ============================================================

import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '../../theme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
  statusDot?: 'available' | 'busy' | 'offline';
}

const SIZES: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 56,
  xl: 72,
  '2xl': 96,
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getBackgroundColor(name: string): string {
  const colors = [
    '#1A73E8',
    '#E53935',
    '#43A047',
    '#FB8C00',
    '#8E24AA',
    '#00897B',
    '#F4511E',
    '#039BE5',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

const STATUS_COLORS = {
  available: Colors.available,
  busy: Colors.busy,
  offline: Colors.offline,
};

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = '?',
  size = 'md',
  style,
  statusDot,
}) => {
  const dimension = SIZES[size];
  const fontSize = dimension * 0.35;
  const dotSize = dimension * 0.28;

  return (
    <View style={[{ width: dimension, height: dimension }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              backgroundColor: getBackgroundColor(name),
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
        </View>
      )}

      {statusDot && (
        <View
          style={[
            styles.statusDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: STATUS_COLORS[statusDot],
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: Colors.white,
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.white,
  },
});

export default Avatar;
