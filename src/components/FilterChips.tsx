import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, fonts } from '../constants/theme';
import type { HomeFilter } from '../types';

const FILTERS: HomeFilter[] = ['All', 'Recent', 'Favorites'];

type FilterChipsProps = {
  value: HomeFilter;
  onChange: (value: HomeFilter) => void;
};

export function FilterChips({ value, onChange }: FilterChipsProps) {
  return (
    <View style={styles.row}>
      {FILTERS.map(filter => {
        const active = filter === value;
        return (
          <Pressable
            key={filter}
            onPress={() => onChange(filter)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>
              {filter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: 18,
  },
  chip: {
    borderRadius: radii.pill,
    paddingHorizontal: 15,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    color: colors.secondary,
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  labelActive: {
    color: colors.surface,
  },
});
