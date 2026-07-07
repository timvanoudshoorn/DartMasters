import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedScore } from '../../components/AnimatedScore';
import { BotThinkingBadge } from '../../components/BotThinkingBadge';
import { Icon } from '../../components/icons/Icon';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { PressableScale } from '../../components/primitives/PressableScale';
import { Screen } from '../../components/Screen';
import { SegmentButton } from '../../components/SegmentButton';
import { hapticPattern } from '../../sound/haptics';
import { playSound } from '../../sound/soundManager';
import { BOT_PROFILES, decideShanghaiDart } from '../../logic/bot';
import { createShanghaiPlayers, getShanghaiLeader, scoreShanghaiVisit } from '../../logic/shanghai';
import { PlayStackParamList } from '../../navigation/types';
import { MatchStorage, PlayerStorage } from '../../storage/storage';
import { useSoundEffects } from '../../sound/useSoundEffects';
import { colors, fonts, radius, spacing } from '../../theme';
import { GameConfig, MatchRecord, Multiplier, Player, ShanghaiPlayerState } from '../../types';
import { generateId } from '../../utils/id';
import { resolvePlayerDisplay } from '../../utils/playerDisplay';

interface Props {
  config: GameConfig;
}

export function ShanghaiGameScreen({ config }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<PlayStackParamList>>();
  const totalRounds = config.shanghaiRounds ?? 7;
  const [players, setPlayers] = useState<Player[]>([]);
  const [shanghaiPlayers, setShanghaiPlayers] = useState<ShanghaiPlayerState[]>(() =>
    createShanghaiPlayers(config.playerIds)
  );
  const [round, setRound] = useState(1);
  const [turnIndex, setTurnIndex] = useState(0);
  const [visitDarts, setVisitDarts] = useState<(Multiplier | null)[]>([]);
  const [dartsThrown, setDartsThrown] = useState<Record<string, number>>(
    Object.fromEntries(config.playerIds.map((id) => [id, 0]))
  );
  const [highestVisit, setHighestVisit] = useState<Record<string, number>>(
    Object.fromEntries(config.playerIds.map((id) => [id, 0]))
  );
  const [botThinking, setBotThinking] = useState(false);
  const playSfx = useSoundEffects();
  const isBot = (playerId: string) => !!config.guestPlayers?.[playerId]?.isBot;

  React.useEffect(() => {
    PlayerStorage.getAll().then(setPlayers);
  }, []);

  const playerMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => (map[p.id] = p));
    return map;
  }, [players]);

  const activePlayerId = config.playerIds[turnIndex];
  const activeDisplay = resolvePlayerDisplay(activePlayerId, playerMap, config.guestPlayers);
  const target = round;

  const finalizeMatch = (winnerId: string | null, finalDarts: Record<string, number>, finalHighest: Record<string, number>) => {
    const results: MatchRecord['results'] = {};
    shanghaiPlayers.forEach((sp) => {
      results[sp.playerId] = {
        playerId: sp.playerId,
        legsWon: sp.playerId === winnerId ? 1 : 0,
        setsWon: 0,
        dartsThrown: finalDarts[sp.playerId],
        totalScored: sp.score,
        threeDartAvg: finalDarts[sp.playerId] > 0 ? (sp.score / finalDarts[sp.playerId]) * 3 : 0,
        firstNineAvg: null,
        highestCheckout: 0,
        checkoutAttempts: 0,
        checkoutHits: 0,
        oneEighties: 0,
        count100Plus: 0,
        count140Plus: 0,
        bestLegDarts: null,
        highestVisit: finalHighest[sp.playerId],
        marksPerRound: null,
        isWinner: sp.playerId === winnerId,
      };
    });
    const record: MatchRecord = {
      id: generateId(),
      gameType: 'shanghai',
      date: Date.now(),
      legsToWin: 1,
      setsToWin: 1,
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
    MatchStorage.save(record)
      .then(() => navigation.replace('GameSummary', { matchId: record.id }))
      .catch((err) => {
        console.error('[ShanghaiGameScreen] Failed to save match:', err);
        navigation.replace('GameSummary', { matchId: record.id });
      });
  };

  const registerDart = (mult: Multiplier | null) => {
    if (mult === null) {
      playSfx('miss');
    } else {
      hapticPattern.dartHit(mult);
      playSound('dartScored');
    }
    const newDartsThrown = { ...dartsThrown, [activePlayerId]: dartsThrown[activePlayerId] + 1 };
    setDartsThrown(newDartsThrown);
    const newVisitDarts = [...visitDarts, mult];

    if (newVisitDarts.length < 3) {
      setVisitDarts(newVisitDarts);
      return;
    }

    const { points, isShanghai } = scoreShanghaiVisit(target, newVisitDarts.map((m) => ({ multiplier: m })));
    const newHighest = { ...highestVisit, [activePlayerId]: Math.max(highestVisit[activePlayerId], points) };
    setHighestVisit(newHighest);

    const updatedPlayers = shanghaiPlayers.map((p) =>
      p.playerId === activePlayerId ? { ...p, score: p.score + points, shanghaiWin: isShanghai } : p
    );
    setShanghaiPlayers(updatedPlayers);
    setVisitDarts([]);

    if (isShanghai) {
      playSfx('checkout');
      finalizeMatch(activePlayerId, newDartsThrown, newHighest);
      return;
    }

    const nextTurn = (turnIndex + 1) % config.playerIds.length;
    if (nextTurn === 0) {
      if (round >= totalRounds) {
        const winnerId = getShanghaiLeader(updatedPlayers);
        finalizeMatch(winnerId, newDartsThrown, newHighest);
        return;
      }
      setRound(round + 1);
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
      registerDart(decideShanghaiDart(BOT_PROFILES[difficulty]));
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
          <Text style={styles.legLabel}>ROUND {round} / {totalRounds}</Text>
        </View>
        <View style={styles.dartsIndicator}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dartDot, i < dartsThisTurn && styles.dartDotFilled]} />
          ))}
        </View>
      </View>

      <View style={styles.scoresRow}>
        {shanghaiPlayers.map((sp) => {
          const display = resolvePlayerDisplay(sp.playerId, playerMap, config.guestPlayers);
          const isActive = sp.playerId === activePlayerId;
          return (
            <View key={sp.playerId} style={[styles.scoreCard, isActive && styles.scoreCardActive]}>
              <PlayerAvatar name={display.name} color={display.color} avatar={display.avatar} photoUri={display.photoUri} size={26} active={isActive} />
              <Text style={[styles.scoreCardName, isActive && styles.scoreCardNameActive]} numberOfLines={1}>{display.name}</Text>
              <AnimatedScore
                value={sp.score}
                style={[styles.scoreCardScore, { color: isActive ? colors.textPrimary : colors.textDim }]}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.spotlight}>
        <Text style={styles.spotlightLabel}>
          {activeDisplay.name.toUpperCase()} — TARGET THIS ROUND
        </Text>
        <AnimatedScore value={target} style={[styles.spotlightTarget, { color: colors.primaryHot }]} />
        <Text style={styles.shanghaiHint}>Single + Double + Triple in one turn = instant win</Text>
      </View>

      {botThinking && <BotThinkingBadge />}

      <View style={styles.buttonGrid}>
        <SegmentButton label="SINGLE" onPress={() => registerDart(1)} disabled={isBot(activePlayerId)} size="lg" variant="default" style={styles.gridBtn} />
        <SegmentButton label="DOUBLE" onPress={() => registerDart(2)} disabled={isBot(activePlayerId)} size="lg" variant="default" style={styles.gridBtn} />
        <SegmentButton label="TRIPLE" onPress={() => registerDart(3)} disabled={isBot(activePlayerId)} size="lg" variant="accent" style={styles.gridBtn} />
        <SegmentButton
          label="MISS"
          onPress={() => registerDart(null)}
          disabled={isBot(activePlayerId)}
          size="lg"
          variant="danger"
          style={styles.gridBtn}
          soundTrigger="miss"
        />
      </View>
    </Screen>
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
    fontSize: 88,
  },
  shanghaiHint: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridBtn: {
    width: '47%',
  },
});
