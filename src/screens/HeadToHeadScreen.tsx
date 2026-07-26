import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { PlayerPairChips } from '../components/PlayerPairChips';
import { CountUp } from '../components/primitives/CountUp';
import { PressableScale } from '../components/primitives/PressableScale';
import { Screen } from '../components/Screen';
import { StatPill } from '../components/StatPill';
import { getGameModeInfo } from '../data/gameModes';
import { computeHeadToHead, HeadToHeadResult } from '../logic/headToHead';
import { RootStackParamList } from '../navigation/types';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { PRESS_SCALE, STAGGER_MS } from '../theme/motion';
import { MatchRecord, Player } from '../types';
import { resolvePlayerDisplayFromMatch } from '../utils/playerDisplay';

const MAX_PICKED = 2;

export function HeadToHeadScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([PlayerStorage.getAll(), MatchStorage.getAll()])
        .then(([p, m]) => {
          setPlayers(p);
          setMatches(m);
        })
        .catch((err) => {
          console.error('[HeadToHeadScreen] Failed to load data:', err);
          setPlayers([]);
          setMatches([]);
        });
    }, [])
  );

  const togglePick = (id: string) => {
    setPickedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PICKED) return [prev[1], id];
      return [...prev, id];
    });
  };

  const playerA = players.find((p) => p.id === pickedIds[0]) ?? null;
  const playerB = players.find((p) => p.id === pickedIds[1]) ?? null;

  const h2h = useMemo<HeadToHeadResult | null>(() => {
    if (!playerA || !playerB) return null;
    return computeHeadToHead(matches, playerA.id, playerB.id);
  }, [matches, playerA, playerB]);

  if (players.length < 2) {
    return (
      <Screen>
        <Header title="Head to Head" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="users"
          title="Need two players"
          subtitle="Add another player to start comparing head-to-head records"
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title="Head to Head" subtitle="Compare two players' records" onBack={() => navigation.goBack()} />

      <Text style={styles.sectionTitle}>PICK TWO PLAYERS</Text>
      <View style={{ marginBottom: spacing.lg }}>
        <PlayerPairChips players={players} pickedIds={pickedIds} onToggle={togglePick} avatarSize={32} />
      </View>

      {!playerA || !playerB || !h2h ? (
        <View style={{ marginTop: spacing.xl }}>
          <EmptyState icon="users" title="Select two players" subtitle="Tap two players above to see their head-to-head record" />
        </View>
      ) : (
        <Comparison playerA={playerA} playerB={playerB} h2h={h2h} navigation={navigation} />
      )}

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

function Comparison({
  playerA,
  playerB,
  h2h,
  navigation,
}: {
  playerA: Player;
  playerB: Player;
  h2h: HeadToHeadResult;
  navigation: NativeStackNavigationProp<RootStackParamList>;
}) {
  const aLeadsRecord = h2h.aWins > h2h.bWins;
  const bLeadsRecord = h2h.bWins > h2h.aWins;

  return (
    <Animated.View entering={FadeInDown.duration(280)}>
      {/* Versus header */}
      <View style={styles.vsRow}>
        <View style={styles.vsSide}>
          <PlayerAvatar name={playerA.name} color={playerA.color} avatar={playerA.avatar} photoUri={playerA.photoUri} size={64} active />
          <Text style={styles.vsName} numberOfLines={1}>{playerA.name}</Text>
        </View>
        <Text style={styles.vsLabel}>VS</Text>
        <View style={styles.vsSide}>
          <PlayerAvatar name={playerB.name} color={playerB.color} avatar={playerB.avatar} photoUri={playerB.photoUri} size={64} active />
          <Text style={styles.vsName} numberOfLines={1}>{playerB.name}</Text>
        </View>
      </View>

      {h2h.totalMatches === 0 ? (
        <Card style={{ marginTop: spacing.lg }}>
          <EmptyState icon="dartboard" title="No matches yet" subtitle="These two haven't played each other" />
        </Card>
      ) : (
        <>
          {/* Overall record */}
          <Card style={styles.recordCard}>
            <Text style={styles.sectionTitle}>H2H RECORD</Text>
            <View style={styles.recordRow}>
              <CountUp
                value={h2h.aWins}
                style={[styles.recordValue, aLeadsRecord && { color: colors.primaryHot }]}
                delay={100}
              />
              <Text style={styles.recordDash}>—</Text>
              <CountUp
                value={h2h.bWins}
                style={[styles.recordValue, bLeadsRecord && { color: colors.primaryHot }]}
                delay={100}
              />
            </View>
            <Text style={styles.recordSub}>
              {h2h.totalMatches} match{h2h.totalMatches === 1 ? '' : 'es'} played
              {h2h.draws > 0 ? ` · ${h2h.draws} no result` : ''}
            </Text>
            {h2h.currentStreak.playerId && h2h.currentStreak.count > 1 && (
              <View style={styles.streakRow}>
                <Icon name="flame" size={13} color={colors.primaryHot} />
                <Text style={styles.streakText}>
                  {(h2h.currentStreak.playerId === playerA.id ? playerA.name : playerB.name)} on a{' '}
                  {h2h.currentStreak.count}-match streak
                </Text>
              </View>
            )}
          </Card>

          {/* X01 averages */}
          {(h2h.averages.aThreeDartAvg > 0 || h2h.averages.bThreeDartAvg > 0) && (
            <Card style={{ marginTop: spacing.md }}>
              <Text style={styles.sectionTitle}>X01 AVERAGES</Text>
              <StatCompareRow
                label="3-Dart Avg"
                aValue={h2h.averages.aThreeDartAvg}
                bValue={h2h.averages.bThreeDartAvg}
                format={(n) => n.toFixed(1)}
              />
              <StatCompareRow
                label="Checkout %"
                aValue={h2h.averages.aCheckoutPercent}
                bValue={h2h.averages.bCheckoutPercent}
                format={(n) => `${n.toFixed(0)}%`}
              />
              <StatCompareRow
                label="Highest Checkout"
                aValue={h2h.averages.aHighestCheckout}
                bValue={h2h.averages.bHighestCheckout}
                format={(n) => (n > 0 ? `${Math.round(n)}` : '—')}
              />
              <StatCompareRow
                label="180s"
                aValue={h2h.averages.aOneEighties}
                bValue={h2h.averages.bOneEighties}
                format={(n) => `${Math.round(n)}`}
                last
              />
            </Card>
          )}

          {/* Per-mode breakdown */}
          {h2h.modeBreakdown.length > 0 && (
            <Card style={{ marginTop: spacing.md }}>
              <Text style={styles.sectionTitle}>BY GAME MODE</Text>
              <View style={styles.modeGrid}>
                {h2h.modeBreakdown.map((mb) => {
                  const modeInfo = getGameModeInfo(mb.gameType);
                  return (
                    <StatPill
                      key={mb.gameType}
                      label={modeInfo.title}
                      value={`${mb.aWins}-${mb.bWins}`}
                    />
                  );
                })}
              </View>
            </Card>
          )}

          {/* Shared match history */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>MATCH HISTORY</Text>
          {h2h.sharedMatches.map((m, i) => {
            const modeInfo = getGameModeInfo(m.gameType);
            const playersMap: Record<string, Player> = { [playerA.id]: playerA, [playerB.id]: playerB };
            const winner = m.winnerId ? resolvePlayerDisplayFromMatch(m.winnerId, playersMap, m) : null;
            return (
              <Animated.View key={m.id} entering={FadeInDown.delay(Math.min(i, 8) * STAGGER_MS).duration(240)}>
                <PressableScale
                  scaleTo={PRESS_SCALE.row}
                  haptic="light"
                  onPress={() => navigation.navigate('MatchDetail', { matchId: m.id })}
                  style={styles.matchRow}
                >
                  <View style={[styles.iconCircle, { backgroundColor: modeInfo.color + '1F' }]}>
                    <Icon name={modeInfo.icon} size={16} color={modeInfo.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.matchMode}>{modeInfo.title}</Text>
                    <Text style={styles.matchDate}>{new Date(m.date).toLocaleDateString()}</Text>
                  </View>
                  {winner && (
                    <View style={styles.winnerRow}>
                      <Icon name="trophy" size={11} color={colors.primaryHot} />
                      <Text style={styles.winnerText}>{winner.name}</Text>
                    </View>
                  )}
                  <Icon name="chevronRight" size={16} color={colors.textFaint} />
                </PressableScale>
              </Animated.View>
            );
          })}
        </>
      )}
    </Animated.View>
  );
}

function StatCompareRow({
  label,
  aValue,
  bValue,
  format,
  last,
}: {
  label: string;
  aValue: number;
  bValue: number;
  format: (n: number) => string;
  last?: boolean;
}) {
  const aLeads = aValue > bValue;
  const bLeads = bValue > aValue;
  return (
    <View style={[styles.statRow, !last && styles.statRowDivider]}>
      <CountUp
        value={aValue}
        format={format}
        style={[styles.statValue, { textAlign: 'left' }, aLeads && { color: colors.primaryHot }]}
      />
      <Text style={styles.statLabel}>{label}</Text>
      <CountUp
        value={bValue}
        format={format}
        style={[styles.statValue, { textAlign: 'right' }, bLeads && { color: colors.primaryHot }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  vsSide: {
    alignItems: 'center',
    width: 100,
  },
  vsName: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  vsLabel: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.textFaint,
    letterSpacing: 1,
  },
  recordCard: {
    alignItems: 'center',
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recordValue: {
    fontFamily: fonts.display,
    fontSize: 56,
    color: colors.textPrimary,
  },
  recordDash: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.textFaint,
  },
  recordSub: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  streakText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.primaryHot,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  statRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textPrimary,
    width: 72,
  },
  statLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.edge,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchMode: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  matchDate: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: spacing.sm,
  },
  winnerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
