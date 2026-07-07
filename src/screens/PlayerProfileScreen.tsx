import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale } from '../components/primitives/PressableScale';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { Screen } from '../components/Screen';
import { StatPill } from '../components/StatPill';
import { getGameModeInfo } from '../data/gameModes';
import { aggregateCareerStats } from '../logic/stats';
import { PlayersStackParamList } from '../navigation/types';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { colors, fonts, spacing } from '../theme';
import { STAGGER_MS } from '../theme/motion';
import { GameType, MatchRecord, Player } from '../types';

type Route = { params: { playerId: string } };

const X01_TYPES: GameType[] = ['501', '301', '201', 'practice170'];

export function PlayerProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PlayersStackParamList>>();
  const route = useRoute() as unknown as Route;
  const { playerId } = route.params;

  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([PlayerStorage.getAll(), MatchStorage.getAll()]).then(([players, m]) => {
        setPlayer(players.find((p) => p.id === playerId) ?? null);
        setMatches(m.filter((match) => match.results[playerId]));
      });
    }, [playerId])
  );

  const overall = useMemo(() => {
    const gamesPlayed = matches.length;
    const gamesWon = matches.filter((m) => m.winnerId === playerId).length;
    return {
      gamesPlayed,
      gamesWon,
      winRate: gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0,
    };
  }, [matches, playerId]);

  const typesPlayed = useMemo(() => {
    const set = new Set(matches.map((m) => m.gameType));
    return Array.from(set);
  }, [matches]);

  if (!player) return <Screen />;

  return (
    <Screen scroll>
      <Header
        title="Profile"
        onBack={() => navigation.goBack()}
        right={
          <PressableScale onPress={() => navigation.navigate('PlayerEdit', { playerId })} hitSlop={10} haptic="light" scaleTo={0.88} style={styles.editBtn}>
            <Icon name="edit" size={18} color={colors.textSecondary} />
          </PressableScale>
        }
      />

      <Animated.View entering={FadeInDown.duration(280)} style={styles.profileHeader}>
        <PlayerAvatar name={player.name} color={player.color} avatar={player.avatar} photoUri={player.photoUri} size={88} active />
        <Text style={styles.name}>{player.name}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_MS).duration(280)} style={styles.overallGrid}>
        <StatPill label="Games" value={overall.gamesPlayed} />
        <StatPill label="Wins" value={overall.gamesWon} accent={colors.primary} />
        <StatPill label="Win Rate" value={`${overall.winRate}%`} accent={colors.gold} />
      </Animated.View>

      {typesPlayed.length === 0 ? (
        <EmptyState icon="stats" title="No games played yet" />
      ) : (
        typesPlayed.map((type, i) => (
          <Animated.View key={type} entering={FadeInDown.delay(STAGGER_MS * (i + 2)).duration(280)}>
            <GameTypeStats playerId={playerId} matches={matches} gameType={type} />
          </Animated.View>
        ))
      )}

      <Text style={styles.sectionTitle}>RECENT MATCHES</Text>
      {matches
        .slice()
        .sort((a, b) => b.date - a.date)
        .slice(0, 10)
        .map((m, i) => {
          const modeInfo = getGameModeInfo(m.gameType);
          const won = m.winnerId === playerId;
          return (
            <Animated.View
              key={m.id}
              entering={FadeInDown.delay(Math.min(i, 8) * STAGGER_MS).duration(240)}
              style={styles.matchRow}
            >
              <Icon name={modeInfo.icon} size={16} color={modeInfo.color} />
              <Text style={styles.matchMode}>{modeInfo.title}</Text>
              <Text style={[styles.matchResult, { color: won ? colors.primary : colors.textMuted }]}>
                {won ? 'WIN' : 'LOSS'}
              </Text>
              <Text style={styles.matchDate}>{new Date(m.date).toLocaleDateString()}</Text>
            </Animated.View>
          );
        })}
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

function GameTypeStats({
  playerId,
  matches,
  gameType,
}: {
  playerId: string;
  matches: MatchRecord[];
  gameType: GameType;
}) {
  const modeInfo = getGameModeInfo(gameType);
  const career = aggregateCareerStats(matches, playerId, gameType);
  const isX01 = X01_TYPES.includes(gameType);
  const isCricket = gameType === 'cricket';

  const cricketAvgMpr = useMemo(() => {
    const relevant = matches.filter((m) => m.gameType === 'cricket' && m.results[playerId]);
    if (relevant.length === 0) return 0;
    const sum = relevant.reduce((s, m) => s + (m.results[playerId].marksPerRound ?? 0), 0);
    return sum / relevant.length;
  }, [matches, playerId]);

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={styles.modeHeader}>
        <Icon name={modeInfo.icon} size={16} color={modeInfo.color} />
        <Text style={styles.modeTitle}>{modeInfo.title}</Text>
        <Text style={styles.modeRecord}>
          {career.gamesWon}W - {career.gamesPlayed - career.gamesWon}L
        </Text>
      </View>

      {isX01 && (
        <>
          <View style={styles.statsGrid}>
            <StatPill label="3-Dart Avg" value={career.avgThreeDart.toFixed(1)} accent={colors.neonCyan} />
            <StatPill label="Checkout %" value={`${career.checkoutPercent.toFixed(0)}%`} />
            <StatPill label="Highest CO" value={career.highestCheckout || '—'} accent={colors.gold} />
            <StatPill label="180s" value={career.oneEighties} accent={colors.neonGreen} />
          </View>
          <View style={[styles.statsGrid, { marginTop: spacing.sm }]}>
            <StatPill label="100+" value={career.count100Plus} />
            <StatPill label="140+" value={career.count140Plus} />
            <StatPill label="Best Leg" value={career.bestLegDarts ?? '—'} accent={colors.gold} />
            <StatPill label="Win Rate" value={`${career.winRate.toFixed(0)}%`} />
          </View>
        </>
      )}
      {isCricket && (
        <View style={styles.statsGrid}>
          <StatPill label="Avg MPR" value={cricketAvgMpr.toFixed(2)} accent={colors.neonCyan} />
          <StatPill label="Best Turn" value={career.highestVisit} accent={colors.gold} />
          <StatPill label="Win Rate" value={`${career.winRate.toFixed(0)}%`} />
        </View>
      )}
      {!isX01 && !isCricket && (
        <View style={styles.statsGrid}>
          <StatPill label="Games" value={career.gamesPlayed} />
          <StatPill label="Win Rate" value={`${career.winRate.toFixed(0)}%`} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  overallGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  modeRecord: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  matchMode: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemibold,
    flex: 1,
  },
  matchResult: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
  },
  matchDate: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    width: 70,
    textAlign: 'right',
  },
});
