import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { PressableScale } from '../components/primitives/PressableScale';
import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { useSoundEffects } from '../sound/useSoundEffects';
import { BullOffStorage, PlayerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';
import { STAGGER_MS } from '../theme/motion';
import { GameConfig, Player } from '../types';
import { resolvePlayerDisplay } from '../utils/playerDisplay';
import { randomInsert, shuffled } from '../utils/shuffle';

type Route = { params: { config: GameConfig } };

const SETTLE_DELAY_MS = 550;

export function BullOffScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute() as unknown as Route;
  const { config } = route.params;
  const playSfx = useSoundEffects();

  const [players, setPlayers] = useState<Player[]>([]);
  // Only humans can meaningfully "throw" at the bull — bots get a random slot later.
  const humanIds = useMemo(
    () => config.playerIds.filter((id) => !config.guestPlayers?.[id]?.isBot),
    [config.playerIds, config.guestPlayers]
  );
  const botIds = useMemo(
    () => config.playerIds.filter((id) => config.guestPlayers?.[id]?.isBot),
    [config.playerIds, config.guestPlayers]
  );

  const [humanOrder, setHumanOrder] = useState<string[]>([]);
  const navigatedRef = React.useRef(false);

  React.useEffect(() => {
    PlayerStorage.getAll().then(setPlayers);
  }, []);

  const playerMap = useMemo(() => {
    const map: Record<string, Player> = {};
    players.forEach((p) => (map[p.id] = p));
    return map;
  }, [players]);

  const display = (id: string) => resolvePlayerDisplay(id, playerMap, config.guestPlayers);

  const remainingHumans = humanIds.filter((id) => !humanOrder.includes(id));
  const decided = remainingHumans.length === 0 && humanOrder.length === humanIds.length;

  const pick = (id: string) => {
    if (humanOrder.includes(id)) return;
    playSfx('dartScored');
    setHumanOrder((prev) => [...prev, id]);
  };

  // The instant only one human is left, their position is determined —
  // resolve it automatically instead of waiting for a redundant tap.
  React.useEffect(() => {
    if (remainingHumans.length === 1 && !decided) {
      setHumanOrder((prev) => [...prev, remainingHumans[0]]);
    }
  }, [remainingHumans.length]);

  React.useEffect(() => {
    if (!decided || navigatedRef.current) return;
    navigatedRef.current = true;

    BullOffStorage.record({
      winnerId: humanOrder[0],
      playerIds: config.playerIds,
      manual: true,
      date: Date.now(),
    });

    // Bots never throw — drop each one into a random slot in the final order.
    let finalOrder = [...humanOrder];
    shuffled(botIds).forEach((botId) => {
      finalOrder = randomInsert(finalOrder, botId);
    });

    const timer = setTimeout(() => {
      navigation.replace('Game', { config: { ...config, playerIds: finalOrder } });
    }, SETTLE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [decided]);

  const settledCount = humanOrder.length;

  return (
    <Screen scroll>
      <Header title="Bull Off" subtitle="Who threw closest to the bull?" onBack={() => navigation.goBack()} />

      {settledCount > 0 && (
        <View style={styles.settledList}>
          {humanOrder.map((id, i) => {
            const d = display(id);
            return (
              <Animated.View key={id} entering={FadeInDown.springify().damping(16)} style={styles.settledRow}>
                <Text style={[styles.settledRank, i === 0 && { color: COLORS.accentHot }]}>{ordinal(i + 1)}</Text>
                <PlayerAvatar name={d.name} color={d.color} avatar={d.avatar} photoUri={d.photoUri} size={28} />
                <Text style={styles.settledName} numberOfLines={1}>
                  {d.name}
                </Text>
                <Animated.View entering={ZoomIn.delay(120).springify().damping(11)}>
                  <Icon name="checkmark" size={14} color={COLORS.positive} />
                </Animated.View>
              </Animated.View>
            );
          })}
        </View>
      )}

      {!decided && (
        <>
          <Animated.Text entering={FadeInDown.duration(260)} style={styles.instruction}>
            {settledCount === 0 ? 'Tap who threw closest to the bull.' : "Now tap who's next closest."}
          </Animated.Text>
          <View style={styles.grid}>
            {remainingHumans.map((id, i) => {
              const d = display(id);
              return (
                <Animated.View
                  key={id}
                  entering={FadeInDown.delay(i * STAGGER_MS).duration(260)}
                  style={styles.pickTileWrap}
                >
                  <PressableScale onPress={() => pick(id)} haptic="medium" scaleTo={0.93} style={styles.pickTile}>
                    <PlayerAvatar name={d.name} color={d.color} avatar={d.avatar} photoUri={d.photoUri} size={40} />
                    <Text style={styles.pickName} numberOfLines={1}>
                      {d.name}
                    </Text>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>
        </>
      )}

      {decided && (
        <Animated.Text entering={FadeInDown.duration(260)} style={styles.startingHint}>
          Game on…
        </Animated.Text>
      )}
    </Screen>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

const styles = StyleSheet.create({
  instruction: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  pickTileWrap: {
    width: '30%',
  },
  pickTile: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  pickName: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
  },
  settledList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  settledRank: {
    width: 28,
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
  },
  settledName: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  startingHint: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
