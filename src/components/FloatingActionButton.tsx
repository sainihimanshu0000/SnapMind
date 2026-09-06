import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../constants/theme';
import { Icon } from './Icon';

type FloatingActionButtonProps = {
  onPress: () => void;
};

export function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();
  // Sit above the tab bar (56 content + bottom inset) with a little gap.
  const bottom = 56 + Math.max(insets.bottom, 8) + 16;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Import screenshots"
      onPress={onPress}
      style={[styles.fab, { bottom }]}>
      <Icon name="plus" color={colors.surface} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: radii.fab,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
