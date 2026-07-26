import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayerAvatar } from './PlayerAvatar';
import { PressableScale } from './primitives/PressableScale';
import { colors, fonts, radius, spacing } from '../theme';

export interface PlayerPairChipData {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  photoUri?: string;
}

interface PlayerPairChipsProps {
  players: PlayerPairChipData[];
  /** Ordered ids of the picked players — index 0 is slot A, index 1 is slot B. Max length 2. */
  pickedIds: string[];
  onToggle: (id: string) => void;
  /** Avatar diameter inside each chip. Defaults to 26, matching PlayerFilterChips. */
  avatarSize?: number;
}

/**
 * Two-slot ordered-pair variant of PlayerFilterChips' chip picker — shares
 * its shape, spacing, and PressableScale haptics, but selection is
 * order-tracked instead of single-select: first tap fills slot A, second
 * fills slot B, tapping a filled chip again deselects it, and tapping a
 * third chip while both slots are full evicts slot A and shifts slot B
 * into A's place (oldest-out). A small numbered badge distinguishes slot
 * A ("1") from slot B ("2"). Built for HeadToHeadScreen; see
 * docs/ui-redesign/qa-report.md item 4 for why this couldn't just be a
 * PlayerFilterChips prop (single vs. ordered-pair selection contracts
 * don't unify cleanly).
 */
export function PlayerPairChips({ players, pickedIds, onToggle, avatarSize = 26 }: PlayerPairChipsProps) {
  return (
    <View style={styles.grid}>
      {players.map((p) => {
        const orderIndex = pickedIds.indexOf(p.id);
        const selected = orderIndex >= 0;
        return (
          <PressableScale
            key={p.id}
            onPress={() => onToggle(p.id)}
            haptic="tick"
            scaleTo={0.94}
            style={[styles.chip, selected && { borderColor: p.color, backgroundColor: p.color + '14' }]}
            accessibilityLabel={p.name}
            accessibilityState={{ selected }}
          >
            <PlayerAvatar name={p.name} color={p.color} avatar={p.avatar} photoUri={p.photoUri} size={avatarSize} active={selected} />
            <Text style={[styles.chipLabel, selected && styles.chipLabelActive]} numberOfLines={1}>
              {p.name}
            </Text>
            {selected && (
              <View style={[styles.badge, { backgroundColor: p.color }]}>
                <Text style={styles.badgeText}>{orderIndex + 1}</Text>
              </View>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  chipLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.textMuted,
    maxWidth: 120,
  },
  chipLabelActive: {
    color: colors.textPrimary,
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.bodyExtraBold,
    color: colors.textPrimary,
  },
});
