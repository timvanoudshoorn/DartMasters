import { useRoute } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { X01GameScreen } from './game/X01GameScreen';
import { Practice170GameScreen } from './game/Practice170GameScreen';
import { CricketGameScreen } from './game/CricketGameScreen';
import { AroundTheClockGameScreen } from './game/AroundTheClockGameScreen';
import { KillerGameScreen } from './game/KillerGameScreen';
import { ShanghaiGameScreen } from './game/ShanghaiGameScreen';
import { Bobs27GameScreen } from './game/Bobs27GameScreen';
import { ActiveMatchStorage } from '../storage/activeMatch';
import { PendingTournamentMatchStorage } from '../storage/tournament';
import { GameConfig, TournamentMatchContext } from '../types';

type Route = { params: { config: GameConfig; tournamentContext?: TournamentMatchContext } };

export function GameScreen() {
  const route = useRoute() as unknown as Route;
  const { config, tournamentContext } = route.params;

  useEffect(() => {
    ActiveMatchStorage.set(config);
    return () => {
      ActiveMatchStorage.clear();
    };
  }, []);

  // Tournament matchups are just normal matches — the per-mode game screens
  // (X01GameScreen, CricketGameScreen, ...) never learn a tournament is
  // involved. Instead we drop a pointer here that GameSummaryScreen picks up
  // once the match is decided, so it can report the result back into the
  // bracket. Only one match plays at a time, so a stale pointer from a
  // previous tournament match is always safe to clear on a normal match.
  useEffect(() => {
    if (tournamentContext) {
      PendingTournamentMatchStorage.set(tournamentContext);
    } else {
      PendingTournamentMatchStorage.clear();
    }
  }, []);

  switch (config.gameType) {
    case '501':
    case '301':
    case '201':
      return <X01GameScreen config={config} />;
    case 'practice170':
      return <Practice170GameScreen config={config} />;
    case 'cricket':
      return <CricketGameScreen config={config} />;
    case 'aroundTheClock':
      return <AroundTheClockGameScreen config={config} />;
    case 'killer':
      return <KillerGameScreen config={config} />;
    case 'shanghai':
      return <ShanghaiGameScreen config={config} />;
    case 'bobs27':
      return <Bobs27GameScreen config={config} />;
    default:
      return null;
  }
}
