import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  EmptyState,
  FilterChips,
  FloatingActionButton,
  SearchBar,
  ScreenshotCard,
} from '../components';
import { colors, radii, spacing, typography, fonts } from '../constants/theme';
import {
  filterScreenshots,
  useScreenshots,
} from '../context/ScreenshotsContext';
import {
  pickImagesFromGallery,
  savePickedScreenshots,
} from '../services/importScreenshots';
import { useNotice } from '../context/NoticeContext';
import { requestProcessNewScreenshots } from '../screenshotDetection';
import type { HomeFilter, ScreenshotWithMeta } from '../types';
import type { RootStackParamList } from '../navigation/types';

export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { screenshots, loading, refresh } = useScreenshots();
  const { showNotice } = useNotice();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HomeFilter>('All');
  const [saving, setSaving] = useState(false);
  const [progressLabel, setProgressLabel] = useState('Saving…');
  const pickingRef = useRef(false);

  const visible = useMemo(
    () => filterScreenshots(screenshots, filter, query),
    [screenshots, filter, query],
  );

  const onImportPress = useCallback(() => {
    if (pickingRef.current || saving) {
      return;
    }
    pickingRef.current = true;

    setTimeout(() => {
      void (async () => {
        try {
          const picked = await pickImagesFromGallery();
          if (picked.error) {
            showNotice({ title: picked.error.title, body: picked.error.body });
            return;
          }
          if (!picked.assets.length) {
            return;
          }

          setSaving(true);
          setProgressLabel(`Saving 1 of ${picked.assets.length}…`);

          const result = await savePickedScreenshots(picked.assets, {
            onProgress: progress => setProgressLabel(progress.currentLabel),
            onOcrItemDone: () => {
              refresh().catch(() => undefined);
            },
          });
          await refresh();

          if (result.imported.length) {
            const first = result.imported[0];
            showNotice({
              title: `${result.imported.length} screenshot(s) saved`,
              body:
                result.failedCount > 0
                  ? `${result.failedCount} image(s) could not be saved. Reading text in the background.`
                  : 'Reading text in the background.',
              actionLabel: 'Open',
              onAction: () =>
                navigation.navigate('ScreenshotDetail', { id: first.id }),
            });
          } else if (result.failedCount > 0) {
            showNotice({
              title: 'Import failed',
              body: 'Could not save the selected images. Try again.',
            });
          }
        } catch {
          showNotice({
            title: 'Import failed',
            body: 'Something went wrong while importing. Please try again.',
          });
        } finally {
          pickingRef.current = false;
          setSaving(false);
        }
      })();
    }, 0);
  }, [navigation, refresh, saving, showNotice]);

  const openDetail = useCallback(
    (item: ScreenshotWithMeta) => {
      navigation.navigate('ScreenshotDetail', { id: item.id });
    },
    [navigation],
  );

  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Text style={styles.brand}>SnapMind</Text>
        <Pressable
          onPress={() => {
            requestProcessNewScreenshots().catch(() => undefined);
          }}>
          <Text style={styles.processLink}>Process new screenshots</Text>
        </Pressable>
        <SearchBar value={query} onChangeText={setQuery} />
        <FilterChips value={filter} onChange={setFilter} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.grid}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <EmptyState
              title="No screenshots yet."
              body="Save your first screenshot and SnapMind will help you organize it."
              action={
                <Pressable style={styles.importButton} onPress={onImportPress}>
                  <Text style={styles.importLabel}>Import Screenshots</Text>
                </Pressable>
              }
            />
          }
          renderItem={({ item }) => (
            <ScreenshotCard item={item} onPress={openDetail} />
          )}
        />
      )}

      <FloatingActionButton onPress={onImportPress} />

      <Modal visible={saving} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.modalText}>{progressLabel}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  top: {
    paddingTop: spacing.xxl,
  },
  brand: {
    ...typography.heading,
    fontSize: 26,
    marginBottom: spacing.sm,
  },
  processLink: {
    ...typography.meta,
    color: colors.accent,
    marginBottom: spacing.lg,
  },
  grid: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  gridRow: {
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  importLabel: {
    color: colors.surface,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 220,
  },
  modalText: {
    ...typography.meta,
    textAlign: 'center',
  },
});
