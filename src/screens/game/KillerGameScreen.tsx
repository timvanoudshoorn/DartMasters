import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { BotThinkingBadge } from '../../components/BotThinkingBadge';
import { Icon } from '../../components/icons/Icon';
import { LifeDots } from '../../components/LifeDots';
import { MultiplierSelector } from '../../components/MultiplierSelector';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { PressableScale } from '../../components/primitives/PressableScale';
import { Screen } from '../../components/Screen';
import { SegmentButton } from '../../components/SegmentButton';
import { COLORS } from '../../theme/colors';
import { BOT_PROFILES, decideKillerClaim, decideKillerThrow } from '../../logic/bot';
import {
  applyKillerThrow,
  claimNumber,
  createKillerPlayers,
  getKillerWinner,
} from '../../logic/killer';
import { RootStackParamList } from '../../navigation/types';
import { MatchStorage, PlayerStorage } from '../../storage/storage';
import { useSoundEffects } from '../../sound/useSoundEffects';
import { colors, fonts, radius, spacing } from '../../theme';
import { STAGGER_MS } from '../../theme/motion';
import { GameConfig, KillerPlayerState, MatchRecord, Multiplier, Player } from '../../types';
import { generateId } from '../../utils/id';
import { PlayerDisplay, resolvePlayerDisplay } from '../../utils/playerDisplay';

interface Props {
  config: GameConfig;
}

type Phase = 'claim' | 'bullOff' | 'play';

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

function rotate<T>(arr: T[], startIndex: number): T[] {
  return [...arr.slice(startIndex), ...arr.slice(0, startIndex)];
}

// Players forget which of the 4 Killer phases they're in mid-game — this banner
// is shown below the top bar on every phase so it's always visible.
function phaseBannerInfo(phase: Phase, isKillerNow: boolean): { label: string; desc: string } {
  if (phase === 'claim') return { label: 'CLAIM', desc: 'Throw with your weak hand' };
  if (phase === 'bullOff') return { label: 'BULL OFF', desc: 'Determine attack order' };
  return isKillerNow
    ? { label: 'KILL', desc: "Hit opponents' numbers" }
    : { label: 'BUILD LIVES', desc: 'Hit your own number' };
}

function PhaseBanner({ phase, isKillerNow }: { phase: Phase; isKillerNow: boolean }) {
  const info = phaseBannerInfo(phase, isKillerNow);
  return (
    <View style={styles.phaseBanner}>
      <Text style={styles.phaseBannerLabel}>{info.label}</Text>
      <Text style={styles.phaseBannerDesc}>{info.desc}</Text>
    </View>
  );
}

export function KillerGameScreen({ config }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const maxLives = config.livesPerPlayer ?? 5;
  const [players, setPlayers] = useState<Player[]>([]);
  const [killerPlayers, setKillerPlayers] = useState<KillerPlayerState[]>(() =>
    createKillerPlayers(config.playerIds)
  );

  const [phase, setPhase] = useState<Phase>('claim');
  const [claimIndex, setClaimIndex] = useState(0);

  const [order, setOrder] = useState<string[]>(config.playerIds);
  const [turnIndex, setTurnIndex] = useState(0);
  const [dartsThisTurn, setDartsThisTurn] = useState(0);
  const [multiplier, setMultiplier] = useState<Multiplier>(1);
  const [dartsThrown, setDartsThrown] = useState<Record<string, number>>(
    Object.fromEntries(config.playerIds.map((id) => [id, 0]))
  );
  const [eliminationsByPlayer, setEliminationsByPlayer] = useState<Record<string, number>>(
    Object.fromEntries(config.playerIds.map((id) => [id, 0]))
  );
  const [everKillerIds, setEverKillerIds] = useState<string[]>([]);
  const [botThinking, setBotThinking] = useState(false);
  const playSfx = useSoundEffects();
  const isBot = (playerId: string) => !!config.guestPlayers?.[playerId]?.isBot;

  React.useEffect(() => {
    PlayerStorage.getAll()
      .then(setPlayers)
      .catch((err) => {
        console.error('[KillerGameScreen] Failed to load players:', err);
        setPlayers([]);
      });
  }, []);

  const playerMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => (map[p.id] = p));
    return map;
  }, [players]);

  const display = (playerId: string): PlayerDisplay =>
    resolvePlayerDisplay(playerId, playerMap, config.guestPlayers);

  const activePlayerId = order[turnIndex];
  const activeKiller = killerPlayers.find((p) => p.playerId === activePlayerId);

  const finalizeMatch = (
    winnerId: string,
    finalDarts: Record<string, number>,
    finalEliminations: Record<string, number>,
    finalEverKillerIds: string[]
  ) => {
    const results: MatchRecord['results'] = {};
    config.playerIds.forEach((id) => {
      results[id] = {
        playerId: id,
        legsWon: id === winnerId ? 1 : 0,
        setsWon: 0,
        dartsThrown: finalDarts[id],
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
        eliminationsCount: finalEliminations[id] ?? 0,
      };
    });
    const record: MatchRecord = {
      id: generateId(),
      gameType: 'killer',
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
      killerEverPlayerIds: finalEverKillerIds,
    };
    playSfx('win');
    MatchStorage.save(record)
      .then(() => navigation.replace('GameSummary', { matchId: record.id }))
      .catch((err) => {
        console.error('[KillerGameScreen] Failed to save match:', err);
        navigation.replace('GameSummary', { matchId: record.id });
      });
  };

  // ---------- Phase 1: claim your number ----------

  const claimingPlayerId = config.playerIds[claimIndex];

  const claimTap = (n: number) => {
    const result = claimNumber(killerPlayers, claimingPlayerId, n);
    if (result.collision) {
      const ownerId = result.players.find((p) => p.number === n)!.playerId;
      Alert.alert('Number Taken', `#${n} is already claimed by ${display(ownerId).name}. Throw again!`);
      return;
    }
    setKillerPlayers(result.players);
    playSfx('dartScored');
    if (claimIndex + 1 >= config.playerIds.length) {
      setPhase('bullOff');
    } else {
      setClaimIndex(claimIndex + 1);
    }
  };

  React.useEffect(() => {
    if (phase !== 'claim' || !isBot(claimingPlayerId)) return;
    setBotThinking(true);
    const timer = setTimeout(() => {
      setBotThinking(false);
      const unclaimed = NUMBERS.filter((n) => !killerPlayers.some((p) => p.number === n));
      claimTap(decideKillerClaim(unclaimed));
    }, 800 + Math.random() * 700);
    return () => {
      clearTimeout(timer);
      setBotThinking(false);
    };
  }, [phase, claimIndex]);

  // ---------- Phase 2: bull off ----------

  const winBullOff = (winnerId: string) => {
    setOrder(rotate(config.playerIds, config.playerIds.indexOf(winnerId)));
    setTurnIndex(0);
    setPhase('play');
  };

  // ---------- Phase 3/4: claiming lives & killer attacks ----------

  const nextActiveIndex = (from: number, list: KillerPlayerState[]): number => {
    let idx = from;
    for (let i = 0; i < order.length; i++) {
      idx = (idx + 1) % order.length;
      if (!list.find((p) => p.playerId === order[idx])?.eliminated) return idx;
    }
    return from;
  };

  const throwAt = (hitPlayerId: string | null, overrideMultiplier?: Multiplier) => {
    if (hitPlayerId === null) playSfx('miss');
    const hitNumber = hitPlayerId ? killerPlayers.find((p) => p.playerId === hitPlayerId)!.number : null;
    const updated = applyKillerThrow(killerPlayers, activePlayerId, hitNumber, overrideMultiplier ?? multiplier, maxLives);

    const prevActive = killerPlayers.find((p) => p.playerId === activePlayerId);
    const newActive = updated.find((p) => p.playerId === activePlayerId);
    const becameKiller = !prevActive?.isKiller && newActive?.isKiller;
    const owner = hitNumber !== null ? killerPlayers.find((p) => p.number === hitNumber) : undefined;
    const eliminatedSomeone =
      !!owner &&
      owner.playerId !== activePlayerId &&
      !owner.eliminated &&
      updated.find((p) => p.playerId === owner.playerId)?.eliminated;

    if (becameKiller) playSfx('becomeKiller');
    else if (eliminatedSomeone) playSfx('killerEliminated');
    else if (hitPlayerId !== null) playSfx('dartScored');

    setKillerPlayers(updated);

    const newDartsThrown = { ...dartsThrown, [activePlayerId]: dartsThrown[activePlayerId] + 1 };
    setDartsThrown(newDartsThrown);

    const newEliminations = eliminatedSomeone
      ? { ...eliminationsByPlayer, [activePlayerId]: eliminationsByPlayer[activePlayerId] + 1 }
      : eliminationsByPlayer;
    if (eliminatedSomeone) setEliminationsByPlayer(newEliminations);

    const newEverKillerIds =
      becameKiller && !everKillerIds.includes(activePlayerId) ? [...everKillerIds, activePlayerId] : everKillerIds;
    if (newEverKillerIds !== everKillerIds) setEverKillerIds(newEverKillerIds);

    const winnerId = getKillerWinner(updated);
    if (winnerId) {
      finalizeMatch(winnerId, newDartsThrown, newEliminations, newEverKillerIds);
      return;
    }

    const newDarts = dartsThisTurn + 1;
    if (newDarts >= 3) {
      setTurnIndex(nextActiveIndex(turnIndex, updated));
      setDartsThisTurn(0);
    } else {
      setDartsThisTurn(newDarts);
    }
  };

  React.useEffect(() => {
    if (phase !== 'play' || !activeKiller || !isBot(activePlayerId)) return;
    setBotThinking(true);
    const difficulty = config.guestPlayers?.[activePlayerId]?.botDifficulty ?? 'intermediate';
    const timer = setTimeout(() => {
      setBotThinking(false);
      const decision = decideKillerThrow(activeKiller, killerPlayers, BOT_PROFILES[difficulty]);
      throwAt(decision.hitPlayerId, decision.multiplier);
    }, 1000 + Math.random() * 1000);
    return () => {
      clearTimeout(timer);
      setBotThinking(false);
    };
  }, [phase, activePlayerId, dartsThisTurn]);

  // ---------- Render ----------

  if (phase === 'claim') {
    return (
      <Screen scroll>
        <View style={styles.topBar}>
          <PressableScale onPress={() => navigation.goBack()} hitSlop={10} haptic="light" scaleTo={0.88} style={styles.exitBtn}>
            <Icon name="close" size={16} color={colors.textMuted} />
          </PressableScale>
          <View style={styles.titlePill}>
            <Icon name="skull" size={14} color="#9B6BFF" />
            <Text style={styles.title}>KILLER</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <PhaseBanner phase="claim" isKillerNow={false} />

        <Text style={styles.phaseTitle}>Claim Your Number</Text>
        <Text style={styles.phaseSubtitle}>Throw with your offhand to claim your number</Text>

        <View style={styles.claimingBanner}>
          <PlayerAvatar
            name={display(claimingPlayerId).name}
            color={display(claimingPlayerId).color}
            avatar={display(claimingPlayerId).avatar}
            photoUri={display(claimingPlayerId).photoUri}
            size={36}
            active
          />
          <Text style={styles.claimingName}>{display(claimingPlayerId).name}'s throw</Text>
        </View>

        {botThinking && <BotThinkingBadge />}

        <View style={styles.claimedRow}>
          {config.playerIds.map((id, i) => {
            const kp = killerPlayers.find((p) => p.playerId === id)!;
            const claimed = kp.number !== 0;
            return (
              <Animated.View
                key={id}
                entering={FadeInDown.delay(i * STAGGER_MS).duration(240)}
                style={[styles.claimedChip, claimed && { borderColor: display(id).color }]}
              >
                <Text style={styles.claimedChipName} numberOfLines={1}>
                  {display(id).name}
                </Text>
                <Text style={[styles.claimedChipNumber, claimed && { color: display(id).color }]}>
                  {claimed ? `#${kp.number}` : '—'}
                </Text>
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.claimGrid}>
          {NUMBERS.map((n) => {
            const owner = killerPlayers.find((p) => p.number === n);
            const ownerDisplay = owner ? display(owner.playerId) : null;
            return (
              <PressableScale
                key={n}
                onPress={() => claimTap(n)}
                disabled={isBot(claimingPlayerId)}
                haptic="tick"
                scaleTo={0.92}
                style={[
                  styles.claimTile,
                  ownerDisplay && { borderColor: ownerDisplay.color, backgroundColor: ownerDisplay.color + '14' },
                ]}
              >
                <Text style={[styles.claimTileNumber, ownerDisplay && { color: ownerDisplay.color }]}>{n}</Text>
                {ownerDisplay && (
                  <Text style={styles.claimTileOwner} numberOfLines={1}>
                    {ownerDisplay.name}
                  </Text>
                )}
              </PressableScale>
            );
          })}
        </View>
      </Screen>
    );
  }

  if (phase === 'bullOff') {
    return (
      <Screen scroll>
        <View style={styles.topBar}>
          <PressableScale onPress={() => navigation.goBack()} hitSlop={10} haptic="light" scaleTo={0.88} style={styles.exitBtn}>
            <Icon name="close" size={16} color={colors.textMuted} />
          </PressableScale>
          <View style={styles.titlePill}>
            <Icon name="skull" size={14} color="#9B6BFF" />
            <Text style={styles.title}>KILLER</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
        <PhaseBanner phase="bullOff" isKillerNow={false} />

        <Text style={styles.phaseTitle}>Bull Off</Text>
        <Text style={styles.phaseSubtitle}>Throw for the bull to decide who starts</Text>

        {config.playerIds.map((id) => {
          const d = display(id);
          return (
            <View key={id} style={styles.bullOffRow}>
              <PlayerAvatar name={d.name} color={d.color} avatar={d.avatar} photoUri={d.photoUri} size={32} />
              <Text style={styles.bullOffName} numberOfLines={1}>
                {d.name}
              </Text>
              <PressableScale style={styles.bullOffBtn} onPress={() => winBullOff(id)} haptic="medium" scaleTo={0.94}>
                <Text style={styles.bullOffBtnText}>CLOSEST TO BULL</Text>
              </PressableScale>
            </View>
          );
        })}
      </Screen>
    );
  }

  if (!activeKiller) return null;

  return (
    <Screen>
      <View style={styles.topBar}>
        <PressableScale onPress={() => navigation.goBack()} hitSlop={10} haptic="light" scaleTo={0.88} style={styles.exitBtn}>
          <Icon name="close" size={16} color={colors.textMuted} />
        </PressableScale>
        <View style={styles.titlePill}>
          <Icon name="skull" size={14} color="#9B6BFF" />
          <Text style={styles.title}>KILLER</Text>
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
      <PhaseBanner phase="play" isKillerNow={!!activeKiller.isKiller} />

      <View style={styles.activeBanner}>
        <Text style={styles.activeLabel}>{display(activePlayerId).name.toUpperCase()}'S TURN</Text>
        <Text style={styles.needsDoubleHint}>
          {activeKiller.isKiller
            ? "You're a KILLER — attack opponents' numbers!"
            : 'Hit your own number to build lives (S=+1 D=+2 T=+3)'}
        </Text>
      </View>

      {botThinking && <BotThinkingBadge />}

      <View style={styles.playersGrid}>
        {killerPlayers.map((kp, i) => {
          const d = display(kp.playerId);
          const isActive = kp.playerId === activePlayerId;
          return (
            <Animated.View
              key={kp.playerId}
              entering={FadeInDown.delay(i * STAGGER_MS).duration(260)}
              style={{ width: '47%', flexGrow: 1 }}
            >
              <PressableScale
                disabled={kp.eliminated || isBot(activePlayerId)}
                onPress={() => throwAt(kp.playerId)}
                haptic="none"
                scaleTo={0.94}
              >
              <View
                style={[
                  styles.playerTile,
                  isActive && { borderColor: colors.accent, backgroundColor: colors.bgCardAlt },
                  kp.eliminated && styles.eliminatedTile,
                ]}
              >
                <PlayerAvatar name={d.name} color={d.color} avatar={d.avatar} photoUri={d.photoUri} size={36} active={isActive} />
                <Text style={[styles.tileName, isActive && { color: colors.primaryHot }]} numberOfLines={1}>{d.name}</Text>
                <Text style={[styles.tileNumber, { color: d.color }]}>
                  #{kp.number}
                </Text>
                <View style={styles.livesRow}>
                  <LifeDots lives={kp.lives} maxLives={maxLives} />
                </View>
                {kp.isKiller && !kp.eliminated && <Text style={styles.killerBadge}>KILLER</Text>}
                {kp.eliminated && <Text style={styles.eliminatedText}>OUT</Text>}
              </View>
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <MultiplierSelector value={multiplier} onChange={setMultiplier} disabled={isBot(activePlayerId)} />
      </View>

      <SegmentButton
        label="MISS"
        onPress={() => throwAt(null)}
        disabled={isBot(activePlayerId)}
        variant="danger"
        size="lg"
        soundTrigger="miss"
        style={{ marginTop: spacing.md }}
      />

      <Text style={styles.helpText}>Tap a player's tile to throw at their number</Text>
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
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontFamily: fonts.bodyExtraBold, fontSize: 12, color: colors.textSecondary, letterSpacing: 1.5 },
  phaseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  phaseBannerLabel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1,
  },
  phaseBannerDesc: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
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
  phaseTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  phaseSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  claimingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  claimingName: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  claimedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  claimedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgCardAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  claimedChipName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.textSecondary,
    maxWidth: 90,
  },
  claimedChipNumber: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  claimGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingBottom: spacing.xl,
  },
  claimTile: {
    width: '18%',
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  claimTileNumber: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  claimTileOwner: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 2,
    maxWidth: '100%',
  },
  bullOffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bullOffName: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  bullOffBtn: {
    backgroundColor: colors.primary + '1F',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bullOffBtnText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.4,
  },
  activeBanner: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  activeLabel: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyExtraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  needsDoubleHint: {
    color: colors.warning,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  playerTile: {
    backgroundColor: COLORS.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderTopColor: COLORS.edge,
    padding: spacing.md,
    alignItems: 'center',
  },
  eliminatedTile: {
    opacity: 0.35,
  },
  tileName: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyBold,
    marginTop: spacing.xs,
  },
  tileNumber: {
    fontFamily: fonts.display,
    fontSize: 36,
    marginVertical: spacing.xs,
  },
  livesRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  killerBadge: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  eliminatedText: {
    marginTop: spacing.xs,
    color: colors.danger,
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  helpText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: spacing.lg,
  },
});
