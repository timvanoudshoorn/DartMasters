import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { radius, shadow, spacing } from '../theme';
import { COLORS } from '../theme/colors';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}

/**
 * Standard surface: card charcoal, hairline border, lit top edge.
 * `elevated` adds a soft black drop shadow for floating content.
 */
export function Card({ children, style, elevated }: CardProps) {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.edge,
    padding: spacing.lg,
  },
  elevated: {
    backgroundColor: COLORS.card2,
    ...shadow.soft,
  },
});
