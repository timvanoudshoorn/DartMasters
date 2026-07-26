import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { PressableScale } from '../components/primitives/PressableScale';
import { Screen } from '../components/Screen';
import { GAME_MODES } from '../data/gameModes';
import { PlayStackParamList } from '../navigation/types';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';
import { PRESS_SCALE, staggerDelay } from '../theme/motion';

export function ModeSelectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PlayStackParamList>>();

  return (
    <Screen scroll>
      <Header
        title="Select Your Game"
        onBack={() => navigation.goBack()}
        right={
          <PressableScale
            scaleTo={0.9}
            haptic="light"
            hitSlop={10}
            style={styles.rulesBtn}
            onPress={() => navigation.navigate('Rules')}
          >
            <Icon name="info" size={18} color={colors.textPrimary} />
          </PressableScale>
        }
      />
      <View style={styles.list}>
        {GAME_MODES.filter((mode) => mode.selectable !== false).map((mode, i) => (
          <ModeRow
            key={mode.type}
            mode={mode}
            index={i}
            onPress={() => navigation.navigate('GameSetup', { gameType: mode.type })}
            onInfoPress={() => navigation.navigate('Rules', { gameType: mode.type })}
          />
        ))}
      </View>
    </Screen>
  );
}

function ModeRow({
  mode,
  index,
  onPress,
  onInfoPress,
}: {
  mode: (typeof GAME_MODES)[number];
  index: number;
  onPress: () => void;
  onInfoPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(staggerDelay(index)).duration(280)} style={styles.row}>
      <PressableScale
        scaleTo={PRESS_SCALE.row}
        haptic="light"
        sound="buttonTap"
        onPress={onPress}
        style={styles.rowMain}
      >
        <View style={[styles.iconCircle, { backgroundColor: mode.color + '1F' }]}>
          <Icon name={mode.icon} size={22} color={mode.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{mode.title}</Text>
          <Text style={styles.subtitle}>{mode.subtitle}</Text>
        </View>
        <Icon name="chevronRight" size={18} color={colors.textFaint} />
      </PressableScale>
      <PressableScale
        scaleTo={0.85}
        haptic="tick"
        hitSlop={10}
        style={styles.infoBtn}
        onPress={onInfoPress}
      >
        <Icon name="info" size={16} color={colors.textFaint} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: COLORS.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    padding: 14,
  },
  infoBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
  },
  rulesBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
});
