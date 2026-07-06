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
}

const NUMBERS = Array.from({ length: 20 }, (_, i) => 20 - i);

export function DartPad({ onDart, disabled }: DartPadProps) {
  const [multiplier, setMultiplier] = useState<Multiplier>(1);

  const tapSegment = (segment: number) => {
    const effectiveMultiplier = segment === 25 ? (Math.min(multiplier, 2) as Multiplier) : multiplier;
    hapticPattern.dartHit(effectiveMultiplier);
    onDart({ segment, multiplier: effectiveMultiplier });
    setMultiplier(1);
  };

  return (
    <View>
      <MultiplierSelector value={multiplier} onChange={setMultiplier} disabled={disabled} />
      <View style={styles.grid}>
        {NUMBERS.map((n) => (
          <PressableScale
            key={n}
            disabled={disabled}
            scaleTo={PRESS_SCALE.key}
            haptic="none"
            onPress={() => tapSegment(n)}
            style={styles.tileWrap}
          >
            <View style={[styles.tile, multiplier > 1 && styles.tileArmed, disabled && styles.disabled]}>
              <Text style={[styles.tileText, multiplier > 1 && styles.tileTextArmed]}>{n}</Text>
            </View>
          </PressableScale>
        ))}
      </View>
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
