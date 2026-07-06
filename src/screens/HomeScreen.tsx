import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { DartboardLogo } from '../components/DartboardLogo';
import { Icon, IconName } from '../components/icons/Icon';
import { PressableScale } from '../components/primitives/PressableScale';
import { Screen } from '../components/Screen';
import { getGameModeInfo } from '../data/gameModes';
import { computeDailyChallengeReport, DailyChallengeReport } from '../logic/challengeProgress';
import { RootStackParamList } from '../navigation/types';
import { ActiveMatchPointer, ActiveMatchStorage } from '../storage/activeMatch';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { COLORS, FONT, RADIUS } from '../theme/colors';
import { PRESS_SCALE } from '../theme/motion';
import { MatchRecord, Player } from '../types';
import { computeHomeOverview } from '../utils/overview';
import { resolvePlayerDisplay } from '../utils/playerDisplay';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [activeMatch, setActiveMatch] = useState<ActiveMatchPointer | null>(null);
  const [challengeReport, setChallengeReport] = useState<DailyChallengeReport | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([PlayerStorage.getAll(), MatchStorage.getAll(), ActiveMatchStorage.get()]).then(
        ([p, m, active]) => {
          setPlayers(p);
          setMatches(m);
          setActiveMatch(active);
        }
      );
      computeDailyChallengeReport().then(setChallengeReport);
    }, [])
  );

  const playerMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => (map[p.id] = p));
    return map;
  }, [players]);

  const overview = useMemo(() => computeHomeOverview(players, matches), [players, matches]);

  const continueMatchInfo = useMemo(() => {
    if (!activeMatch) return null;
    const modeInfo = getGameModeInfo(activeMatch.config.gameType);
    const names = activeMatch.config.playerIds
      .map((id) => resolvePlayerDisplay(id, playerMap, activeMatch.config.guestPlayers).name)
      .join(', ');
    return { modeInfo, names };
  }, [activeMatch, playerMap]);

  const challengePercent = challengeReport
    ? Math.round((challengeReport.completedCount / Math.max(1, challengeReport.totalCount)) * 100)
    : 0;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoWrap}>
              <DartboardLogo size={40} />
            </View>
            <View>
              <Text style={styles.wordmark}>
                DartMaster<Text style={{ color: COLORS.accentHot }}>s</Text>
              </Text>
              <Text style={styles.tagline}>PRO SCORER</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <PressableScale
              onPress={() => Alert.alert("You're all caught up", 'No new notifications.')}
              style={styles.iconBtn}
              haptic="light"
              scaleTo={0.88}
              hitSlop={8}
            >
              <Icon name="bell" size={18} color={COLORS.text} />
            </PressableScale>
            <PressableScale
              onPress={() => navigation.navigate('StatsHome')}
              style={styles.iconBtn}
              haptic="light"
              scaleTo={0.88}
              hitSlop={8}
            >
              <Icon name="stats" size={18} color={COLORS.text} />
            </PressableScale>
          </View>
        </View>

        {/* Continue match */}
        {continueMatchInfo && (
          <PressableScale
            scaleTo={PRESS_SCALE.row}
            haptic="medium"
            style={styles.continueCard}
            onPress={() => navigation.navigate('Game', { config: activeMatch!.config })}
          >
            <View style={styles.continueRail} />
            <View style={{ flex: 1 }}>
              <Text style={styles.continueLabel}>CONTINUE MATCH</Text>
              <Text style={styles.continueTitle}>{continueMatchInfo.modeInfo.title}</Text>
              <Text style={styles.continueSubtitle} numberOfLines={1}>
                vs {continueMatchInfo.names}
              </Text>
            </View>
            <View style={styles.continuePlayBtn}>
              <Icon name="play" size={16} color={COLORS.text} />
            </View>
          </PressableScale>
        )}

        {/* Stats band */}
        <View style={styles.statsBand}>
          <View style={styles.statsCell}>
            <Text style={styles.statsValue}>{overview.matches}</Text>
            <Text style={styles.statsLabel}>MATCHES</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsCell}>
            <Text style={[styles.statsValue, { color: COLORS.accentHot }]}>{overview.winRate}%</Text>
            <Text style={styles.statsLabel}>WIN RATE</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsCell}>
            <Text style={styles.statsValue}>{overview.streak}</Text>
            <Text style={styles.statsLabel}>STREAK</Text>
          </View>
        </View>

        {/* Challenges */}
        <PressableScale
          scaleTo={PRESS_SCALE.row}
          haptic="light"
          style={styles.challengesCard}
          onPress={() => navigation.navigate('Challenges')}
        >
          <View style={styles.challengesIcon}>
            <Icon name="trophy" size={20} color={COLORS.accentHot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengesTitle}>Daily Challenges</Text>
            <Text style={styles.challengesSubtitle}>
              {challengeReport
                ? `${challengeReport.completedCount} of ${challengeReport.totalCount} completed`
                : '— of — completed'}
            </Text>
            <ProgressTrack percent={challengePercent} />
          </View>
          <Icon name="chevronRight" size={16} color={COLORS.textFaint} />
        </PressableScale>

        {/* New Match CTA */}
        <PressableScale
          scaleTo={PRESS_SCALE.button}
          haptic="medium"
          sound="buttonTap"
          style={styles.playButton}
          onPress={() => navigation.navigate('ModeSelect')}
        >
          <View style={[styles.playDecor, styles.playDecorTop]} />
          <View style={[styles.playDecor, styles.playDecorBottom]} />
          <View style={styles.playRow}>
            <View style={styles.playIconCircle}>
              <Icon name="play" size={22} color={COLORS.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.playTitle}>New Match</Text>
              <Text style={styles.playSubtitle}>Choose game mode & players</Text>
            </View>
            <Icon name="chevronRight" size={20} color="rgba(255,255,255,0.4)" />
          </View>
        </PressableScale>

        {/* Nav grid */}
        <View style={styles.navGrid}>
          <NavTile
            icon="stats"
            title="Stats"
            subtitle="Career performance"
            onPress={() => navigation.navigate('StatsHome')}
          />
          <NavTile
            icon="users"
            title="Players"
            subtitle="Manage profiles"
            onPress={() => navigation.navigate('PlayersList')}
          />
          <NavTile
            icon="medal"
            title="Leaderboard"
            subtitle="Top players"
            onPress={() => navigation.navigate('Leaderboard')}
            accent
          />
          <NavTile
            icon="settings"
            title="Settings"
            subtitle="Preferences"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Progress bar whose fill springs to its new width instead of snapping. */
function ProgressTrack({ percent }: { percent: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(350, withTiming(percent, { duration: 600 }));
  }, [percent]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={styles.challengesTrack}>
      <Animated.View style={[styles.challengesFill, fillStyle]} />
    </View>
  );
}

function NavTile({
  icon,
  title,
  subtitle,
  onPress,
  accent,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <View style={styles.navTileWrap}>
      <PressableScale
        onPress={onPress}
        scaleTo={PRESS_SCALE.row}
        haptic="light"
        style={[styles.navTile, accent && styles.navTileAccent]}
      >
        <View style={styles.navTileTop}>
          <View style={[styles.navTileIcon, accent && styles.navTileIconAccent]}>
            <Icon name={icon} size={18} color={accent ? COLORS.accentHot : COLORS.text} />
          </View>
          <View style={{ flex: 1 }} />
          <Icon name="chevronRight" size={14} color={COLORS.textFaint} />
        </View>
        <Text style={styles.navTileTitle}>{title}</Text>
        <Text style={[styles.navTileSubtitle, accent && { color: COLORS.accentHot }]}>{subtitle}</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: FONT.ui,
    fontSize: 19,
    color: COLORS.text,
    letterSpacing: -0.8,
  },
  tagline: {
    fontFamily: FONT.ui,
    fontSize: 9,
    color: COLORS.textSub,
    letterSpacing: 2.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  continueRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.accent,
  },
  continueLabel: {
    fontFamily: FONT.ui,
    fontSize: 10,
    color: COLORS.accentHot,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  continueTitle: {
    fontFamily: FONT.ui,
    fontSize: 16,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  continueSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textSub,
    marginTop: 2,
  },
  continuePlayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  statsBand: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    borderRadius: RADIUS.lg,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  statsCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
  },
  statsDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statsValue: {
    fontFamily: FONT.score,
    fontSize: 32,
    color: COLORS.text,
    lineHeight: 34,
  },
  statsLabel: {
    fontFamily: FONT.ui,
    fontSize: 9,
    color: COLORS.textSub,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  challengesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    borderRadius: RADIUS.lg,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
  },
  challengesIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengesTitle: {
    fontFamily: FONT.ui,
    fontSize: 14,
    color: COLORS.text,
  },
  challengesSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: COLORS.textSub,
    marginTop: 2,
  },
  challengesTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.card2,
    marginTop: 8,
    overflow: 'hidden',
  },
  challengesFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  playButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accentDeep,
    borderTopColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  playDecor: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 22,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  playDecorTop: {
    width: 120,
    height: 120,
    top: -60,
    right: -40,
  },
  playDecorBottom: {
    width: 90,
    height: 90,
    bottom: -50,
    right: -10,
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
  },
  playIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTitle: {
    fontFamily: FONT.ui,
    fontSize: 21,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  playSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  navTileWrap: {
    width: '47%',
    flexGrow: 1,
  },
  navTile: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  navTileAccent: {
    backgroundColor: COLORS.card,
    borderColor: 'rgba(193,54,32,0.28)',
  },
  navTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTileIconAccent: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentBorder,
  },
  navTileTitle: {
    fontFamily: FONT.ui,
    fontSize: 14,
    color: COLORS.text,
    marginTop: 14,
    letterSpacing: -0.2,
  },
  navTileSubtitle: {
    fontFamily: FONT.regular,
    fontSize: 10,
    color: COLORS.textSub,
    marginTop: 3,
  },
});
