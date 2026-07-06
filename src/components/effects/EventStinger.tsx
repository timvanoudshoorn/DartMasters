import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, FONT } from '../../theme/colors';
import { SPRING_BOUNCY } from '../../theme/motion';

export interface StingerEvent {
  /** Unique per occurrence so back-to-back identical stingers re-fire. */
  id: number;
  text: string;
  sub?: string;
  color?: string;
}

interface EventStingerProps {
  event: StingerEvent | null;
  onDone?: () => void;
}

const HOLD_MS = 900;

/**
 * Full-screen text slam for the moments that deserve one — ONE EIGHTY,
 * a big checkout, a Shanghai. Slams in oversized, holds, lifts away.
 */
export function EventStinger({ event, onDone }: EventStingerProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!event) return;
    scale.value = 2.4;
    opacity.value = withSequence(
      withTiming(1, { duration: 90 }),
      withDelay(
        HOLD_MS,
        withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }, (finished) => {
          if (finished && onDone) runOnJS(onDone)();
        })
      )
    );
    scale.value = withSequence(
      withSpring(1, SPRING_BOUNCY),
      withDelay(HOLD_MS, withTiming(0.92, { duration: 260 }))
    );
  }, [event?.id]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!event) return null;
  const color = event.color ?? COLORS.accentHot;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.stage, style]}>
        <View style={styles.rule} />
        <Text style={[styles.text, { color }]}>{event.text}</Text>
        {event.sub ? <Text style={styles.sub}>{event.sub}</Text> : null}
        <View style={styles.rule} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  stage: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(12,11,10,0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderTopColor: COLORS.edge,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  rule: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: COLORS.borderStrong,
  },
  text: {
    fontFamily: FONT.score,
    fontSize: 64,
    letterSpacing: 4,
    marginVertical: 6,
    textAlign: 'center',
  },
  sub: {
    fontFamily: FONT.ui,
    fontSize: 11,
    letterSpacing: 3,
    color: COLORS.textSub,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
});
