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
import { GameConfig } from '../types';

type Route = { params: { config: GameConfig } };

export function GameScreen() {
  const route = useRoute() as unknown as Route;
  const { config } = route.params;

  useEffect(() => {
    ActiveMatchStorage.set(config);
    return () => {
      ActiveMatchStorage.clear();
    };
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
