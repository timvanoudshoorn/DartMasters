import 'react-native-gesture-handler';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from '@expo-google-fonts/inter';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { configureAudioMode, preloadSounds, setSoundEnabled } from './src/sound/soundManager';
import { setHapticsEnabled } from './src/sound/haptics';
import { setReducedMotionEnabled } from './src/theme/motionPreference';
import { SettingsStorage } from './src/storage/storage';
import { colors } from './src/theme';
import { preloadAnnouncerSounds } from './src/utils/dartAnnouncer';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    BebasNeue_400Regular,
  });

  useEffect(() => {
    SettingsStorage.get().then((s) => {
      setSoundEnabled(s.soundEnabled);
      setHapticsEnabled(s.hapticsEnabled);
      setReducedMotionEnabled(s.reducedMotionEnabled);
    });
    // Audio session mode (silent-switch override) must be applied before any
    // sound preloads so playback is audible from the very first clip —
    // configureAudioMode() is the single owner of this native call, awaited
    // here rather than raced against another independent setAudioModeAsync
    // call elsewhere.
    configureAudioMode().then(() => {
      preloadSounds();
      preloadAnnouncerSounds();
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
