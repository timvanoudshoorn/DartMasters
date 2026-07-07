import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale } from '../components/primitives/PressableScale';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { OptionRow } from '../components/OptionRow';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { Screen } from '../components/Screen';
import { SwitchRow } from '../components/SwitchRow';
import { setSoundEnabled } from '../sound/soundManager';
import { AppSettings, MatchStorage, PlayerStorage, SettingsStorage } from '../storage/storage';
import { colors, fonts, spacing } from '../theme';
import { STAGGER_MS } from '../theme/motion';
import { Player } from '../types';

export function SettingsScreen() {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<AppSettings>(SettingsStorage.defaults);
  const [players, setPlayers] = useState<Player[]>([]);

  useFocusEffect(
    useCallback(() => {
      SettingsStorage.get().then(setSettings);
      PlayerStorage.getAll().then(setPlayers);
    }, [])
  );

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    SettingsStorage.save(next);
    if (patch.soundEnabled !== undefined) setSoundEnabled(patch.soundEnabled);
  };

  const removePlayer = (id: string, name: string) => {
    Alert.alert('Remove player', `Remove ${name}? Match history will be kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await PlayerStorage.remove(id);
          setPlayers((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  };

  const clearHistory = () => {
    Alert.alert('Clear all match history', 'This permanently deletes every saved match. Player profiles are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear History', style: 'destructive', onPress: () => MatchStorage.clear() },
    ]);
  };

  return (
    <Screen scroll>
      <Header title="Settings" subtitle="Defaults & data" onBack={() => navigation.goBack()} />

      <Animated.View entering={FadeInDown.duration(260)}>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.sectionTitle}>DEFAULT MATCH RULES</Text>
        <OptionRow
          label="Out"
          value={settings.defaultOutMode}
          onChange={(v) => update({ defaultOutMode: v })}
          options={[
            { value: 'double', label: 'Double Out' },
            { value: 'master', label: 'Master Out' },
            { value: 'straight', label: 'Straight Out' },
          ]}
        />
        <OptionRow
          label="In"
          value={settings.defaultInMode}
          onChange={(v) => update({ defaultInMode: v })}
          options={[
            { value: 'straight', label: 'Straight In' },
            { value: 'double', label: 'Double In' },
          ]}
        />
        <OptionRow
          label="Legs to win"
          value={settings.defaultLegsToWin}
          onChange={(v) => update({ defaultLegsToWin: v })}
          options={[1, 2, 3, 5, 7].map((n) => ({ value: n, label: `${n}` }))}
        />
        <OptionRow
          label="Sets to win"
          value={settings.defaultSetsToWin}
          onChange={(v) => update({ defaultSetsToWin: v })}
          options={[1, 2, 3, 5].map((n) => ({ value: n, label: `${n}` }))}
        />
        <SwitchRow
          label="Sound effects"
          value={settings.soundEnabled}
          onChange={(v) => update({ soundEnabled: v })}
        />
      </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_MS).duration(260)}>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.sectionTitle}>MANAGE PLAYERS</Text>
        {players.length === 0 ? (
          <Text style={styles.emptyText}>No players yet — add one from a game setup screen.</Text>
        ) : (
          players.map((p) => (
            <View key={p.id} style={styles.playerRow}>
              <PlayerAvatar name={p.name} color={p.color} avatar={p.avatar} photoUri={p.photoUri} size={32} />
              <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
              <PressableScale onPress={() => removePlayer(p.id, p.name)} hitSlop={10} haptic="tick" scaleTo={0.88} style={styles.deleteBtn}>
                <Icon name="delete" size={16} color={colors.neonRed} />
              </PressableScale>
            </View>
          ))
        )}
      </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_MS * 2).duration(260)}>
      <Card style={{ marginBottom: spacing.xl }}>
        <Text style={styles.sectionTitle}>DATA</Text>
        <Button label="CLEAR MATCH HISTORY" variant="danger" onPress={clearHistory} />
      </Card>
      </Animated.View>

      <Text style={styles.about}>DartMasters · Built for the throw</Text>
      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerName: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.bodySemibold,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  about: {
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
});
