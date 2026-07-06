import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';
import { PressableScale } from './primitives/PressableScale';

interface OptionRowProps<T extends string | number> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function OptionRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: OptionRowProps<T>) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <PressableScale
              key={String(opt.value)}
              haptic="tick"
              scaleTo={0.94}
              onPress={() => onChange(opt.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                {opt.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  options: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.full,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentDeep,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  chipLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  chipLabelSelected: {
    color: COLORS.text,
  },
});
