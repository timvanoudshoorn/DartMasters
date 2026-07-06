import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme';
import { Icon, IconName } from './icons/Icon';

interface PlayerAvatarProps {
  name: string;
  color: string;
  avatar?: string;
  photoUri?: string;
  size?: number;
  active?: boolean;
}

const ICON_PREFIX = 'icon:';

/** Avatar strings of the form "icon:<name>" render as icons; anything else is legacy text. */
export function iconAvatar(name: IconName): string {
  return ICON_PREFIX + name;
}

function parseIconAvatar(avatar?: string): IconName | null {
  if (!avatar || !avatar.startsWith(ICON_PREFIX)) return null;
  return avatar.slice(ICON_PREFIX.length) as IconName;
}

export function PlayerAvatar({ name, color, avatar, photoUri, size = 44, active }: PlayerAvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const avatarIcon = parseIconAvatar(avatar);

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
      ) : avatarIcon ? (
        <Icon name={avatarIcon} size={size * 0.52} color={color} />
      ) : avatar ? (
        // Legacy persisted avatars (pre-icon emoji strings) still render.
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
