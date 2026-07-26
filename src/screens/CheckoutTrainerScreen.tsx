import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button } from '../components/Button';
import { CheckoutBanner } from '../components/CheckoutBanner';
import { DartPad } from '../components/DartPad';
import { DartSlots } from '../components/DartSlots';
import { ScreenFlash } from '../components/effects/ScreenFlash';
import { useShake } from '../components/effects/useShake';
import { GameHud } from '../components/GameHud';
import { CountUp } from '../components/primitives/CountUp';
import { Screen } from '../components/Screen';
import { getCheckoutSuggestion } from '../data/checkoutTable';
import { evaluateDart } from '../logic/x01';
import { RootStackParamList } from '../navigation/types';
import { haptic, hapticPattern } from '../sound/haptics';
import { playSound } from '../sound/soundManager';
import { CheckoutTrainerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing } from '../theme';
import { Dart } from '../types';

// Every score 2-170 that has a valid double-out finish within 3 darts —
// the pool the trainer draws its targets from. Standard checkout table,
// reused as-is (never forked).
const REACHABLE_TARGETS: number[] = [];
for (let score = 2; score <= 170; score++) {
  if (getCheckoutSuggestion(score, 3)) REACHABLE_TARGETS.push(score);
}

function randomTarget(exclude?: number): number {
  let next: number;
  do {
    next = REACHABLE_TARGETS[Math.floor(Math.random() * REACHABLE_TARGETS.length)];
  } while (next === exclude);
  return next;
}

type ResultKind = 'success' | 'fail' | null;

export function CheckoutTrainerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [target, setTarget] = useState<number>(() => randomTarget());
  const [visitDarts, setVisitDarts] = useState<Dart[]>([]);
  const [liveRemaining, setLiveRemaining] = useState<number>(target);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [result, setResult] = useState<ResultKind>(null);
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const { shakeStyle, triggerShake } = useShake();

  useEffect(() => {
    CheckoutTrainerStorage.getBest()
      .then(setBestStreak)
      .catch((err) => {
        console.error('[CheckoutTrainerScreen] Failed to load best streak:', err);
      });
  }, []);

  useEffect(() => {
    return () => {
      pendingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      pendingTimeoutsRef.current.clear();
    };
  }, []);

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      pendingTimeoutsRef.current.delete(timeout);
      callback();
    }, delay);
    pendingTimeoutsRef.current.add(timeout);
    return timeout;
  };

  const newTarget = (prev?: number) => {
    const next = randomTarget(prev);
    setTarget(next);
    setLiveRemaining(next);
    setVisitDarts([]);
    setResult(null);
  };

  const finishAttempt = (kind: ResultKind, darts: Dart[], remainingAfter: number) => {
    setVisitDarts(darts);
    setLiveRemaining(remainingAfter);
    setResult(kind);

    if (kind === 'success') {
      hapticPattern.checkout();
      playSound('checkout');
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((best) => {
          if (next > best) {
            CheckoutTrainerStorage.setBest(next).catch((err) => {
              console.error('[CheckoutTrainerScreen] Failed to save best streak:', err);
            });
            return next;
          }
          return best;
        });
        return next;
      });
    } else {
      hapticPattern.bust();
      playSound('bust');
      triggerShake();
      setStreak(0);
    }

    scheduleTimeout(() => newTarget(target), 1400);
  };

  const tapDart = (dart: Dart) => {
    if (result) return; // locked during feedback

    const outcome = evaluateDart(liveRemaining, dart, 'double', 'straight', true);
    const newDarts = [...visitDarts, dart];

    if (outcome.bust) {
      finishAttempt('fail', newDarts, liveRemaining);
      return;
    }
    if (outcome.checkout) {
      finishAttempt('success', newDarts, 0);
      return;
    }

    // DartPad already delivered the weight-scaled contact haptic — sound is
    // this screen's call, based on outcome (mirrors X01GameScreen's pattern).
    playSound(dart.segment === 0 ? 'miss' : 'dartScored');
    setVisitDarts(newDarts);
    setLiveRemaining(outcome.remainingAfter);

    if (newDarts.length >= 3) {
      // Used all 3 darts without reaching zero — a failed checkout attempt.
      finishAttempt('fail', newDarts, outcome.remainingAfter);
    }
  };

  const skip = () => {
    if (streak !== 0) haptic.tick();
    newTarget(target);
  };

  const suggestedCombo = result ? getCheckoutSuggestion(target, 3) : null;

  return (
    <Screen>
      <ScreenFlash trigger={result === 'success'} color={colors.success} />
      <ScreenFlash trigger={result === 'fail'} color={colors.neonRed} />

      <GameHud
        onExit={() => navigation.goBack()}
        centerContent={
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>CHECKOUT TRAINER</Text>
            <Text style={styles.topBarSubtitle}>Work out the finish</Text>
          </View>
        }
      />

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <CountUp value={streak} duration={400} style={styles.statValue} />
          <Text style={styles.statLabel}>STREAK</Text>
        </View>
        <View style={styles.statBox}>
          <CountUp value={bestStreak} duration={400} style={styles.statValue} />
          <Text style={styles.statLabel}>BEST</Text>
        </View>
      </View>

      <View style={styles.spotlight}>
        <Text style={styles.targetOverline}>CHECKOUT</Text>
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor:
                result === 'success' ? colors.success : result === 'fail' ? colors.neonRed : colors.accent,
            },
            result === 'fail' ? shakeStyle : null,
          ]}
        >
          <Text style={styles.ringScore}>{liveRemaining}</Text>
          <Text style={styles.ringSub}>{visitDarts.length === 0 ? 'TARGET' : 'REMAINING'}</Text>
        </Animated.View>

        {result === 'success' && (
          <Animated.Text entering={FadeIn.duration(180)} style={[styles.resultText, { color: colors.success }]}>
            CHECKED OUT
          </Animated.Text>
        )}
        {result === 'fail' && (
          <Animated.Text entering={FadeIn.duration(180)} style={[styles.resultText, { color: colors.neonRed }]}>
            NO FINISH — {target} WAS ON
          </Animated.Text>
        )}
      </View>

      <View style={styles.inputCard}>
        <DartSlots darts={visitDarts} />
        {suggestedCombo && (
          <View style={{ marginTop: spacing.sm }}>
            <CheckoutBanner combo={suggestedCombo} />
          </View>
        )}

        <DartPad onDart={tapDart} disabled={!!result} />

        <View style={styles.actionsRow}>
          <Button label="Skip" onPress={skip} variant="secondary" style={{ flex: 1 }} disabled={!!result} />
          <Button label="Done" onPress={() => navigation.goBack()} variant="outline" style={{ flex: 1 }} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 12, color: colors.textSecondary, letterSpacing: 1.5 },
  topBarSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.edge,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  statValue: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 24,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontFamily: fonts.bodyExtraBold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  spotlight: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  targetOverline: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  ring: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.bgCard,
  },
  ringScore: {
    fontFamily: fonts.display,
    fontSize: 56,
    color: colors.textPrimary,
  },
  ringSub: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
  resultText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 14,
    letterSpacing: 1,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  inputCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
