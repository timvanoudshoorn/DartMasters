import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { isReducedMotionEnabled } from '../../theme/motionPreference';

export function useShake() {
  const offset = useSharedValue(0);

  const trigger = () => {
    // Pure decorative wobble (bust feedback already has its own haptic/sound
    // signature) — skip outright under reduced motion.
    if (isReducedMotionEnabled()) return;
    offset.value = withSequence(
      withTiming(-10, { duration: 45 }),
      withTiming(10, { duration: 45 }),
      withTiming(-8, { duration: 45 }),
      withTiming(8, { duration: 45 }),
      withTiming(0, { duration: 45 })
    );
  };

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return { shakeStyle: style, triggerShake: trigger };
}
