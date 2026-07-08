import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { Screen } from '../components/Screen';
import { StatPill } from '../components/StatPill';
import { getGameModeInfo } from '../data/gameModes';
import { StatsStackParamList } from '../navigation/types';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { MatchRecord, Player } from '../types';
import { resolvePlayerDisplayFromMatch } from '../utils/playerDisplay';

type Route = { params: { matchId: string } };

export function MatchDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StatsStackParamList>>();
  const route = useRoute() as unknown as Route;
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});

  useEffect(() => {
    Promise.all([MatchStorage.getAll(), PlayerStorage.getAll()])
      .then(([matches, all]) => {
        setMatch(matches.find((m) => m.id === route.params.matchId) ?? null);
        const map: Record<string, Player> = {};
        all.forEach((p) => (map[p.id] = p));
        setPlayers(map);
      })
      .catch((err) => {
        console.error('[MatchDetailScreen] Failed to load data:', err);
        setMatch(null);
        setPlayers({});
      });
  }, [route.params.matchId]);

  if (!match) return <Screen />;

  const modeInfo = getGameModeInfo(match.gameType);
  const isX01 = ['501', '301', '201', 'practice170'].includes(match.gameType);
  const isCricket = match.gameType === 'cricket';

  const deleteMatch = () => {
    Alert.alert('Delete match', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await MatchStorage.remove(match.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Header
        title={modeInfo.title}
        subtitle={new Date(match.date).toLocaleString()}
        onBack={() => navigation.goBack()}
      />

      {match.playerIds.map((id) => {
        const display = resolvePlayerDisplayFromMatch(id, players, match);
        const r = match.results[id];
        if (!r) return null;
        const isWinner = id === match.winnerId;
        return (
          <Card
            key={id}
            elevated={isWinner}
            style={[styles.playerCard, isWinner && { borderColor: display.color }]}
          >
            <View style={styles.playerHeader}>
              <PlayerAvatar name={display.name} color={display.color} avatar={display.avatar} photoUri={display.photoUri} size={36} />
              <Text style={styles.playerName}>{display.name}</Text>
              {isWinner && (
                <View style={[styles.winnerTagBox, { backgroundColor: display.color + '1F', borderColor: display.color }]}>
                  <Text style={[styles.winnerTag, { color: display.color }]}>WINNER</Text>
                </View>
              )}
            </View>

            {isX01 && (
              <View style={styles.statsGrid}>
                <StatPill label="3-Dart Avg" value={r.threeDartAvg.toFixed(1)} accent={colors.neonCyan} />
                <StatPill label="Highest CO" value={r.highestCheckout || '—'} accent={colors.gold} />
                <StatPill label="180s" value={r.oneEighties} accent={colors.neonGreen} />
                <StatPill label="Best Leg" value={r.bestLegDarts ?? '—'} />
              </View>
            )}
            {isCricket && (
              <View style={styles.statsGrid}>
                <StatPill label="MPR" value={r.marksPerRound ? r.marksPerRound.toFixed(2) : '—'} accent={colors.neonCyan} />
                <StatPill label="Points" value={r.totalScored} />
                <StatPill label="Darts" value={r.dartsThrown} />
              </View>
            )}
            {!isX01 && !isCricket && (
              <View style={styles.statsGrid}>
                <StatPill label="Darts" value={r.dartsThrown} />
                {(match.gameType === 'shanghai' || match.gameType === 'bobs27') && (
                  <StatPill label="Score" value={r.totalScored} accent={colors.neonCyan} />
                )}
              </View>
            )}
          </Card>
        );
      })}

      <Button label="DELETE MATCH" variant="danger" onPress={deleteMatch} style={{ marginTop: spacing.lg, marginBottom: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  playerCard: {
    marginBottom: spacing.md,
    borderWidth: 1.5,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  playerName: {
    ...typography.heading,
    color: colors.textPrimary,
    flex: 1,
  },
  winnerTagBox: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  winnerTag: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
