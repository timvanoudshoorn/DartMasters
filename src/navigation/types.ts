import { Dart, GameConfig, GameType, TournamentMatchContext } from '../types';

export type HomeStackParamList = {
  Home: undefined;
};

export type PlayStackParamList = {
  ModeSelect: undefined;
  Rules: { gameType?: GameType } | undefined;
  GameSetup: { gameType: GameType };
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
  GameSetup: { gameType: GameType };
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
