import { Audio, AVPlaybackStatus } from 'expo-av';

// iOS mutes app audio by default when the device's silent switch is on —
// without this, every announcer clip plays silently with no error.
Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  allowsRecordingIOS: false,
}).catch((err) => console.error('[dartAnnouncer] setAudioModeAsync failed:', err));

type ClipKey = `score_${number}` | 'bust' | 'game_on' | 'game_shot';

const SCORE_FILES: number[] = [
  require('../../assets/sounds/announcer/score_1.mp3'),
  require('../../assets/sounds/announcer/score_2.mp3'),
  require('../../assets/sounds/announcer/score_3.mp3'),
  require('../../assets/sounds/announcer/score_4.mp3'),
  require('../../assets/sounds/announcer/score_5.mp3'),
  require('../../assets/sounds/announcer/score_6.mp3'),
  require('../../assets/sounds/announcer/score_7.mp3'),
  require('../../assets/sounds/announcer/score_8.mp3'),
  require('../../assets/sounds/announcer/score_9.mp3'),
  require('../../assets/sounds/announcer/score_10.mp3'),
  require('../../assets/sounds/announcer/score_11.mp3'),
  require('../../assets/sounds/announcer/score_12.mp3'),
  require('../../assets/sounds/announcer/score_13.mp3'),
  require('../../assets/sounds/announcer/score_14.mp3'),
  require('../../assets/sounds/announcer/score_15.mp3'),
  require('../../assets/sounds/announcer/score_16.mp3'),
  require('../../assets/sounds/announcer/score_17.mp3'),
  require('../../assets/sounds/announcer/score_18.mp3'),
  require('../../assets/sounds/announcer/score_19.mp3'),
  require('../../assets/sounds/announcer/score_20.mp3'),
  require('../../assets/sounds/announcer/score_21.mp3'),
  require('../../assets/sounds/announcer/score_22.mp3'),
  require('../../assets/sounds/announcer/score_23.mp3'),
  require('../../assets/sounds/announcer/score_24.mp3'),
  require('../../assets/sounds/announcer/score_25.mp3'),
  require('../../assets/sounds/announcer/score_26.mp3'),
  require('../../assets/sounds/announcer/score_27.mp3'),
  require('../../assets/sounds/announcer/score_28.mp3'),
  require('../../assets/sounds/announcer/score_29.mp3'),
  require('../../assets/sounds/announcer/score_30.mp3'),
  require('../../assets/sounds/announcer/score_31.mp3'),
  require('../../assets/sounds/announcer/score_32.mp3'),
  require('../../assets/sounds/announcer/score_33.mp3'),
  require('../../assets/sounds/announcer/score_34.mp3'),
  require('../../assets/sounds/announcer/score_35.mp3'),
  require('../../assets/sounds/announcer/score_36.mp3'),
  require('../../assets/sounds/announcer/score_37.mp3'),
  require('../../assets/sounds/announcer/score_38.mp3'),
  require('../../assets/sounds/announcer/score_39.mp3'),
  require('../../assets/sounds/announcer/score_40.mp3'),
  require('../../assets/sounds/announcer/score_41.mp3'),
  require('../../assets/sounds/announcer/score_42.mp3'),
  require('../../assets/sounds/announcer/score_43.mp3'),
  require('../../assets/sounds/announcer/score_44.mp3'),
  require('../../assets/sounds/announcer/score_45.mp3'),
  require('../../assets/sounds/announcer/score_46.mp3'),
  require('../../assets/sounds/announcer/score_47.mp3'),
  require('../../assets/sounds/announcer/score_48.mp3'),
  require('../../assets/sounds/announcer/score_49.mp3'),
  require('../../assets/sounds/announcer/score_50.mp3'),
  require('../../assets/sounds/announcer/score_51.mp3'),
  require('../../assets/sounds/announcer/score_52.mp3'),
  require('../../assets/sounds/announcer/score_53.mp3'),
  require('../../assets/sounds/announcer/score_54.mp3'),
  require('../../assets/sounds/announcer/score_55.mp3'),
  require('../../assets/sounds/announcer/score_56.mp3'),
  require('../../assets/sounds/announcer/score_57.mp3'),
  require('../../assets/sounds/announcer/score_58.mp3'),
  require('../../assets/sounds/announcer/score_59.mp3'),
  require('../../assets/sounds/announcer/score_60.mp3'),
  require('../../assets/sounds/announcer/score_61.mp3'),
  require('../../assets/sounds/announcer/score_62.mp3'),
  require('../../assets/sounds/announcer/score_63.mp3'),
  require('../../assets/sounds/announcer/score_64.mp3'),
  require('../../assets/sounds/announcer/score_65.mp3'),
  require('../../assets/sounds/announcer/score_66.mp3'),
  require('../../assets/sounds/announcer/score_67.mp3'),
  require('../../assets/sounds/announcer/score_68.mp3'),
  require('../../assets/sounds/announcer/score_69.mp3'),
  require('../../assets/sounds/announcer/score_70.mp3'),
  require('../../assets/sounds/announcer/score_71.mp3'),
  require('../../assets/sounds/announcer/score_72.mp3'),
  require('../../assets/sounds/announcer/score_73.mp3'),
  require('../../assets/sounds/announcer/score_74.mp3'),
  require('../../assets/sounds/announcer/score_75.mp3'),
  require('../../assets/sounds/announcer/score_76.mp3'),
  require('../../assets/sounds/announcer/score_77.mp3'),
  require('../../assets/sounds/announcer/score_78.mp3'),
  require('../../assets/sounds/announcer/score_79.mp3'),
  require('../../assets/sounds/announcer/score_80.mp3'),
  require('../../assets/sounds/announcer/score_81.mp3'),
  require('../../assets/sounds/announcer/score_82.mp3'),
  require('../../assets/sounds/announcer/score_83.mp3'),
  require('../../assets/sounds/announcer/score_84.mp3'),
  require('../../assets/sounds/announcer/score_85.mp3'),
  require('../../assets/sounds/announcer/score_86.mp3'),
  require('../../assets/sounds/announcer/score_87.mp3'),
  require('../../assets/sounds/announcer/score_88.mp3'),
  require('../../assets/sounds/announcer/score_89.mp3'),
  require('../../assets/sounds/announcer/score_90.mp3'),
  require('../../assets/sounds/announcer/score_91.mp3'),
  require('../../assets/sounds/announcer/score_92.mp3'),
  require('../../assets/sounds/announcer/score_93.mp3'),
  require('../../assets/sounds/announcer/score_94.mp3'),
  require('../../assets/sounds/announcer/score_95.mp3'),
  require('../../assets/sounds/announcer/score_96.mp3'),
  require('../../assets/sounds/announcer/score_97.mp3'),
  require('../../assets/sounds/announcer/score_98.mp3'),
  require('../../assets/sounds/announcer/score_99.mp3'),
  require('../../assets/sounds/announcer/score_100.mp3'),
  require('../../assets/sounds/announcer/score_101.mp3'),
  require('../../assets/sounds/announcer/score_102.mp3'),
  require('../../assets/sounds/announcer/score_103.mp3'),
  require('../../assets/sounds/announcer/score_104.mp3'),
  require('../../assets/sounds/announcer/score_105.mp3'),
  require('../../assets/sounds/announcer/score_106.mp3'),
  require('../../assets/sounds/announcer/score_107.mp3'),
  require('../../assets/sounds/announcer/score_108.mp3'),
  require('../../assets/sounds/announcer/score_109.mp3'),
  require('../../assets/sounds/announcer/score_110.mp3'),
  require('../../assets/sounds/announcer/score_111.mp3'),
  require('../../assets/sounds/announcer/score_112.mp3'),
  require('../../assets/sounds/announcer/score_113.mp3'),
  require('../../assets/sounds/announcer/score_114.mp3'),
  require('../../assets/sounds/announcer/score_115.mp3'),
  require('../../assets/sounds/announcer/score_116.mp3'),
  require('../../assets/sounds/announcer/score_117.mp3'),
  require('../../assets/sounds/announcer/score_118.mp3'),
  require('../../assets/sounds/announcer/score_119.mp3'),
  require('../../assets/sounds/announcer/score_120.mp3'),
  require('../../assets/sounds/announcer/score_121.mp3'),
  require('../../assets/sounds/announcer/score_122.mp3'),
  require('../../assets/sounds/announcer/score_123.mp3'),
  require('../../assets/sounds/announcer/score_124.mp3'),
  require('../../assets/sounds/announcer/score_125.mp3'),
  require('../../assets/sounds/announcer/score_126.mp3'),
  require('../../assets/sounds/announcer/score_127.mp3'),
  require('../../assets/sounds/announcer/score_128.mp3'),
  require('../../assets/sounds/announcer/score_129.mp3'),
  require('../../assets/sounds/announcer/score_130.mp3'),
  require('../../assets/sounds/announcer/score_131.mp3'),
  require('../../assets/sounds/announcer/score_132.mp3'),
  require('../../assets/sounds/announcer/score_133.mp3'),
  require('../../assets/sounds/announcer/score_134.mp3'),
  require('../../assets/sounds/announcer/score_135.mp3'),
  require('../../assets/sounds/announcer/score_136.mp3'),
  require('../../assets/sounds/announcer/score_137.mp3'),
  require('../../assets/sounds/announcer/score_138.mp3'),
  require('../../assets/sounds/announcer/score_139.mp3'),
  require('../../assets/sounds/announcer/score_140.mp3'),
  require('../../assets/sounds/announcer/score_141.mp3'),
  require('../../assets/sounds/announcer/score_142.mp3'),
  require('../../assets/sounds/announcer/score_143.mp3'),
  require('../../assets/sounds/announcer/score_144.mp3'),
  require('../../assets/sounds/announcer/score_145.mp3'),
  require('../../assets/sounds/announcer/score_146.mp3'),
  require('../../assets/sounds/announcer/score_147.mp3'),
  require('../../assets/sounds/announcer/score_148.mp3'),
  require('../../assets/sounds/announcer/score_149.mp3'),
  require('../../assets/sounds/announcer/score_150.mp3'),
  require('../../assets/sounds/announcer/score_151.mp3'),
  require('../../assets/sounds/announcer/score_152.mp3'),
  require('../../assets/sounds/announcer/score_153.mp3'),
  require('../../assets/sounds/announcer/score_154.mp3'),
  require('../../assets/sounds/announcer/score_155.mp3'),
  require('../../assets/sounds/announcer/score_156.mp3'),
  require('../../assets/sounds/announcer/score_157.mp3'),
  require('../../assets/sounds/announcer/score_158.mp3'),
  require('../../assets/sounds/announcer/score_159.mp3'),
  require('../../assets/sounds/announcer/score_160.mp3'),
  require('../../assets/sounds/announcer/score_161.mp3'),
  require('../../assets/sounds/announcer/score_162.mp3'),
  require('../../assets/sounds/announcer/score_163.mp3'),
  require('../../assets/sounds/announcer/score_164.mp3'),
  require('../../assets/sounds/announcer/score_165.mp3'),
  require('../../assets/sounds/announcer/score_166.mp3'),
  require('../../assets/sounds/announcer/score_167.mp3'),
  require('../../assets/sounds/announcer/score_168.mp3'),
  require('../../assets/sounds/announcer/score_169.mp3'),
  require('../../assets/sounds/announcer/score_170.mp3'),
  require('../../assets/sounds/announcer/score_171.mp3'),
  require('../../assets/sounds/announcer/score_172.mp3'),
  require('../../assets/sounds/announcer/score_173.mp3'),
  require('../../assets/sounds/announcer/score_174.mp3'),
  require('../../assets/sounds/announcer/score_175.mp3'),
  require('../../assets/sounds/announcer/score_176.mp3'),
  require('../../assets/sounds/announcer/score_177.mp3'),
  require('../../assets/sounds/announcer/score_178.mp3'),
  require('../../assets/sounds/announcer/score_179.mp3'),
  require('../../assets/sounds/announcer/score_180.mp3'),
];

const ANNOUNCER_FILES: Record<ClipKey, number> = SCORE_FILES.reduce(
  (acc, file, i) => {
    acc[`score_${i + 1}`] = file;
    return acc;
  },
  {
    bust: require('../../assets/sounds/announcer/bust.mp3'),
    game_on: require('../../assets/sounds/announcer/game_on.mp3'),
    game_shot: require('../../assets/sounds/announcer/game_shot.mp3'),
  } as Record<ClipKey, number>
);

const clips = new Map<ClipKey, Audio.Sound>();
let currentSound: Audio.Sound | null = null;
let sequenceToken = 0;

/** Preload every announcer clip up front so playback has zero delay on first trigger. */
export async function preloadAnnouncerSounds(): Promise<void> {
  await Promise.all(
    (Object.keys(ANNOUNCER_FILES) as ClipKey[]).map(async (clip) => {
      try {
        const { sound } = await Audio.Sound.createAsync(ANNOUNCER_FILES[clip]);
        clips.set(clip, sound);
      } catch (err) {
        console.error(`[dartAnnouncer] Failed to load clip "${clip}":`, err);
      }
    })
  );
}

function waitForClipToFinish(sound: Audio.Sound, token: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      sound.setOnPlaybackStatusUpdate(null);
      resolve();
    };

    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (token !== sequenceToken) {
        finish();
        return;
      }
      if (!status.isLoaded) return;
      if (status.didJustFinish) finish();
    });

    sound
      .setPositionAsync(0)
      .then(() => sound.playAsync())
      .catch(() => finish());
  });
}

async function playClip(clipKey: ClipKey): Promise<void> {
  const token = ++sequenceToken;

  if (currentSound) {
    const previous = currentSound;
    currentSound = null;
    try {
      previous.setOnPlaybackStatusUpdate(null);
      await previous.stopAsync();
    } catch {
      // ignore — previous clip may have already finished
    }
  }

  const sound = clips.get(clipKey);
  if (!sound) return;
  if (token !== sequenceToken) return;

  currentSound = sound;
  await waitForClipToFinish(sound, token);
  if (token === sequenceToken) currentSound = null;
}

export function announceScore(total: number, isBust: boolean): void {
  if (isBust) {
    playClip('bust');
    return;
  }
  if (total < 1 || total > 180) return;
  playClip(`score_${total}`);
}

export function announceGameOn(): void {
  playClip('game_on');
}

export function announceGameShot(): void {
  playClip('game_shot');
}

export function cancelAnnouncements(): void {
  sequenceToken++;
  if (currentSound) {
    currentSound.setOnPlaybackStatusUpdate(null);
    currentSound.stopAsync().catch(() => {});
    currentSound = null;
  }
}
