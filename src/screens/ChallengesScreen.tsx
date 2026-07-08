import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from '../components/primitives/PressableScale';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { Screen } from '../components/Screen';
import { ChallengeStatus, computeDailyChallengeReport, DailyChallengeReport } from '../logic/challengeProgress';
import { colors, fonts, radius, spacing } from '../theme';
import { STAGGER_MS } from '../theme/motion';

type Tab = 'solo' | 'multiplayer';

export function ChallengesScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('solo');
  const [report, setReport] = useState<DailyChallengeReport | null>(null);

  useFocusEffect(
    useCallback(() => {
      computeDailyChallengeReport()
        .then(setReport)
        .catch((err) => {
          console.error('[ChallengesScreen] Failed to compute challenges:', err);
          setReport(null);
        });
    }, [])
  );

  const list = report ? (tab === 'solo' ? report.solo : report.multiplayer) : [];

  return (
    <Screen scroll>
      <Header
        title="Daily Challenges"
        subtitle={report ? `${report.completedCount}/${report.totalCount} completed today` : 'Loading…'}
        onBack={() => navigation.goBack()}
      />

      {report && !report.playerId && (
        <Text style={styles.emptyHint}>Add a player profile to start tracking daily challenges.</Text>
      )}

      <View style={styles.tabRow}>
        <TabButton label="Solo" active={tab === 'solo'} onPress={() => setTab('solo')} />
        <TabButton label="With Friends" active={tab === 'multiplayer'} onPress={() => setTab('multiplayer')} />
      </View>

      <View style={styles.list}>
        {list.map((status, i) => (
          <ChallengeCard key={`${tab}-${status.definition.id}`} status={status} index={i} />
        ))}
      </View>

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} haptic="tick" scaleTo={0.95} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabBtnLabel, active && styles.tabBtnLabelActive]}>{label}</Text>
    </PressableScale>
  );
}

function ChallengeCard({ status, index }: { status: ChallengeStatus; index: number }) {
  const { definition, progress, completed } = status;
  const percent = definition.target > 0 ? Math.min(1, progress / definition.target) : 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * STAGGER_MS).duration(260)}
      style={[styles.card, completed && styles.cardCompleted]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{definition.title}</Text>
        {completed ? (
          <Animated.View
            entering={ZoomIn.delay(index * STAGGER_MS + 200).springify().damping(11)}
            style={styles.checkBadge}
          >
            <Icon name="checkmark" size={14} color="#0A0A0A" />
          </Animated.View>
        ) : (
          <Text style={styles.cardCount}>
            {progress}/{definition.target}
          </Text>
        )}
      </View>
      <View style={styles.progressTrack}>
        <ProgressFill percent={percent * 100} delay={index * STAGGER_MS + 150} />
      </View>
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
  emptyHint: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.full,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabBtnLabel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabBtnLabelActive: {
    color: colors.textPrimary,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardCompleted: {
    borderColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    marginRight: spacing.sm,
  },
  cardCount: {
    color: colors.textMuted,
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bgCardAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
