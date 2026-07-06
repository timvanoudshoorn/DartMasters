import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme';

interface PlayerAvatarProps {
  name: string;
  color: string;
  avatar?: string;
  photoUri?: string;
  size?: number;
  active?: boolean;
}

export function PlayerAvatar({ name, color, avatar, photoUri, size = 44, active }: PlayerAvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '26',
          borderColor: active ? color : 'transparent',
        },
      ]}
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : avatar ? (
        <Text style={{ fontSize: size * 0.55 }}>{avatar}</Text>
      ) : (
        <Text style={[styles.initials, { color, fontSize: size * 0.36 }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  initials: {
    fontFamily: fonts.bodyExtraBold,
  },
});
