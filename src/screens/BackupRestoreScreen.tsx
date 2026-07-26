import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { Screen } from '../components/Screen';
import { exportAllData, exportAllDataAsJson, importAllData } from '../logic/backup';
import { SettingsStorage } from '../storage/storage';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';

export function BackupRestoreScreen() {
  const navigation = useNavigation();
  const [exporting, setExporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

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
      await SettingsStorage.save({ ...settings, lastBackupAt: Date.now() });
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
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
