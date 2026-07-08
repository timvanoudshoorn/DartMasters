import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CircularProgress } from '../components/CircularProgress';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { CountUp } from '../components/primitives/CountUp';
import { PressableScale } from '../components/primitives/PressableScale';
import { Screen } from '../components/Screen';
import { PRESS_SCALE, STAGGER_MS } from '../theme/motion';
import { getGameModeInfo } from '../data/gameModes';
import { RootStackParamList } from '../navigation/types';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing } from '../theme';
import { MatchRecord, Player } from '../types';
import { computeHomeOverview } from '../utils/overview';
import { resolvePlayerDisplayFromMatch } from '../utils/playerDisplay';

export function StatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [playerList, setPlayerList] = useState<Player[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([MatchStorage.getAll(), PlayerStorage.getAll()])
        .then(([m, p]) => {
          setMatches(m);
          setPlayerList(p);
          const map: Record<string, Player> = {};
          p.forEach((pl) => (map[pl.id] = pl));
          setPlayers(map);
        })
        .catch((err) => {
          console.error('[StatsScreen] Failed to load data:', err);
          setMatches([]);
          setPlayerList([]);
          setPlayers({});
        });
    }, [])
  );

  const overview = useMemo(() => computeHomeOverview(playerList, matches), [playerList, matches]);

  return (
    <Screen scroll={matches.length > 0}>
      <Header title="Stats" subtitle={`${matches.length} matches played`} onBack={() => navigation.goBack()} />

      <View style={styles.overviewRow}>
        <View style={styles.overviewCard}>
          <Icon name="dartboard" size={20} color={colors.textMuted} />
          <CountUp value={overview.matches} delay={150} duration={600} style={styles.overviewValue} />
          <Text style={styles.overviewLabel}>MATCHES</Text>
        </View>
        <View style={styles.overviewCard}>
          <CircularProgress percent={overview.winRate} size={56} color={colors.success} label={`${overview.winRate}%`} />
          <Text style={[styles.overviewLabel, { marginTop: spacing.xs }]}>WIN RATE</Text>
        </View>
        <View style={styles.overviewCard}>
          <Icon name="flame" size={20} color={colors.primaryHot} />
          <CountUp value={overview.streak} delay={150} duration={600} style={styles.overviewValue} />
          <Text style={styles.overviewLabel}>STREAK</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>MATCH HISTORY</Text>
      {matches.length === 0 ? (
        <EmptyState
          icon="dartboard"
          title="No matches yet"
          subtitle="Finish a game to see it here"
          actionLabel="PLAY YOUR FIRST MATCH"
          onAction={() => navigation.navigate('ModeSelect')}
        />
      ) : (
        matches.map((m, i) => {
          const modeInfo = getGameModeInfo(m.gameType);
          const winner = m.winnerId ? resolvePlayerDisplayFromMatch(m.winnerId, players, m) : null;
          const names = m.playerIds.map((id) => resolvePlayerDisplayFromMatch(id, players, m).name).join(', ');
          return (
            <Animated.View key={m.id} entering={FadeInDown.delay(Math.min(i, 8) * STAGGER_MS).duration(260)}>
              <PressableScale
                scaleTo={PRESS_SCALE.row}
                haptic="light"
                onPress={() => navigation.navigate('MatchDetail', { matchId: m.id })}
                style={styles.row}
              >
                <View style={[styles.iconCircle, { backgroundColor: modeInfo.color + '1F' }]}>
                  <Icon name={modeInfo.icon} size={18} color={modeInfo.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeTitle}>{modeInfo.title}</Text>
                  <Text style={styles.players} numberOfLines={1}>{names}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {winner ? (
                    <View style={styles.winnerRow}>
                      <Icon name="trophy" size={12} color={colors.primaryHot} />
                      <Text style={styles.winnerText}>{winner.name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.winnerText}>—</Text>
                  )}
                  <Text style={styles.date}>{formatDate(m.date)}</Text>
                </View>
              </PressableScale>
            </Animated.View>
          );
        })
      )}
    </Screen>
  );
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  overviewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.edge,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  overviewValue: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.textPrimary,
  },
  overviewLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.edge,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  players: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  winnerText: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  date: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    marginTop: 2,
  },
});
