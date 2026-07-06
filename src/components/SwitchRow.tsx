import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { haptic } from '../sound/haptics';
import { colors, fonts, spacing } from '../theme';
import { COLORS } from '../theme/colors';
import { SPRING_SNAPPY } from '../theme/motion';

interface SwitchRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

const TRACK_W = 50;
const TRACK_H = 30;
const THUMB = 24;
const TRAVEL = TRACK_W - THUMB - 6;

/** Custom toggle — ember track, springing thumb, tick haptic. No stock Switch. */
export function SwitchRow({ label, value, onChange }: SwitchRowProps) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, SPRING_SNAPPY);
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [COLORS.card2, COLORS.accent]),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.13)', COLORS.accentDeep]
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * TRAVEL },
      { scale: 1 + progress.value * 0.04 },
    ],
  }));

  return (
    <Pressable
      onPress={() => {
        haptic.tick();
        onChange(!value);
      }}
      style={styles.container}
    >
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: COLORS.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
});
