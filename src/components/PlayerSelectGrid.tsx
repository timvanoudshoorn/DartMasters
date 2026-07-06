import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Player } from '../types';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';
import { PlayerAvatar } from './PlayerAvatar';
import { PressableScale } from './primitives/PressableScale';
import { Icon } from './icons/Icon';

interface PlayerSelectGridProps {
  players: Player[];
  selectedIds: string[];
  onToggle: (playerId: string) => void;
  onAddPress: () => void;
}

export function PlayerSelectGrid({
  players,
  selectedIds,
  onToggle,
  onAddPress,
}: PlayerSelectGridProps) {
  return (
    <View style={styles.grid}>
      {players.map((p) => {
        const orderIndex = selectedIds.indexOf(p.id);
        const selected = orderIndex >= 0;
        return (
          <PressableScale
            key={p.id}
            onPress={() => onToggle(p.id)}
            haptic="tick"
            scaleTo={0.94}
            style={[
              styles.chip,
              selected && {
                borderColor: p.color,
                backgroundColor: p.color + '14',
              },
            ]}
          >
            <PlayerAvatar name={p.name} color={p.color} avatar={p.avatar} photoUri={p.photoUri} size={32} active={selected} />
            <Text style={[styles.name, selected && { color: colors.textPrimary }]}>{p.name}</Text>
            {selected && (
              <Animated.View
                entering={ZoomIn.springify().damping(11).stiffness(260)}
                style={[styles.badge, { backgroundColor: p.color }]}
              >
                <Text style={styles.badgeText}>{orderIndex + 1}</Text>
              </Animated.View>
            )}
          </PressableScale>
        );
      })}
      <PressableScale style={styles.addChip} onPress={onAddPress} haptic="light" scaleTo={0.94}>
        <Icon name="add" size={18} color={colors.primaryHot} />
        <Text style={styles.addLabel}>Add player</Text>
      </PressableScale>
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
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: COLORS.card2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  name: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemibold,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.bodyExtraBold,
    color: colors.textPrimary,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(232,92,63,0.4)',
    borderStyle: 'dashed',
  },
  addLabel: {
    color: colors.primaryHot,
    fontFamily: fonts.bodyBold,
  },
});
