import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { Screen } from '../components/Screen';
import { exportAllData, exportAllDataAsJson, importAllData } from '../logic/backup';
import { SettingsStorage } from '../storage/storage';
import { colors, fonts, radius, spacing, typography } from '../theme';
import { COLORS } from '../theme/colors';

// Days since the last backup after which the timestamp gets a soft visual
// nudge (not an alert/nag — just a warmer text color) rather than the
// default muted tone. "Never backed up" always uses the nudge tone too.
const STALE_BACKUP_DAYS = 14;

// Small local relative-time formatter — the app has no shared "X ago" util
// elsewhere (other screens just show full dates, e.g. MatchDetailScreen's
// `new Date(match.date).toLocaleString()`), so this stays a one-off here
// rather than introducing a new shared module for a single call site.
function formatLastBackup(lastBackupAt: number | null): string {
  if (lastBackupAt == null) return 'Never backed up';

  const diffMs = Date.now() - lastBackupAt;
  const minutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (minutes < 1) return 'Backed up just now';
  if (minutes < 60) return `Backed up ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `Backed up ${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days === 1) return 'Backed up yesterday';
  if (days < 14) return `Backed up ${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `Backed up ${weeks} week${weeks === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  return `Backed up ${months} month${months === 1 ? '' : 's'} ago`;
}

export function BackupRestoreScreen() {
  const navigation = useNavigation();
  const [exporting, setExporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      SettingsStorage.get().then((settings) => {
        if (!cancelled) setLastBackupAt(settings.lastBackupAt ?? null);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const isStale =
    lastBackupAt == null || Date.now() - lastBackupAt > STALE_BACKUP_DAYS * 24 * 60 * 60 * 1000;

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportAllData();
      const json = exportAllDataAsJson(data);
      // No expo-sharing / file-system share dependency installed — RN's
      // built-in Share API shares the JSON directly as text, which every
      // platform's share sheet can save to Files, send via email/AirDrop, etc.
      await Share.share({
        message: json,
        title: 'DartMasters Backup',
      });
      // Share.share resolving without throwing is this screen's existing
      // definition of export success (it doesn't inspect the share sheet's
      // result action) — record the timestamp at the same point.
      const settings = await SettingsStorage.get();
      const savedAt = Date.now();
      await SettingsStorage.save({ ...settings, lastBackupAt: savedAt });
      setLastBackupAt(savedAt);
    } catch (err) {
      console.error('[BackupRestoreScreen] Export failed:', err);
      Alert.alert('Export failed', 'Something went wrong creating the backup. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      await importAllData(importText.trim());
      Alert.alert('Restore complete', 'Your data has been restored from the backup.');
      setImportText('');
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong restoring the backup.';
      Alert.alert('Restore failed', message);
    } finally {
      setImporting(false);
    }
  };

  const handleImportPress = () => {
    const trimmed = importText.trim();
    if (!trimmed) {
      Alert.alert('Paste a backup first', 'Paste the exported backup JSON into the box above, then try again.');
      return;
    }
    Alert.alert(
      'Overwrite existing data?',
      'Restoring this backup will overwrite your current players, match history, and settings on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: runImport },
      ]
    );
  };

  return (
    <Screen scroll>
      <Header title="Backup & Restore" subtitle="Export or import your data" onBack={() => navigation.goBack()} />

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.sectionTitle}>EXPORT</Text>
        <Text style={styles.bodyText}>
          Save every player, match, and setting on this device to a single backup file you can share or store
          somewhere safe.
        </Text>
        <Button
          label={exporting ? 'PREPARING…' : 'EXPORT DATA'}
          onPress={handleExport}
          disabled={exporting}
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
        <View style={styles.lastBackupRow}>
          <Icon
            name={isStale ? 'alertCircle' : 'checkmark'}
            size={13}
            color={isStale ? COLORS.accentHot : colors.textFaint}
          />
          <Text style={[styles.lastBackupText, isStale && styles.lastBackupTextStale]}>
            {formatLastBackup(lastBackupAt)}
          </Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>IMPORT</Text>
        <Text style={styles.bodyText}>
          Paste a previously exported backup below. Restoring overwrites the players, matches, and settings
          currently on this device.
        </Text>
        <TextInput
          value={importText}
          onChangeText={setImportText}
          placeholder="Paste exported backup JSON here"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          label={importing ? 'RESTORING…' : 'IMPORT DATA'}
          variant="danger"
          onPress={handleImportPress}
          disabled={importing || !importText.trim()}
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
      </Card>

      <View style={styles.noteRow}>
        <Icon name="share" size={14} color={colors.textFaint} />
        <Text style={styles.note}>Backups are plain JSON — keep them somewhere private.</Text>
      </View>

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  bodyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  input: {
    backgroundColor: COLORS.card2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 12,
    fontFamily: fonts.body,
    marginTop: spacing.lg,
    minHeight: 140,
  },
  lastBackupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  lastBackupText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textFaint,
  },
  lastBackupTextStale: {
    color: COLORS.accentHot,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  note: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textFaint,
  },
});
