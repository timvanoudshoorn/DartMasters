import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AnimatedScore } from '../../components/AnimatedScore';
import { BotThinkingBadge } from '../../components/BotThinkingBadge';
import { GameHud, HudUndoButton } from '../../components/GameHud';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { Screen } from '../../components/Screen';
import { SegmentButton } from '../../components/SegmentButton';
import {
  applyAtcThrow,
  AtcThrow,
  atcBullProgress,
  createAtcPlayers,
  currentAtcTarget,
} from '../../logic/aroundTheClock';
import { BOT_PROFILES, decideAtcThrow } from '../../logic/bot';
import { PlayStackParamList } from '../../navigation/types';
import { MatchStorage, PlayerStorage } from '../../storage/storage';
import { hapticPattern } from '../../sound/haptics';
import { playSound } from '../../sound/soundManager';
import { useSoundEffects } from '../../sound/useSoundEffects';
import { colors, fonts, radius, spacing } from '../../theme';
import { STAGGER_MS } from '../../theme/motion';
import { ATC_SEQUENCE, AtcPlayerState, GameConfig, MatchRecord, Player } from '../../types';
import { generateId } from '../../utils/id';
import { guestIdentityMaps } from '../../utils/guestMaps';
import { resolvePlayerDisplay } from '../../utils/playerDisplay';

interface Props {
  config: GameConfig;
}

export function AroundTheClockGameScreen({ config }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<PlayStackParamList>>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [atcPlayers, setAtcPlayers] = useState<AtcPlayerState[]>(() =>
    createAtcPlayers(config.playerIds)
  );
  const [order, setOrder] = useState(config.playerIds);
  const [turnIndex, setTurnIndex] = useState(0);
  const [dartsThisTurn, setDartsThisTurn] = useState(0);
  const [legsWonMap, setLegsWonMap] = useState<Record<string, number>>(
    Object.fromEntries(config.playerIds.map((id) => [id, 0]))
  );
  const [totalDarts, setTotalDarts] = useState<Record<string, number>>(
    Object.fromEntries(config.playerIds.map((id) => [id, 0]))
  );
  const [starterIndex, setStarterIndex] = useState(0);
  const [gameNumber, setGameNumber] = useState(1);
  const [missesThisLeg, setMissesThisLeg] = useState<Record<string, number>>(
    Object.fromEntries(config.playerIds.map((id) => [id, 0]))
  );
  const [botThinking, setBotThinking] = useState(false);
  const playSfx = useSoundEffects();

  React.useEffect(() => {
    PlayerStorage.getAll()
      .then(setPlayers)
      .catch((err) => {
        console.error('[AroundTheClockGameScreen] Failed to load players:', err);
        setPlayers([]);
      });
  }, []);

  const playerMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => (map[p.id] = p));
    return map;
  }, [players]);

  const activePlayerId = order[turnIndex];
  const activePlayer = atcPlayers.find((p) => p.playerId === activePlayerId)!;
  const target = currentAtcTarget(activePlayer);
  const activeDisplay = resolvePlayerDisplay(activePlayerId, playerMap, config.guestPlayers);
  const isBot = (playerId: string) => !!config.guestPlayers?.[playerId]?.isBot;

  const atBull = target === 25;
  const bullHits = atcBullProgress(activePlayer)?.hits ?? 0;
  // Doubles/triples only matter when "D/T skip ahead" is on — in "any hit
  // advances 1" mode they're functionally identical to a plain hit, so
  // showing them as distinct options would just be noise. The bull is the
  // one exception: a double bull always finishes the leg outright, so it
  // stays available regardless of variant. A triple bull has no special
  // effect (same as a single bull hit) so it's never shown there.
  const showDouble = atBull || !!config.atcDoublesMode;
  const showTriple = !atBull && !!config.atcDoublesMode;

  const finalizeMatch = (winnerId: string, finalTotals: Record<string, number>, finalMisses: Record<string, number>) => {
    const results: MatchRecord['results'] = {};
    config.playerIds.forEach((id) => {
      results[id] = {
        playerId: id,
        legsWon: legsWonMap[id],
        setsWon: 0,
        dartsThrown: finalTotals[id],
        totalScored: 0,
        threeDartAvg: 0,
        firstNineAvg: null,
        highestCheckout: 0,
        checkoutAttempts: 0,
        checkoutHits: 0,
        oneEighties: 0,
        count100Plus: 0,
        count140Plus: 0,
        bestLegDarts: null,
        highestVisit: 0,
        marksPerRound: null,
        isWinner: id === winnerId,
        missCount: finalMisses[id] ?? 0,
      };
    });
    const record: MatchRecord = {
      id: generateId(),
      gameType: 'aroundTheClock',
      date: Date.now(),
      legsToWin: config.legsToWin,
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
        console.error('[AroundTheClockGameScreen] Failed to save match:', err);
        navigation.replace('GameSummary', { matchId: record.id });
      });
  };

  // One-dart undo: snapshot every slice a dart can touch.
  interface Snapshot {
    atcPlayers: AtcPlayerState[];
    order: string[];
    turnIndex: number;
    dartsThisTurn: number;
    legsWonMap: Record<string, number>;
    totalDarts: Record<string, number>;
    starterIndex: number;
    gameNumber: number;
    missesThisLeg: Record<string, number>;
  }
  const history = useRef<Snapshot[]>([]);

  const snapshot = () => {
    history.current.push(
      JSON.parse(
        JSON.stringify({ atcPlayers, order, turnIndex, dartsThisTurn, legsWonMap, totalDarts, starterIndex, gameNumber, missesThisLeg })
      )
    );
    if (history.current.length > 80) history.current.shift();
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    setAtcPlayers(prev.atcPlayers);
    setOrder(prev.order);
    setTurnIndex(prev.turnIndex);
    setDartsThisTurn(prev.dartsThisTurn);
    setLegsWonMap(prev.legsWonMap);
    setTotalDarts(prev.totalDarts);
    setStarterIndex(prev.starterIndex);
    setGameNumber(prev.gameNumber);
    setMissesThisLeg(prev.missesThisLeg);
  };

  const throwDart = (type: AtcThrow) => {
    snapshot();
    // Physical weight tracks the dart (double/triple land heavier); sound
    // stays outcome-level. playSfx would bundle a second, fixed-weight haptic.
    if (type === 'miss') {
      playSfx('miss');
    } else {
      hapticPattern.dartHit(type === 'triple' ? 3 : type === 'double' ? 2 : 1);
      playSound('dartScored');
    }
    const updated = atcPlayers.map((p) =>
      p.playerId === activePlayerId ? applyAtcThrow(p, type, !!config.atcDoublesMode) : p
    );
    setAtcPlayers(updated);

    const newTotals = { ...totalDarts, [activePlayerId]: totalDarts[activePlayerId] + 1 };
    setTotalDarts(newTotals);

    const newMisses =
      type === 'miss'
        ? { ...missesThisLeg, [activePlayerId]: missesThisLeg[activePlayerId] + 1 }
        : missesThisLeg;
    if (type === 'miss') setMissesThisLeg(newMisses);

    const justFinished = updated.find((p) => p.playerId === activePlayerId)!;

    if (justFinished.finished) {
      const newLegsWon = { ...legsWonMap, [activePlayerId]: legsWonMap[activePlayerId] + 1 };
      setLegsWonMap(newLegsWon);

      if (newLegsWon[activePlayerId] >= config.legsToWin) {
        finalizeMatch(activePlayerId, newTotals, newMisses);
        return;
      }

      const newStarter = (starterIndex + 1) % order.length;
      setStarterIndex(newStarter);
      setOrder(rotate(config.playerIds, newStarter));
      setAtcPlayers(createAtcPlayers(config.playerIds));
      setTurnIndex(0);
      setDartsThisTurn(0);
      setGameNumber((g) => g + 1);
      setMissesThisLeg(Object.fromEntries(config.playerIds.map((id) => [id, 0])));
      return;
    }

    const newDarts = dartsThisTurn + 1;
    if (newDarts >= 3) {
      setTurnIndex((turnIndex + 1) % order.length);
      setDartsThisTurn(0);
    } else {
      setDartsThisTurn(newDarts);
    }
  };

  React.useEffect(() => {
    if (!isBot(activePlayerId)) return;
    setBotThinking(true);
    const difficulty = config.guestPlayers?.[activePlayerId]?.botDifficulty ?? 'intermediate';
    const timer = setTimeout(() => {
      setBotThinking(false);
      throwDart(decideAtcThrow(BOT_PROFILES[difficulty]));
    }, 1000 + Math.random() * 1000);
    return () => {
      clearTimeout(timer);
      setBotThinking(false);
    };
  }, [activePlayerId, dartsThisTurn]);

  return (
    <Screen>
      <GameHud
        onExit={() => navigation.goBack()}
        centerContent={
          <View style={styles.legPill}>
            <Text style={styles.legLabel}>GAME {gameNumber}</Text>
          </View>
        }
        dartsThisTurn={dartsThisTurn}
        rightAction={<HudUndoButton onPress={undo} disabled={history.current.length === 0} />}
      />

      <View style={styles.tracksContainer}>
        {atcPlayers.map((p, i) => {
          const display = resolvePlayerDisplay(p.playerId, playerMap, config.guestPlayers);
          const isActive = p.playerId === activePlayerId;
          return (
            <Animated.View
              key={p.playerId}
              entering={FadeInDown.delay(i * STAGGER_MS).duration(260)}
              style={styles.trackRow}
            >
              <PlayerAvatar name={display.name} color={display.color} avatar={display.avatar} photoUri={display.photoUri} size={26} active={isActive} />
              <View style={styles.track}>
                <TrackFill
                  percent={(p.targetIndex / ATC_SEQUENCE.length) * 100}
                  color={isActive ? colors.primaryHot : display.color}
                />
              </View>
              <Text style={[styles.trackLabel, isActive && { color: colors.primaryHot }]}>
                {currentAtcTarget(p) === 25 ? `B ${atcBullProgress(p)?.hits ?? 0}/2` : currentAtcTarget(p)}
              </Text>
            </Animated.View>
          );
        })}
      </View>

      <Animated.View
        entering={FadeInDown.delay(atcPlayers.length * STAGGER_MS).duration(280)}
        style={styles.spotlight}
      >
        <Text style={styles.spotlightLabel}>{activeDisplay.name.toUpperCase()}'S TARGET</Text>
        <AnimatedScore
          value={atBull ? (bullHits > 0 ? `BULL ${bullHits}/2` : 'BULL') : target}
          style={[
            styles.spotlightTarget,
            { color: colors.primaryHot },
            atBull && bullHits > 0 ? styles.spotlightTargetSmall : null,
          ]}
        />
      </Animated.View>

      {botThinking && <BotThinkingBadge />}

      <View style={styles.buttonGrid}>
        {/* haptic="none" throughout: throwDart delivers the weighted haptic. */}
        <SegmentButton
          label="HIT"
          onPress={() => throwDart('hit')}
          disabled={isBot(activePlayerId)}
          size="lg"
          variant="accent"
          style={styles.gridBtn}
          haptic="none"
        />
        {showDouble && (
          <SegmentButton
            label="DOUBLE"
            onPress={() => throwDart('double')}
            disabled={isBot(activePlayerId)}
            size="lg"
            variant="default"
            style={styles.gridBtn}
            haptic="none"
          />
        )}
        {showTriple && (
          <SegmentButton
            label="TRIPLE"
            onPress={() => throwDart('triple')}
            disabled={isBot(activePlayerId)}
            size="lg"
            variant="default"
            style={styles.gridBtn}
            haptic="none"
          />
        )}
        <SegmentButton
          label="MISS"
          onPress={() => throwDart('miss')}
          disabled={isBot(activePlayerId)}
          size="lg"
          variant="danger"
          style={styles.gridBtn}
          haptic="none"
        />
      </View>
    </Screen>
  );
}

function rotate<T>(arr: T[], startIndex: number): T[] {
  return [...arr.slice(startIndex), ...arr.slice(0, startIndex)];
}

/** Progress fill that eases toward each new target instead of jumping. */
function TrackFill({ percent, color }: { percent: number; color: string }) {
  const width = useSharedValue(percent);

  useEffect(() => {
    width.value = withTiming(percent, { duration: 350 });
  }, [percent]);

  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return <Animated.View style={[styles.trackFill, { backgroundColor: color }, style]} />;
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
  tracksContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.bgCardAlt,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 5,
  },
  trackLabel: {
    width: 44,
    textAlign: 'right',
    color: colors.textMuted,
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
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
  spotlightTargetSmall: {
    fontSize: 44,
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
