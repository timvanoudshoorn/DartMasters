import React, { useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Line, Svg } from 'react-native-svg';
import { COLORS } from '../theme/colors';
import { SPRING_BOUNCY } from '../theme/motion';

interface CricketMarkProps {
  /** 0–3+: slash, cross, circled cross (closed). */
  marks: number;
  size?: number;
  /** Closed by everyone — number is dead, render muted. */
  dead?: boolean;
}

/**
 * Classic cricket notation drawn as strokes instead of text glyphs:
 * one mark = slash, two = cross, three = circled cross. Each new mark
 * pops; closing a number lands with a bigger, springier hit.
 */
export function CricketMark({ marks, size = 22, dead }: CricketMarkProps) {
  const clamped = Math.min(3, marks);
  const scale = useSharedValue(1);
  const prev = useRef(clamped);

  useEffect(() => {
    if (clamped > prev.current) {
      // Closing the number hits harder than an ordinary mark.
      const punch = clamped === 3 ? 1.7 : 1.4;
      scale.value = withSequence(
        withTiming(punch, { duration: 60 }),
        withSpring(1, SPRING_BOUNCY)
      );
    }
    prev.current = clamped;
  }, [clamped]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (clamped === 0) {
    return <Animated.View style={{ width: size, height: size }} />;
  }

  const color = dead ? COLORS.textDim : clamped >= 3 ? COLORS.accentHot : COLORS.text;
  const stroke = { stroke: color, strokeWidth: 2.4, strokeLinecap: 'round' as const };

  return (
    <Animated.View style={[{ width: size, height: size }, animStyle]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Line x1={6.5} y1={17.5} x2={17.5} y2={6.5} {...stroke} />
        {clamped >= 2 && <Line x1={6.5} y1={6.5} x2={17.5} y2={17.5} {...stroke} />}
        {clamped >= 3 && (
          <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} fill="none" />
        )}
      </Svg>
    </Animated.View>
  );
}
