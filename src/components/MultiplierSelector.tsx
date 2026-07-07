import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Multiplier } from '../types';
import { fonts } from '../theme';
import { COLORS } from '../theme/colors';
import { PRESS_SCALE, SPRING_SNAPPY } from '../theme/motion';
import { haptic } from '../sound/haptics';
import { PressableScale } from './primitives/PressableScale';

interface MultiplierSelectorProps {
  value: Multiplier;
  onChange: (m: Multiplier) => void;
  disabled?: boolean;
}

const OPTIONS: { value: Multiplier; label: string }[] = [
  { value: 1, label: 'SINGLE' },
  { value: 2, label: 'DOUBLE' },
  { value: 3, label: 'TRIPLE' },
];

const PADDING = 3;

/** Segmented control with a sliding ember thumb — arming a multiplier feels mechanical. */
export function MultiplierSelector({ value, onChange, disabled }: MultiplierSelectorProps) {
  const [width, setWidth] = useState(0);
  const index = OPTIONS.findIndex((o) => o.value === value);
  const position = useSharedValue(index);

  useEffect(() => {
    position.value = withSpring(index, SPRING_SNAPPY);
  }, [index]);

  const segmentWidth = width > 0 ? (width - PADDING * 2) / OPTIONS.length : 0;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * segmentWidth }],
  }));

  return (
    <View
      style={[styles.track, disabled && styles.disabled]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            { width: segmentWidth },
            value > 1 && styles.thumbArmed,
            thumbStyle,
          ]}
        />
      )}
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <PressableScale
            key={opt.value}
            disabled={disabled}
            scaleTo={PRESS_SCALE.key}
            haptic="none"
            onPress={() => {
              // Arming double/triple clicks harder than returning to single.
              if (opt.value > 1) haptic.medium();
              else haptic.tick();
              onChange(opt.value);
            }}
            style={styles.segment}
          >
            <Text
              style={[
                styles.label,
                selected && (opt.value > 1 ? styles.labelArmed : styles.labelSelected),
              ]}
            >
              {opt.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: PADDING,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: 9,
    backgroundColor: COLORS.raised,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderTopColor: COLORS.edge,
  },
  thumbArmed: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentDeep,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  segment: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: COLORS.textSub,
    letterSpacing: 1.8,
  },
  labelSelected: {
    color: COLORS.text,
  },
  labelArmed: {
    color: COLORS.text,
  },
  disabled: {
    opacity: 0.35,
  },
});
