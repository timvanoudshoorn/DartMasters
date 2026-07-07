import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

/**
 * Launch-safe fade+rise entrance built on core RN Animated.
 *
 * Reanimated `entering=` Layout Animations hang the app at splash when used
 * on the initial route on native (web silently no-ops them). Anything
 * visible at app start (HomeScreen) must use this instead of Reanimated
 * entrances; screens mounted after launch may use Reanimated `entering=`
 * freely.
 */
export function MountReveal({
  children,
  delay = 0,
  distance = 14,
  duration = 380,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
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
