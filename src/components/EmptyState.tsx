import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Icon, IconName } from './icons/Icon';
import { Button } from './Button';
import { colors, fonts, spacing, typography } from '../theme';
import { COLORS } from '../theme/colors';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'inbox', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.iconWell}>
        <View style={styles.iconRing} />
        <Icon name={icon} size={34} color={colors.textFaint} />
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(80).duration(300)} style={styles.title}>
        {title}
      </Animated.Text>
      {subtitle && (
        <Animated.Text entering={FadeInDown.delay(140).duration(300)} style={styles.subtitle}>
          {subtitle}
        </Animated.Text>
      )}
      {actionLabel && onAction && (
        <Animated.View entering={FadeInDown.delay(220).duration(300)}>
          <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.md }} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  iconWell: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
  },
  iconRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  title: {
    ...typography.heading,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
