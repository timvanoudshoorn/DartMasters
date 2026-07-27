import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';

interface StatPillProps {
  label: string;
  value: string | number;
  accent?: string;
  /** Extra styling merged onto the pill's own container — e.g. to opt a lone
   * pill in a row out of the default `flex: 1` full-width stretch. */
  style?: StyleProp<ViewStyle>;
}

export function StatPill({ label, value, accent, style }: StatPillProps) {
  return (
    <View style={[styles.container, accent ? { borderColor: accent + '40' } : null, style]}>
      <Text style={[styles.value, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    flex: 1,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.textPrimary,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
