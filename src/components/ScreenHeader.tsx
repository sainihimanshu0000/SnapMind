import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../constants/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle = 'SnapMind' }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.brand}>{subtitle}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xxl,
    paddingBottom: 18,
  },
  copy: {
    gap: spacing.sm,
  },
  brand: {
    ...typography.eyebrow,
  },
  title: {
    ...typography.heading,
    maxWidth: 280,
  },
});
