import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string;
  imageUri?: string;
  size?: AvatarSize;
  style?: ViewStyle;
  online?: boolean;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 64,
  xl: 88,
};

const fontSizeMap: Record<AvatarSize, number> = {
  xs: 11,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
};

const getInitials = (name?: string): string => {
  if (!name) return '?';
  const words = name.trim().split(' ');
  if (words.length === 1) return words[0][0]?.toUpperCase() || '?';
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

const getColor = (name?: string): string => {
  const avatarColors = [
    colors.primary,
    colors.secondary,
    colors.success,
    '#E84393',
    '#00CEC9',
    '#6C5CE7',
    '#FDCB6E',
  ];
  if (!name) return colors.primary;
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  imageUri,
  size = 'md',
  style,
  online,
}) => {
  const dimension = sizeMap[size];
  const fontSize = fontSizeMap[size];
  const bgColor = getColor(name);
  const onlineDotSize = dimension * 0.28;

  return (
    <View
      style={[
        styles.wrapper,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        },
        style,
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
          }}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              backgroundColor: bgColor,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
        </View>
      )}
      {online !== undefined && (
        <View
          style={[
            styles.onlineDot,
            {
              width: onlineDotSize,
              height: onlineDotSize,
              borderRadius: onlineDotSize / 2,
              backgroundColor: online ? colors.success : colors.textSecondary,
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
  wrapper: {
    position: 'relative',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.white,
  },
});
