import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { Icon } from '../components/icons/Icon';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { PressableScale } from '../components/primitives/PressableScale';
import { Screen } from '../components/Screen';
import { PlayersStackParamList } from '../navigation/types';
import { PlayerStorage } from '../storage/storage';
import { colors, fonts, radius, spacing } from '../theme';
import { COLORS } from '../theme/colors';
import { Player } from '../types';
import { generateId } from '../utils/id';

function deleteFileIfExists(uri: string) {
  try {
    new File(uri).delete();
  } catch {
    // file may already be gone — nothing to clean up
  }
}

type Route = { params: { playerId?: string } };

const EMOJI_OPTIONS = [
  '🎯', '🔥', '⚡', '👑', '💀', '🐉', '🦅', '🐺',
  '🦁', '🐯', '🦂', '🥇', '🚀', '⭐', '💎', '🍀',
  '🍺', '🎩', '🦾', '🤖', '👽', '🧨', '🃏', '🎮',
];

export function PlayerEditScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PlayersStackParamList>>();
  const route = useRoute() as unknown as Route;
  const editingId = route.params?.playerId;

  const [id] = useState(() => editingId ?? generateId());
  const [name, setName] = useState('');
  const [color, setColor] = useState(colors.playerPalette[0]);
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [createdAt, setCreatedAt] = useState(Date.now());

  useEffect(() => {
    if (editingId) {
      PlayerStorage.getAll().then((players) => {
        const p = players.find((x) => x.id === editingId);
        if (p) {
          setName(p.name);
          setColor(p.color);
          setAvatar(p.avatar);
          setPhotoUri(p.photoUri);
          setCreatedAt(p.createdAt);
        }
      });
    }
  }, [editingId]);

  const clearPhoto = () => {
    if (photoUri) deleteFileIfExists(photoUri);
    setPhotoUri(undefined);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set a player photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const avatarsDir = new Directory(Paths.document, 'avatars');
    if (!avatarsDir.exists) avatarsDir.create({ intermediates: true, idempotent: true });

    const destFile = new File(avatarsDir, `${id}-${Date.now()}.jpg`);
    new File(result.assets[0].uri).copy(destFile);

    if (photoUri) deleteFileIfExists(photoUri);
    setPhotoUri(destFile.uri);
    setAvatar(undefined);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const player: Player = {
      id,
      name: trimmed,
      color,
      avatar,
      photoUri,
      createdAt,
    };
    await PlayerStorage.save(player);
    navigation.goBack();
  };

  const remove = () => {
    if (!editingId) return;
    Alert.alert('Delete player', `Remove ${name}? Match history will be kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await PlayerStorage.remove(editingId);
          if (photoUri) deleteFileIfExists(photoUri);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Header title={editingId ? 'EDIT PLAYER' : 'NEW PLAYER'} onBack={() => navigation.goBack()} />

      <View style={styles.avatarPreview}>
        <PlayerAvatar name={name || '?'} color={color} avatar={avatar} photoUri={photoUri} size={88} active />
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Player name"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoFocus={!editingId}
      />

      <Text style={styles.label}>PHOTO</Text>
      <View style={styles.photoRow}>
        <PressableScale onPress={pickPhoto} haptic="light" scaleTo={0.95} style={styles.photoPickBtn}>
          <Icon name="userAdd" size={16} color={colors.primaryHot} />
          <Text style={styles.photoPickText}>{photoUri ? 'Change Photo' : 'Choose Photo'}</Text>
        </PressableScale>
        {photoUri && (
          <PressableScale onPress={clearPhoto} haptic="tick" scaleTo={0.88} style={styles.photoRemoveBtn} hitSlop={8}>
            <Icon name="delete" size={16} color={colors.danger} />
          </PressableScale>
        )}
      </View>

      <Text style={[styles.label, { marginTop: spacing.lg }]}>AVATAR</Text>
      <View style={styles.colorGrid}>
        <PressableScale
          onPress={() => {
            setAvatar(undefined);
            clearPhoto();
          }}
          haptic="tick"
          scaleTo={0.88}
          style={[styles.emojiSwatch, !avatar && !photoUri && styles.colorSwatchSelected]}
        >
          <Text style={styles.initialsPreview}>Aa</Text>
        </PressableScale>
        {EMOJI_OPTIONS.map((e) => (
          <PressableScale
            key={e}
            onPress={() => {
              setAvatar(e);
              clearPhoto();
            }}
            haptic="tick"
            scaleTo={0.88}
            style={[styles.emojiSwatch, avatar === e && styles.colorSwatchSelected]}
          >
            <Text style={styles.emojiText}>{e}</Text>
          </PressableScale>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: spacing.lg }]}>COLOR</Text>
      <View style={styles.colorGrid}>
        {colors.playerPalette.map((c) => (
          <PressableScale
            key={c}
            onPress={() => setColor(c)}
            haptic="tick"
            scaleTo={0.88}
            style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]}
          >
            {color === c && <Icon name="checkmark" size={18} color={colors.textPrimary} />}
          </PressableScale>
        ))}
      </View>

      <Button label="SAVE" size="lg" fullWidth onPress={save} style={{ marginTop: spacing.xl }} />
      {editingId && (
        <Button label="DELETE PLAYER" variant="danger" size="lg" fullWidth onPress={remove} style={{ marginTop: spacing.md }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarPreview: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  input: {
    backgroundColor: COLORS.card2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    fontFamily: fonts.bodySemibold,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  photoPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgCardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  photoPickText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  photoRemoveBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderColor: colors.textPrimary,
  },
  emojiSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: colors.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 20,
  },
  initialsPreview: {
    fontFamily: fonts.bodyExtraBold,
    color: colors.textMuted,
    fontSize: 13,
  },
});
