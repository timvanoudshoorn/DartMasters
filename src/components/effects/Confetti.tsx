import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PIECE_COUNT = 90;

// Ember family + warm metals — celebration in the brand's own voice.
const PALETTE = [
  COLORS.accent,
  COLORS.accentHot,
  '#F0A030',
  '#C1A536',
  '#F4F1EE',
  '#8E2716',
];

interface PieceConfig {
  id: number;
  left: number;
  color: string;
  width: number;
  height: number;
  delay: number;
  duration: number;
  drift: number;
  swayAmp: number;
  swayFreq: number;
  rotations: number;
  flips: number;
  isCircle: boolean;
}

export function Confetti({ active }: { active: boolean }) {
  const pieces = useMemo<PieceConfig[]>(() => {
    if (!active) return [];
    return Array.from({ length: PIECE_COUNT }, (_, i) => {
      // First wave lands dense and fast, second wave drizzles in behind it.
      const secondWave = i > PIECE_COUNT * 0.6;
      return {
        id: i,
        left: Math.random() * SCREEN_WIDTH,
        color: PALETTE[i % PALETTE.length],
        width: 5 + Math.random() * 6,
        height: 8 + Math.random() * 10,
        delay: secondWave ? 600 + Math.random() * 900 : Math.random() * 350,
        duration: 2200 + Math.random() * 1600,
        drift: (Math.random() - 0.5) * 160,
        swayAmp: 14 + Math.random() * 30,
        swayFreq: 2 + Math.random() * 3,
        rotations: 2 + Math.random() * 5,
        flips: 3 + Math.random() * 5,
        isCircle: Math.random() > 0.75,
      };
    });
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} config={p} />
      ))}
    </View>
  );
}

function ConfettiPiece({ config }: { config: PieceConfig }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withTiming(1, { duration: config.duration, easing: Easing.in(Easing.sin) })
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const translateY = t * (SCREEN_HEIGHT + 60) - 30;
    const translateX = config.drift * t + Math.sin(t * config.swayFreq * Math.PI * 2) * config.swayAmp;
    const rotate = `${t * config.rotations * 360}deg`;
    // Tumble: squashing height reads as the piece flipping through the air.
    const scaleY = 0.25 + Math.abs(Math.cos(t * config.flips * Math.PI * 2)) * 0.75;
    const opacity = t > 0.82 ? 1 - (t - 0.82) / 0.18 : 1;
    return {
      transform: [{ translateY }, { translateX }, { rotate }, { scaleY }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: config.left,
          top: -30,
          width: config.width,
          height: config.isCircle ? config.width : config.height,
          backgroundColor: config.color,
          borderRadius: config.isCircle ? config.width / 2 : 1.5,
        },
        style,
      ]}
    />
  );
}
