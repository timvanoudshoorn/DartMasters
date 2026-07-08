import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AnimatedScore } from '../../components/AnimatedScore';
import { BotThinkingBadge } from '../../components/BotThinkingBadge';
import { CricketMark } from '../../components/CricketMark';
import { Icon } from '../../components/icons/Icon';
import { MultiplierSelector } from '../../components/MultiplierSelector';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { PressableScale } from '../../components/primitives/PressableScale';
import { Screen } from '../../components/Screen';
import { SegmentButton } from '../../components/SegmentButton';
import { hapticPattern } from '../../sound/haptics';
import { playSound } from '../../sound/soundManager';
import {
  applyCricketThrow,
  createCricketPlayers,
  getCricketWinner,
  isTargetClosedFor,
} from '../../logic/cricket';
import { BOT_PROFILES, decideCricketThrow } from '../../logic/bot';
import { PlayStackParamList } from '../../navigation/types';
import { MatchStorage, PlayerStorage } from '../../storage/storage';
import { useSoundEffects } from '../../sound/useSoundEffects';
import { colors, fonts, radius, spacing } from '../../theme';
import {
  CRICKET_TARGETS,
  CricketPlayerState,
  GameConfig,
  MatchRecord,
  Multiplier,
  Player,
} from '../../types';
import { generateId } from '../../utils/id';
import { resolvePlayerDisplay } from '../../utils/playerDisplay';

interface Props {
  config: GameConfig;
}

interface Accum {
  darts: number;
  turns: number;
  marks: number;
  totalScore: number;
  highestTurn: number;
}

function emptyAccum(): Accum {
  return { darts: 0, turns: 0, marks: 0, totalScore: 0, highestTurn: 0 };
}


export function CricketGameScreen({ config }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<PlayStackParamList>>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [cricketPlayers, setCricketPlayers] = useState<CricketPlayerState[]>(() =>
    createCricketPlayers(config.playerIds)
  );
  const [order, setOrder] = useState(config.playerIds);
  const [turnIndex, setTurnIndex] = useState(0);
  const [dartsThisTurn, setDartsThisTurn] = useState(0);
  const [visitPoints, setVisitPoints] = useState(0);
  const [multiplier, setMultiplier] = useState<Multiplier>(1);
  const [legsWonMap, setLegsWonMap] = useState<Record<string, number>>(
    Object.fromEntries(config.playerIds.map((id) => [id, 0]))
  );
  const [accum, setAccum] = useState<Record<string, Accum>>(
    Object.fromEntries(config.playerIds.map((id) => [id, emptyAccum()]))
  );
  const [starterIndex, setStarterIndex] = useState(0);
  const [botThinking, setBotThinking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const playSfx = useSoundEffects();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 1100);
  };

  React.useEffect(() => {
    PlayerStorage.getAll().then(setPlayers);
  }, []);

  const playerMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => (map[p.id] = p));
    return map;
  }, [players]);

  const activePlayerId = order[turnIndex];
  const isBot = (playerId: string) => !!config.guestPlayers?.[playerId]?.isBot;

  // Closed by every player at the table — dead number, nothing left to do here.
  const closedByAll = (t: number) => cricketPlayers.every((p) => isTargetClosedFor(p, t));
  // Closed by every opponent of whoever's throwing now — the thrower can still
  // mark it for themselves, but it can never score them any points.
  const deadForActive = (t: number) => {
    const opponents = cricketPlayers.filter((p) => p.playerId !== activePlayerId);
    return opponents.length > 0 && opponents.every((p) => isTargetClosedFor(p, t));
  };

  const finalizeMatch = (winnerId: string | null, finalAccum: Record<string, Accum>) => {
    const results: MatchRecord['results'] = {};
    config.playerIds.forEach((id) => {
      const a = finalAccum[id];
      results[id] = {
        playerId: id,
        legsWon: legsWonMap[id],
        setsWon: 0,
        dartsThrown: a.darts,
        totalScored: a.totalScore,
        threeDartAvg: a.darts > 0 ? (a.totalScore / a.darts) * 3 : 0,
        firstNineAvg: null,
        highestCheckout: 0,
        checkoutAttempts: 0,
        checkoutHits: 0,
        oneEighties: 0,
        count100Plus: 0,
        count140Plus: 0,
        bestLegDarts: null,
        highestVisit: a.highestTurn,
        marksPerRound: a.turns > 0 ? a.marks / a.turns : 0,
        isWinner: id === winnerId,
      };
    });
    const record: MatchRecord = {
      id: generateId(),
      gameType: 'cricket',
      date: Date.now(),
      legsToWin: config.legsToWin,
      setsToWin: 1,
      cutThroat: config.cutThroat,
      playerIds: config.playerIds,
      winnerId,
      results,
      guestNames: config.guestPlayers
        ? Object.fromEntries(Object.entries(config.guestPlayers).map(([id, g]) => [id, g.name]))
        : undefined,
      guestColors: config.guestPlayers
        ? Object.fromEntries(Object.entries(config.guestPlayers).map(([id, g]) => [id, g.color]))
        : undefined,
      botPlayerIds: config.guestPlayers
        ? Object.entries(config.guestPlayers).filter(([, g]) => g.isBot).map(([id]) => id)
        : undefined,
    };
    playSfx('win');
    MatchStorage.save(record).then(() => navigation.replace('GameSummary', { matchId: record.id }));
  };

  const throwDart = (target: number | null, mult: Multiplier) => {
    const before = cricketPlayers.find((p) => p.playerId === activePlayerId)!;
    const beforeScore = before.score;
    const updated = applyCricketThrow(cricketPlayers, activePlayerId, target, mult, config.cutThroat);
    const after = updated.find((p) => p.playerId === activePlayerId)!;
    const gained = after.score - beforeScore;

    if (target === null) {
      playSfx('miss');
    } else {
      // Physical weight tracks the dart itself; sound tracks whether it scored.
      hapticPattern.dartHit(mult);
      playSound(gained > 0 ? 'dartScored' : 'buttonTap');
    }

    const newAccum = { ...accum };
    const a = { ...newAccum[activePlayerId] };
    a.darts += 1;
    if (target !== null) a.marks += mult;
    a.totalScore += gained;
    newAccum[activePlayerId] = a;

    setCricketPlayers(updated);
    setVisitPoints((v) => v + gained);

    const winnerId = getCricketWinner(updated, config.cutThroat);
    const newDartsThisTurn = dartsThisTurn + 1;

    if (winnerId) {
      a.turns += 1;
      a.highestTurn = Math.max(a.highestTurn, visitPoints + gained);
      newAccum[activePlayerId] = a;
      const newLegsWon = { ...legsWonMap, [winnerId]: legsWonMap[winnerId] + 1 };
      setLegsWonMap(newLegsWon);
      setAccum(newAccum);

      if (newLegsWon[winnerId] >= config.legsToWin) {
        finalizeMatch(winnerId, newAccum);
        return;
      }

      const newStarter = (starterIndex + 1) % order.length;
      setStarterIndex(newStarter);
      setOrder(rotate(config.playerIds, newStarter));
      setCricketPlayers(createCricketPlayers(config.playerIds));
      setTurnIndex(0);
      setDartsThisTurn(0);
      setVisitPoints(0);
      return;
    }

    if (newDartsThisTurn >= 3) {
      a.turns += 1;
      a.highestTurn = Math.max(a.highestTurn, visitPoints + gained);
      newAccum[activePlayerId] = a;
      setAccum(newAccum);
      setTurnIndex((turnIndex + 1) % order.length);
      setDartsThisTurn(0);
      setVisitPoints(0);
    } else {
      setAccum(newAccum);
      setDartsThisTurn(newDartsThisTurn);
    }
  };

  React.useEffect(() => {
    if (!isBot(activePlayerId)) return;
    const active = cricketPlayers.find((p) => p.playerId === activePlayerId);
    if (!active) return;
    setBotThinking(true);
    const difficulty = config.guestPlayers?.[activePlayerId]?.botDifficulty ?? 'intermediate';
    const timer = setTimeout(() => {
      setBotThinking(false);
      const decision = decideCricketThrow(active.marks, BOT_PROFILES[difficulty]);
      throwDart(decision.target, decision.multiplier);
    }, 1000 + Math.random() * 1000);
    return () => {
      clearTimeout(timer);
      setBotThinking(false);
    };
  }, [activePlayerId, dartsThisTurn]);

  return (
    <Screen>
      <View style={styles.topBar}>
        <PressableScale onPress={() => navigation.goBack()} hitSlop={10} haptic="light" scaleTo={0.88} style={styles.exitBtn}>
          <Icon name="close" size={16} color={colors.textMuted} />
        </PressableScale>
        <View style={styles.legPill}>
          <Text style={styles.legLabel}>
            {config.cutThroat ? 'CUT-THROAT · ' : ''}GAME {Object.values(legsWonMap).reduce((a, b) => a + b, 0) + 1}
          </Text>
        </View>
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
      </View>

      <View style={styles.board}>
        <View style={styles.boardHeaderRow}>
          <View style={styles.nameCol} />
          {CRICKET_TARGETS.map((t) => {
            const dead = closedByAll(t);
            return (
              <View key={t} style={styles.targetCol}>
                <Text style={[styles.targetHeader, dead && styles.targetHeaderClosed]}>
                  {t === 25 ? 'B' : t}
                </Text>
              </View>
            );
          })}
          <View style={styles.scoreCol} />
        </View>
        {toast && (
          <Animated.View entering={FadeInDown.duration(180)} style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        )}
        {cricketPlayers.map((p) => {
          const display = resolvePlayerDisplay(p.playerId, playerMap, config.guestPlayers);
          const isActive = p.playerId === activePlayerId;
          return (
            <View
              key={p.playerId}
              style={[
                styles.boardRow,
                isActive && { backgroundColor: colors.accent + '12', borderLeftColor: colors.accent, borderLeftWidth: 3 },
              ]}
            >
              <View style={styles.nameCol}>
                <PlayerAvatar name={display.name} color={display.color} avatar={display.avatar} photoUri={display.photoUri} size={24} active={isActive} />
              </View>
              {CRICKET_TARGETS.map((t) => (
                <View key={t} style={styles.targetCol}>
                  <CricketMark marks={p.marks[t] || 0} dead={closedByAll(t)} />
                </View>
              ))}
              <View style={styles.scoreCol}>
                <AnimatedScore
                  value={p.score}
                  style={[styles.scoreText, { color: isActive ? colors.textPrimary : colors.textDim }]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {botThinking && <BotThinkingBadge />}

      <View style={{ marginTop: spacing.lg }}>
        <MultiplierSelector value={multiplier} onChange={setMultiplier} disabled={isBot(activePlayerId)} />
      </View>

      <View style={styles.targetGrid}>
        {CRICKET_TARGETS.map((t) => {
          const dead = closedByAll(t);
          const noEffect = !dead && deadForActive(t);
          return (
            <View key={t} style={styles.targetButtonWrap}>
              <SegmentButton
                label={t === 25 ? 'BULL' : String(t)}
                onPress={() => {
                  if (dead) {
                    showToast('Closed');
                    return;
                  }
                  throwDart(t, multiplier);
                }}
                disabled={isBot(activePlayerId)}
                size="lg"
                variant={dead ? 'muted' : 'accent'}
                style={styles.targetButton}
              />
              {noEffect && <View style={styles.noEffectDot} />}
            </View>
          );
        })}
      </View>

      <SegmentButton
        label="MISS"
        onPress={() => throwDart(null, multiplier)}
        disabled={isBot(activePlayerId)}
        variant="danger"
        size="md"
        soundTrigger="miss"
      />
    </Screen>
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
  exit: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bodyBold },
  legPill: {
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legLabel: { fontFamily: fonts.bodyExtraBold, fontSize: 12, color: colors.textSecondary, letterSpacing: 0.6 },
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
  board: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  boardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgDeep,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  nameCol: { width: 36, alignItems: 'center' },
  targetCol: { flex: 1, alignItems: 'center' },
  scoreCol: { width: 48, alignItems: 'center' },
  targetHeader: {
    color: colors.textMuted,
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
  },
  scoreText: {
    fontSize: 20,
    color: colors.textPrimary,
  },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  targetButtonWrap: {
    width: '22%',
    position: 'relative',
  },
  targetButton: {
    width: '100%',
  },
  noEffectDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  targetHeaderClosed: {
    color: colors.textDim,
    textDecorationLine: 'line-through',
  },
  toast: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  toastText: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
});
