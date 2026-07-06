import { useCallback } from 'react';
import { haptic, hapticPattern } from './haptics';
import { playSound, SoundTrigger } from './soundManager';

// Each trigger fires its sound and haptic signature together so the audio
// and physical layers always reinforce each other.
const HAPTIC_MAP: Partial<Record<SoundTrigger, () => void>> = {
  dartScored: () => hapticPattern.dartHit(1),
  buttonTap: haptic.light,
  checkout: hapticPattern.checkout,
  oneEighty: hapticPattern.oneEighty,
  win: hapticPattern.win,
  bust: hapticPattern.bust,
  miss: hapticPattern.miss,
  killerEliminated: hapticPattern.eliminated,
  becomeKiller: hapticPattern.becomeKiller,
};

export function useSoundEffects() {
  return useCallback((trigger: SoundTrigger) => {
    playSound(trigger);
    HAPTIC_MAP[trigger]?.();
  }, []);
}
