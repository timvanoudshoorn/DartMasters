import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AnimatedScore } from '../../components/AnimatedScore';
import { BotThinkingBadge } from '../../components/BotThinkingBadge';
import { EventStinger, StingerEvent } from '../../components/effects/EventStinger';
import { Icon } from '../../components/icons/Icon';
import { MultiplierSelector } from '../../components/MultiplierSelector';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { PressableScale } from '../../components/primitives/PressableScale';
import { Screen } from '../../components/Screen';
import { ScreenFlash } from '../../components/effects/ScreenFlash';
import { useShake } from '../../components/effects/useShake';
import { getCheckoutSuggestion } from '../../data/checkoutTable';
import { evaluateDart, buildVisit } from '../../logic/x01';
import { computeX01PlayerResult } from '../../logic/stats';
import { BOT_PROFILES, decideX01Dart } from '../../logic/bot';
import { PlayStackParamList } from '../../navigation/types';
import { MatchStorage, PlayerStorage } from '../../storage/storage';
import { haptic, hapticPattern } from '../../sound/haptics';
import { playSound } from '../../sound/soundManager';
import { useSoundEffects } from '../../sound/useSoundEffects';
import { spacing } from '../../theme';
import { COLORS, FONT } from '../../theme/colors';
import { PRESS_SCALE } from '../../theme/motion';
import { Dart, GameConfig, MatchRecord, Multiplier, Player, X01PlayerState } from '../../types';
import { announceGameOn, announceGameShot, announceScore, cancelAnnouncements } from '../../utils/dartAnnouncer';
import { generateId } from '../../utils/id';
import { resolvePlayerDisplay } from '../../utils/playerDisplay';

interface Props {
  config: GameConfig;
}

interface MatchState {
  players: X01PlayerState[];
  order: string[];
  turnIndex: number;
  leg: number;
  set: number;
  starterIndex: number;
  matchWinnerId: string | null;
  legDartsThisLeg: Record<string, number>;
  legWinnerHistory: string[];
}

const NUMBER_GRID_ROWS = [
  [20, 1, 18, 4, 13],
  [6, 10, 15, 2, 17],
  [3, 19, 7, 16, 8],
  [11, 14, 9, 12, 5],
];

const BUST_DISPLAY_MS = 1500;

// Numbers frequently targeted (20, 19, 18 — top three targets)
const PRIME_SEGMENTS = new Set([20, 19, 18]);

function createInitialState(config: GameConfig): MatchState {
  const startingScore = config.startingScore ?? 501;
  const openedByDefault = config.inMode === 'straight';
  return {
    players: config.playerIds.map((playerId) => ({
      playerId,
      remaining: startingScore,
      legsWon: 0,
      setsWon: 0,
      visits: [],
      legStartScore: startingScore,
      opened: openedByDefault,
      legDartsHistory: [],
    })),
    order: [...config.playerIds],
    turnIndex: 0,
    leg: 1,
    set: 1,
    starterIndex: 0,
    matchWinnerId: null,
    legDartsThisLeg: Object.fromEntries(config.playerIds.map((id) => [id, 0])),
    legWinnerHistory: [],
  };
}

export function X01GameScreen({ config }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<PlayStackParamList>>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [state, setState] = useState<MatchState>(() => createInitialState(config));
  const [visitDarts, setVisitDarts] = useState<Dart[]>([]);
  const [liveRemaining, setLiveRemaining] = useState(config.startingScore ?? 501);
  const [liveOpened, setLiveOpened] = useState(config.inMode === 'straight');
  const [bustFlash, setBustFlash] = useState(false);
  const [multiplier, setMultiplier] = useState<Multiplier>(1);
  const [stinger, setStinger] = useState<StingerEvent | null>(null);
  const history = useRef<{ state: MatchState; visitDarts: Dart[]; liveRemaining: number; liveOpened: boolean }[]>([]);
  const startingScore = config.startingScore ?? 501;
  const playSfx = useSoundEffects();
  const { shakeStyle, triggerShake } = useShake();

  const dartQueueRef = useRef<Dart[]>([]);
  const queueOwnerRef = useRef<string | null>(null);
  const [queueTick, setQueueTick] = useState(0);
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  React.useEffect(() => {
    PlayerStorage.getAll()
      .then(setPlayers)
      .catch((err) => {
        console.error('[X01GameScreen] Failed to load players:', err);
        setPlayers([]);
      });
  }, []);

  React.useEffect(() => {
    announceGameOn();
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
  const dartsLeft = (3 - visitDarts.length) as 1 | 2 | 3;
  const checkoutCombo = liveOpened ? getCheckoutSuggestion(liveRemaining, dartsLeft) : null;

  const isBot = (playerId: string) => !!config.guestPlayers?.[playerId]?.isBot;
  const [botThinking, setBotThinking] = useState(false);

  const snapshot = () => {
    history.current.push({
      state: JSON.parse(JSON.stringify(state)),
      visitDarts: [...visitDarts],
      liveRemaining,
      liveOpened,
    });
    if (history.current.length > 80) history.current.shift();
  };

  const undo = () => {
    const prev = history.current.pop();
    if (prev) {
      setState(prev.state);
      setVisitDarts(prev.visitDarts);
      setLiveRemaining(prev.liveRemaining);
      setLiveOpened(prev.liveOpened);
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

    if (finalState.players.length === 2) {
      const [a, b] = finalState.players;
      const rounds = Math.min(a.visits.length, b.visits.length);
      let aOutscored = rounds > 0;
      let bOutscored = rounds > 0;
      for (let i = 0; i < rounds; i++) {
        const aScore = a.visits[i].bust ? 0 : a.visits[i].scored;
        const bScore = b.visits[i].bust ? 0 : b.visits[i].scored;
        if (!(aScore > bScore)) aOutscored = false;
        if (!(bScore > aScore)) bOutscored = false;
      }
      results[a.playerId].outscoredEveryRound = aOutscored;
      results[b.playerId].outscoredEveryRound = bOutscored;
    }

    const record: MatchRecord = {
      id: generateId(),
      gameType: config.gameType,
      date: Date.now(),
      legsToWin: config.legsToWin,
      setsToWin: config.setsToWin,
      startingScore: config.startingScore,
      outMode: config.outMode,
      inMode: config.inMode,
      playerIds: config.playerIds,
      winnerId: finalState.matchWinnerId,
      results,
      guestNames: guestNameMap(config),
      guestColors: guestColorMap(config),
      legWinnerHistory: finalState.legWinnerHistory,
      botPlayerIds: botPlayerIds(config),
    };
    playSfx('win');
    MatchStorage.save(record).then(() => {
      navigation.replace('GameSummary', { matchId: record.id });
    });
  };

  const startNextTurn = (s: MatchState, nextTurnIndex: number, openedFor: string) => {
    setState({ ...s, turnIndex: nextTurnIndex });
    setVisitDarts([]);
    const nextPlayerId = s.order[nextTurnIndex];
    const nextPlayer = s.players.find((p) => p.playerId === nextPlayerId)!;
    setLiveRemaining(nextPlayer.remaining);
    setLiveOpened(nextPlayer.opened);
    haptic.tick();
  };

  const finishVisit = (darts: Dart[], finalRemaining: number, bust: boolean, checkout: boolean, opened: boolean) => {
    const visit = buildVisit(activePlayer.playerId, activePlayer.remaining, darts, finalRemaining, bust, checkout);
    if (!checkout) announceScore(visit.scored, visit.bust);

    if (visit.oneEighty) {
      playSfx('oneEighty');
      setStinger({ id: Date.now(), text: 'ONE EIGHTY', sub: 'Maximum' });
    }

    const legDarts = { ...state.legDartsThisLeg, [activePlayer.playerId]: state.legDartsThisLeg[activePlayer.playerId] + darts.length };

    let nextPlayers = state.players.map((p) =>
      p.playerId === activePlayer.playerId
        ? { ...p, remaining: bust ? p.remaining : finalRemaining, opened, visits: [...p.visits, visit] }
        : p
    );

    if (!checkout) {
      const nextState: MatchState = { ...state, players: nextPlayers, legDartsThisLeg: legDarts };
      setState(nextState);
      startNextTurn(nextState, (state.turnIndex + 1) % state.order.length, '');
      return;
    }

    // Leg won — cancel any pending announcements before playing game shot
    cancelAnnouncements();
    announceGameShot();
    const checkoutScore = visit.scored;
    const winnerLegDarts = legDarts[activePlayer.playerId];
    nextPlayers = nextPlayers.map((p) => {
      if (p.playerId !== activePlayer.playerId) return { ...p, remaining: startingScore, opened: config.inMode === 'straight' };
      const legsWon = p.legsWon + 1;
      return {
        ...p,
        remaining: startingScore,
        opened: config.inMode === 'straight',
        legsWon,
        legDartsHistory: [...p.legDartsHistory, winnerLegDarts],
      };
    });

    const winner = nextPlayers.find((p) => p.playerId === activePlayer.playerId)!;
    const setWon = winner.legsWon >= config.legsToWin;
    let set = state.set;
    let matchWinnerId: string | null = null;

    if (setWon) {
      nextPlayers = nextPlayers.map((p) =>
        p.playerId === activePlayer.playerId ? { ...p, setsWon: p.setsWon + 1, legsWon: 0 } : { ...p, legsWon: 0 }
      );
      const setsWinner = nextPlayers.find((p) => p.playerId === activePlayer.playerId)!;
      if (setsWinner.setsWon >= config.setsToWin) matchWinnerId = activePlayer.playerId;
      set = state.set + 1;
    }

    const newStarterIndex = (state.starterIndex + 1) % state.order.length;
    const newOrder = rotate(state.order, newStarterIndex);
    const resetLegDarts = Object.fromEntries(config.playerIds.map((id) => [id, 0]));

    const nextState: MatchState = {
      ...state,
      players: nextPlayers,
      order: newOrder,
      turnIndex: 0,
      leg: setWon ? 1 : state.leg + 1,
      set,
      starterIndex: newStarterIndex,
      matchWinnerId,
      legDartsThisLeg: resetLegDarts,
      legWinnerHistory: [...state.legWinnerHistory, activePlayer.playerId],
    };

    if (matchWinnerId) {
      setState(nextState);
      finalizeMatch(nextState);
      return;
    }

    // Big finishes on a continuing match deserve their moment on screen.
    if (checkoutScore >= 100) {
      setStinger({
        id: Date.now(),
        text: checkoutScore === 170 ? 'BIG FISH' : `${checkoutScore} OUT`,
        sub: checkoutScore === 170 ? 'The 170 checkout' : 'Big finish',
        color: COLORS.positive,
      });
    }

    announceGameOn();
    setState(nextState);
    setVisitDarts([]);
    setLiveRemaining(startingScore);
    setLiveOpened(config.inMode === 'straight');
  };

  const tapDart = (dart: Dart) => {
    snapshot();
    const outcome = evaluateDart(liveRemaining, dart, config.outMode, config.inMode, liveOpened);
    const newDarts = [...visitDarts, dart];

    if (outcome.bust) {
      playSfx('bust');
      setBustFlash(true);
      triggerShake();
      setVisitDarts(newDarts);
      scheduleTimeout(() => {
        setBustFlash(false);
        finishVisit(newDarts, activePlayer.remaining, true, false, liveOpened);
      }, BUST_DISPLAY_MS);
      return;
    }

    if (outcome.checkout) {
      playSfx('checkout');
      setVisitDarts(newDarts);
      setLiveRemaining(0);
      finishVisit(newDarts, 0, false, true, true);
      return;
    }

    const newOpened = liveOpened || outcome.opensNow;
    setLiveOpened(newOpened);
    setLiveRemaining(outcome.remainingAfter);
    setVisitDarts(newDarts);

    if (newDarts.length >= 3) {
      finishVisit(newDarts, outcome.remainingAfter, false, false, newOpened);
    } else {
      // Sound only — the physical layer already fired, scaled to the dart's weight.
      if (dartValueScored(dart, outcome)) playSound('dartScored');
      else playSound('miss');
    }
  };

  const tapSegment = (segment: number) => {
    const effectiveMultiplier = segment === 25 ? (Math.min(multiplier, 2) as Multiplier) : multiplier;
    hapticPattern.dartHit(effectiveMultiplier);
    tapDart({ segment, multiplier: effectiveMultiplier });
    setMultiplier(1);
  };

  const tapMiss = () => {
    hapticPattern.miss();
    tapDart({ segment: 0, multiplier: 1 });
    setMultiplier(1);
  };

  const enqueueDetectedDarts = (darts: Dart[]) => {
    dartQueueRef.current = darts.slice(0, 3);
    queueOwnerRef.current = activePlayerId;
    setQueueTick((t) => t + 1);
  };

  React.useEffect(() => {
    if (dartQueueRef.current.length === 0) return;
    if (bustFlash) return;
    if (activePlayerId !== queueOwnerRef.current) {
      dartQueueRef.current = [];
      return;
    }
    const next = dartQueueRef.current.shift();
    if (next) tapDart(next);
  }, [queueTick, visitDarts.length, bustFlash, activePlayerId]);

  const openCameraScoring = () => {
    haptic.light();
    navigation.navigate('CameraScoring', { onConfirm: enqueueDetectedDarts });
  };

  React.useEffect(() => {
    if (!isBot(activePlayerId) || bustFlash) return;
    setBotThinking(true);
    const difficulty = config.guestPlayers?.[activePlayerId]?.botDifficulty ?? 'intermediate';
    const timer = setTimeout(() => {
      setBotThinking(false);
      tapDart(decideX01Dart(liveRemaining, dartsLeft, config.outMode, BOT_PROFILES[difficulty]));
    }, 1000 + Math.random() * 1000);
    return () => {
      clearTimeout(timer);
      setBotThinking(false);
    };
  }, [activePlayerId, visitDarts.length, bustFlash]);

  const variantLabel = config.outMode === 'double' ? 'STANDARD' : `${config.outMode.toUpperCase()} OUT`;
  const legSetLabel =
    config.setsToWin > 1
      ? `Set ${state.set} · Leg ${state.leg} of ${config.legsToWin}`
      : `Best of ${config.legsToWin} legs`;

  const inputDisabled = bustFlash || isBot(activePlayerId);
  const showDoubleInBadge = config.inMode === 'double' && !liveOpened && !bustFlash;
  const armed = multiplier > 1;

  return (
    <Screen padded={false}>
      <ScreenFlash trigger={bustFlash} color={COLORS.bust} />
      <EventStinger event={stinger} onDone={() => setStinger(null)} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <PressableScale onPress={() => navigation.goBack()} hitSlop={12} haptic="light" scaleTo={0.88} style={styles.topBtn}>
          <Icon name="back" size={18} color={COLORS.text} />
        </PressableScale>
        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>
            {config.gameType.toUpperCase()} · {variantLabel}
          </Text>
          <Text style={styles.topSubtitle}>{legSetLabel}</Text>
        </View>
        <PressableScale
          onPress={undo}
          hitSlop={12}
          disabled={history.current.length === 0}
          haptic="tick"
          scaleTo={0.88}
          style={styles.topBtn}
        >
          <Icon name="undo" size={18} color={history.current.length === 0 ? COLORS.textDim : COLORS.text} />
        </PressableScale>
      </View>

      {/* 2-player head-to-head layout */}
      {state.players.length === 2 ? (
        <>
          <View style={styles.legDotsRow}>
            {state.players.map((p, i) => (
              <View key={p.playerId} style={[styles.legDotsGroup, i === 1 && { marginLeft: 20 }]}>
                {Array.from({ length: config.legsToWin }).map((_, d) =>
                  d < p.legsWon ? (
                    <Animated.View
                      key={`won-${d}`}
                      entering={ZoomIn.springify().damping(11).stiffness(240)}
                      style={[styles.legDot, styles.legDotFilled]}
                    />
                  ) : (
                    <View key={d} style={styles.legDot} />
                  )
                )}
              </View>
            ))}
          </View>

          <View style={styles.scoreSection}>
            {state.players.map((p, i) => {
              const display = resolvePlayerDisplay(p.playerId, playerMap, config.guestPlayers);
              const isActive = p.playerId === activePlayerId;
              const shownRemaining = isActive ? liveRemaining : p.remaining;
              const dartsThrown = p.visits.reduce((s, v) => s + v.dartsUsed, 0);
              const totalScored = p.visits.reduce((s, v) => s + v.scored, 0);
              const avg = dartsThrown > 0 ? ((totalScored / dartsThrown) * 3).toFixed(1) : '0.0';
              return (
                <React.Fragment key={p.playerId}>
                  {i === 1 && (
                    <View style={styles.vsDivider}>
                      <View style={styles.vsDividerLine} />
                      <View style={styles.vsChip}>
                        <Text style={styles.vsText}>VS</Text>
                      </View>
                      <View style={styles.vsDividerLine} />
                    </View>
                  )}
                  <Animated.View
                    style={[
                      styles.scoreBlock,
                      i === 1 && { alignItems: 'flex-end' },
                      isActive && styles.scoreBlockActive,
                      !isActive && styles.scoreBlockIdle,
                      isActive && bustFlash ? shakeStyle : null,
                    ]}
                  >
                    <View style={[styles.scoreBlockHeader, i === 1 && { flexDirection: 'row-reverse' }]}>
                      <PlayerAvatar name={display.name} color={display.color} avatar={display.avatar} photoUri={display.photoUri} size={22} active={isActive} />
                      <Text style={[styles.scoreBlockName, isActive && styles.scoreBlockNameActive]} numberOfLines={1}>
                        {display.name}
                      </Text>
                      {isActive && (
                        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.activePip} />
                      )}
                    </View>
                    <AnimatedScore
                      value={shownRemaining}
                      style={[
                        styles.scoreBlockValue,
                        { color: bustFlash && isActive ? COLORS.bust : isActive ? COLORS.text : COLORS.textFaint },
                      ]}
                    />
                    <View style={[styles.avgPill, i === 1 && { alignSelf: 'flex-end' }]}>
                      <Text style={styles.avgPillValue}>{avg}</Text>
                      <Text style={styles.avgPillLabel}>AVG</Text>
                    </View>
                  </Animated.View>
                </React.Fragment>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.playersRow}>
          {state.players.map((p) => {
            const display = resolvePlayerDisplay(p.playerId, playerMap, config.guestPlayers);
            const isActive = p.playerId === activePlayerId;
            const shownRemaining = isActive ? liveRemaining : p.remaining;
            const dartsThrown = p.visits.reduce((s, v) => s + v.dartsUsed, 0);
            const totalScored = p.visits.reduce((s, v) => s + v.scored, 0);
            const avg = dartsThrown > 0 ? ((totalScored / dartsThrown) * 3).toFixed(1) : '0.0';
            return (
              <Animated.View
                key={p.playerId}
                style={[
                  styles.playerCard,
                  isActive && styles.playerCardActive,
                  isActive && bustFlash ? shakeStyle : null,
                  bustFlash && isActive && { borderColor: COLORS.bust, backgroundColor: COLORS.bustGlow },
                ]}
              >
                {isActive && (
                  <Animated.View entering={FadeIn.duration(180)} style={styles.onThrowStrip}>
                    <Text style={styles.onThrowText}>ON THROW</Text>
                  </Animated.View>
                )}
                <View style={styles.playerCardHeader}>
                  <PlayerAvatar name={display.name} color={display.color} avatar={display.avatar} photoUri={display.photoUri} size={26} active={isActive} />
                  <Text style={[styles.playerName, isActive && styles.playerNameActive]} numberOfLines={1}>
                    {display.name}
                  </Text>
                </View>
                <AnimatedScore
                  value={shownRemaining}
                  style={[styles.remaining, isActive ? styles.remainingActive : styles.remainingInactive]}
                />
                <View style={styles.legsRow}>
                  {config.setsToWin > 1 && <Text style={styles.legsText}>SETS {p.setsWon}</Text>}
                  <Text style={styles.legsText}>LEGS {p.legsWon}</Text>
                  <Text style={styles.legsText}>AVG {avg}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
      )}

      {/* Bust banner or turn info */}
      {bustFlash ? (
        <Animated.View entering={ZoomIn.springify().damping(13).stiffness(220)} style={styles.bustBanner}>
          <Text style={styles.bustBannerText}>BUST</Text>
          <Text style={styles.bustBannerSub}>Score doesn't count — turn passes</Text>
        </Animated.View>
      ) : (
        <>
          {/* Checkout suggestion — prominent when available */}
          {checkoutCombo ? (
            <Animated.View entering={FadeInDown.duration(240).springify()} style={styles.checkoutCard}>
              <View style={styles.checkoutCardLeft}>
                <Text style={styles.checkoutLabel}>CHECKOUT</Text>
                <View style={styles.checkoutComboRow}>
                  {checkoutCombo.map((c, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <Text style={styles.checkoutArrow}>→</Text>}
                      <View style={styles.checkoutChip}>
                        <Text style={styles.checkoutChipText}>{c}</Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </View>
              <View style={styles.checkoutBullseye}>
                <Icon name="dartboard" size={20} color={COLORS.positive} />
              </View>
            </Animated.View>
          ) : (
            <View style={styles.turnStrip}>
              <View style={styles.turnDot} />
              <Text style={styles.turnStripText}>
                <Text style={styles.turnStripName}>
                  {resolvePlayerDisplay(activePlayerId, playerMap, config.guestPlayers).name}
                </Text>
                {'  '}throwing
              </Text>
              <Text style={styles.dartCountLabel}>{visitDarts.length}/3</Text>
            </View>
          )}

          {/* Dart slots */}
          <View style={styles.dartSlotsRow}>
            {Array.from({ length: 3 }).map((_, i) => {
              const dart = visitDarts[i];
              const isMostRecent = i === visitDarts.length - 1 && !!dart;
              return (
                <View
                  key={i}
                  style={[
                    styles.dartSlot,
                    dart && styles.dartSlotFilled,
                    dart && isMostRecent && styles.dartSlotRecent,
                  ]}
                >
                  <Text style={[styles.dartSlotIndex, dart && styles.dartSlotIndexFilled]}>
                    {i + 1}
                  </Text>
                  {dart ? (
                    <Animated.Text
                      entering={ZoomIn.springify().damping(12).stiffness(260)}
                      style={[styles.dartSlotText, styles.dartSlotTextFilled, isMostRecent && styles.dartSlotTextRecent]}
                    >
                      {dartLabel(dart)}
                    </Animated.Text>
                  ) : (
                    <Text style={styles.dartSlotText}>·</Text>
                  )}
                </View>
              );
            })}
          </View>

          {showDoubleInBadge && (
            <View style={styles.doubleInRow}>
              <Animated.View entering={FadeIn.duration(200)} style={styles.doubleInBadge}>
                <Text style={styles.doubleInText}>DOUBLE IN REQUIRED</Text>
              </Animated.View>
            </View>
          )}
        </>
      )}

      <View style={{ flex: 1 }} />

      {/* Input tray — a raised deck the keys sit on */}
      <View style={styles.deck}>
        <View style={styles.deckHeaderRow}>
          <Text style={styles.toFinishLabel}>
            TO FINISH  <Text style={styles.toFinishValue}>{liveRemaining}</Text>
          </Text>
          <PressableScale
            disabled={inputDisabled}
            onPress={openCameraScoring}
            haptic="light"
            scaleTo={0.88}
            hitSlop={8}
            style={[styles.cameraBtn, inputDisabled && styles.disabled]}
          >
            <Icon name="camera" size={16} color={COLORS.textSub} />
          </PressableScale>
        </View>

        <View style={styles.multiplierRow}>
          <MultiplierSelector value={multiplier} onChange={setMultiplier} disabled={inputDisabled} />
        </View>

        {/* Number grid */}
        <View style={styles.numberGrid}>
          {NUMBER_GRID_ROWS.map((row, ri) => (
            <View key={ri} style={styles.numberGridRow}>
              {row.map((n) => {
                const isPrime = PRIME_SEGMENTS.has(n);
                return (
                  <PressableScale
                    key={n}
                    disabled={inputDisabled}
                    onPress={() => tapSegment(n)}
                    haptic="none"
                    scaleTo={PRESS_SCALE.key}
                    style={styles.numberBtnWrap}
                  >
                    <View
                      style={[
                        styles.numberBtn,
                        isPrime && styles.numberBtnPrime,
                        armed && styles.numberBtnArmed,
                        inputDisabled && styles.disabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.numberBtnText,
                          n === 20 && !armed && styles.numberBtnTextTop,
                          armed && styles.numberBtnTextArmed,
                        ]}
                      >
                        {n}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          ))}
        </View>

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          <PressableScale
            disabled={inputDisabled}
            onPress={() => tapSegment(25)}
            haptic="none"
            scaleTo={PRESS_SCALE.key}
            style={{ flex: 2 }}
          >
            <View style={[styles.bottomBtn, styles.bullBtn, inputDisabled && styles.disabled]}>
              <Text style={styles.bullBtnText}>BULL{multiplier >= 2 ? '  ·  DOUBLE' : ''}</Text>
            </View>
          </PressableScale>
          <PressableScale
            disabled={inputDisabled}
            onPress={tapMiss}
            haptic="none"
            scaleTo={PRESS_SCALE.key}
            style={{ flex: 1 }}
          >
            <View style={[styles.bottomBtn, styles.missBtn, inputDisabled && styles.disabled]}>
              <Text style={styles.missBtnText}>MISS</Text>
            </View>
          </PressableScale>
        </View>

        {botThinking && <BotThinkingBadge />}
        <View style={{ height: spacing.md }} />
      </View>
    </Screen>
  );
}

function dartLabel(d: Dart): string {
  if (d.segment === 0) return 'MISS';
  const prefix = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : 'S';
  if (d.segment === 25) return d.multiplier === 2 ? 'D·BULL' : 'BULL';
  return `${prefix}${d.segment}`;
}

function dartValueScored(dart: Dart, outcome: { gated: boolean }): boolean {
  return !outcome.gated && dart.segment > 0;
}

function rotate<T>(arr: T[], startIndex: number): T[] {
  return [...arr.slice(startIndex), ...arr.slice(0, startIndex)];
}

function guestNameMap(config: GameConfig): Record<string, string> | undefined {
  if (!config.guestPlayers) return undefined;
  return Object.fromEntries(Object.entries(config.guestPlayers).map(([id, g]) => [id, g.name]));
}

function guestColorMap(config: GameConfig): Record<string, string> | undefined {
  if (!config.guestPlayers) return undefined;
  return Object.fromEntries(Object.entries(config.guestPlayers).map(([id, g]) => [id, g.color]));
}

function botPlayerIds(config: GameConfig): string[] | undefined {
  if (!config.guestPlayers) return undefined;
  const ids = Object.entries(config.guestPlayers).filter(([, g]) => g.isBot).map(([id]) => id);
  return ids.length ? ids : undefined;
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    alignItems: 'center',
  },
  topTitle: {
    fontFamily: FONT.ui,
    fontSize: 11,
    color: COLORS.textSub,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  topSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 10,
    color: COLORS.textFaint,
    marginTop: 2,
  },

  // Leg dots
  legDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 0,
  },
  legDotsGroup: {
    flexDirection: 'row',
    gap: 5,
  },
  legDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  legDotFilled: {
    backgroundColor: COLORS.accentHot,
    borderColor: COLORS.accentHot,
  },

  // Score section (2-player)
  scoreSection: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 10,
    alignItems: 'stretch',
  },
  scoreBlock: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  scoreBlockActive: {
    borderColor: COLORS.accentBorder,
    backgroundColor: COLORS.card,
  },
  scoreBlockIdle: {
    opacity: 0.45,
    shadowOpacity: 0,
  },
  scoreBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  scoreBlockName: {
    fontFamily: FONT.ui,
    fontSize: 9,
    color: COLORS.textFaint,
    letterSpacing: 2,
    textTransform: 'uppercase',
    flex: 1,
  },
  scoreBlockNameActive: {
    color: COLORS.accentHot,
  },
  activePip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentHot,
  },
  scoreBlockValue: {
    fontFamily: FONT.score,
    fontSize: 84,
    lineHeight: 76,
    letterSpacing: -1,
  },
  avgPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  avgPillValue: {
    fontFamily: FONT.ui,
    fontSize: 13,
    color: COLORS.textSub,
  },
  avgPillLabel: {
    fontFamily: FONT.ui,
    fontSize: 8,
    color: COLORS.textFaint,
    letterSpacing: 1,
  },

  // VS divider
  vsDivider: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  vsDividerLine: {
    width: 1,
    flex: 1,
    backgroundColor: COLORS.border,
  },
  vsChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontFamily: FONT.ui,
    fontSize: 8,
    color: COLORS.textFaint,
    letterSpacing: 1,
  },

  // Multi-player grid
  playersRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: 14,
  },
  playerCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  playerCardActive: {
    backgroundColor: COLORS.card2,
    borderColor: COLORS.accentBorder,
  },
  onThrowStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    alignItems: 'center',
    backgroundColor: COLORS.accent,
  },
  onThrowText: {
    fontFamily: FONT.ui,
    fontSize: 8,
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  playerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    marginBottom: 2,
  },
  playerName: {
    color: COLORS.textSub,
    fontFamily: FONT.ui,
    fontSize: 11,
    maxWidth: 70,
  },
  playerNameActive: {
    color: COLORS.accentHot,
  },
  remaining: {
    fontFamily: FONT.score,
    fontSize: 38,
    lineHeight: 42,
  },
  remainingActive: {
    color: COLORS.text,
  },
  remainingInactive: {
    color: COLORS.textFaint,
  },
  legsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  legsText: {
    color: COLORS.textSub,
    fontSize: 9,
    fontFamily: FONT.ui,
    letterSpacing: 0.2,
  },

  // Bust banner
  bustBanner: {
    alignItems: 'center',
    backgroundColor: COLORS.bustGlow,
    borderWidth: 1.5,
    borderColor: COLORS.bust,
    borderRadius: 14,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingVertical: 16,
  },
  bustBannerText: {
    fontFamily: FONT.score,
    fontSize: 42,
    color: COLORS.bust,
    letterSpacing: 6,
  },
  bustBannerSub: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textSub,
    marginTop: 2,
  },

  // Checkout card
  checkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.positiveGlow,
    borderWidth: 1,
    borderColor: COLORS.positiveBorder,
    borderRadius: 14,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  checkoutCardLeft: {
    flex: 1,
  },
  checkoutLabel: {
    fontFamily: FONT.ui,
    fontSize: 9,
    color: COLORS.positive,
    letterSpacing: 2,
    marginBottom: 6,
  },
  checkoutComboRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkoutChip: {
    backgroundColor: COLORS.card2,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderTopColor: COLORS.edge,
  },
  checkoutChipText: {
    fontFamily: FONT.ui,
    fontSize: 14,
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  checkoutArrow: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textFaint,
  },
  checkoutBullseye: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(87,160,95,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Turn strip (when no checkout)
  turnStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    borderRadius: 12,
    marginHorizontal: 14,
    marginBottom: 10,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  turnDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.accentHot,
  },
  turnStripText: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textSub,
  },
  turnStripName: {
    fontFamily: FONT.ui,
    color: COLORS.text,
  },
  dartCountLabel: {
    fontFamily: FONT.ui,
    fontSize: 11,
    color: COLORS.textFaint,
    letterSpacing: 1,
  },

  // Dart slots
  dartSlotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  dartSlot: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dartSlotFilled: {
    backgroundColor: COLORS.card2,
    borderColor: COLORS.borderStrong,
    borderTopColor: COLORS.edge,
  },
  dartSlotRecent: {
    borderColor: COLORS.accentBorder,
    backgroundColor: COLORS.accentDim,
  },
  dartSlotIndex: {
    position: 'absolute',
    top: 4,
    left: 6,
    fontFamily: FONT.ui,
    fontSize: 8,
    color: COLORS.textDim,
    letterSpacing: 0.5,
  },
  dartSlotIndexFilled: {
    color: COLORS.textSub,
  },
  dartSlotText: {
    fontFamily: FONT.ui,
    fontSize: 13,
    color: COLORS.textDim,
  },
  dartSlotTextFilled: {
    color: COLORS.text,
  },
  dartSlotTextRecent: {
    color: COLORS.accentHot,
  },

  // Double-in
  doubleInRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  doubleInBadge: {
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  doubleInText: {
    fontFamily: FONT.ui,
    fontSize: 10,
    color: COLORS.accentHot,
    letterSpacing: 1.5,
  },

  // Input tray
  deck: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.edge,
    paddingTop: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  deckHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  toFinishLabel: {
    fontFamily: FONT.ui,
    fontSize: 10,
    color: COLORS.textFaint,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  toFinishValue: {
    fontFamily: FONT.score,
    fontSize: 22,
    color: COLORS.textSub,
    letterSpacing: 0,
  },
  cameraBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Multiplier row
  multiplierRow: {
    marginBottom: 8,
  },

  // Number grid
  numberGrid: {
    gap: 5,
    marginBottom: 8,
  },
  numberGridRow: {
    flexDirection: 'row',
    gap: 5,
  },
  numberBtnWrap: {
    flex: 1,
  },
  numberBtn: {
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  numberBtnPrime: {
    backgroundColor: COLORS.raised,
    borderColor: COLORS.borderStrong,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  numberBtnArmed: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
  },
  numberBtnText: {
    fontFamily: FONT.ui,
    fontSize: 15,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  numberBtnTextTop: {
    color: COLORS.accentHot,
    fontSize: 16,
  },
  numberBtnTextArmed: {
    color: COLORS.accentHot,
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    gap: 6,
  },
  bottomBtn: {
    borderRadius: 11,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bullBtn: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
  },
  bullBtnText: {
    fontFamily: FONT.ui,
    fontSize: 11,
    color: COLORS.accentHot,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  missBtn: {
    backgroundColor: COLORS.bustGlow,
    borderColor: 'rgba(217,58,46,0.3)',
  },
  missBtnText: {
    fontFamily: FONT.ui,
    fontSize: 11,
    color: COLORS.bust,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.35,
  },
});
