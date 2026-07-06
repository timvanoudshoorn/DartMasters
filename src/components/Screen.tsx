import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { spacing } from '../theme';

interface ScreenProps {
  children?: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Faint concentric board rings in the top-right corner — the app's backdrop texture. */
  texture?: boolean;
}

export function Screen({ children, scroll, style, padded = true, texture = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const content = <View style={[styles.content, padded && styles.padded, style]}>{children}</View>;
  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      {texture && <BoardRings />}
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

/** Oversized dartboard rings bleeding off-canvas — texture without gradients. */
function BoardRings() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.ring, styles.ringOuter]} />
      <View style={[styles.ring, styles.ringMiddle]} />
      <View style={[styles.ring, styles.ringInner]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  ringOuter: {
    width: 560,
    height: 560,
    top: -300,
    right: -220,
  },
  ringMiddle: {
    width: 420,
    height: 420,
    top: -230,
    right: -150,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  ringInner: {
    width: 290,
    height: 290,
    top: -165,
    right: -85,
    borderColor: 'rgba(193,54,32,0.05)',
  },
});
