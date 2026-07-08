import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AnimatedScore } from '../../components/AnimatedScore';
import { CheckoutBanner } from '../../components/CheckoutBanner';
import { DartPad } from '../../components/DartPad';
import { DartSlots } from '../../components/DartSlots';
import { Icon } from '../../components/icons/Icon';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { PressableScale } from '../../components/primitives/PressableScale';
import { Screen } from '../../components/Screen';
import { playSound } from '../../sound/soundManager';
import { ScreenFlash } from '../../components/effects/ScreenFlash';
import { useShake } from '../../components/effects/useShake';
import { getCheckoutSuggestion } from '../../data/checkoutTable';
import { buildVisit, evaluateDart } from '../../logic/x01';
import { computeX01PlayerResult } from '../../logic/stats';
import { PlayStackParamList } from '../../navigation/types';
import { MatchStorage, PlayerStorage } from '../../storage/storage';
import { useSoundEffects } from '../../sound/useSoundEffects';
import { colors, fonts, radius, spacing } from '../../theme';
import { Dart, GameConfig, MatchRecord, Player, X01PlayerState } from '../../types';
import { generateId } from '../../utils/id';
import { resolvePlayerDisplay } from '../../utils/playerDisplay';

interface Props {
  config: GameConfig;
}

interface MatchState {
  players: X01PlayerState[];
  order: string[];
  turnIndex: number;
  attempt: number;
  starterIndex: number;
  matchWinnerId: string | null;
  sharedRemaining: number; // one shared checkout number all players work down together
}

const TARGET = 170;

function createInitialState(config: GameConfig): MatchState {
  return {
    players: config.playerIds.map((playerId) => ({
      playerId,
      remaining: TARGET,
      legsWon: 0,
      setsWon: 0,
      visits: [],
      legStartScore: TARGET,
      opened: true,
      legDartsHistory: [],
    })),
    order: [...config.playerIds],
    turnIndex: 0,
    attempt: 1,
    starterIndex: 0,
    matchWinnerId: null,
    sharedRemaining: TARGET,
  };
}

export function Practice170GameScreen({ config }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<PlayStackParamList>>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [state, setState] = useState<MatchState>(() => createInitialState(config));
  const [visitDarts, setVisitDarts] = useState<Dart[]>([]);
  const [liveRemaining, setLiveRemaining] = useState(TARGET);
  const [bustFlash, setBustFlash] = useState(false);
  const history = useRef<{ state: MatchState; visitDarts: Dart[]; liveRemaining: number }[]>([]);
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const playSfx = useSoundEffects();
  const { shakeStyle, triggerShake } = useShake();

  React.useEffect(() => {
    PlayerStorage.getAll()
      .then(setPlayers)
      .catch((err) => {
        console.error('[Practice170GameScreen] Failed to load players:', err);
        setPlayers([]);
      });
  }, []);

  React.useEffect(() => {
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

  const playerMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => (map[p.id] = p));
    return map;
  }, [players]);

  const activePlayerId = state.order[state.turnIndex];
  const activePlayer = state.players.find((p) => p.playerId === activePlayerId)!;
  const display = resolvePlayerDisplay(activePlayerId, playerMap, config.guestPlayers);
  const dartsLeft = (3 - visitDarts.length) as 1 | 2 | 3;
  const checkoutCombo = getCheckoutSuggestion(liveRemaining, dartsLeft);

  const checkouts = activePlayer.visits.filter((v) => v.checkout).length;
  const bestDarts = activePlayer.visits
    .filter((v) => v.checkout)
    .reduce((min, v) => Math.min(min, v.dartsUsed), 99);

  const snapshot = () => {
    history.current.push({ state: JSON.parse(JSON.stringify(state)), visitDarts: [...visitDarts], liveRemaining });
    if (history.current.length > 80) history.current.shift();
  };

  const undo = () => {
    const prev = history.current.pop();
    if (prev) {
      setState(prev.state);
      setVisitDarts(prev.visitDarts);
      setLiveRemaining(prev.liveRemaining);
    }
  };

  const finalizeMatch = (finalState: MatchState) => {
    const results: MatchRecord['results'] = {};
    finalState.players.forEach((p) => {
      results[p.playerId] = computeX01PlayerResult(
        p.playerId,
        p.visits,
        p.legsWon,
        p.setsWon,
        p.playerId === finalState.matchWinnerId,
        p.legDartsHistory
      );
    });
    const record: MatchRecord = {
      id: generateId(),
      gameType: config.gameType,
      date: Date.now(),
      legsToWin: config.legsToWin,
      setsToWin: 1,
      startingScore: TARGET,
      outMode: 'double',
      inMode: 'straight',
      playerIds: config.playerIds,
      winnerId: finalState.matchWinnerId,
      results,
    };
    playSfx('win');
    MatchStorage.save(record)
      .then(() => navigation.replace('GameSummary', { matchId: record.id }))
      .catch((err) => {
        console.error('[Practice170GameScreen] Failed to save match:', err);
        navigation.replace('GameSummary', { matchId: record.id });
      });
  };

  const startNextTurn = (s: MatchState, nextTurnIndex: number) => {
    setState({ ...s, turnIndex: nextTurnIndex });
    setVisitDarts([]);
    setLiveRemaining(s.sharedRemaining);
  };

  const finishVisit = (darts: Dart[], finalRemaining: number, bust: boolean, checkout: boolean) => {
    const visit = buildVisit(activePlayer.playerId, state.sharedRemaining, darts, finalRemaining, bust, checkout);
    let nextPlayers = state.players.map((p) =>
      p.playerId === activePlayer.playerId ? { ...p, visits: [...p.visits, visit] } : p
    );

    if (!checkout) {
      const nextState = { ...state, players: nextPlayers, sharedRemaining: bust ? state.sharedRemaining : finalRemaining };
      setState(nextState);
      startNextTurn(nextState, (state.turnIndex + 1) % state.order.length);
      return;
    }

    nextPlayers = nextPlayers.map((p) =>
      p.playerId === activePlayer.playerId
        ? { ...p, legsWon: p.legsWon + 1, legDartsHistory: [...p.legDartsHistory, darts.length] }
        : p
    );
    const winner = nextPlayers.find((p) => p.playerId === activePlayer.playerId)!;
    const matchWinnerId = winner.legsWon >= config.legsToWin ? activePlayer.playerId : null;
    const newStarterIndex = (state.starterIndex + 1) % state.order.length;
    const newOrder = rotate(state.order, newStarterIndex);

    const nextState: MatchState = {
      ...state,
      players: nextPlayers,
      order: newOrder,
      turnIndex: 0,
      attempt: state.attempt + 1,
      starterIndex: newStarterIndex,
      matchWinnerId,
      sharedRemaining: TARGET,
    };

    if (matchWinnerId) {
      setState(nextState);
      finalizeMatch(nextState);
      return;
    }
    setState(nextState);
    setVisitDarts([]);
    setLiveRemaining(TARGET);
  };

  const tapDart = (dart: Dart) => {
    snapshot();
    const outcome = evaluateDart(liveRemaining, dart, 'double', 'straight', true);
    const newDarts = [...visitDarts, dart];

    if (outcome.bust) {
      playSfx('bust');
      setBustFlash(true);
      triggerShake();
      scheduleTimeout(() => setBustFlash(false), 700);
      setVisitDarts(newDarts);
      scheduleTimeout(() => finishVisit(newDarts, state.sharedRemaining, true, false), 550);
      return;
    }
    if (outcome.checkout) {
      playSfx('checkout');
      setVisitDarts(newDarts);
      setLiveRemaining(0);
      finishVisit(newDarts, 0, false, true);
      return;
    }
    // DartPad already delivered the weight-scaled haptic on contact.
    playSound('dartScored');
    setLiveRemaining(outcome.remainingAfter);
    setVisitDarts(newDarts);
    if (newDarts.length >= 3) finishVisit(newDarts, outcome.remainingAfter, false, false);
  };

  return (
    <Screen>
      <ScreenFlash trigger={bustFlash} color={colors.neonRed} />
      <View style={styles.topBar}>
        <PressableScale onPress={() => navigation.goBack()} hitSlop={10} haptic="light" scaleTo={0.88} style={styles.exitBtn}>
          <Icon name="back" size={20} color={colors.textPrimary} />
        </PressableScale>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>170 PRACTICE</Text>
          <Text style={styles.topBarSubtitle}>Round {state.attempt}</Text>
        </View>
        <PressableScale onPress={undo} hitSlop={10} disabled={history.current.length === 0} haptic="tick" scaleTo={0.88} style={styles.exitBtn}>
          <Icon name="undo" size={20} color={history.current.length === 0 ? colors.textMuted : colors.textPrimary} />
        </PressableScale>
      </View>

      <View style={styles.spotlight}>
        <View style={styles.playerHeader}>
          <PlayerAvatar name={display.name} color={display.color} avatar={display.avatar} photoUri={display.photoUri} size={32} active />
          <Text style={styles.playerName}>{display.name}</Text>
        </View>
        <Animated.View
          style={[
            styles.ring,
            { borderColor: bustFlash ? colors.neonRed : colors.accent },
            bustFlash ? shakeStyle : null,
          ]}
        >
          <AnimatedScore value={liveRemaining} style={[styles.ringScore, { color: colors.textPrimary }]} />
          <Text style={styles.ringSub}>REMAINING</Text>
        </Animated.View>
        {!bustFlash && (
          <View style={styles.turnIndicator}>
            <View style={styles.turnDot} />
            <Text style={styles.turnText}>{display.name}'s turn</Text>
          </View>
        )}
      </View>

      <View style={styles.inputCard}>
        {bustFlash ? (
          <Text style={styles.bustText}>BUST — TRY AGAIN</Text>
        ) : (
          <>
            <DartSlots darts={visitDarts} />
            {checkoutCombo && (
              <View style={{ marginTop: spacing.sm }}>
                <CheckoutBanner combo={checkoutCombo} />
              </View>
            )}
          </>
        )}

        <View style={styles.statsRow}>
          <Stat label="ROUND" value={state.attempt} />
          <Stat label="CHECKOUTS" value={checkouts} />
          <Stat label="BEST DARTS" value={bestDarts === 99 ? '—' : bestDarts} />
          <Stat label="ROUNDS TO WIN" value={`${config.legsToWin}`} />
        </View>

        <DartPad onDart={tapDart} disabled={bustFlash} />
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function rotate<T>(arr: T[], startIndex: number): T[] {
  return [...arr.slice(startIndex), ...arr.slice(0, startIndex)];
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 12, color: colors.textSecondary, letterSpacing: 1.5 },
  topBarSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  spotlight: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  turnDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  turnText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  inputCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  playerName: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  ring: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.bgCard,
  },
  ringScore: {
    fontSize: 50,
  },
  ringSub: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
  bustText: {
    color: colors.neonRed,
    fontFamily: fonts.bodyExtraBold,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 20,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontFamily: fonts.bodyExtraBold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
