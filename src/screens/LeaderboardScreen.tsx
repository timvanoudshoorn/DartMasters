import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { Icon, IconName } from '../components/icons/Icon';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { Screen } from '../components/Screen';
import { aggregateCareerStats } from '../logic/stats';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing } from '../theme';
import { GameType, MatchRecord, Player } from '../types';

const X01_TYPES: GameType[] = ['501', '301', '201', 'practice170'];

type Period = 'all' | 'month' | 'week';
type CategoryKey = 'winRate' | 'wins' | 'avg' | 'oneEighties' | 'checkout' | 'matches';

interface CategoryDef {
  key: CategoryKey;
  label: string;
  icon: IconName;
  emptyHint: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: 'winRate', label: 'Win Rate', icon: 'trophy', emptyHint: 'Play a match to appear on this board.' },
  { key: 'wins', label: 'Most Wins', icon: 'flame', emptyHint: 'Win a match to climb this board.' },
  { key: 'avg', label: 'Best Average', icon: 'stats', emptyHint: 'Play a 501/301/201 leg to set an average.' },
  { key: 'oneEighties', label: '180s', icon: 'bolt', emptyHint: 'Throw a 180 to show up here.' },
  { key: 'checkout', label: 'Highest Checkout', icon: 'dartboard', emptyHint: 'Hit a checkout to show up here.' },
  { key: 'matches', label: 'Most Active', icon: 'history', emptyHint: 'Play a match to appear on this board.' },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

interface Row {
  player: Player;
  display: string;
  sub: string;
  value: number;
}

function periodCutoff(period: Period): number {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.getTime();
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d.getTime();
  }
  return 0;
}

function buildRows(category: CategoryKey, players: Player[], matches: MatchRecord[]): Row[] {
  const x01Matches = matches.filter((m) => X01_TYPES.includes(m.gameType));

  const rows = players
    .map((p): Row | null => {
      const all = aggregateCareerStats(matches, p.id);
      const x01 = aggregateCareerStats(x01Matches, p.id);

      switch (category) {
        case 'winRate':
          if (all.gamesPlayed === 0) return null;
          return {
            player: p,
            value: all.winRate,
            display: `${all.winRate.toFixed(0)}%`,
            sub: `${all.gamesWon}-${all.gamesPlayed - all.gamesWon} record`,
          };
        case 'wins':
          if (all.gamesPlayed === 0) return null;
          return {
            player: p,
            value: all.gamesWon,
            display: `${all.gamesWon}`,
            sub: `${all.gamesPlayed} played`,
          };
        case 'avg':
          if (x01.avgThreeDart <= 0) return null;
          return {
            player: p,
            value: x01.avgThreeDart,
            display: x01.avgThreeDart.toFixed(1),
            sub: '3-dart average',
          };
        case 'oneEighties':
          if (x01.oneEighties <= 0) return null;
          return {
            player: p,
            value: x01.oneEighties,
            display: `${x01.oneEighties}`,
            sub: '180s thrown',
          };
        case 'checkout':
          if (x01.highestCheckout <= 0) return null;
          return {
            player: p,
            value: x01.highestCheckout,
            display: `${x01.highestCheckout}`,
            sub: 'best checkout',
          };
        case 'matches':
          if (all.gamesPlayed === 0) return null;
          return {
            player: p,
            value: all.gamesPlayed,
            display: `${all.gamesPlayed}`,
            sub: `${all.gamesWon} wins`,
          };
        default:
          return null;
      }
    })
    .filter((r): r is Row => r !== null);

  rows.sort((a, b) => b.value - a.value);
  return rows;
}

const RANK_COLORS = ['#E8C84A', '#C7CDD6', '#C98A4F'];

export function LeaderboardScreen() {
  const navigation = useNavigation();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [period, setPeriod] = useState<Period>('all');
  const [category, setCategory] = useState<CategoryKey>('winRate');

  useFocusEffect(
    useCallback(() => {
      Promise.all([PlayerStorage.getAll(), MatchStorage.getAll()])
        .then(([p, m]) => {
          setPlayers(p);
          setMatches(m);
        })
        .catch((err) => {
          console.error('[LeaderboardScreen] Failed to load data:', err);
          setPlayers([]);
          setMatches([]);
        });
    }, [])
  );

  const primaryPlayerId = useMemo(
    () => (players.length ? players.slice().sort((a, b) => a.createdAt - b.createdAt)[0].id : null),
    [players]
  );

  const periodMatches = useMemo(() => {
    const cutoff = periodCutoff(period);
    return cutoff === 0 ? matches : matches.filter((m) => m.date >= cutoff);
  }, [matches, period]);

  const rows = useMemo(() => buildRows(category, players, periodMatches), [category, players, periodMatches]);
  const activeCategory = CATEGORIES.find((c) => c.key === category)!;

  return (
    <Screen scroll={rows.length > 0}>
      <Header title="Leaderboard" subtitle={`${rows.length} ranked`} onBack={() => navigation.goBack()} />

      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <PressableScale
            key={p.key}
            onPress={() => setPeriod(p.key)}
            haptic="tick"
            scaleTo={0.95}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
          >
            <Text style={[styles.periodLabel, period === p.key && styles.periodLabelActive]}>{p.label}</Text>
          </PressableScale>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {CATEGORIES.map((c) => {
          const active = c.key === category;
          return (
            <PressableScale
              key={c.key}
              onPress={() => setCategory(c.key)}
              haptic="tick"
              scaleTo={0.95}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
            >
              <Icon name={c.icon} size={14} color={active ? colors.primaryHot : colors.textMuted} />
              <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{c.label}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      {rows.length === 0 ? (
        <EmptyState icon="medal" title="No rankings yet" subtitle={activeCategory.emptyHint} />
      ) : (
        <View style={styles.list}>
          {rows.map((row, i) => {
            const isYou = row.player.id === primaryPlayerId;
            const rankColor = RANK_COLORS[i];
            return (
              <View key={row.player.id} style={[styles.row, isYou && styles.rowYou]}>
                <View style={[styles.rankBadge, rankColor && { backgroundColor: rankColor }]}>
                  <Text style={[styles.rankText, rankColor && styles.rankTextTop]}>{i + 1}</Text>
                </View>
                <PlayerAvatar
                  name={row.player.name}
                  color={row.player.color}
                  avatar={row.player.avatar}
                  photoUri={row.player.photoUri}
                  size={40}
                />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {row.player.name}
                    </Text>
                    {isYou && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>YOU</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sub}>{row.sub}</Text>
                </View>
                <Text style={styles.value}>{row.display}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  periodRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing.md,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.full,
  },
  periodBtnActive: {
    backgroundColor: colors.primary,
  },
  periodLabel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  periodLabelActive: {
    color: colors.textPrimary,
  },
  categoryRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '14',
  },
  categoryLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  categoryLabelActive: {
    color: colors.primary,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
  },
  rowYou: {
    borderColor: colors.primary,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  rankTextTop: {
    color: '#1A1A1A',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 15,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  sub: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  youBadge: {
    backgroundColor: colors.primary + '1F',
    borderRadius: radius.full,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  youBadgeText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
});
