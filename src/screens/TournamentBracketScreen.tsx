import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Confetti } from '../components/effects/Confetti';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { Screen } from '../components/Screen';
import { findNextPlayableMatchup } from '../logic/tournament';
import { RootStackParamList } from '../navigation/types';
import { PlayerStorage } from '../storage/storage';
import { TournamentStorage } from '../storage/tournament';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS, FONT } from '../theme/colors';
import { staggerDelay } from '../theme/motion';
import { GameConfig, Player, Tournament, TournamentMatchup } from '../types';
import { PlayerDisplay, resolvePlayerDisplay } from '../utils/playerDisplay';

type Route = { params: { tournamentId: string } };

export function TournamentBracketScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute() as unknown as Route;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});

  useFocusEffect(
    useCallback(() => {
      Promise.all([TournamentStorage.get(route.params.tournamentId), PlayerStorage.getAll()])
        .then(([t, all]) => {
          setTournament(t);
          const map: Record<string, Player> = {};
          all.forEach((p) => (map[p.id] = p));
          setPlayers(map);
        })
        .catch((err) => {
          console.error('[TournamentBracketScreen] Failed to load tournament:', err);
        });
    }, [route.params.tournamentId])
  );

  if (!tournament) return <Screen />;

  const display = (id: string | null): PlayerDisplay | null =>
    id ? resolvePlayerDisplay(id, players, tournament.guestPlayers) : null;

  const next = findNextPlayableMatchup(tournament);
  const isComplete = tournament.status === 'completed';
  const champion = isComplete && tournament.winnerId ? display(tournament.winnerId) : null;

  const playMatchup = (roundIndex: number, matchupIndex: number) => {
    const matchup = tournament.rounds[roundIndex].matchups[matchupIndex];
    if (!matchup.playerAId || !matchup.playerBId) return;

    const config: GameConfig = {
      ...tournament.formatConfig,
      playerIds: [matchup.playerAId, matchup.playerBId],
      guestPlayers: tournament.guestPlayers,
    };

    navigation.navigate('Game', {
      config,
      tournamentContext: { tournamentId: tournament.id, roundIndex, matchupIndex },
    });
  };

  return (
    <Screen scroll>
      <Header
        title={tournament.name}
        subtitle={
          isComplete
            ? 'Tournament complete'
            : `Round ${(next?.roundIndex ?? tournament.rounds.length - 1) + 1} of ${tournament.rounds.length}`
        }
        onBack={() => navigation.popToTop()}
      />

      <Confetti active={!!champion} />

      {champion && (
        <Animated.View entering={ZoomIn.springify().damping(11).stiffness(180)} style={styles.championWrap}>
          <View style={styles.championAvatarWrap}>
            <PlayerAvatar
              name={champion.name}
              color={champion.color}
              avatar={champion.avatar}
              photoUri={champion.photoUri}
              size={96}
              active
            />
            <View style={styles.championBadge}>
              <Icon name="trophy" size={20} color={COLORS.text} />
            </View>
          </View>
          <Text style={styles.championLabel}>TOURNAMENT CHAMPION</Text>
          <Text style={styles.championName}>{champion.name.toUpperCase()}</Text>
        </Animated.View>
      )}

      {tournament.rounds.map((round, ri) => (
        <View key={round.roundIndex} style={styles.roundBlock}>
          <Text style={styles.roundLabel}>{roundLabel(ri, tournament.rounds.length)}</Text>
          {round.matchups.map((matchup, mi) => {
            const isNext = !!next && next.roundIndex === ri && next.matchupIndex === mi;
            return (
              <Animated.View
                key={matchup.id}
                entering={FadeInDown.delay(staggerDelay(ri * round.matchups.length + mi, 40)).duration(240)}
              >
                <MatchupCard matchup={matchup} display={display}>
                  {isNext && (
                    <Button
                      label="PLAY MATCH"
                      size="sm"
                      fullWidth
                      onPress={() => playMatchup(ri, mi)}
                      style={{ marginTop: spacing.md }}
                    />
                  )}
                </MatchupCard>
              </Animated.View>
            );
          })}
        </View>
      ))}

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

function roundLabel(roundIndex: number, roundCount: number): string {
  const fromEnd = roundCount - 1 - roundIndex;
  if (fromEnd === 0) return 'FINAL';
  if (fromEnd === 1) return 'SEMIFINAL';
  if (fromEnd === 2) return 'QUARTERFINAL';
  return `ROUND ${roundIndex + 1}`;
}

function MatchupCard({
  matchup,
  display,
  children,
}: {
  matchup: TournamentMatchup;
  display: (id: string | null) => PlayerDisplay | null;
  children?: React.ReactNode;
}) {
  const a = display(matchup.playerAId);
  const b = display(matchup.playerBId);
  const decided = !!matchup.winnerId;
  return (
    <Card style={[styles.matchupCard, decided && !matchup.isBye ? styles.matchupCardDecided : null]}>
      <MatchupSide display={a} isWinner={decided && matchup.winnerId === matchup.playerAId} />
      <View style={styles.vsRow}>
        <View style={styles.vsLine} />
        <Text style={styles.vsText}>{matchup.isBye ? 'BYE' : 'VS'}</Text>
        <View style={styles.vsLine} />
      </View>
      <MatchupSide display={b} isWinner={decided && matchup.winnerId === matchup.playerBId} />
      {children}
    </Card>
  );
}

function MatchupSide({ display, isWinner }: { display: PlayerDisplay | null; isWinner: boolean }) {
  if (!display) {
    return (
      <View style={styles.sideRow}>
        <View style={styles.tbdCircle} />
        <Text style={styles.tbdText}>TBD</Text>
      </View>
    );
  }
  return (
    <View style={styles.sideRow}>
      <PlayerAvatar name={display.name} color={display.color} avatar={display.avatar} photoUri={display.photoUri} size={30} active={isWinner} />
      <Text style={[styles.sideName, isWinner && styles.sideNameWinner]} numberOfLines={1}>
        {display.name}
      </Text>
      {isWinner && <Icon name="checkmark" size={14} color={COLORS.accentHot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  championWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  championAvatarWrap: {
    position: 'relative',
  },
  championBadge: {
    position: 'absolute',
    bottom: -6,
    right: -8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  championLabel: {
    fontFamily: FONT.ui,
    fontSize: 11,
    color: COLORS.accentHot,
    letterSpacing: 4,
    marginTop: spacing.lg,
  },
  championName: {
    fontFamily: FONT.score,
    fontSize: 40,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  roundBlock: {
    marginBottom: spacing.lg,
  },
  roundLabel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  matchupCard: {
    marginBottom: spacing.sm,
  },
  matchupCardDecided: {
    borderColor: COLORS.accentBorder,
  },
  sideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sideName: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  sideNameWinner: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyExtraBold,
  },
  tbdCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  tbdText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textFaint,
    letterSpacing: 1,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  vsLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  vsText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textFaint,
  },
});
