import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TrendLineChart } from '../components/charts/TrendLineChart';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { PressableScale } from '../components/primitives/PressableScale';
import { Screen } from '../components/Screen';
import { StatPill } from '../components/StatPill';
import { computePlayerTrend } from '../logic/trends';
import { RootStackParamList } from '../navigation/types';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';
import { STAGGER_MS } from '../theme/motion';
import { MatchRecord, Player } from '../types';

export function StatsTrendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([PlayerStorage.getAll(), MatchStorage.getAll()])
        .then(([p, m]) => {
          setPlayers(p);
          setMatches(m);
          setSelectedId((prev) => (prev && p.some((pl) => pl.id === prev) ? prev : p[0]?.id ?? null));
        })
        .catch((err) => {
          console.error('[StatsTrendsScreen] Failed to load data:', err);
          setPlayers([]);
          setMatches([]);
        });
    }, [])
  );

  const playerMatches = useMemo(
    () => (selectedId ? matches.filter((m) => m.results[selectedId]) : []),
    [matches, selectedId]
  );

  const trend = useMemo(
    () => (selectedId ? computePlayerTrend(playerMatches, selectedId) : null),
    [playerMatches, selectedId]
  );

  const chartData = useMemo(
    () =>
      trend?.points.map((p) => ({
        x: p.date,
        y: p.threeDartAvg,
        label: formatDate(p.date),
      })) ?? [],
    [trend]
  );

  const trendIcon = trend?.direction === 'improving' ? 'trendUp' : trend?.direction === 'declining' ? 'trendDown' : 'trendFlat';
  const trendColor =
    trend?.direction === 'improving' ? colors.success : trend?.direction === 'declining' ? colors.danger : colors.textMuted;

  return (
    <Screen scroll>
      <Header title="Trends" subtitle="3-dart average over time" onBack={() => navigation.goBack()} />

      {players.length === 0 ? (
        <EmptyState icon="stats" title="No players yet" subtitle="Add a player to track their trends" />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pickerRow}
          >
            {players.map((p) => {
              const active = p.id === selectedId;
              return (
                <PressableScale
                  key={p.id}
                  onPress={() => setSelectedId(p.id)}
                  scaleTo={0.94}
                  haptic="tick"
                  style={[styles.pickerChip, active && styles.pickerChipActive]}
                >
                  <PlayerAvatar name={p.name} color={p.color} avatar={p.avatar} photoUri={p.photoUri} size={28} />
                  <Text style={[styles.pickerName, active && styles.pickerNameActive]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>

          {!trend ? (
            <EmptyState
              icon="pulse"
              title="Not enough history yet"
              subtitle="Play at least 2 X01 matches (501/301/201/Practice 170) to chart a trend"
            />
          ) : (
            <>
              <Animated.View entering={FadeInDown.duration(280)} style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>3-DART AVERAGE</Text>
                  <View style={[styles.trendBadge, { borderColor: trendColor + '55' }]}>
                    <Icon name={trendIcon} size={12} color={trendColor} />
                    <Text style={[styles.trendBadgeText, { color: trendColor }]}>
                      {trend.direction === 'steady' ? 'STEADY' : `${trend.delta > 0 ? '+' : ''}${trend.delta.toFixed(1)}`}
                    </Text>
                  </View>
                </View>
                <TrendLineChart
                  data={chartData}
                  accessibilityLabel={`3-dart average across the last ${chartData.length} matches`}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(STAGGER_MS).duration(280)}
                style={styles.statsGrid}
              >
                <StatPill label="Current" value={trend.currentAvg.toFixed(1)} accent={colors.primaryHot} />
                <StatPill label="Best" value={trend.bestAvg.toFixed(1)} accent={colors.gold} />
                <StatPill label="Worst" value={trend.worstAvg.toFixed(1)} />
              </Animated.View>

              <Text style={styles.footnote}>
                Based on the last {trend.points.length} X01 match{trend.points.length === 1 ? '' : 'es'}. Trend compares
                the first half of this window against the second half.
              </Text>
            </>
          )}
        </>
      )}
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  pickerRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  pickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: COLORS.card,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    maxWidth: 160,
  },
  pickerChipActive: {
    borderColor: COLORS.accentBorder,
    backgroundColor: COLORS.accentDim,
  },
  pickerName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  pickerNameActive: {
    color: colors.textPrimary,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  trendBadgeText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  footnote: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textFaint,
    lineHeight: 16,
  },
});
