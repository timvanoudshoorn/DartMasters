import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Icon } from './icons/Icon';
import { PressableScale } from './primitives/PressableScale';
import { colors, radius, spacing } from '../theme';

interface GameHudProps {
  /** Fired when the 36×36 circular exit button is pressed — usually navigation.goBack(). */
  onExit: () => void;
  /**
   * Whatever sits in the middle of the bar: the round/leg pill (plain text)
   * in most game screens, or an icon+text "titlePill" (e.g. Killer's skull
   * + "KILLER"). Passed through as-is so callers keep full control of it.
   */
  centerContent: React.ReactNode;
  /**
   * Darts thrown so far this turn (0-3) — renders as a row of 3 dot
   * indicators. Omit during phases that don't track a per-turn dart count
   * (e.g. Killer's claim/bull-off phases); a same-width invisible spacer
   * renders in its place so the exit button + centerContent stay centered.
   */
  dartsThisTurn?: number;
  /**
   * Optional action rendered at the right edge (after the dart dots) —
   * the one shared home for per-screen game actions like Undo, so every
   * mode puts it in the same place.
   */
  rightAction?: React.ReactNode;
}

/**
 * Shared in-game HUD top bar: exit button + round/leg pill + dart-thrown
 * dots. Consolidates the identical top bar independently hand-rolled in all
 * 7 non-X01 game screens (HalveIt, Bobs27, Shanghai, AroundTheClock, Killer,
 * Cricket, Practice170) — see docs/ui-redesign/audit.md.
 */
export function GameHud({ onExit, centerContent, dartsThisTurn, rightAction }: GameHudProps) {
  return (
    <View style={styles.topBar}>
      <PressableScale onPress={onExit} hitSlop={10} haptic="light" scaleTo={0.88} style={styles.exitBtn}>
        <Icon name="close" size={16} color={colors.textMuted} />
      </PressableScale>

      {centerContent}

      <View style={styles.rightCluster}>
        {dartsThisTurn !== undefined ? (
          <View style={styles.dartsIndicator}>
            {[0, 1, 2].map((i) =>
              i < dartsThisTurn ? (
                <Animated.View
                  key={i}
                  entering={ZoomIn.springify().damping(11).stiffness(240)}
                  style={[styles.dartDot, styles.dartDotFilled]}
                />
              ) : (
                <View key={i} style={styles.dartDot} />
              )
            )}
          </View>
        ) : rightAction ? null : (
          <View style={styles.exitBtnSpacer} />
        )}
        {rightAction}
      </View>
    </View>
  );
}

/**
 * The standard Undo control for the `rightAction` slot — every game screen
 * renders this same 32×32 button so one-dart undo lives in one place
 * across all modes.
 */
export function HudUndoButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="tick"
      scaleTo={0.88}
      hitSlop={8}
      style={[styles.undoBtn, disabled && styles.undoBtnDisabled]}
    >
      <Icon name="undo" size={15} color={colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Balances the exit button's width when there's no darts indicator, so
  // centerContent stays visually centered (mirrors Killer's claim/bullOff
  // phases, which use a bare `<View style={{ width: 36 }} />` today).
  exitBtnSpacer: {
    width: 36,
  },
  rightCluster: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dartsIndicator: { flexDirection: 'row', gap: 6 },
  dartDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.bgCardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dartDotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  undoBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBtnDisabled: {
    opacity: 0.35,
  },
});
