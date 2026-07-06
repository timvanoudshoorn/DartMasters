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
import { PRESS_SCALE, STAGGER_MS } from '../theme/motion';

export function ModeSelectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PlayStackParamList>>();

  return (
    <Screen scroll>
      <Header title="Select Your Game" onBack={() => navigation.goBack()} />
      <View style={styles.list}>
        {GAME_MODES.filter((mode) => mode.selectable !== false).map((mode, i) => (
          <ModeRow
            key={mode.type}
            mode={mode}
            index={i}
            onPress={() => navigation.navigate('GameSetup', { gameType: mode.type })}
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
}: {
  mode: (typeof GAME_MODES)[number];
  index: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * STAGGER_MS).duration(280)}>
      <PressableScale
        scaleTo={PRESS_SCALE.row}
        haptic="light"
        sound="buttonTap"
        onPress={onPress}
        style={styles.row}
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
    gap: spacing.md,
    backgroundColor: COLORS.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    padding: 14,
    marginBottom: spacing.sm,
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
