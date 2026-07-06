import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { COLORS } from '../theme/colors';
import { PRESS_SCALE } from '../theme/motion';
import { PressableScale } from './primitives/PressableScale';

interface SegmentButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'accent' | 'danger' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  soundTrigger?: 'buttonTap' | 'miss';
}

export function SegmentButton({
  label,
  onPress,
  disabled,
  variant = 'default',
  size = 'md',
  style,
  soundTrigger = 'buttonTap',
}: SegmentButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={PRESS_SCALE.key}
      haptic={variant === 'accent' ? 'medium' : 'light'}
      sound={soundTrigger}
      style={[disabled && styles.disabled, variant === 'accent' && shadow.key, style]}
    >
      <View style={[styles.base, sizeMap[size], variantMap[variant]]}>
        <Text
          style={[
            styles.label,
            sizeFont[size],
            variant === 'danger' && { color: COLORS.bust },
            disabled && styles.disabledLabel,
          ]}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.bodyExtraBold,
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  disabled: {
    opacity: 0.35,
  },
  disabledLabel: {
    color: colors.textMuted,
  },
});

const sizeMap = StyleSheet.create({
  sm: { paddingVertical: spacing.sm + 2, minWidth: 44 },
  md: { paddingVertical: spacing.md + 2, minWidth: 56 },
  lg: { paddingVertical: spacing.lg, minWidth: 72 },
});

const sizeFont = StyleSheet.create({
  sm: { fontSize: 13 },
  md: { fontSize: 15 },
  lg: { fontSize: 17 },
});

const variantMap = StyleSheet.create({
  default: {
    backgroundColor: COLORS.card2,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
  },
  muted: { backgroundColor: 'transparent', borderColor: COLORS.border },
  accent: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentDeep,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  danger: {
    backgroundColor: COLORS.bustGlow,
    borderColor: COLORS.bustBorder,
  },
});
