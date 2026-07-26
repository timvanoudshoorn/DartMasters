import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedScore } from '../../components/AnimatedScore';
import { BotThinkingBadge } from '../../components/BotThinkingBadge';
import { GameHud, HudUndoButton } from '../../components/GameHud';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { Screen } from '../../components/Screen';
import { SegmentButton } from '../../components/SegmentButton';
import { hapticPattern } from '../../sound/haptics';
import { playSound } from '../../sound/soundManager';
import { BOT_PROFILES, decideHalveItDart } from '../../logic/bot';
import {
  applyHalveItRound,
  createHalveItPlayers,
  getHalveItLeader,
  HalveItDart,
  scoreHalveItDart,
} from '../../logic/halveIt';
import { PlayStackParamList } from '../../navigation/types';
import { MatchStorage, PlayerStorage } from '../../storage/storage';
import { useSoundEffects } from '../../sound/useSoundEffects';
import { colors, fonts, radius, spacing } from '../../theme';
import { STAGGER_MS } from '../../theme/motion';
import { GameConfig, HALVE_IT_SEQUENCE, HalveItPlayerState, HalveItTarget, MatchRecord, Player } from '../../types';
import { generateId } from '../../utils/id';
import { guestIdentityMaps } from '../../utils/guestMaps';
import { resolvePlayerDisplay } from '../../utils/playerDisplay';

interface Props {
  config: GameConfig;
}

const NUMBER_GRID_ROWS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
];

function targetHeadline(target: HalveItTarget): string {
  switch (target.kind) {
    case 'number':
      return String(target.segment);
    case 'bull':
      return 'BULL';
    case 'anyDouble':
      return 'ANY DOUBLE';
    case 'anyTriple':
      return 'ANY TRIPLE';
  }
}

function targetHint(target: HalveItTarget): string {
  switch (target.kind) {
    case 'number':
      return `Hit ${target.segment} with any dart, or your score is halved`;
    case 'bull':
      return 'Hit the bull, or your score is halved';
    case 'anyDouble':
      return 'Hit any double, or your score is halved';
    case 'anyTriple':
      return 'Hit any triple, or your score is halved';
  }
}

export function HalveItGameScreen({ config }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<PlayStackParamList>>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [halveItPlayers, setHalveItPlayers] = useState<HalveItPlayerState[]>(() =>
    createHalveItPlayers(config.playerIds)
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [turnIndex, setTurnIndex] = useState(0);
  const [visitDarts, setVisitDarts] = useState<(HalveItDart | null)[]>([]);
  const [dartsThrown, setDartsThrown] = useState<Record<string, number>>(
    Object.fromEntries(config.playerIds.map((id) => [id, 0]))
  );
  const [highestRound, setHighestRound] = useState<Record<string, number>>(
    Object.fromEntries(config.playerIds.map((id) => [id, 0]))
  );
  const [toast, setToast] = useState<string | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const playSfx = useSoundEffects();
  const isBot = (playerId: string) => !!config.guestPlayers?.[playerId]?.isBot;

  React.useEffect(() => {
    PlayerStorage.getAll()
      .then(setPlayers)
      .catch((err) => {
        console.error('[HalveItGameScreen] Failed to load players:', err);
        setPlayers([]);
      });
  }, []);

  const playerMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => (map[p.id] = p));
    return map;
  }, [players]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => (t === msg ? null : t)), 1100);
  };

  React.useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // One-dart undo: snapshot every slice a dart can touch.
  interface Snapshot {
    halveItPlayers: HalveItPlayerState[];
    roundIndex: number;
    turnIndex: number;
    visitDarts: (HalveItDart | null)[];
    dartsThrown: Record<string, number>;
    highestRound: Record<string, number>;
  }
  const history = useRef<Snapshot[]>([]);

  const snapshot = () => {
    history.current.push(
      JSON.parse(JSON.stringify({ halveItPlayers, roundIndex, turnIndex, visitDarts, dartsThrown, highestRound }))
    );
    if (history.current.length > 80) history.current.shift();
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    setHalveItPlayers(prev.halveItPlayers);
    setRoundIndex(prev.roundIndex);
    setTurnIndex(prev.turnIndex);
    setVisitDarts(prev.visitDarts);
    setDartsThrown(prev.dartsThrown);
    setHighestRound(prev.highestRound);
  };

  const activePlayerId = config.playerIds[turnIndex];
  const activeDisplay = resolvePlayerDisplay(activePlayerId, playerMap, config.guestPlayers);
  const target = HALVE_IT_SEQUENCE[roundIndex];

  const finalizeMatch = (
    winnerId: string | null,
    finalDarts: Record<string, number>,
    finalHighest: Record<string, number>,
    finalPlayers: HalveItPlayerState[]
  ) => {
    const results: MatchRecord['results'] = {};
    finalPlayers.forEach((hp) => {
      results[hp.playerId] = {
        playerId: hp.playerId,
        legsWon: hp.playerId === winnerId ? 1 : 0,
        setsWon: 0,
        dartsThrown: finalDarts[hp.playerId],
        totalScored: hp.score,
        threeDartAvg: finalDarts[hp.playerId] > 0 ? (hp.score / finalDarts[hp.playerId]) * 3 : 0,
        firstNineAvg: null,
        highestCheckout: 0,
        checkoutAttempts: 0,
        checkoutHits: 0,
        oneEighties: 0,
        count100Plus: 0,
        count140Plus: 0,
        bestLegDarts: null,
        highestVisit: finalHighest[hp.playerId],
        marksPerRound: null,
        isWinner: hp.playerId === winnerId,
      };
    });
    const record: MatchRecord = {
      id: generateId(),
      gameType: 'halveIt',
      date: Date.now(),
      legsToWin: 1,
      setsToWin: 1,
      playerIds: config.playerIds,
      winnerId,
      results,
      ...guestIdentityMaps(config),
    };
    playSfx('win');
    MatchStorage.save(record)
      .then(() => navigation.replace('GameSummary', { matchId: record.id }))
      .catch((err) => {
        console.error('[HalveItGameScreen] Failed to save match:', err);
        navigation.replace('GameSummary', { matchId: record.id });
      });
  };

  const registerDart = (dart: HalveItDart | null) => {
    snapshot();
    if (dart === null) {
      playSfx('miss');
    } else {
      hapticPattern.dartHit(dart.multiplier);
      playSound(scoreHalveItDart(target, dart) > 0 ? 'dartScored' : 'buttonTap');
    }

    const newDartsThrown = { ...dartsThrown, [activePlayerId]: dartsThrown[activePlayerId] + 1 };
    setDartsThrown(newDartsThrown);
    const newVisitDarts = [...visitDarts, dart];

    if (newVisitDarts.length < 3) {
      setVisitDarts(newVisitDarts);
      return;
    }

    const activePlayer = halveItPlayers.find((p) => p.playerId === activePlayerId)!;
    const result = applyHalveItRound(activePlayer.score, target, newVisitDarts);
    const newHighest = { ...highestRound, [activePlayerId]: Math.max(highestRound[activePlayerId], result.roundPoints) };
    setHighestRound(newHighest);

    const updatedPlayers = halveItPlayers.map((p) =>
      p.playerId === activePlayerId ? { ...p, score: result.newScore } : p
    );
    setHalveItPlayers(updatedPlayers);
    setVisitDarts([]);
    showToast(result.halved ? 'HALVED' : `+${result.roundPoints}`);
    if (result.halved) playSfx('bust');

    const nextTurn = (turnIndex + 1) % config.playerIds.length;
    if (nextTurn === 0) {
      if (roundIndex >= HALVE_IT_SEQUENCE.length - 1) {
        const winnerId = getHalveItLeader(updatedPlayers);
        finalizeMatch(winnerId, newDartsThrown, newHighest, updatedPlayers);
        return;
      }
      setRoundIndex(roundIndex + 1);
    }
    setTurnIndex(nextTurn);
  };

  const dartsThisTurn = visitDarts.length;

  React.useEffect(() => {
    if (!isBot(activePlayerId)) return;
    setBotThinking(true);
    const difficulty = config.guestPlayers?.[activePlayerId]?.botDifficulty ?? 'intermediate';
    const timer = setTimeout(() => {
      setBotThinking(false);
      registerDart(decideHalveItDart(target, BOT_PROFILES[difficulty]));
    }, 1000 + Math.random() * 1000);
    return () => {
      clearTimeout(timer);
      setBotThinking(false);
    };
  }, [activePlayerId, dartsThisTurn]);

  const inputDisabled = isBot(activePlayerId);

  return (
    <Screen>
      <GameHud
        onExit={() => navigation.goBack()}
        centerContent={
          <View style={styles.legPill}>
            <Text style={styles.legLabel}>ROUND {roundIndex + 1} / {HALVE_IT_SEQUENCE.length}</Text>
          </View>
        }
        dartsThisTurn={dartsThisTurn}
        rightAction={<HudUndoButton onPress={undo} disabled={history.current.length === 0} />}
      />

      <View style={styles.scoresRow}>
        {halveItPlayers.map((hp, i) => {
          const display = resolvePlayerDisplay(hp.playerId, playerMap, config.guestPlayers);
          const isActive = hp.playerId === activePlayerId;
          return (
            <Animated.View
              key={hp.playerId}
              entering={FadeInDown.delay(i * STAGGER_MS).duration(260)}
              style={[styles.scoreCard, isActive && styles.scoreCardActive]}
            >
              <PlayerAvatar name={display.name} color={display.color} avatar={display.avatar} photoUri={display.photoUri} size={26} active={isActive} />
              <Text style={[styles.scoreCardName, isActive && styles.scoreCardNameActive]} numberOfLines={1}>{display.name}</Text>
              <AnimatedScore
                value={hp.score}
                style={[styles.scoreCardScore, { color: isActive ? colors.textPrimary : colors.textDim }]}
              />
            </Animated.View>
          );
        })}
      </View>

      <Animated.View entering={FadeInDown.delay(STAGGER_MS * 2).duration(280)} style={styles.spotlight}>
        <Text style={styles.spotlightLabel}>
          {activeDisplay.name.toUpperCase()} — TARGET THIS ROUND
        </Text>
        <AnimatedScore value={targetHeadline(target)} style={[styles.spotlightTarget, { color: colors.primaryHot }]} />
        <Text style={styles.hint}>{targetHint(target)}</Text>
        {toast && (
          <Animated.View entering={FadeInDown.duration(180)} style={styles.toast}>
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        )}
      </Animated.View>

      {botThinking && <BotThinkingBadge />}

      {(target.kind === 'number' || target.kind === 'bull') && (
        <View style={styles.buttonGrid}>
          {/* haptic="none" throughout: registerDart delivers the weighted haptic. */}
          <SegmentButton
            label={target.kind === 'bull' ? 'SINGLE BULL' : 'SINGLE'}
            onPress={() => registerDart({ segment: target.segment ?? 25, multiplier: 1 })}
            disabled={inputDisabled}
            size="lg"
            variant="default"
            style={styles.gridBtn}
            haptic="none"
          />
          <SegmentButton
            label={target.kind === 'bull' ? 'DOUBLE BULL' : 'DOUBLE'}
            onPress={() => registerDart({ segment: target.segment ?? 25, multiplier: 2 })}
            disabled={inputDisabled}
            size="lg"
            variant="default"
            style={styles.gridBtn}
            haptic="none"
          />
          {target.kind === 'number' && (
            <SegmentButton
              label="TRIPLE"
              onPress={() => registerDart({ segment: target.segment!, multiplier: 3 })}
              disabled={inputDisabled}
              size="lg"
              variant="accent"
              style={styles.gridBtn}
              haptic="none"
            />
          )}
          <SegmentButton
            label="MISS"
            onPress={() => registerDart(null)}
            disabled={inputDisabled}
            size="lg"
            variant="danger"
            style={styles.gridBtn}
            haptic="none"
          />
        </View>
      )}

      {(target.kind === 'anyDouble' || target.kind === 'anyTriple') && (
        <>
          <View style={styles.numberGrid}>
            {NUMBER_GRID_ROWS.map((row, ri) => (
              <View key={ri} style={styles.numberGridRow}>
                {row.map((n) => (
                  <SegmentButton
                    key={n}
                    label={String(n)}
                    onPress={() => registerDart({ segment: n, multiplier: target.kind === 'anyDouble' ? 2 : 3 })}
                    disabled={inputDisabled}
                    size="sm"
                    variant="accent"
                    style={styles.numberBtn}
                    haptic="none"
                  />
                ))}
              </View>
            ))}
          </View>
          <SegmentButton
            label="MISS"
            onPress={() => registerDart(null)}
            disabled={inputDisabled}
            size="md"
            variant="danger"
            haptic="none"
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  legPill: {
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legLabel: { fontFamily: fonts.bodyExtraBold, fontSize: 12, color: colors.textSecondary, letterSpacing: 0.6 },
  scoresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  scoreCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
  },
  scoreCardActive: {
    backgroundColor: colors.bgCardAlt,
    borderColor: colors.accent,
  },
  scoreCardName: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    marginTop: 4,
  },
  scoreCardNameActive: {
    color: colors.accent,
    textTransform: 'uppercase',
  },
  scoreCardScore: {
    fontSize: 22,
    marginTop: 2,
  },
  spotlight: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  spotlightLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  spotlightTarget: {
    fontSize: 72,
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  toast: {
    marginTop: spacing.sm,
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  toastText: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridBtn: {
    width: '47%',
  },
  numberGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  numberGridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numberBtn: {
    flex: 1,
  },
});
