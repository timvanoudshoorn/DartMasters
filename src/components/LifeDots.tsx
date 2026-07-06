import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../theme/colors';
import { SPRING_BOUNCY } from '../theme/motion';

interface LifeDotsProps {
  lives: number;
  maxLives: number;
  size?: number;
}

/**
 * Killer life track. Gained lives pop in; a lost life collapses while the
 * whole row recoils — losing a life should feel like taking a hit.
 */
export function LifeDots({ lives, maxLives, size = 8 }: LifeDotsProps) {
  const shake = useSharedValue(0);
  const prev = useRef(lives);

  useEffect(() => {
    if (lives < prev.current) {
      shake.value = withSequence(
        withTiming(-5, { duration: 40 }),
        withTiming(5, { duration: 40 }),
        withTiming(-3, { duration: 40 }),
        withTiming(0, { duration: 40 })
      );
    }
    prev.current = lives;
  }, [lives]);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      {Array.from({ length: maxLives }).map((_, i) => (
        <LifeDot key={i} alive={i < lives} size={size} />
      ))}
    </Animated.View>
  );
}

function LifeDot({ alive, size }: { alive: boolean; size: number }) {
  const presence = useSharedValue(alive ? 1 : 0);
  const prev = useRef(alive);

  useEffect(() => {
    if (alive !== prev.current) {
      if (alive) {
        // Gained a life: overshoot in.
        presence.value = withSequence(
          withTiming(1.5, { duration: 90 }),
          withSpring(1, SPRING_BOUNCY)
        );
      } else {
        // Lost a life: flare then collapse.
        presence.value = withSequence(
          withTiming(1.6, { duration: 70 }),
          withTiming(0, { duration: 220 })
        );
      }
      prev.current = alive;
    }
  }, [alive]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + presence.value * 0.4 }],
    opacity: 0.35 + presence.value * 0.65,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: alive ? COLORS.bust : COLORS.card2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
});
