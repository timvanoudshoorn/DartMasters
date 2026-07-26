import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from '../components/primitives/PressableScale';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CountUp } from '../components/primitives/CountUp';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { Icon, IconName } from '../components/icons/Icon';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { Screen } from '../components/Screen';
import { Sheet } from '../components/Sheet';
import { StatPill } from '../components/StatPill';
import { getGameModeInfo } from '../data/gameModes';
import { computePersonalBests, PersonalBestRecord } from '../logic/personalBests';
import { aggregateCareerStats, CareerStats } from '../logic/stats';
import { RootStackParamList } from '../navigation/types';
import { GoalsStorage, PlayerGoals } from '../storage/goals';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing } from '../theme';
import { reducedMs, staggerDelay } from '../theme/motion';
import { GameType, MatchRecord, Player } from '../types';

type Route = { params: { playerId: string } };

const X01_TYPES: GameType[] = ['501', '301', '201', 'practice170'];

const PB_ICONS: Record<PersonalBestRecord['id'], IconName> = {
  highestCheckout: 'target',
  bestThreeDartAvg: 'pulse',
  most180sInMatch: 'bolt',
  bestLegDarts: 'clock',
  bestVisit: 'crosshair',
  longestWinStreak: 'flame',
};

interface GoalDef {
  key: keyof PlayerGoals;
  label: string;
  getCurrent: (career: CareerStats) => number;
  format: (n: number) => string;
}

const GOAL_DEFS: GoalDef[] = [
  {
    key: 'targetThreeDartAvg',
    label: '3-Dart Average',
    getCurrent: (career) => career.avgThreeDart,
    format: (n) => n.toFixed(1),
  },
  {
    key: 'targetCheckoutPercent',
    label: 'Checkout %',
    getCurrent: (career) => career.checkoutPercent,
    format: (n) => `${n.toFixed(0)}%`,
  },
  {
    key: 'targetHighestCheckout',
    label: 'Highest Checkout',
    getCurrent: (career) => career.highestCheckout,
    format: (n) => String(Math.round(n)),
  },
];

export function PlayerProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute() as unknown as Route;
  const { playerId } = route.params;

  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [goals, setGoals] = useState<PlayerGoals>({});
  const [editingGoal, setEditingGoal] = useState<GoalDef | null>(null);
  const [goalInput, setGoalInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      Promise.all([PlayerStorage.getAll(), MatchStorage.getAll(), GoalsStorage.getForPlayer(playerId)])
        .then(([players, m, g]) => {
          setPlayer(players.find((p) => p.id === playerId) ?? null);
          setMatches(m.filter((match) => match.results[playerId]));
          setGoals(g);
        })
        .catch((err) => {
          console.error('[PlayerProfileScreen] Failed to load data:', err);
          setPlayer(null);
          setMatches([]);
          setGoals({});
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

  const personalBests = useMemo(() => computePersonalBests(matches, playerId), [matches, playerId]);

  const x01Career = useMemo(() => {
    const x01Matches = matches.filter((m) => X01_TYPES.includes(m.gameType));
    return aggregateCareerStats(x01Matches, playerId);
  }, [matches, playerId]);

  const openGoalEditor = useCallback(
    (def: GoalDef) => {
      setEditingGoal(def);
      const current = goals[def.key];
      setGoalInput(current !== undefined ? String(current) : '');
    },
    [goals]
  );

  const saveGoal = useCallback(() => {
    if (!editingGoal) return;
    const parsed = parseFloat(goalInput);
    const next: PlayerGoals = { ...goals };
    if (Number.isFinite(parsed) && parsed > 0) {
      next[editingGoal.key] = parsed;
    } else {
      delete next[editingGoal.key];
    }
    setGoals(next);
    setEditingGoal(null);
    GoalsStorage.setForPlayer(playerId, next).catch((err) => {
      console.error('[PlayerProfileScreen] Failed to save goal:', err);
    });
  }, [editingGoal, goalInput, goals, playerId]);

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

      <Animated.View entering={FadeInDown.delay(staggerDelay(1)).duration(280)} style={styles.overallGrid}>
        <StatPill label="Games" value={overall.gamesPlayed} />
        <StatPill label="Wins" value={overall.gamesWon} accent={colors.primary} />
        <StatPill label="Win Rate" value={`${overall.winRate}%`} accent={colors.gold} />
      </Animated.View>

      {typesPlayed.length === 0 ? (
        <EmptyState icon="stats" title="No games played yet" />
      ) : (
        typesPlayed.map((type, i) => (
          <Animated.View key={type} entering={FadeInDown.delay(staggerDelay(i + 2)).duration(280)}>
            <GameTypeStats playerId={playerId} matches={matches} gameType={type} />
          </Animated.View>
        ))
      )}

      {typesPlayed.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>PERSONAL BESTS</Text>
          <View style={styles.pbGrid}>
            {personalBests.map((pb, i) => (
              <PersonalBestTile
                key={pb.id}
                record={pb}
                index={i}
                onPress={() => {
                  if (pb.matchId) navigation.navigate('MatchDetail', { matchId: pb.matchId });
                }}
              />
            ))}
          </View>

          <Text style={styles.sectionTitle}>GOALS</Text>
          <View style={styles.goalsList}>
            {GOAL_DEFS.map((def, i) => (
              <GoalRow
                key={def.key}
                def={def}
                index={i}
                target={goals[def.key]}
                current={def.getCurrent(x01Career)}
                onPress={() => openGoalEditor(def)}
              />
            ))}
          </View>
        </>
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
              entering={FadeInDown.delay(staggerDelay(Math.min(i, 8))).duration(240)}
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

      <Sheet visible={!!editingGoal} onClose={() => setEditingGoal(null)} title={editingGoal ? `Target: ${editingGoal.label}` : undefined}>
        <TextInput
          value={goalInput}
          onChangeText={setGoalInput}
          placeholder="Enter target"
          placeholderTextColor={colors.textMuted}
          style={styles.goalInput}
          keyboardType="decimal-pad"
          autoFocus
        />
        <View style={styles.goalSheetActions}>
          <Button label="Clear" variant="outline" onPress={() => setGoalInput('')} style={{ flex: 1 }} />
          <Button label="Save" variant="primary" onPress={saveGoal} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </Screen>
  );
}

function PersonalBestTile({
  record,
  index,
  onPress,
}: {
  record: PersonalBestRecord;
  index: number;
  onPress: () => void;
}) {
  const numeric = record.value !== null;
  const format = (n: number) => {
    switch (record.id) {
      case 'bestThreeDartAvg':
        return n.toFixed(1);
      case 'bestLegDarts':
        return `${Math.round(n)} darts`;
      case 'longestWinStreak':
        return `${Math.round(n)} wins`;
      default:
        return String(Math.round(n));
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(staggerDelay(index)).duration(240)} style={styles.pbTileWrap}>
      <PressableScale
        onPress={onPress}
        disabled={!record.matchId}
        haptic={record.matchId ? 'light' : undefined}
        scaleTo={0.96}
        style={styles.pbTile}
      >
        <Icon name={PB_ICONS[record.id]} size={16} color={colors.primaryHot} />
        {numeric ? (
          <CountUp value={record.value as number} format={format} style={styles.pbValue} delay={staggerDelay(index)} />
        ) : (
          <Text style={styles.pbValue}>{record.formatted}</Text>
        )}
        <Text style={styles.pbLabel}>{record.label}</Text>
      </PressableScale>
    </Animated.View>
  );
}

function GoalRow({
  def,
  index,
  target,
  current,
  onPress,
}: {
  def: GoalDef;
  index: number;
  target: number | undefined;
  current: number;
  onPress: () => void;
}) {
  const percent = target && target > 0 ? Math.min(1, current / target) * 100 : 0;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(staggerDelay(index) + reducedMs(150), withTiming(percent, { duration: 550 }));
  }, [percent]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <Animated.View entering={FadeInDown.delay(staggerDelay(index)).duration(240)}>
      <PressableScale onPress={onPress} haptic="light" scaleTo={0.98} style={styles.goalRow}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalLabel}>{def.label}</Text>
          <Text style={styles.goalTarget}>
            {def.format(current)} {target ? `/ ${def.format(target)}` : ''}
          </Text>
        </View>
        {target ? (
          <View style={styles.goalTrack}>
            <Animated.View style={[styles.goalFill, fillStyle]} />
          </View>
        ) : (
          <Text style={styles.goalSetHint}>Tap to set a target</Text>
        )}
      </PressableScale>
    </Animated.View>
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
  pbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  pbTileWrap: {
    width: '31%',
    flexGrow: 1,
  },
  pbTile: {
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.edge,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  pbValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textPrimary,
    marginTop: 4,
  },
  pbLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  goalsList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  goalRow: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.edge,
    padding: spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  goalLabel: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    flex: 1,
  },
  goalTarget: {
    color: colors.textMuted,
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
  },
  goalTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bgCardAlt,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  goalSetHint: {
    color: colors.primaryHot,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  goalInput: {
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    fontFamily: fonts.bodySemibold,
    marginBottom: spacing.lg,
  },
  goalSheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
