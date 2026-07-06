import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Icon } from './icons/Icon';
import { colors, fonts, spacing, typography } from '../theme';
import { COLORS } from '../theme/colors';
import { PressableScale } from './primitives/PressableScale';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, onBack, right }: HeaderProps) {
  return (
    <Animated.View entering={FadeInDown.duration(280)} style={styles.row}>
      <View style={styles.left}>
        {onBack && (
          <PressableScale
            onPress={onBack}
            haptic="light"
            hitSlop={10}
            scaleTo={0.9}
            style={styles.backBtn}
          >
            <Icon name="back" size={20} color={colors.textPrimary} />
          </PressableScale>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    marginRight: spacing.xs,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    borderRadius: 12,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fonts.body,
  },
});
