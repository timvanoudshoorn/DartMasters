import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedScore } from '../../components/AnimatedScore';
import { GameHud, HudUndoButton } from '../../components/GameHud';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { Screen } from '../../components/Screen';
import { SegmentButton } from '../../components/SegmentButton';
import { applyBobs27Round, BOBS27_ROUNDS, createBobs27Players, getBobs27Leader } from '../../logic/bobs27';
import { PlayStackParamList } from '../../navigation/types';
import { MatchStorage, PlayerStorage } from '../../storage/storage';
import { hapticPattern } from '../../sound/haptics';
import { playSound } from '../../sound/soundManager';
import { useSoundEffects } from '../../sound/useSoundEffects';
import { colors, fonts, radius, spacing } from '../../theme';
import { reducedMs, staggerDelay, STAGGER_MS } from '../../theme/motion';
import { Bobs27PlayerState, GameConfig, MatchRecord, Player } from '../../types';
import { generateId } from '../../utils/id';
import { guestIdentityMaps } from '../../utils/guestMaps';
import { resolvePlayerDisplay } from '../../utils/playerDisplay';

interface Props {
  config: GameConfig;
}

export function Bobs27GameScreen({ config }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<PlayStackParamList>>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [bobsPlayers, setBobsPlayers] = useState<Bobs27PlayerState[]>(() =>
    createBobs27Players(config.playerIds)
  );
  const [turnIndex, setTurnIndex] = useState(0);
  const [hitsThisRound, setHitsThisRound] = useState(0);
  const [dartsThisTurn, setDartsThisTurn] = useState(0);
  const [dartsThrown, setDartsThrown] = useState<Record<string, number>>(
    Object.fromEntries(config.playerIds.map((id) => [id, 0]))
  );
  const playSfx = useSoundEffects();

  React.useEffect(() => {
    PlayerStorage.getAll()
      .then(setPlayers)
      .catch((err) => {
        console.error('[Bobs27GameScreen] Failed to load players:', err);
        setPlayers([]);
      });
  }, []);

  const playerMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => (map[p.id] = p));
    return map;
  }, [players]);

  const activePlayerId = config.playerIds[turnIndex];
  const activeBobs = bobsPlayers.find((p) => p.playerId === activePlayerId)!;
  const display = resolvePlayerDisplay(activePlayerId, playerMap, config.guestPlayers);

  const nextActiveIndex = (from: number, list: Bobs27PlayerState[]): number => {
    let idx = from;
    for (let i = 0; i < list.length; i++) {
      idx = (idx + 1) % list.length;
      if (!list[idx].finished) return idx;
    }
    return from;
  };

  const finalizeMatch = (winnerId: string | null, finalDarts: Record<string, number>, finalPlayers: Bobs27PlayerState[]) => {
    const results: MatchRecord['results'] = {};
    finalPlayers.forEach((bp) => {
      results[bp.playerId] = {
        playerId: bp.playerId,
        legsWon: bp.playerId === winnerId ? 1 : 0,
        setsWon: 0,
        dartsThrown: finalDarts[bp.playerId],
        totalScored: bp.score,
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
        isWinner: bp.playerId === winnerId,
      };
    });
    const record: MatchRecord = {
      id: generateId(),
      gameType: 'bobs27',
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
        console.error('[Bobs27GameScreen] Failed to save match:', err);
        navigation.replace('GameSummary', { matchId: record.id });
      });
  };

  // One-dart undo: snapshot every slice a dart can touch.
  interface Snapshot {
    bobsPlayers: Bobs27PlayerState[];
    turnIndex: number;
    hitsThisRound: number;
    dartsThisTurn: number;
    dartsThrown: Record<string, number>;
  }
  const history = useRef<Snapshot[]>([]);

  const snapshot = () => {
    history.current.push(
      JSON.parse(JSON.stringify({ bobsPlayers, turnIndex, hitsThisRound, dartsThisTurn, dartsThrown }))
    );
    if (history.current.length > 80) history.current.shift();
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    setBobsPlayers(prev.bobsPlayers);
    setTurnIndex(prev.turnIndex);
    setHitsThisRound(prev.hitsThisRound);
    setDartsThisTurn(prev.dartsThisTurn);
    setDartsThrown(prev.dartsThrown);
  };

  const throwDart = (hit: boolean) => {
    snapshot();
    // A hit double is a double landing, not a leg won — the full checkout
    // signature fired here up to 20 times a game, diluting the one moment
    // it's meant to mark. Weighted contact haptic + scored sound instead.
    if (hit) {
      hapticPattern.dartHit(2);
      playSound('dartScored');
    } else {
      playSfx('miss');
    }
    const newDartsThrown = { ...dartsThrown, [activePlayerId]: dartsThrown[activePlayerId] + 1 };
    setDartsThrown(newDartsThrown);

    const newHits = hitsThisRound + (hit ? 1 : 0);
    const newDartsThisTurn = dartsThisTurn + 1;

    if (newDartsThisTurn < 3) {
      setHitsThisRound(newHits);
      setDartsThisTurn(newDartsThisTurn);
      return;
    }

    const updated = bobsPlayers.map((p) => (p.playerId === activePlayerId ? applyBobs27Round(p, newHits) : p));
    setBobsPlayers(updated);
    setHitsThisRound(0);
    setDartsThisTurn(0);

    const allFinished = updated.every((p) => p.finished);
    if (allFinished) {
      const winnerId = getBobs27Leader(updated);
      finalizeMatch(winnerId, newDartsThrown, updated);
      return;
    }

    setTurnIndex(nextActiveIndex(turnIndex, updated));
  };

  return (
    <Screen>
      <GameHud
        onExit={() => navigation.goBack()}
        centerContent={
          <View style={styles.titlePill}>
            <Text style={styles.title}>BOB'S 27</Text>
          </View>
        }
        dartsThisTurn={dartsThisTurn}
        rightAction={<HudUndoButton onPress={undo} disabled={history.current.length === 0} />}
      />

      <View style={styles.scoresRow}>
        {bobsPlayers.map((bp, i) => {
          const p = resolvePlayerDisplay(bp.playerId, playerMap, config.guestPlayers);
          const isActive = bp.playerId === activePlayerId;
          return (
            <Animated.View
              key={bp.playerId}
              entering={FadeInDown.delay(staggerDelay(i)).duration(260)}
              style={[styles.scoreCard, isActive && styles.scoreCardActive, bp.finished && styles.finishedCard]}
            >
              <PlayerAvatar name={p.name} color={p.color} avatar={p.avatar} photoUri={p.photoUri} size={24} active={isActive} />
              <Text style={[styles.scoreCardName, isActive && styles.scoreCardNameActive]} numberOfLines={1}>{p.name}</Text>
              <AnimatedScore
                value={bp.score}
                style={[
                  styles.scoreCardScore,
                  { color: bp.score < 0 ? colors.neonRed : isActive ? colors.textPrimary : colors.textDim },
                ]}
              />
            </Animated.View>
          );
        })}
      </View>

      <Animated.View entering={FadeInDown.delay(reducedMs(STAGGER_MS * 2)).duration(280)} style={styles.spotlight}>
        <Text style={styles.spotlightLabel}>{display.name.toUpperCase()} — ROUND {activeBobs.round} / {BOBS27_ROUNDS}</Text>
        <Text style={[styles.spotlightTarget, { color: colors.primaryHot }]}>D{activeBobs.round}</Text>
        <Text style={styles.hint}>Hit the double or lose {activeBobs.round * 2} points</Text>
      </Animated.View>

      <View style={styles.buttonGrid}>
        {/* haptic="none": throwDart delivers the weighted haptic. */}
        <SegmentButton label="HIT DOUBLE" onPress={() => throwDart(true)} size="lg" variant="accent" style={styles.gridBtn} haptic="none" />
        <SegmentButton label="MISS" onPress={() => throwDart(false)} size="lg" variant="danger" style={styles.gridBtn} haptic="none" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titlePill: {
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 12, color: colors.textSecondary, letterSpacing: 1 },
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
  finishedCard: {
    opacity: 0.5,
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
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  buttonGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gridBtn: {
    flex: 1,
  },
});
