import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, LocalImage, ScreenHeader } from '../components';
import { colors, radii, spacing, typography, fonts } from '../constants/theme';
import { useScreenshots } from '../context/ScreenshotsContext';
import {
  countScreenshots,
  deleteScreenshot,
  listOldScreenshots,
  updateScreenshot,
} from '../services/screenshotsRepository';
import type { ScreenshotWithMeta } from '../types';
import type { RootStackParamList } from '../navigation/types';

export function CleanupScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { refresh } = useScreenshots();
  const [total, setTotal] = useState(0);
  const [oldShots, setOldShots] = useState<ScreenshotWithMeta[]>([]);
  const [temporary, setTemporary] = useState<ScreenshotWithMeta[]>([]);

  const load = useCallback(async () => {
    setTotal(await countScreenshots());
    const old = await listOldScreenshots(30);
    setOldShots(old);
    const temps = old.filter(shot => shot.isTemporary);
    setTemporary(temps);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.page}>
      <ScreenHeader title="A little less clutter." subtitle="CLEANUP" />
      <View style={styles.summary}>
        <Text style={styles.number}>{total}</Text>
        <Text style={styles.summaryTitle}>screenshots in your library</Text>
        <Text style={styles.summaryBody}>
          SnapMind never deletes anything without you. Review old items below.
        </Text>
      </View>

      <Text style={styles.section}>Older than 30 days</Text>
      {!oldShots.length ? (
        <EmptyState
          title="You're all clean"
          body="Duplicates and temporary items will show up here as your library grows."
        />
      ) : (
        <FlatList
          style={styles.list}
          data={oldShots}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                navigation.navigate('ScreenshotDetail', { id: item.id })
              }>
              <LocalImage uri={item.imageUri} style={styles.thumb} />
              <View style={styles.copy}>
                <Text style={styles.title}>{item.category}</Text>
                <Text style={styles.meta}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  Alert.alert('Delete this screenshot?', undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteScreenshot(item.id);
                        await refresh();
                        await load();
                      },
                    },
                  ]);
                }}>
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </Pressable>
          )}
          ListFooterComponent={
            <Pressable
              style={styles.markTemp}
              onPress={async () => {
                if (!oldShots[0]) {
                  return;
                }
                await updateScreenshot(oldShots[0].id, { isTemporary: true });
                await load();
                Alert.alert(
                  'Marked temporary',
                  'You can revisit temporary items anytime. Nothing was deleted.',
                );
              }}>
              <Text style={styles.markTempText}>
                Mark oldest as temporary ({temporary.length} temporary)
              </Text>
            </Pressable>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  list: {
    flex: 1,
  },
  summary: {
    backgroundColor: colors.softAccent,
    borderRadius: radii.xl,
    padding: 22,
    marginBottom: spacing.md,
  },
  number: {
    color: colors.primary,
    fontSize: 52,
    fontFamily: fonts.bold,
  },
  summaryTitle: {
    ...typography.title,
  },
  summaryBody: {
    color: '#5D4D48',
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.md,
  },
  section: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.softLavender,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  delete: {
    color: colors.danger,
    fontFamily: fonts.semiBold,
  },
  markTemp: {
    marginTop: spacing.lg,
    marginBottom: 40,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    alignItems: 'center',
  },
  markTempText: {
    color: colors.secondary,
    fontFamily: fonts.semiBold,
  },
});
