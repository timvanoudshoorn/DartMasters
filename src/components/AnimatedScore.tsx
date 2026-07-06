import React, { useEffect, useRef } from 'react';
import { StyleProp, StyleSheet, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { fonts } from '../theme';

interface AnimatedScoreProps {
  value: number | string;
  style?: StyleProp<TextStyle>;
}

export function AnimatedScore({ value, style }: AnimatedScoreProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      scale.value = withSequence(
        withTiming(1.45, { duration: 70 }),
        withSpring(1, { damping: 7, stiffness: 180 })
      );
      translateY.value = withSequence(
        withTiming(-6, { duration: 70 }),
        withSpring(0, { damping: 7, stiffness: 180 })
      );
      prev.current = value;
    }
  }, [value]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.text, style, animStyle]}>{value}</Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.display,
  },
});
