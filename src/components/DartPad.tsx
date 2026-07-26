import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Dart, Multiplier } from '../types';
import { fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';
import { PRESS_SCALE } from '../theme/motion';
import { hapticPattern } from '../sound/haptics';
import { playSound } from '../sound/soundManager';
import { MultiplierSelector } from './MultiplierSelector';
import { PressableScale } from './primitives/PressableScale';

interface DartPadProps {
  onDart: (dart: Dart) => void;
  disabled?: boolean;
  /**
   * Segments to highlight as "frequently targeted" (X01's top-3-target
   * treatment — a raised, higher-contrast tile). Purely cosmetic; doesn't
   * change scoring.
   */
  primeSegments?: number[];
  /**
   * `'default'` (the original CheckoutTrainer layout: 20→1 wrapped 5-per-row)
   * or `'x01'` (X01's own digit order, grouped for faster muscle-memory
   * scanning: 20/1/18/4/13, 6/10/15/2/17, 3/19/7/16/8, 11/14/9/12/5).
   */
  variant?: 'default' | 'x01';
}

const NUMBERS = Array.from({ length: 20 }, (_, i) => 20 - i);

// X01's digit order — grouped so high-value numbers (20, 19, 18) anchor
// separate rows rather than sitting sequentially.
const X01_NUMBER_ROWS = [
  [20, 1, 18, 4, 13],
  [6, 10, 15, 2, 17],
  [3, 19, 7, 16, 8],
  [11, 14, 9, 12, 5],
];

export function DartPad({ onDart, disabled, primeSegments, variant = 'default' }: DartPadProps) {
  const [multiplier, setMultiplier] = useState<Multiplier>(1);
  const primeSet = primeSegments ? new Set(primeSegments) : null;

  const tapSegment = (segment: number) => {
    const effectiveMultiplier = segment === 25 ? (Math.min(multiplier, 2) as Multiplier) : multiplier;
    hapticPattern.dartHit(effectiveMultiplier);
    onDart({ segment, multiplier: effectiveMultiplier });
    setMultiplier(1);
  };

  const renderTile = (n: number) => {
    const isPrime = !!primeSet?.has(n);
    return (
      <PressableScale
        key={n}
        disabled={disabled}
        scaleTo={PRESS_SCALE.key}
        haptic="none"
        onPress={() => tapSegment(n)}
        style={variant === 'x01' ? styles.tileWrapRow : styles.tileWrap}
      >
        <View
          style={[
            styles.tile,
            isPrime && styles.tilePrime,
            multiplier > 1 && styles.tileArmed,
            disabled && styles.disabled,
          ]}
        >
          <Text style={[styles.tileText, multiplier > 1 && styles.tileTextArmed]}>{n}</Text>
        </View>
      </PressableScale>
    );
  };

  return (
    <View>
      <MultiplierSelector value={multiplier} onChange={setMultiplier} disabled={disabled} />
      {variant === 'x01' ? (
        <View style={styles.rowsGrid}>
          {X01_NUMBER_ROWS.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((n) => renderTile(n))}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.grid}>{NUMBERS.map((n) => renderTile(n))}</View>
      )}
      <View style={styles.bottomRow}>
        <PressableScale
          disabled={disabled}
          scaleTo={PRESS_SCALE.key}
          haptic="none"
          onPress={() => tapSegment(25)}
          style={{ flex: 2 }}
        >
          <View style={[styles.bullBtn, disabled && styles.disabled]}>
            <Text style={styles.bullText}>BULL{multiplier >= 2 ? '  ·  DOUBLE' : ''}</Text>
          </View>
        </PressableScale>
        <PressableScale
          disabled={disabled}
          scaleTo={PRESS_SCALE.key}
          haptic="none"
          onPress={() => {
            hapticPattern.miss();
            playSound('miss');
            onDart({ segment: 0, multiplier: 1 });
            setMultiplier(1);
          }}
          style={{ flex: 1 }}
        >
          <View style={[styles.missBtn, disabled && styles.disabled]}>
            <Text style={styles.missText}>MISS</Text>
          </View>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 1,
    marginTop: spacing.md,
  },
  tileWrap: {
    width: '18%',
    flexGrow: 1,
  },
  rowsGrid: {
    gap: spacing.xs + 1,
    marginTop: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.xs + 1,
  },
  tileWrapRow: {
    flex: 1,
  },
  tile: {
    backgroundColor: COLORS.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilePrime: {
    backgroundColor: COLORS.raised,
    borderColor: COLORS.borderStrong,
  },
  tileArmed: {
    borderColor: COLORS.accentBorder,
    backgroundColor: COLORS.accentDim,
  },
  tileText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 16,
    color: COLORS.text,
  },
  tileTextArmed: {
    color: COLORS.accentHot,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  bullBtn: {
    backgroundColor: COLORS.accentDim,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  bullText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 13,
    color: COLORS.accentHot,
    letterSpacing: 1.5,
  },
  missBtn: {
    backgroundColor: COLORS.bustGlow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: COLORS.bustBorder,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  missText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 13,
    color: COLORS.bust,
    letterSpacing: 1.5,
  },
  disabled: {
    opacity: 0.35,
  },
});
