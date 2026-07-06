import { IconName } from '../components/icons/Icon';
import { colors } from '../theme';
import { GameType } from '../types';

export interface GameModeInfo {
  type: GameType;
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  selectable?: boolean; // false = kept only for historical match lookups, hidden from mode select
}

export const GAME_MODES: GameModeInfo[] = [
  { type: '501', title: '501', subtitle: 'Classic double-out · 501/301/201', icon: 'dartboard', color: colors.secondary },
  { type: '301', title: '301', subtitle: 'Fast double-out', icon: 'dartboard', color: colors.secondary, selectable: false },
  { type: '201', title: '201', subtitle: 'Sprint to zero', icon: 'dartboard', color: colors.secondary, selectable: false },
  { type: 'cricket', title: 'Cricket', subtitle: 'Standard & cut-throat', icon: 'grid', color: colors.secondary },
  {
    type: 'aroundTheClock',
    title: 'Around the Clock',
    subtitle: '1 to 20 then Bull',
    icon: 'clock',
    color: colors.secondary,
  },
  { type: 'killer', title: 'Killer', subtitle: 'Last one standing', icon: 'skull', color: colors.secondary },
  { type: 'shanghai', title: 'Shanghai', subtitle: 'S + D + T to win instantly', icon: 'bolt', color: colors.secondary },
  {
    type: 'practice170',
    title: '170 Practice',
    subtitle: 'Big checkout training',
    icon: 'pulse',
    color: colors.secondary,
  },
  {
    type: 'bobs27',
    title: "Bob's 27",
    subtitle: 'Doubles practice, 1-20',
    icon: 'flame',
    color: colors.secondary,
  },
];

export function getGameModeInfo(type: GameType): GameModeInfo {
  return GAME_MODES.find((m) => m.type === type)!;
}
