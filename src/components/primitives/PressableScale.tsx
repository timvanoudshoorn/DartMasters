import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { haptic } from '../../sound/haptics';
import { playSound, SoundTrigger } from '../../sound/soundManager';
import { PRESS_SCALE, SPRING_PRESS } from '../../theme/motion';

type HapticKind = 'tick' | 'light' | 'medium' | 'rigid' | 'none';

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** How far the element dips on press. Defaults to button scale. */
  scaleTo?: number;
  /** Fired on press-in so feedback lands the instant a finger makes contact. */
  haptic?: HapticKind;
  sound?: SoundTrigger | null;
  hitSlop?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The app's universal tactile surface: spring scale on contact, haptic on
 * press-in, optional sound on release. Anything tappable should be one of
 * these — a bare Pressable is a design bug.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  scaleTo = PRESS_SCALE.button,
  haptic: hapticKind = 'light',
  sound = null,
  hitSlop,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (sound) playSound(sound);
        onPress?.();
      }}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, SPRING_PRESS);
        if (hapticKind !== 'none') haptic[hapticKind]();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_PRESS);
      }}
      style={[animStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
