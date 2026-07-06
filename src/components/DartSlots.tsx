import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Dart } from '../types';
import { fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';

interface DartSlotsProps {
  darts: Dart[];
  slots?: number;
}

function dartLabel(d: Dart): string {
  if (d.segment === 0) return 'MISS';
  const prefix = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : 'S';
  if (d.segment === 25) return d.multiplier === 2 ? 'D-BULL' : 'BULL';
  return `${prefix}${d.segment}`;
}

function dartColor(d: Dart): string {
  if (d.segment === 0) return COLORS.textFaint;
  if (d.multiplier >= 2) return COLORS.accentHot;
  return COLORS.text;
}

export function DartSlots({ darts, slots = 3 }: DartSlotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: slots }).map((_, i) => {
        const dart = darts[i];
        return (
          <View key={i} style={[styles.slot, dart && styles.slotFilled]}>
            {dart ? (
              <Animated.Text
                entering={ZoomIn.springify().damping(12).stiffness(220)}
                style={[styles.slotText, { color: dartColor(dart) }]}
              >
                {dartLabel(dart)}
              </Animated.Text>
            ) : (
              <Text style={styles.slotEmpty}>·</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  slot: {
    minWidth: 56,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: {
    backgroundColor: COLORS.card2,
    borderColor: COLORS.borderStrong,
    borderTopColor: COLORS.edge,
  },
  slotText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 13,
  },
  slotEmpty: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 13,
    color: COLORS.textDim,
  },
});
