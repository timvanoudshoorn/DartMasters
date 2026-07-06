import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { colors, fonts, radius, spacing } from '../theme';

interface QuickAddPlayerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function QuickAddPlayerSheet({ visible, onClose, onSubmit }: QuickAddPlayerSheetProps) {
  const [name, setName] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setName('');
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="New Player">
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Player name"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoFocus
        onSubmitEditing={submit}
      />
      <View style={styles.row}>
        <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
        <Button label="Add" onPress={submit} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    fontFamily: fonts.bodySemibold,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
