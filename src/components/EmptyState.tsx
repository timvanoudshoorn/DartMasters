import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Icon, IconName } from './icons/Icon';
import { Button } from './Button';
import { colors, fonts, spacing, typography } from '../theme';
import { COLORS } from '../theme/colors';
import { reducedMs } from '../theme/motion';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Whether the container claims the remaining screen space via flex:1 and
   * centers within it (the default — right for a screen's sole content).
   * Set false when more content follows below (e.g. a quick-list under the
   * pre-query hint) so this block sizes to its own content instead of
   * pushing siblings off-screen. */
  fill?: boolean;
}

export function EmptyState({ icon = 'inbox', title, subtitle, actionLabel, onAction, fill = true }: EmptyStateProps) {
  return (
    <View style={[styles.container, fill ? styles.containerFill : styles.containerInline]}>
      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.iconWell}>
        <View style={styles.iconRing} />
        <Icon name={icon} size={34} color={colors.textFaint} />
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(reducedMs(80)).duration(300)} style={styles.title}>
        {title}
      </Animated.Text>
      {subtitle && (
        <Animated.Text entering={FadeInDown.delay(reducedMs(140)).duration(300)} style={styles.subtitle}>
          {subtitle}
        </Animated.Text>
      )}
      {actionLabel && onAction && (
        <Animated.View entering={FadeInDown.delay(reducedMs(220)).duration(300)}>
          <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.md }} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  containerFill: {
    flex: 1,
  },
  containerInline: {
    paddingVertical: spacing.xl,
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
