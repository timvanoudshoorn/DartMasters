import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { PressableScale } from '../components/primitives/PressableScale';
import { Screen } from '../components/Screen';
import { getGameModeInfo } from '../data/gameModes';
import { searchAll } from '../logic/search';
import { RootStackParamList } from '../navigation/types';
import { MatchStorage, PlayerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { COLORS } from '../theme/colors';
import { PRESS_SCALE, staggerDelay } from '../theme/motion';
import { MatchRecord, Player } from '../types';

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([PlayerStorage.getAll(), MatchStorage.getAll()])
        .then(([p, m]) => {
          setPlayers(p);
          setMatches(m);
        })
        .catch((err) => {
          console.error('[SearchScreen] Failed to load data:', err);
          setPlayers([]);
          setMatches([]);
        });
    }, [])
  );

  const results = useMemo(() => searchAll(query, players, matches), [query, players, matches]);
  const hasQuery = query.trim().length > 0;
  const hasResults = results.players.length > 0 || results.matches.length > 0;
  const suggestedPlayers = useMemo(() => players.slice(0, 5), [players]);

  return (
    <Screen scroll={(hasQuery && hasResults) || (!hasQuery && suggestedPlayers.length > 0)}>
      <Header title="Search" onBack={() => navigation.goBack()} />

      <View style={styles.searchBar}>
        <Icon name="search" size={18} color={colors.textFaint} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search players or matches"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
        {hasQuery && (
          <PressableScale onPress={() => setQuery('')} haptic="light" scaleTo={0.85} hitSlop={10}>
            <Icon name="close" size={16} color={colors.textFaint} />
          </PressableScale>
        )}
      </View>

      {!hasQuery ? (
        <>
          <EmptyState
            icon="search"
            title="Search DartMasters"
            subtitle="Find a player by name, or a match by mode or opponent"
            fill={suggestedPlayers.length === 0}
          />
          {suggestedPlayers.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>PLAYERS</Text>
              {suggestedPlayers.map((p, i) => (
                <Animated.View key={p.id} entering={FadeInDown.delay(staggerDelay(i)).duration(240)}>
                  <PressableScale
                    scaleTo={PRESS_SCALE.row}
                    haptic="light"
                    onPress={() => navigation.navigate('PlayerProfile', { playerId: p.id })}
                    style={styles.row}
                  >
                    <PlayerAvatar name={p.name} color={p.color} avatar={p.avatar} photoUri={p.photoUri} size={44} />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={styles.name}>{p.name}</Text>
                      <Text style={styles.sub}>Player</Text>
                    </View>
                    <Icon name="chevronRight" size={18} color={colors.textFaint} />
                  </PressableScale>
                </Animated.View>
              ))}
            </>
          )}
        </>
      ) : !hasResults ? (
        <EmptyState icon="inbox" title="No results" subtitle={`Nothing matches "${query.trim()}"`} />
      ) : (
        <>
          {results.players.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>PLAYERS</Text>
              {results.players.map((r, i) => (
                <Animated.View
                  key={r.player.id}
                  entering={FadeInDown.delay(staggerDelay(Math.min(i, 8))).duration(240)}
                >
                  <PressableScale
                    scaleTo={PRESS_SCALE.row}
                    haptic="light"
                    onPress={() => navigation.navigate('PlayerProfile', { playerId: r.player.id })}
                    style={styles.row}
                  >
                    <PlayerAvatar
                      name={r.player.name}
                      color={r.player.color}
                      avatar={r.player.avatar}
                      photoUri={r.player.photoUri}
                      size={44}
                    />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={styles.name}>{r.player.name}</Text>
                      <Text style={styles.sub}>Player</Text>
                    </View>
                    <Icon name="chevronRight" size={18} color={colors.textFaint} />
                  </PressableScale>
                </Animated.View>
              ))}
            </>
          )}

          {results.matches.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, results.players.length > 0 && { marginTop: spacing.lg }]}>
                MATCHES
              </Text>
              {results.matches.map((r, i) => {
                const modeInfo = getGameModeInfo(r.match.gameType);
                return (
                  <Animated.View
                    key={r.match.id}
                    entering={FadeInDown.delay(staggerDelay(Math.min(i, 8))).duration(240)}
                  >
                    <PressableScale
                      scaleTo={PRESS_SCALE.row}
                      haptic="light"
                      onPress={() => navigation.navigate('MatchDetail', { matchId: r.match.id })}
                      style={styles.row}
                    >
                      <View style={[styles.iconCircle, { backgroundColor: modeInfo.color + '1F' }]}>
                        <Icon name={modeInfo.icon} size={18} color={modeInfo.color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={styles.name}>{modeInfo.title}</Text>
                        <Text style={styles.sub} numberOfLines={1}>
                          {r.participantNames.join(', ')}
                        </Text>
                      </View>
                      <Icon name="chevronRight" size={18} color={colors.textFaint} />
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: COLORS.card2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    paddingHorizontal: spacing.md,
    height: 46,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textPrimary,
    height: '100%',
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.sm,
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
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
