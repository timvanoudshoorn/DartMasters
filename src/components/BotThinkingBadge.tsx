import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';

/** Three rising dots — the bot is lining up its throw. */
export function BotThinkingBadge() {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.badge}>
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} delay={i * 140} />
        ))}
      </View>
      <Text style={styles.text}>Bot thinking</Text>
    </Animated.View>
  );
}

function Dot({ delay }: { delay: number }) {
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 260 }), withTiming(0, { duration: 260 }), withTiming(0, { duration: 320 })),
        -1
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + lift.value * 0.65,
    transform: [{ translateY: lift.value * -3 }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: COLORS.card2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.md + 2,
    marginBottom: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accentHot,
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
});
