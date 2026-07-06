import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface ScreenFlashProps {
  trigger: boolean;
  color: string;
}

export function ScreenFlash({ trigger, color }: ScreenFlashProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      opacity.value = withSequence(
        withTiming(0.45, { duration: 60 }),
        withTiming(0, { duration: 500 })
      );
    }
  }, [trigger]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]}
    />
  );
}
