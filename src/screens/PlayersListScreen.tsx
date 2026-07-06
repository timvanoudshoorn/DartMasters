import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { PressableScale } from '../components/primitives/PressableScale';
import { Screen } from '../components/Screen';
import { PlayersStackParamList } from '../navigation/types';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';
import { PRESS_SCALE, STAGGER_MS } from '../theme/motion';
import { MatchRecord, Player } from '../types';

export function PlayersListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PlayersStackParamList>>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([PlayerStorage.getAll(), MatchStorage.getAll()]).then(([p, m]) => {
        setPlayers(p);
        setMatches(m);
      });
    }, [])
  );

  return (
    <Screen scroll={players.length > 0}>
      <Header
        title="Players"
        subtitle={`${players.length} profiles`}
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.headerActions}>
            <PressableScale
              onPress={() => navigation.navigate('Settings')}
              hitSlop={10}
              haptic="light"
              scaleTo={0.88}
              style={styles.settingsBtn}
            >
              <Icon name="settings" size={20} color={colors.textSecondary} />
            </PressableScale>
            <PressableScale
              onPress={() => navigation.navigate('PlayerEdit', {})}
              hitSlop={10}
              haptic="light"
              scaleTo={0.88}
              style={styles.addBtn}
            >
              <Icon name="addCircle" size={28} color={colors.primaryHot} />
            </PressableScale>
          </View>
        }
      />
      {players.length === 0 ? (
        <EmptyState icon="userAdd" title="No players yet" subtitle="Add a player to start tracking stats" />
      ) : (
        players.map((p, i) => {
          const gamesPlayed = matches.filter((m) => m.results[p.id]).length;
          const wins = matches.filter((m) => m.winnerId === p.id).length;
          return (
            <Animated.View key={p.id} entering={FadeInDown.delay(Math.min(i, 8) * STAGGER_MS).duration(260)}>
              <PressableScale
                scaleTo={PRESS_SCALE.row}
                haptic="light"
                onPress={() => navigation.navigate('PlayerProfile', { playerId: p.id })}
                style={styles.row}
              >
                <PlayerAvatar name={p.name} color={p.color} avatar={p.avatar} photoUri={p.photoUri} size={48} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.sub}>{gamesPlayed} games · {wins} wins</Text>
                </View>
                <Icon name="chevronRight" size={18} color={colors.textFaint} />
              </PressableScale>
            </Animated.View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    padding: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
