export type GameType =
  | '501'
  | '301'
  | '201'
  | 'cricket'
  | 'aroundTheClock'
  | 'killer'
  | 'shanghai'
  | 'practice170'
  | 'bobs27';

export type OutMode = 'double' | 'master' | 'straight';
export type InMode = 'straight' | 'double';

export type BotDifficulty = 'beginner' | 'amateur' | 'intermediate' | 'pro' | 'legend';

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar?: string; // emoji, falls back to initials when absent
  photoUri?: string; // local file uri; takes precedence over avatar/initials when present
  createdAt: number;
  isGuest?: boolean;
}

export type Multiplier = 1 | 2 | 3;

export interface Dart {
  segment: number; // 1-20, or 25 for bull
  multiplier: Multiplier;
}

export const dartValue = (d: Dart) => d.segment * d.multiplier;

export const isDoubleHit = (d: Dart) => d.multiplier === 2;
export const isMasterHit = (d: Dart) => d.multiplier === 2 || d.multiplier === 3;

// ---------- X01 (501 / 301 / 201 / practice170) ----------

export interface X01Visit {
  playerId: string;
  startScore: number;
  scored: number;
  darts: Dart[];
  dartsUsed: 1 | 2 | 3;
  bust: boolean;
  checkout: boolean;
  isCheckoutAttempt: boolean;
  oneEighty: boolean;
}

export interface X01PlayerState {
  playerId: string;
  remaining: number;
  legsWon: number;
  setsWon: number;
  visits: X01Visit[];
  legStartScore: number;
  opened: boolean; // for double-in: has this player started scoring this leg
  legDartsHistory: number[]; // darts used per leg won, for "best leg" stat
}

// ---------- Cricket ----------

export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, 25] as const;
export type CricketTarget = (typeof CRICKET_TARGETS)[number];

export interface CricketMarks {
  [target: number]: number; // 0-3+ marks
}

export interface CricketPlayerState {
  playerId: string;
  marks: CricketMarks;
  score: number;
  legsWon: number;
}

export interface CricketDartRecord {
  playerId: string;
  target: number | null; // null = miss
  multiplier: Multiplier;
  pointsScored: number;
}

// ---------- Around the Clock ----------

export const ATC_SEQUENCE: number[] = [
  ...Array.from({ length: 20 }, (_, i) => i + 1),
  25,
];

export interface AtcPlayerState {
  playerId: string;
  targetIndex: number; // index into ATC_SEQUENCE
  bullHits: number; // single-bull hits banked toward the 2 needed to finish (0-2)
  dartsThrown: number;
  legsWon: number;
  finished: boolean;
}

// ---------- Killer ----------

export interface KillerPlayerState {
  playerId: string;
  number: number; // 1-20 assigned
  lives: number;
  isKiller: boolean;
  eliminated: boolean;
}

// ---------- Shanghai ----------

export interface ShanghaiPlayerState {
  playerId: string;
  score: number;
  shanghaiWin: boolean;
}

// ---------- Bob's 27 ----------

export interface Bobs27PlayerState {
  playerId: string;
  score: number;
  round: number; // 1-20, the double currently being attempted
  finished: boolean;
}

// ---------- Match history / stats ----------

export interface PlayerMatchResult {
  playerId: string;
  legsWon: number;
  setsWon: number;
  dartsThrown: number;
  totalScored: number;
  threeDartAvg: number;
  firstNineAvg: number | null;
  highestCheckout: number;
  checkoutAttempts: number;
  checkoutHits: number;
  oneEighties: number;
  count100Plus: number;
  count140Plus: number;
  bestLegDarts: number | null;
  highestVisit: number;
  marksPerRound: number | null;
  isWinner: boolean;
  doublesHit?: number; // X01/practice170 — count of darts landed on a double, for challenge tracking
  missCount?: number; // around the clock — misses thrown during the leg that completed the game
  eliminationsCount?: number; // killer — opponents this player eliminated
  outscoredEveryRound?: boolean; // x01 2-player — true if this player's visit score beat the opponent's every round
}

export interface MatchRecord {
  id: string;
  gameType: GameType;
  date: number;
  legsToWin: number;
  setsToWin: number;
  startingScore?: number;
  outMode?: OutMode;
  inMode?: InMode;
  cutThroat?: boolean;
  playerIds: string[];
  winnerId: string | null;
  results: { [playerId: string]: PlayerMatchResult };
  guestNames?: { [playerId: string]: string };
  guestColors?: { [playerId: string]: string };
  guestAvatars?: { [playerId: string]: string };
  killerEverPlayerIds?: string[]; // killer — every playerId who reached Killer status at any point this match
  legWinnerHistory?: string[]; // x01 — playerId of the winner of each leg, in order
  botPlayerIds?: string[]; // playerIds in this match that were bot opponents
}

export interface GameConfig {
  gameType: GameType;
  playerIds: string[];
  legsToWin: number;
  setsToWin: number;
  startingScore?: number; // 501 / 301 / 201
  outMode: OutMode;
  inMode: InMode;
  livesPerPlayer?: number; // killer
  atcDoublesMode?: boolean; // around the clock skip-ahead variant
  shanghaiRounds?: number; // shanghai
  cutThroat?: boolean; // cricket
  bullOff?: boolean; // manual bull-off to decide starting order (non-killer modes)
  guestPlayers?: {
    [playerId: string]: { name: string; color: string; avatar?: string; isBot?: boolean; botDifficulty?: BotDifficulty };
  };
}
