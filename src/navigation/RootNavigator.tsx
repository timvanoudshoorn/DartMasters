import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import React from 'react';
import { HomeScreen } from '../screens/HomeScreen';
import { ChallengesScreen } from '../screens/ChallengesScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { ModeSelectScreen } from '../screens/ModeSelectScreen';
import { GameSetupScreen } from '../screens/GameSetupScreen';
import { BullOffScreen } from '../screens/BullOffScreen';
import { GameScreen } from '../screens/GameScreen';
import { GameSummaryScreen } from '../screens/GameSummaryScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { MatchDetailScreen } from '../screens/MatchDetailScreen';
import { PlayersListScreen } from '../screens/PlayersListScreen';
import { PlayerProfileScreen } from '../screens/PlayerProfileScreen';
import { PlayerEditScreen } from '../screens/PlayerEditScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CameraScoringScreen } from '../screens/CameraScoringScreen';
import { RootStackParamList } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    border: colors.border,
    primary: colors.primary,
    text: colors.textPrimary,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
          animationDuration: 260,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Challenges" component={ChallengesScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="ModeSelect" component={ModeSelectScreen} />
        <Stack.Screen name="GameSetup" component={GameSetupScreen} />
        {/* Stepping up to the oche: the match itself fades in rather than sliding. */}
        <Stack.Screen name="BullOff" component={BullOffScreen} options={{ animation: 'fade', animationDuration: 320 }} />
        <Stack.Screen name="Game" component={GameScreen} options={{ animation: 'fade', animationDuration: 320, gestureEnabled: false }} />
        {/* The win moment takes the whole stage — no swipe-back out of it. */}
        <Stack.Screen name="GameSummary" component={GameSummaryScreen} options={{ animation: 'fade', animationDuration: 400, gestureEnabled: false }} />
        <Stack.Screen name="StatsHome" component={StatsScreen} />
        <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
        <Stack.Screen name="PlayersList" component={PlayersListScreen} />
        <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
        <Stack.Screen name="PlayerEdit" component={PlayerEditScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="CameraScoring" component={CameraScoringScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
