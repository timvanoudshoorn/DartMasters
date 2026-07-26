import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { PlayerFilterChips } from '../components/PlayerFilterChips';
import { Screen } from '../components/Screen';
import { AchievementStatus, computeAchievements } from '../logic/achievements';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing } from '../theme';
import { reducedMs, staggerDelay } from '../theme/motion';
import { MatchRecord, Player } from '../types';

export function AchievementsScreen() {
  const navigation = useNavigation();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([PlayerStorage.getAll(), MatchStorage.getAll()])
        .then(([p, m]) => {
          setPlayers(p);
          setMatches(m);
          setSelectedPlayerId((current) => {
            if (current && p.some((pl) => pl.id === current)) return current;
            if (p.length === 0) return null;
            return p.slice().sort((a, b) => a.createdAt - b.createdAt)[0].id;
          });
        })
        .catch((err) => {
          console.error('[AchievementsScreen] Failed to load data:', err);
          setPlayers([]);
          setMatches([]);
          setSelectedPlayerId(null);
        });
    }, [])
  );

  const statuses = useMemo(
    () => (selectedPlayerId ? computeAchievements(matches, selectedPlayerId) : []),
    [matches, selectedPlayerId]
  );

  const earnedCount = statuses.filter((s) => s.earned).length;

  return (
    <Screen scroll={players.length > 0}>
      <Header
        title="Achievements"
        subtitle={selectedPlayerId ? `${earnedCount}/${statuses.length} earned` : 'Loading…'}
        onBack={() => navigation.goBack()}
      />

      {players.length === 0 ? (
        <EmptyState
          icon="star"
          title="No players yet"
          subtitle="Add a player profile to start earning badges"
        />
      ) : (
        <>
          <PlayerFilterChips players={players} selectedId={selectedPlayerId} onSelect={setSelectedPlayerId} />

          {matches.filter((m) => selectedPlayerId && m.results[selectedPlayerId]).length === 0 ? (
            <EmptyState icon="star" title="No badges yet" subtitle="Play a match to start earning achievements" />
          ) : (
            <View style={styles.grid}>
              {statuses.map((status, i) => (
                <BadgeCard key={status.definition.id} status={status} index={i} />
              ))}
            </View>
          )}
        </>
      )}

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

function BadgeCard({ status, index }: { status: AchievementStatus; index: number }) {
  const { definition, progress, earned } = status;
  const percent = definition.target > 0 ? Math.min(1, progress / definition.target) : 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(staggerDelay(index)).duration(260)}
      style={[styles.card, earned && styles.cardEarned]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconWell, earned && styles.iconWellEarned]}>
          <Icon name={definition.icon} size={20} color={earned ? colors.primaryHot : colors.textFaint} />
        </View>
        {earned && (
          <Animated.View
            entering={ZoomIn.delay(staggerDelay(index) + reducedMs(150)).springify().damping(11)}
            style={styles.earnedBadge}
          >
            <Icon name="checkmark" size={11} color={colors.onFill} />
          </Animated.View>
        )}
      </View>
      <Text style={[styles.cardTitle, !earned && styles.cardTitleLocked]}>{definition.title}</Text>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {definition.description}
      </Text>
      {!earned && (
        <>
          <View style={styles.progressTrack}>
            <ProgressFill percent={percent * 100} delay={staggerDelay(index) + reducedMs(150)} />
          </View>
          <Text style={styles.progressLabel}>
            {progress}/{definition.target}
          </Text>
        </>
      )}
    </Animated.View>
  );
}

/** Fill sweeps to its value after the card lands instead of appearing pre-filled. */
function ProgressFill({ percent, delay }: { percent: number; delay: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(delay, withTiming(percent, { duration: 550 }));
  }, [percent]);

  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return <Animated.View style={[styles.progressFill, style]} />;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.edge,
    padding: spacing.md,
    opacity: 0.62,
  },
  cardEarned: {
    borderColor: colors.primary,
    opacity: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  iconWell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWellEarned: {
    backgroundColor: colors.primary + '1F',
  },
  earnedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardTitleLocked: {
    color: colors.textSecondary,
  },
  cardDescription: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bgCardAlt,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textFaint,
    textAlign: 'right',
  },
});
