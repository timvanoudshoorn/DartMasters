import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';

interface CheckoutBannerProps {
  combo: string[] | null;
}

/** "You're on a finish" — green wash, breathing dot, dart chips slide in. */
export function CheckoutBanner({ combo }: CheckoutBannerProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (combo) {
      pulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 800 }), withTiming(0, { duration: 800 })),
        -1,
        true
      );
    } else {
      pulse.value = 0;
    }
  }, [!!combo]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + pulse.value * 0.5,
    transform: [{ scale: 1 + pulse.value * 0.35 }],
  }));

  if (!combo) return null;
  return (
    <Animated.View entering={FadeInDown.duration(220).springify()} style={styles.container}>
      <Animated.View style={[styles.dot, dotStyle]} />
      <Text style={styles.label}>CHECKOUT</Text>
      <View style={styles.dartsRow}>
        {combo.map((d, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Text style={styles.arrow}>→</Text>}
            <View style={styles.dartChip}>
              <Text style={styles.dartText}>{d}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.positiveGlow,
    borderColor: COLORS.positiveBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.positive,
  },
  label: {
    color: COLORS.positive,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 2,
  },
  dartsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  arrow: {
    color: COLORS.textFaint,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  dartChip: {
    backgroundColor: COLORS.card2,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderTopColor: COLORS.edge,
  },
  dartText: {
    color: COLORS.text,
    fontFamily: fonts.bodyExtraBold,
    fontSize: 13,
  },
});
