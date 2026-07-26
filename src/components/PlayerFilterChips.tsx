import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { PlayerAvatar } from './PlayerAvatar';
import { PressableScale } from './primitives/PressableScale';
import { colors, fonts, radius, spacing } from '../theme';

export interface PlayerFilterChipData {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  photoUri?: string;
}

interface PlayerFilterChipsProps {
  players: PlayerFilterChipData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Avatar diameter inside each chip. Defaults to 26 (between the 24/28 used independently). */
  avatarSize?: number;
}

/**
 * Single-select "which player's data am I viewing" horizontal chip picker.
 * Consolidates the independently-built copies in AchievementsScreen,
 * HeadToHeadScreen's single-pick usage, and StatsTrendsScreen (see
 * docs/ui-redesign/audit.md / design-system.md). Distinct from
 * `PlayerSelectGrid`, which is multi-select, wraps into a grid, and shows
 * order-number badges for a different job.
 */
export function PlayerFilterChips({ players, selectedId, onSelect, avatarSize = 26 }: PlayerFilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {players.map((p) => {
        const active = p.id === selectedId;
        return (
          <PressableScale
            key={p.id}
            onPress={() => onSelect(p.id)}
            haptic="tick"
            scaleTo={0.94}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityLabel={p.name}
            accessibilityState={{ selected: active }}
          >
            <PlayerAvatar name={p.name} color={p.color} avatar={p.avatar} photoUri={p.photoUri} size={avatarSize} />
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]} numberOfLines={1}>
              {p.name}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.edge,
    borderRadius: radius.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '14',
  },
  chipLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.textMuted,
    maxWidth: 120,
  },
  chipLabelActive: {
    color: colors.textPrimary,
  },
});
