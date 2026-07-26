import { Dart, GameConfig, GameType, InMode, OutMode, TournamentMatchContext } from '../types';

export type HomeStackParamList = {
  Home: undefined;
};

/** Prefill for GameSetup's "one-tap replay" — a partial GameConfig carrying
 * just the fields that make sense to carry over from a finished match
 * (roster + rule settings). The setup screen still starts fully editable;
 * this only seeds initial state, it never locks anything. */
export type RematchConfig = {
  playerIds: string[];
  guestPlayers?: GameConfig['guestPlayers'];
  legsToWin: number;
  setsToWin: number;
  outMode: OutMode;
  inMode: InMode;
};

export type PlayStackParamList = {
  ModeSelect: undefined;
  Rules: { gameType?: GameType } | undefined;
  GameSetup: { gameType: GameType; rematch?: RematchConfig };
  Game: { config: GameConfig; tournamentContext?: TournamentMatchContext };
  GameSummary: { matchId: string; tournamentContext?: TournamentMatchContext };
  CameraScoring: { onConfirm: (darts: Dart[]) => void };
  TournamentSetup: undefined;
  TournamentBracket: { tournamentId: string };
};

export type PlayersStackParamList = {
  PlayersList: undefined;
  PlayerProfile: { playerId: string };
  PlayerEdit: { playerId?: string };
  Settings: undefined;
  HeadToHead: undefined;
};

export type StatsStackParamList = {
  StatsHome: undefined;
  MatchDetail: { matchId: string };
};

export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Challenges: undefined;
  Leaderboard: undefined;
  Achievements: undefined;
  CheckoutTrainer: undefined;
  ModeSelect: undefined;
  Rules: { gameType?: GameType } | undefined;
  GameSetup: { gameType: GameType; rematch?: RematchConfig };
  BullOff: { config: GameConfig };
  Game: { config: GameConfig; tournamentContext?: TournamentMatchContext };
  GameSummary: { matchId: string; tournamentContext?: TournamentMatchContext };
  StatsHome: undefined;
  MatchDetail: { matchId: string };
  StatsTrends: undefined;
  PlayersList: undefined;
  PlayerProfile: { playerId: string };
  PlayerEdit: { playerId?: string };
  Settings: undefined;
  BackupRestore: undefined;
  CameraScoring: { onConfirm: (darts: Dart[]) => void };
  HeadToHead: undefined;
  TournamentSetup: undefined;
  TournamentBracket: { tournamentId: string };
};
