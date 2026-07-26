import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Button } from '../components/Button';
import { PressableScale } from '../components/primitives/PressableScale';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { OptionRow } from '../components/OptionRow';
import { iconAvatar } from '../components/PlayerAvatar';
import { PlayerSelectGrid } from '../components/PlayerSelectGrid';
import { QuickAddPlayerSheet } from '../components/QuickAddPlayerSheet';
import { Screen } from '../components/Screen';
import { SwitchRow } from '../components/SwitchRow';
import { createBracket, isTournamentComplete } from '../logic/tournament';
import { RootStackParamList } from '../navigation/types';
import { PlayerStorage } from '../storage/storage';
import { TournamentStorage } from '../storage/tournament';
import { colors, fonts, playerColor, radius, spacing, typography } from '../theme';
import { reducedMs } from '../theme/motion';
import { GameConfig, GameType, InMode, OutMode, Player, Tournament } from '../types';
import { generateId } from '../utils/id';

const MAX_PLAYERS = 16;
const MIN_PLAYERS = 2;

const GUEST_AVATARS = [
  iconAvatar('target'),
  iconAvatar('flame'),
  iconAvatar('bolt'),
  iconAvatar('crosshair'),
  iconAvatar('shield'),
  iconAvatar('crown'),
  iconAvatar('star'),
  iconAvatar('rocket'),
];

// Kept deliberately small: a tournament needs a format with an unambiguous
// per-matchup winner, so it reuses the same X01/Cricket settings from
// GameSetupScreen rather than the full mode list.
const TOURNAMENT_GAME_TYPES: { type: GameType; label: string }[] = [
  { type: '501', label: '501' },
  { type: '301', label: '301' },
  { type: '201', label: '201' },
  { type: 'cricket', label: 'Cricket' },
];

interface GuestEntry {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export function TournamentSetupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const [gameType, setGameType] = useState<GameType>('501');
  const [legsToWin, setLegsToWin] = useState(3);
  const [outMode, setOutMode] = useState<OutMode>('double');
  const [inMode, setInMode] = useState<InMode>('straight');
  const [cutThroat, setCutThroat] = useState(false);

  useFocusEffect(
    useCallback(() => {
      PlayerStorage.getAll()
        .then(setPlayers)
        .catch((err) => {
          console.error('[TournamentSetupScreen] Failed to load players:', err);
          setPlayers([]);
        });
    }, [])
  );

  const atCap = selectedIds.length >= MAX_PLAYERS;
  const isX01Like = gameType === '501' || gameType === '301' || gameType === '201';
  const canGenerate = selectedIds.length >= MIN_PLAYERS;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PLAYERS) return prev;
      return [...prev, id];
    });
  };

  const addPlayer = async (name: string) => {
    const player: Player = {
      id: generateId(),
      name,
      color: playerColor(players.length),
      createdAt: Date.now(),
    };
    await PlayerStorage.save(player);
    setPlayers((prev) => [...prev, player]);
    setSelectedIds((prev) => (prev.length >= MAX_PLAYERS ? prev : [...prev, player.id]));
    setAddOpen(false);
  };

  const addGuest = () => {
    if (atCap) return;
    const n = guests.length + 1;
    const guest: GuestEntry = {
      id: `guest-${generateId()}`,
      name: `Guest ${n}`,
      color: playerColor(players.length + guests.length),
      avatar: GUEST_AVATARS[(n - 1) % GUEST_AVATARS.length],
    };
    setGuests((prev) => [...prev, guest]);
    setSelectedIds((prev) => [...prev, guest.id]);
  };

  const removeGuest = (id: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const generateBracket = async () => {
    if (!canGenerate) return;

    const guestPlayers = guests.length
      ? Object.fromEntries(guests.map((g) => [g.id, { name: g.name, color: g.color, avatar: g.avatar }]))
      : undefined;

    const formatConfig: Omit<GameConfig, 'playerIds' | 'guestPlayers'> = {
      gameType,
      legsToWin,
      setsToWin: 1,
      startingScore: gameType === '501' ? 501 : gameType === '301' ? 301 : gameType === '201' ? 201 : undefined,
      outMode,
      inMode,
      cutThroat: gameType === 'cricket' ? cutThroat : undefined,
    };

    const rounds = createBracket(selectedIds);
    const modeLabel = TOURNAMENT_GAME_TYPES.find((g) => g.type === gameType)?.label ?? gameType;

    const tournament: Tournament = {
      id: generateId(),
      name: `${modeLabel} Knockout`,
      gameType,
      formatConfig,
      playerIds: selectedIds,
      guestPlayers,
      rounds,
      status: 'inProgress',
      createdAt: Date.now(),
    };

    if (isTournamentComplete(tournament)) {
      tournament.status = 'completed';
      tournament.winnerId = tournament.rounds[tournament.rounds.length - 1].matchups[0].winnerId ?? null;
      tournament.completedAt = Date.now();
    }

    await TournamentStorage.save(tournament);
    navigation.replace('TournamentBracket', { tournamentId: tournament.id });
  };

  return (
    <Screen scroll>
      <Header title="New Tournament" subtitle="Single elimination bracket" onBack={() => navigation.goBack()} />

      <Animated.View entering={FadeInDown.delay(reducedMs(60)).duration(280)}>
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PLAYERS</Text>
            <Text style={styles.countBadge}>{selectedIds.length}/{MAX_PLAYERS}</Text>
          </View>
          <PlayerSelectGrid
            players={players}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            onAddPress={() => setAddOpen(true)}
          />

          {guests.length > 0 && (
            <View style={styles.guestRow}>
              {guests.map((g) => (
                <Animated.View key={g.id} entering={FadeIn.duration(200)} style={[styles.guestChip, { borderColor: g.color }]}>
                  <Icon name="person" size={16} color={g.color} />
                  <Text style={styles.guestName}>{g.name}</Text>
                  <PressableScale onPress={() => removeGuest(g.id)} haptic="tick" scaleTo={0.85} hitSlop={8}>
                    <Icon name="close" size={14} color={colors.textMuted} />
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
          )}

          <PressableScale
            onPress={addGuest}
            disabled={atCap}
            haptic="light"
            scaleTo={0.96}
            style={[styles.guestAddBtn, atCap && { opacity: 0.4 }]}
          >
            <Icon name="userAdd" size={16} color={colors.secondary} />
            <Text style={styles.guestAddText}>QUICK GUEST (not saved to profile)</Text>
          </PressableScale>

          <Text style={styles.hint}>
            {selectedIds.length >= MIN_PLAYERS
              ? 'Seeding is randomized when the bracket is generated'
              : `Select at least ${MIN_PLAYERS} players`}
          </Text>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(reducedMs(140)).duration(280)}>
        <Card>
          <Text style={styles.sectionTitle}>MATCH FORMAT</Text>
          <Text style={styles.hint}>Every round is played with this format</Text>

          <OptionRow
            label="Game"
            value={gameType}
            onChange={setGameType}
            options={TOURNAMENT_GAME_TYPES.map((g) => ({ value: g.type, label: g.label }))}
          />

          {isX01Like && (
            <>
              <OptionRow
                label="Out"
                value={outMode}
                onChange={setOutMode}
                options={[
                  { value: 'double', label: 'Double Out' },
                  { value: 'master', label: 'Master Out' },
                  { value: 'straight', label: 'Straight Out' },
                ]}
              />
              <OptionRow
                label="In"
                value={inMode}
                onChange={setInMode}
                options={[
                  { value: 'straight', label: 'Straight In' },
                  { value: 'double', label: 'Double In' },
                ]}
              />
            </>
          )}

          <OptionRow
            label="Legs to win (per match)"
            value={legsToWin}
            onChange={setLegsToWin}
            options={[1, 2, 3, 5].map((n) => ({ value: n, label: `${n}` }))}
          />

          {gameType === 'cricket' && (
            <SwitchRow label="Cut-throat" value={cutThroat} onChange={setCutThroat} />
          )}
        </Card>
      </Animated.View>

      <View style={{ height: spacing.xl }} />
      <Button
        label="GENERATE BRACKET"
        size="lg"
        fullWidth
        disabled={!canGenerate}
        onPress={generateBracket}
        style={{ marginBottom: spacing.xl }}
      />

      <QuickAddPlayerSheet visible={addOpen} onClose={() => setAddOpen(false)} onSubmit={addPlayer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
  },
  countBadge: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  hint: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  guestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  guestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.bgCardAlt,
    borderWidth: 1.5,
  },
  guestName: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
  },
  guestAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.secondary + '55',
    borderStyle: 'dashed',
    alignSelf: 'flex-start',
  },
  guestAddText: {
    color: colors.secondary,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
