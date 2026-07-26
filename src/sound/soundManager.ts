import { Audio } from 'expo-av';

// Single authoritative owner of the native audio session mode. Both gameplay
// SFX (this module) and the announcer (dartAnnouncer.ts) share one physical
// AVAudioSession on iOS — if two modules independently call
// Audio.setAudioModeAsync(), whichever call's native bridge round-trip
// resolves last wins, and previously dartAnnouncer.ts made its own
// module-load-time call in addition to App.tsx's launch-effect call. They
// happened to carry identical values so they didn't fight in practice, but
// call it here — once, awaited before anything preloads or plays — so there
// is exactly one place that owns this and no ordering ambiguity.
// playsInSilentModeIOS: true is what makes both SFX and the announcer play
// audibly with the iOS hardware silent switch on; it must not be dropped or
// overridden by a later call that omits it.
export async function configureAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (err) {
    console.error('[soundManager] configureAudioMode failed:', err);
  }
}

export type SoundTrigger =
  | 'dartScored'
  | 'bust'
  | 'checkout'
  | 'win'
  | 'miss'
  | 'buttonTap'
  | 'oneEighty'
  | 'killerEliminated'
  | 'becomeKiller';

const SOUND_FILES: Partial<Record<SoundTrigger, number>> = {
  dartScored: require('../../assets/sfx/dart_hit.mp3'),
  bust: require('../../assets/sfx/bust.mp3'),
  checkout: require('../../assets/sfx/checkout.mp3'),
  win: require('../../assets/sfx/win.mp3'),
  oneEighty: require('../../assets/sfx/max_score.mp3'),
  killerEliminated: require('../../assets/sfx/eliminated.mp3'),
  becomeKiller: require('../../assets/sfx/killer.mp3'),
};

// Balanced playback levels so no single effect overpowers another.
const SOUND_VOLUME: Partial<Record<SoundTrigger, number>> = {
  dartScored: 0.6,
  bust: 0.65,
  checkout: 0.35,
  win: 0.7,
  oneEighty: 0.75,
  killerEliminated: 0.6,
  becomeKiller: 0.55,
};

// Some source recordings run longer than the moment they're scoring — cap
// playback so they read as a short burst/stinger instead of a full clip.
const SOUND_MAX_DURATION_MS: Partial<Record<SoundTrigger, number>> = {
  win: 2800,
  oneEighty: 2200,
};

let soundEnabled = true;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

const cache: Partial<Record<SoundTrigger, Audio.Sound>> = {};

async function loadSound(trigger: SoundTrigger): Promise<Audio.Sound | null> {
  const existing = cache[trigger];
  if (existing) return existing;

  const asset = SOUND_FILES[trigger];
  if (!asset) return null;

  const { sound } = await Audio.Sound.createAsync(asset, { volume: SOUND_VOLUME[trigger] ?? 1 });
  cache[trigger] = sound;
  return sound;
}

/** Preload every bundled sound effect up front so playback has zero delay on first trigger. */
export async function preloadSounds(): Promise<void> {
  await Promise.all(
    (Object.keys(SOUND_FILES) as SoundTrigger[]).map((trigger) => loadSound(trigger).catch(() => null))
  );
}

export function playSound(trigger: SoundTrigger) {
  if (!soundEnabled) return;
  const asset = SOUND_FILES[trigger];
  if (!asset) return;

  loadSound(trigger)
    .then(async (sound) => {
      if (!sound) return;
      try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
        const maxDuration = SOUND_MAX_DURATION_MS[trigger];
        if (maxDuration) {
          setTimeout(() => {
            sound.stopAsync().catch(() => {});
          }, maxDuration);
        }
      } catch {
        // playback is best-effort — never block gameplay on audio failures
      }
    })
    .catch(() => {
      // playback is best-effort — never block gameplay on audio failures
    });
}
