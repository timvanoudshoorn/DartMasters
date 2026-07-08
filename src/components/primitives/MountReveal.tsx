import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

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

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, duration, delay]);

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
                outputRange: [distance, 0],
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
