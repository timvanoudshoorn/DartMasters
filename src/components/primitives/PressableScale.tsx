import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
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

/**
 * The app's universal tactile surface: spring scale on contact, haptic on
 * press-in, optional sound on release. Anything tappable should be one of
 * these — a bare Pressable is a design bug.
 *
 * Built on react-native-gesture-handler's Gesture.Tap, not core RN
 * Pressable. Wrapping Pressable in Animated.createAnimatedComponent and
 * driving its own transform from a UI-thread shared value is a known,
 * still-open React Native New Architecture bug (onPress silently stops
 * firing once the responder view's own transform is animated — see
 * facebook/react-native#51621, software-mansion/react-native-reanimated
 * #5977/#3923). Gesture Handler's tap recognizer runs on its own native
 * pipeline and isn't affected, so it's used here instead.
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

  const fireHaptic = () => {
    if (hapticKind !== 'none') haptic[hapticKind]();
  };
  const firePress = () => {
    if (sound) playSound(sound);
    onPress?.();
  };

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .maxDuration(10000)
    .hitSlop(hitSlop ?? 0)
    .onBegin(() => {
      scale.value = withSpring(scaleTo, SPRING_PRESS);
      runOnJS(fireHaptic)();
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING_PRESS);
    })
    .onEnd((_event, success) => {
      if (success) runOnJS(firePress)();
    });

  const gesture = onLongPress
    ? Gesture.Exclusive(
        Gesture.LongPress()
          .enabled(!disabled)
          .onStart(() => runOnJS(onLongPress)()),
        tap
      )
    : tap;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[animStyle, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}
