import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

export function useShake() {
  const offset = useSharedValue(0);

  const trigger = () => {
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
