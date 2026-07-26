import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './primitives/PressableScale';
import { colors, fonts, radius, spacing } from '../theme';

export interface TabBarOption<T extends string = string> {
  key: T;
  label: string;
}

interface TabBarProps<T extends string = string> {
  options: TabBarOption<T>[];
  value: T;
  onChange: (key: T) => void;
}

/**
 * Segmented pill-track tab control — a rounded track with 4px padding and
 * an ember-filled active pill. Reconciles the two independently-built
 * copies (ChallengesScreen's solo/multiplayer tabs, LeaderboardScreen's
 * period selector) into one shared component; see
 * docs/ui-redesign/audit.md + design-system.md.
 */
export function TabBar<T extends string = string>({ options, value, onChange }: TabBarProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <PressableScale
            key={opt.key}
            onPress={() => onChange(opt.key)}
            haptic="tick"
            scaleTo={0.95}
            style={[styles.btn, active && styles.btnActive]}
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.full,
    padding: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.full,
  },
  btnActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.textPrimary,
  },
});
