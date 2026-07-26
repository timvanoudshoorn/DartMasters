import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Confetti } from '../components/effects/Confetti';
import { Icon } from '../components/icons/Icon';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { CountUp } from '../components/primitives/CountUp';
import { Screen } from '../components/Screen';
import { getGameModeInfo } from '../data/gameModes';
import { recordMatchResult } from '../logic/tournament';
import { RematchConfig, RootStackParamList } from '../navigation/types';
import { haptic } from '../sound/haptics';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { PendingTournamentMatchStorage, TournamentStorage } from '../storage/tournament';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS, FONT } from '../theme/colors';
import { reducedMs } from '../theme/motion';
import { isReducedMotionEnabled } from '../theme/motionPreference';
import { GameConfig, MatchRecord, Player, Tournament, TournamentMatchContext } from '../types';
import { resolvePlayerDisplayFromMatch } from '../utils/playerDisplay';

/** Reconstructs a rematch prefill from a finished match. `MatchRecord` only
 * retains the guest/bot *identity* maps (name/color/avatar + which ids were
 * bots) via `guestIdentityMaps` — not the original per-guest `botDifficulty`
 * — so bot opponents are rebuilt at a fixed middle difficulty rather than
 * omitted outright; still fully editable on the setup screen afterward. */
function buildRematchConfig(match: MatchRecord): RematchConfig {
  const guestIds = Object.keys(match.guestNames ?? {});
  const guestPlayers: GameConfig['guestPlayers'] = guestIds.length
    ? Object.fromEntries(
        guestIds.map((id) => {
          const isBot = match.botPlayerIds?.includes(id) ?? false;
          return [
            id,
            {
              name: match.guestNames?.[id] ?? (isBot ? 'Bot' : 'Guest'),
              color: match.guestColors?.[id] ?? colors.primary,
              avatar: match.guestAvatars?.[id],
              isBot: isBot || undefined,
              botDifficulty: isBot ? 'intermediate' : undefined,
            },
          ];
        })
      )
    : undefined;

  return {
    playerIds: match.playerIds,
    guestPlayers,
    legsToWin: match.legsToWin,
    setsToWin: match.setsToWin,
    outMode: match.outMode ?? 'double',
    inMode: match.inMode ?? 'straight',
  };
}

type Route = { params: { matchId: string } };

// Reveal choreography (ms from mount): overline → trophy → name → stats → actions.
const REVEAL = {
  overline: 80,
  trophy: 280,
  name: 560,
  stats: 900,
  statStep: 110,
  actions: 1400,
};

export function GameSummaryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute() as unknown as Route;
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [tournamentResult, setTournamentResult] = useState<{
    context: TournamentMatchContext;
    tournament: Tournament;
  } | null>(null);

  useEffect(() => {
    Promise.all([MatchStorage.getAll(), PlayerStorage.getAll()])
      .then(([matches, all]) => {
        const found = matches.find((m) => m.id === route.params.matchId) ?? null;
        setMatch(found);
        const map: Record<string, Player> = {};
        all.forEach((p) => (map[p.id] = p));
        setPlayers(map);
      })
      .catch((err) => {
        console.error('[GameSummaryScreen] Failed to load data:', err);
        setMatch(null);
        setPlayers({});
      });
  }, [route.params.matchId]);

  // Architectural hook point: the per-mode game screens (X01GameScreen etc.)
  // finish a match and land here knowing nothing about tournaments — they
  // just call MatchStorage.save() and navigate with a matchId, same as
  // always. GameScreen (the dispatcher, which we do own) drops a pointer in
  // PendingTournamentMatchStorage before the match starts if it was launched
  // from a bracket; once the resulting match is loaded here with a winner,
  // we consume that pointer, advance the bracket, and persist it — without
  // ever touching per-mode game logic or screens.
  useEffect(() => {
    if (!match || !match.winnerId) return;
    let cancelled = false;
    PendingTournamentMatchStorage.get()
      .then(async (context) => {
        if (!context || cancelled) return;
        const tournament = await TournamentStorage.get(context.tournamentId);
        if (!tournament) {
          await PendingTournamentMatchStorage.clear();
          return;
        }
        const updated = recordMatchResult(
          tournament,
          context.roundIndex,
          context.matchupIndex,
          match.winnerId!,
          match.id
        );
        await TournamentStorage.save(updated);
        await PendingTournamentMatchStorage.clear();
        if (!cancelled) setTournamentResult({ context, tournament: updated });
      })
      .catch((err) => {
        console.error('[GameSummaryScreen] Failed to record tournament result:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [match?.id, match?.winnerId]);

  // Physical echo of the on-screen reveal: a thump as the trophy lands,
  // a success roll as the name slams in.
  useEffect(() => {
    if (!match?.winnerId) return;
    const t1 = setTimeout(() => haptic.heavy(), reducedMs(REVEAL.trophy) + 120);
    const t2 = setTimeout(() => haptic.success(), reducedMs(REVEAL.name) + 100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [match?.winnerId]);

  if (!match) return <Screen />;

  // Collapse the staged reveal choreography to near-instant under reduced
  // motion — read once per render, no subscription exists for this flag.
  const R = {
    overline: reducedMs(REVEAL.overline),
    trophy: reducedMs(REVEAL.trophy),
    name: reducedMs(REVEAL.name),
    stats: reducedMs(REVEAL.stats),
    statStep: reducedMs(REVEAL.statStep),
    actions: reducedMs(REVEAL.actions),
  };

  const modeInfo = getGameModeInfo(match.gameType);
  const isX01 = ['501', '301', '201', 'practice170'].includes(match.gameType);
  const isCricket = match.gameType === 'cricket';
  const winner = match.winnerId ? resolvePlayerDisplayFromMatch(match.winnerId, players, match) : null;

  // Winner's card leads the list; the rest follow in original order.
  const orderedIds = [...match.playerIds].sort((a, b) =>
    a === match.winnerId ? -1 : b === match.winnerId ? 1 : 0
  );

  return (
    <Screen scroll>
      <Confetti active={!!winner} />

      <View style={styles.header}>
        <Animated.Text entering={FadeIn.delay(R.overline).duration(reducedMs(400) || 1)} style={styles.modeLabel}>
          {modeInfo.title}
        </Animated.Text>

        {winner ? (
          <>
            <Animated.View
              entering={ZoomIn.delay(R.trophy).springify().damping(11).stiffness(180)}
              style={styles.heroWrap}
            >
              <PulseRing delay={R.trophy + reducedMs(200)} size={148} />
              <PulseRing delay={R.trophy + reducedMs(550)} size={148} />
              <PlayerAvatar
                name={winner.name}
                color={winner.color}
                avatar={winner.avatar}
                photoUri={winner.photoUri}
                size={104}
                active
              />
              <Animated.View
                entering={ZoomIn.delay(R.trophy + reducedMs(220)).springify().damping(9).stiffness(220)}
                style={styles.trophyBadge}
              >
                <Icon name="trophy" size={22} color={COLORS.text} />
              </Animated.View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(R.name).springify().damping(14)} style={styles.nameBlock}>
              <Text style={styles.championLabel}>CHAMPION</Text>
              <Text style={styles.winnerName}>{winner.name.toUpperCase()}</Text>
              <View style={styles.nameRule} />
            </Animated.View>
          </>
        ) : (
          // No winner means a genuine tie (Shanghai/Bob's/Halve It can end
          // level) — name the result instead of a vague "match complete".
          <Animated.View entering={FadeInDown.delay(R.trophy).duration(reducedMs(400) || 1)} style={styles.nameBlock}>
            <Text style={styles.championLabel}>TIED RESULT</Text>
            <Text style={styles.winnerName}>DRAW</Text>
            <View style={styles.nameRule} />
          </Animated.View>
        )}
      </View>

      {orderedIds.map((id, cardIndex) => {
        const display = resolvePlayerDisplayFromMatch(id, players, match);
        const r = match.results[id];
        if (!r) return null;
        const isWinner = id === match.winnerId;
        const delay = R.stats + cardIndex * R.statStep;
        return (
          <Animated.View key={id} entering={FadeInDown.delay(delay).springify().damping(16)}>
            <Card
              style={[styles.playerCard, isWinner ? styles.winnerCard : styles.loserCard]}
              elevated={isWinner}
            >
              <View style={styles.playerHeader}>
                <PlayerAvatar name={display.name} color={display.color} avatar={display.avatar} photoUri={display.photoUri} size={36} />
                <Text style={styles.playerName}>{display.name}</Text>
                {isWinner && (
                  <View style={styles.winnerTagBox}>
                    <Text style={styles.winnerTag}>WINNER</Text>
                  </View>
                )}
              </View>

              {isX01 && (
                <>
                  <View style={styles.statsGrid}>
                    <RevealStat label="3-Dart Avg" value={r.threeDartAvg} format={(n) => n.toFixed(1)} delay={delay} hot />
                    <RevealStat label="First 9" value={r.firstNineAvg || null} format={(n) => n.toFixed(1)} delay={delay} />
                    <RevealStat label="Highest CO" value={r.highestCheckout || null} delay={delay} hot />
                    <RevealStat label="Legs" value={r.legsWon} delay={delay} />
                  </View>
                  <View style={[styles.statsGrid, { marginTop: spacing.sm }]}>
                    <RevealStat label="180s" value={r.oneEighties} delay={delay} hot={r.oneEighties > 0} />
                    <RevealStat label="100+" value={r.count100Plus} delay={delay} />
                    <RevealStat
                      label="Checkout %"
                      value={r.checkoutAttempts > 0 ? Math.round((r.checkoutHits / r.checkoutAttempts) * 100) : null}
                      format={(n) => `${Math.round(n)}%`}
                      delay={delay}
                    />
                    <RevealStat label="Best Leg" value={r.bestLegDarts ?? null} delay={delay} />
                  </View>
                </>
              )}
              {isCricket && (
                <View style={styles.statsGrid}>
                  <RevealStat label="MPR" value={r.marksPerRound || null} format={(n) => n.toFixed(2)} delay={delay} hot />
                  <RevealStat label="Points" value={r.totalScored} delay={delay} />
                  <RevealStat label="Best Turn" value={r.highestVisit} delay={delay} hot />
                  <RevealStat label="Darts" value={r.dartsThrown} delay={delay} />
                </View>
              )}
              {!isX01 && !isCricket && (
                <View style={styles.statsGrid}>
                  <RevealStat label="Darts" value={r.dartsThrown} delay={delay} />
                  {(match.gameType === 'shanghai' || match.gameType === 'bobs27' || match.gameType === 'halveIt') && (
                    <RevealStat label="Score" value={r.totalScored} delay={delay} hot />
                  )}
                </View>
              )}
            </Card>
          </Animated.View>
        );
      })}

      <View style={{ height: spacing.lg }} />
      {/* Match is always fully decided on this screen, so "back to menu" is
          the primary action and "play again" is secondary — never the reverse.
          A tournament matchup swaps both for a single "back to bracket" action
          instead, since "play again" and "back to menu" don't make sense
          mid-tournament. */}
      <Animated.View entering={FadeInUp.delay(R.actions).springify().damping(16)}>
        {tournamentResult ? (
          <Button
            label={tournamentResult.tournament.status === 'completed' ? 'VIEW CHAMPION' : 'BACK TO BRACKET'}
            size="lg"
            fullWidth
            onPress={() =>
              navigation.replace('TournamentBracket', { tournamentId: tournamentResult.context.tournamentId })
            }
            style={{ marginBottom: spacing.xl }}
          />
        ) : (
          <>
            <Button
              label="BACK TO MENU"
              size="lg"
              fullWidth
              onPress={() => navigation.popToTop()}
              style={{ marginBottom: spacing.md }}
            />
            <Button
              label="PLAY AGAIN"
              size="lg"
              variant="outline"
              fullWidth
              onPress={() => navigation.replace('GameSetup', { gameType: match.gameType, rematch: buildRematchConfig(match) })}
              style={{ marginBottom: spacing.xl }}
            />
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

/** Stat cell whose number counts up as its card lands. */
function RevealStat({
  label,
  value,
  format,
  delay,
  hot,
}: {
  label: string;
  value: number | null;
  format?: (n: number) => string;
  delay: number;
  hot?: boolean;
}) {
  return (
    <View style={[styles.statCell, hot && value !== null ? styles.statCellHot : null]}>
      {value === null ? (
        <Text style={[styles.statValue, { color: colors.textFaint }]}>—</Text>
      ) : (
        <CountUp
          value={value}
          delay={delay + reducedMs(150)}
          duration={reducedMs(650) || 150}
          format={format}
          style={[styles.statValue, hot ? { color: COLORS.accentHot } : null]}
        />
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Hairline ring that expands and fades behind the winner's avatar. */
function PulseRing({ delay, size }: { delay: number; size: number }) {
  const progress = useSharedValue(0);
  const reduced = isReducedMotionEnabled();

  useEffect(() => {
    if (reduced) return; // pure decoration, no information conveyed
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 1600 }), withTiming(0, { duration: 0 })),
        3
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.5,
    transform: [{ scale: 0.8 + progress.value * 0.7 }],
  }));

  if (reduced) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  modeLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    letterSpacing: 3,
    marginBottom: spacing.xl,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  pulseRing: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 1.5,
    borderColor: COLORS.accentHot,
  },
  trophyBadge: {
    position: 'absolute',
    bottom: -8,
    right: -10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  nameBlock: {
    alignItems: 'center',
  },
  championLabel: {
    fontFamily: FONT.ui,
    fontSize: 11,
    color: COLORS.accentHot,
    letterSpacing: 5,
    marginBottom: 4,
  },
  winnerName: {
    fontFamily: FONT.score,
    fontSize: 52,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  nameRule: {
    width: 56,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: spacing.sm,
  },
  playerCard: {
    marginBottom: spacing.md,
  },
  winnerCard: {
    borderColor: COLORS.accentBorder,
  },
  loserCard: {
    opacity: 0.82,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  playerName: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 17,
    color: colors.textPrimary,
    flex: 1,
  },
  winnerTagBox: {
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    backgroundColor: COLORS.accentDim,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  winnerTag: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 10,
    letterSpacing: 1,
    color: COLORS.accentHot,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCell: {
    backgroundColor: COLORS.card2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    flex: 1,
  },
  statCellHot: {
    borderColor: 'rgba(193,54,32,0.3)',
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.textPrimary,
  },
  statLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 8.5,
    color: colors.textMuted,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
});
