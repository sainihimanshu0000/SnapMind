import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../constants/theme';
import type { ScreenshotWithMeta } from '../types';
import { LocalImage } from './LocalImage';
import { Icon } from './Icon';

type ScreenshotCardProps = {
  item: ScreenshotWithMeta;
  onPress: (item: ScreenshotWithMeta) => void;
};

function ScreenshotCardComponent({ item, onPress }: ScreenshotCardProps) {
  return (
    <Pressable onPress={() => onPress(item)} style={styles.card}>
      <LocalImage uri={item.imageUri} style={styles.image} />
      <View style={styles.metaRow}>
        <Text style={styles.category} numberOfLines={1}>
          {item.category}
        </Text>
        <View style={styles.indicators}>
          {item.isFavorite ? <Icon name="star" color={colors.accent} size={12} /> : null}
          {item.reminderDate ? <Icon name="clock" color={colors.accent} size={12} /> : null}
          {item.collectionName ? (
            <Icon name="collections" color={colors.accent} size={12} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const ScreenshotCard = memo(ScreenshotCardComponent);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 190,
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: colors.softLavender,
  },
  metaRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  category: {
    ...typography.meta,
    flex: 1,
  },
  indicators: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
});
