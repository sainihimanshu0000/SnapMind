import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, typography } from '../constants/theme';

type EmptyStateProps = {
  title: string;
  body: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  title: {
    ...typography.title,
    fontSize: 20,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.regular,
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.xl,
  },
});
