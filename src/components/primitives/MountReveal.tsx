import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { isReducedMotionEnabled } from '../../theme/motionPreference';

interface MountRevealProps {
  children: React.ReactNode;
  /** ms before the reveal starts — stagger sections by index * STAGGER_MS. */
  delay?: number;
  /** px the content rises while fading in. */
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Launch-safe entrance: fade + rise on mount using core RN Animated with the
 * native driver. Unlike Reanimated's entering= Layout Animations (which hang
 * the app when used on the initial route on native), this runs everywhere —
 * launch path included. Use this for anything visible at app start; Reanimated
 * entering= stays fine for screens mounted after launch.
 */
export function MountReveal({
  children,
  delay = 0,
  distance = 14,
  duration = 320,
  style,
}: MountRevealProps) {
  const progress = useRef(new Animated.Value(0)).current;
  // Read fresh at mount time (no subscription exists for this flag) — a
  // reduced-motion user gets a near-instant fade with no stagger delay and
  // no rise, rather than the full choreographed entrance.
  const reduced = isReducedMotionEnabled();
  const effectiveDelay = reduced ? 0 : delay;
  const effectiveDuration = reduced ? Math.min(duration, 120) : duration;
  const effectiveDistance = reduced ? 0 : distance;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: effectiveDuration,
      delay: effectiveDelay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, effectiveDuration, effectiveDelay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [effectiveDistance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
