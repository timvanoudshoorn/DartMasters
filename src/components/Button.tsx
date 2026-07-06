import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { PRESS_SCALE } from '../theme/motion';
import { COLORS } from '../theme/colors';
import { PressableScale } from './primitives/PressableScale';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'md' | 'lg' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  fullWidth,
}: ButtonProps) {
  const sizeStyle = sizeStyles[size];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={PRESS_SCALE.button}
      haptic={variant === 'primary' || variant === 'danger' ? 'medium' : 'light'}
      sound="buttonTap"
      style={[
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        variant === 'primary' && shadow.key,
        style,
      ]}
    >
      <View style={[styles.base, sizeStyle.box, variantStyles[variant]]}>
        <Text
          style={[
            styles.label,
            sizeStyle.label,
            { color: LABEL_COLOR[variant] },
          ]}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const LABEL_COLOR: Record<Variant, string> = {
  primary: COLORS.text,
  secondary: COLORS.text,
  danger: COLORS.bust,
  outline: COLORS.text,
  ghost: COLORS.textSub,
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontFamily: fonts.bodyExtraBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.35,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.accentDeep,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  secondary: {
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
  },
  danger: {
    backgroundColor: COLORS.bustGlow,
    borderWidth: 1,
    borderColor: COLORS.bustBorder,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});

const sizeStyles: Record<Size, { box: ViewStyle; label: { fontSize: number } }> = {
  sm: {
    box: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
    label: { fontSize: 12 },
  },
  md: {
    box: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.lg },
    label: { fontSize: 14 },
  },
  lg: {
    box: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
    label: { fontSize: 16 },
  },
};
