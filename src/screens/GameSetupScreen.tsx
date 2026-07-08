import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Button } from '../components/Button';
import { PressableScale } from '../components/primitives/PressableScale';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { OptionRow } from '../components/OptionRow';
import { iconAvatar, PlayerAvatar } from '../components/PlayerAvatar';
import { PlayerSelectGrid } from '../components/PlayerSelectGrid';
import { QuickAddPlayerSheet } from '../components/QuickAddPlayerSheet';
import { Screen } from '../components/Screen';
import { SwitchRow } from '../components/SwitchRow';
import { getGameModeInfo } from '../data/gameModes';
import { BOT_DIFFICULTIES, BOT_PROFILES } from '../logic/bot';
import { RootStackParamList } from '../navigation/types';
import { PlayerStorage, SettingsStorage } from '../storage/storage';
import { colors, fonts, playerColor, radius, spacing, typography } from '../theme';
import { BotDifficulty, GameConfig, InMode, OutMode, Player } from '../types';
import { generateId } from '../utils/id';
import { shuffled } from '../utils/shuffle';

type Route = { params: { gameType: GameConfig['gameType'] } };

const MAX_PLAYERS = 8;
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
const BOT_UNSUPPORTED_MODES: GameConfig['gameType'][] = ['practice170', 'bobs27'];

interface GuestEntry {
  id: string;
  name: string;
  color: string;
  avatar: string;
  isBot?: boolean;
  botDifficulty?: BotDifficulty;
}

export function GameSetupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute() as unknown as Route;
  const { gameType } = route.params;
  const modeInfo = getGameModeInfo(gameType);

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [pickingBotDifficulty, setPickingBotDifficulty] = useState(false);

  const [legsToWin, setLegsToWin] = useState(3);
  const [setsToWin, setSetsToWin] = useState(1);
  const [outMode, setOutMode] = useState<OutMode>('double');
  const [inMode, setInMode] = useState<InMode>('straight');
  const [cutThroat, setCutThroat] = useState(false);
  const [livesPerPlayer, setLivesPerPlayer] = useState(5);
  const [skipAhead, setSkipAhead] = useState(true);
  const [shanghaiRounds, setShanghaiRounds] = useState(7);
  const [startingScore, setStartingScore] = useState(501);
  const [bullOff, setBullOff] = useState(true);

  useFocusEffect(
    useCallback(() => {
      PlayerStorage.getAll().then(setPlayers);
    }, [])
  );

  useEffect(() => {
    SettingsStorage.get().then((s) => {
      setLegsToWin(gameType === 'aroundTheClock' ? 1 : s.defaultLegsToWin);
      setSetsToWin(s.defaultSetsToWin);
      setOutMode(s.defaultOutMode);
      setInMode(s.defaultInMode);
    });
  }, []);

  const atCap = selectedIds.length >= MAX_PLAYERS;

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

  const addBot = (difficulty: BotDifficulty) => {
    setPickingBotDifficulty(false);
    if (atCap) return;
    const n = guests.length + 1;
    const guest: GuestEntry = {
      id: `bot-${generateId()}`,
      name: `Bot · ${BOT_PROFILES[difficulty].label}`,
      color: playerColor(players.length + guests.length),
      avatar: iconAvatar('robot'),
      isBot: true,
      botDifficulty: difficulty,
    };
    setGuests((prev) => [...prev, guest]);
    setSelectedIds((prev) => [...prev, guest.id]);
  };

  const minPlayers = gameType === 'killer' ? 2 : 1;
  const canStart = selectedIds.length >= minPlayers;
  const isX01Like = isX01(gameType);
  const botSupported = !BOT_UNSUPPORTED_MODES.includes(gameType);

  const startGame = () => {
    const guestPlayers = guests.length
      ? Object.fromEntries(
          guests.map((g) => [
            g.id,
            { name: g.name, color: g.color, avatar: g.avatar, isBot: g.isBot, botDifficulty: g.botDifficulty },
          ])
        )
      : undefined;

    const config: GameConfig = {
      gameType,
      playerIds: selectedIds,
      legsToWin,
      setsToWin: isX01Like ? setsToWin : 1,
      startingScore: gameType === '501' ? startingScore : gameType === '301' ? 301 : gameType === '201' ? 201 : gameType === 'practice170' ? 170 : undefined,
      outMode,
      inMode,
      livesPerPlayer: gameType === 'killer' ? livesPerPlayer : undefined,
      atcDoublesMode: gameType === 'aroundTheClock' ? skipAhead : undefined,
      shanghaiRounds: gameType === 'shanghai' ? shanghaiRounds : undefined,
      cutThroat: gameType === 'cricket' ? cutThroat : undefined,
      bullOff: gameType === 'killer' ? undefined : bullOff,
      guestPlayers,
    };

    if (gameType === 'killer') {
      navigation.navigate('Game', { config });
      return;
    }

    // Bull off only has a meaningful decision to make when 2+ humans are present
    // to actually throw against each other. Otherwise there's nothing to tap —
    // skip the screen and resolve the order automatically.
    const humanIds = config.playerIds.filter((id) => !guestPlayers?.[id]?.isBot);
    if (!config.bullOff || humanIds.length <= 1) {
      navigation.navigate('Game', { config: { ...config, playerIds: shuffled(config.playerIds) } });
    } else {
      navigation.navigate('BullOff', { config });
    }
  };

  return (
    <Screen scroll>
      <Header title={modeInfo.title} subtitle={modeInfo.subtitle} onBack={() => navigation.goBack()} />

      <Animated.View entering={FadeInDown.delay(60).duration(280)}>
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
                <PlayerAvatar name={g.name} color={g.color} avatar={g.avatar} size={26} />
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

        {botSupported && (
          <PressableScale
            onPress={() => setPickingBotDifficulty((v) => !v)}
            disabled={atCap}
            haptic="light"
            scaleTo={0.96}
            style={[styles.guestAddBtn, { marginTop: spacing.sm, borderColor: colors.primaryHot + '55' }, atCap && { opacity: 0.4 }]}
          >
            <Icon name="robot" size={16} color={colors.primaryHot} />
            <Text style={[styles.guestAddText, { color: colors.primaryHot }]}>ADD BOT OPPONENT</Text>
          </PressableScale>
        )}

        {pickingBotDifficulty && (
          <View style={styles.botDifficultyRow}>
            {BOT_DIFFICULTIES.map((d, i) => (
              <Animated.View key={d} entering={FadeInDown.delay(i * 40).duration(200)}>
                <PressableScale onPress={() => addBot(d)} haptic="tick" scaleTo={0.94} style={styles.botDifficultyChip}>
                  <Text style={styles.botDifficultyLabel}>{BOT_PROFILES[d].label}</Text>
                  <Text style={styles.botDifficultySub}>~{BOT_PROFILES[d].avgTarget} avg</Text>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        )}

        {selectedIds.length > 0 && <Text style={styles.hint}>Throw order follows selection order</Text>}
        {atCap && <Text style={[styles.hint, { color: colors.warning }]}>Maximum {MAX_PLAYERS} players reached</Text>}
      </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).duration(280)}>
      <Card>
        <Text style={styles.sectionTitle}>MATCH SETTINGS</Text>

        {gameType !== 'killer' && (
          <SwitchRow label="Bull off to start" value={bullOff} onChange={setBullOff} />
        )}

        {isX01Like && (
          <>
            {gameType === '501' && (
              <OptionRow
                label="Starting score"
                value={startingScore}
                onChange={setStartingScore}
                options={[501, 301, 201].map((n) => ({ value: n, label: `${n}` }))}
              />
            )}
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
            <OptionRow
              label="Legs to win"
              value={legsToWin}
              onChange={setLegsToWin}
              options={[1, 2, 3, 5, 7].map((n) => ({ value: n, label: `${n}` }))}
            />
            <SwitchRow
              label="Play multiple sets"
              value={setsToWin > 1}
              onChange={(v) => setSetsToWin(v ? 3 : 1)}
            />
            {setsToWin > 1 && (
              <OptionRow
                label="Sets to win"
                value={setsToWin}
                onChange={setSetsToWin}
                options={[2, 3, 5].map((n) => ({ value: n, label: `${n}` }))}
              />
            )}
          </>
        )}

        {gameType === 'practice170' && (
          <OptionRow
            label="Legs to win"
            value={legsToWin}
            onChange={setLegsToWin}
            options={[1, 3, 5, 7, 10].map((n) => ({ value: n, label: `${n}` }))}
          />
        )}

        {(gameType === 'cricket' || gameType === 'aroundTheClock') && (
          <OptionRow
            label="Legs to win"
            value={legsToWin}
            onChange={setLegsToWin}
            options={[1, 3, 5, 7].map((n) => ({ value: n, label: `${n}` }))}
          />
        )}

        {gameType === 'cricket' && (
          <OptionRow
            label="Variant"
            value={cutThroat ? 'cut' : 'standard'}
            onChange={(v) => setCutThroat(v === 'cut')}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'cut', label: 'Cut-Throat' },
            ]}
          />
        )}

        {gameType === 'aroundTheClock' && (
          <OptionRow
            label="Variant"
            value={skipAhead ? 'skip' : 'simple'}
            onChange={(v) => setSkipAhead(v === 'skip')}
            options={[
              { value: 'simple', label: 'Any hit advances 1' },
              { value: 'skip', label: 'D/T skip ahead' },
            ]}
          />
        )}

        {gameType === 'killer' && (
          <OptionRow
            label="Lives per player"
            value={livesPerPlayer}
            onChange={setLivesPerPlayer}
            options={[3, 5, 7].map((n) => ({ value: n, label: `${n}` }))}
          />
        )}

        {gameType === 'shanghai' && (
          <OptionRow
            label="Rounds"
            value={shanghaiRounds}
            onChange={setShanghaiRounds}
            options={[
              { value: 7, label: '7 (1-7)' },
              { value: 20, label: '20 (1-20)' },
            ]}
          />
        )}

        {gameType === 'bobs27' && <Text style={styles.hint}>20 rounds, doubles 1 through 20. Highest score wins.</Text>}
      </Card>
      </Animated.View>

      <View style={{ height: spacing.xl }} />
      <Button
        label={`START ${modeInfo.title.toUpperCase()}`}
        size="lg"
        fullWidth
        disabled={!canStart}
        onPress={startGame}
        style={{ marginBottom: spacing.xl }}
      />

      <QuickAddPlayerSheet visible={addOpen} onClose={() => setAddOpen(false)} onSubmit={addPlayer} />
    </Screen>
  );
}

function isX01(gameType: GameConfig['gameType']) {
  return gameType === '501' || gameType === '301' || gameType === '201';
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  countBadge: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  hint: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: spacing.md,
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
  botDifficultyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  botDifficultyChip: {
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  botDifficultyLabel: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
  },
  botDifficultySub: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    marginTop: 1,
  },
});
