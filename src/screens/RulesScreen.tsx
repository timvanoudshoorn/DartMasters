import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { PressableScale } from '../components/primitives/PressableScale';
import { Screen } from '../components/Screen';
import { GAME_MODES, GameModeInfo } from '../data/gameModes';
import { GAME_RULES } from '../data/rules';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';
import { SPRING_GENTLE, staggerDelay } from '../theme/motion';
import { GameType } from '../types';

type Route = { params?: { gameType?: GameType } };

export function RulesScreen() {
  const navigation = useNavigation();
  const route = useRoute() as unknown as Route;
  const initialType = route.params?.gameType;

  const [expanded, setExpanded] = useState<GameType | null>(initialType ?? null);

  const modes = GAME_MODES.filter((mode) => mode.selectable !== false);

  return (
    <Screen scroll>
      <Header title="How to Play" subtitle="Rules for every game mode" onBack={() => navigation.goBack()} />
      <View style={styles.list}>
        {modes.map((mode, i) => (
          <ModeRuleCard
            key={mode.type}
            mode={mode}
            index={i}
            expanded={expanded === mode.type}
            onToggle={() => setExpanded((prev) => (prev === mode.type ? null : mode.type))}
          />
        ))}
      </View>
    </Screen>
  );
}

function ModeRuleCard({
  mode,
  index,
  expanded,
  onToggle,
}: {
  mode: GameModeInfo;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const rules = GAME_RULES[mode.type];

  return (
    <Animated.View
      entering={FadeInDown.delay(staggerDelay(index)).duration(280)}
      layout={Layout.springify().damping(SPRING_GENTLE.damping).stiffness(SPRING_GENTLE.stiffness)}
      style={styles.card}
    >
      <PressableScale scaleTo={0.99} haptic="light" onPress={onToggle} style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: mode.color + '1F' }]}>
          <Icon name={mode.icon} size={20} color={mode.color} />
        </View>
        <Text style={styles.title}>{mode.title}</Text>
        <View style={expanded ? styles.chevronOpen : undefined}>
          <Icon name="chevronRight" size={16} color={colors.textFaint} />
        </View>
      </PressableScale>

      {expanded && (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.body}>
          {rules.howToPlay.map((line, idx) => (
            <Text key={idx} style={styles.paragraph}>
              {line}
            </Text>
          ))}
          <View style={styles.winRow}>
            <Icon name="trophy" size={14} color={COLORS.accentHot} />
            <Text style={styles.winText}>{rules.howToWin}</Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: spacing.sm,
  },
  paragraph: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  winRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  winText: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: COLORS.accentHot,
  },
});
