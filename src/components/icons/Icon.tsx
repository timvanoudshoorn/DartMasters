import React from 'react';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Single icon gateway for the whole app, backed by @expo/vector-icons.
// Feather is the primary set (2px-stroke minimalism that matches the
// Charcoal & Ember language); MaterialCommunityIcons/Ionicons fill the
// gaps Feather doesn't cover (trophy, skull, bullseye, robot, medal…).
// Never render emoji or raw glyph text as iconography — add a name here.

export type IconName =
  | 'back'
  | 'close'
  | 'add'
  | 'addCircle'
  | 'edit'
  | 'chevronRight'
  | 'undo'
  | 'checkmark'
  | 'trophy'
  | 'dartboard'
  | 'grid'
  | 'clock'
  | 'skull'
  | 'bolt'
  | 'pulse'
  | 'play'
  | 'users'
  | 'history'
  | 'stats'
  | 'inbox'
  | 'userAdd'
  | 'dartLogo'
  | 'flame'
  | 'delete'
  | 'settings'
  | 'home'
  | 'bell'
  | 'person'
  | 'robot'
  | 'medal'
  | 'camera'
  | 'crown'
  | 'target'
  | 'crosshair'
  | 'shield'
  | 'star'
  | 'anchor'
  | 'compass'
  | 'feather'
  | 'moon'
  | 'sun'
  | 'gamepad'
  | 'rocket';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Kept for API compatibility with the old SVG icon set; font glyphs have fixed stroke. */
  strokeWidth?: number;
}

type Glyph =
  | { set: 'feather'; glyph: keyof typeof Feather.glyphMap }
  | { set: 'mci'; glyph: keyof typeof MaterialCommunityIcons.glyphMap }
  | { set: 'ion'; glyph: keyof typeof Ionicons.glyphMap };

const MAP: Record<IconName, Glyph> = {
  back: { set: 'feather', glyph: 'arrow-left' },
  close: { set: 'feather', glyph: 'x' },
  add: { set: 'feather', glyph: 'plus' },
  addCircle: { set: 'feather', glyph: 'plus-circle' },
  edit: { set: 'feather', glyph: 'edit-2' },
  chevronRight: { set: 'feather', glyph: 'chevron-right' },
  undo: { set: 'feather', glyph: 'rotate-ccw' },
  checkmark: { set: 'feather', glyph: 'check' },
  trophy: { set: 'mci', glyph: 'trophy-outline' },
  dartboard: { set: 'mci', glyph: 'bullseye-arrow' },
  grid: { set: 'feather', glyph: 'grid' },
  clock: { set: 'feather', glyph: 'clock' },
  skull: { set: 'mci', glyph: 'skull-outline' },
  bolt: { set: 'feather', glyph: 'zap' },
  pulse: { set: 'feather', glyph: 'activity' },
  play: { set: 'ion', glyph: 'play' },
  users: { set: 'feather', glyph: 'users' },
  history: { set: 'mci', glyph: 'history' },
  stats: { set: 'feather', glyph: 'bar-chart-2' },
  inbox: { set: 'feather', glyph: 'inbox' },
  userAdd: { set: 'feather', glyph: 'user-plus' },
  dartLogo: { set: 'mci', glyph: 'bullseye' },
  flame: { set: 'ion', glyph: 'flame-outline' },
  delete: { set: 'feather', glyph: 'trash-2' },
  settings: { set: 'feather', glyph: 'settings' },
  home: { set: 'feather', glyph: 'home' },
  bell: { set: 'feather', glyph: 'bell' },
  person: { set: 'feather', glyph: 'user' },
  robot: { set: 'mci', glyph: 'robot-outline' },
  medal: { set: 'mci', glyph: 'medal-outline' },
  camera: { set: 'feather', glyph: 'camera' },
  // Avatar-grade icons (used by the icon-avatar picker)
  crown: { set: 'mci', glyph: 'crown-outline' },
  target: { set: 'feather', glyph: 'target' },
  crosshair: { set: 'feather', glyph: 'crosshair' },
  shield: { set: 'feather', glyph: 'shield' },
  star: { set: 'feather', glyph: 'star' },
  anchor: { set: 'feather', glyph: 'anchor' },
  compass: { set: 'feather', glyph: 'compass' },
  feather: { set: 'feather', glyph: 'feather' },
  moon: { set: 'feather', glyph: 'moon' },
  sun: { set: 'feather', glyph: 'sun' },
  gamepad: { set: 'mci', glyph: 'gamepad-variant-outline' },
  rocket: { set: 'mci', glyph: 'rocket-launch-outline' },
};

export function Icon({ name, size = 24, color = '#FFFFFF' }: IconProps) {
  const entry = MAP[name];
  switch (entry.set) {
    case 'feather':
      return <Feather name={entry.glyph} size={size} color={color} />;
    case 'mci':
      return <MaterialCommunityIcons name={entry.glyph} size={size} color={color} />;
    case 'ion':
      return <Ionicons name={entry.glyph} size={size} color={color} />;
  }
}
