import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { EmptyState, ScreenshotCard } from '../components';
import { colors, spacing, typography, fonts } from '../constants/theme';
import { useScreenshots } from '../context/ScreenshotsContext';
import {
  getCollectionScreenshots,
  removeScreenshotFromCollection,
} from '../services/collectionsRepository';
import type { ScreenshotWithMeta } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CollectionDetail'>;

export function CollectionDetailScreen({ route, navigation }: Props) {
  const { id, name } = route.params;
  const { refresh } = useScreenshots();
  const [shots, setShots] = useState<ScreenshotWithMeta[]>([]);

  const load = useCallback(async () => {
    setShots(await getCollectionScreenshots(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.count}>{shots.length} screenshots</Text>
      </View>

      <FlatList
        style={styles.list}
        data={shots}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <EmptyState
            title="Empty collection"
            body="Open a screenshot and tap Add to collection."
          />
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <ScreenshotCard
              item={item}
              onPress={shot =>
                navigation.navigate('ScreenshotDetail', { id: shot.id })
              }
            />
            <Pressable
              onPress={() => {
                Alert.alert('Remove from collection?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      await removeScreenshotFromCollection(id, item.id);
                      await refresh();
                      await load();
                    },
                  },
                ]);
              }}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  top: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 6,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  back: {
    color: colors.accent,
    fontSize: 17,
    fontFamily: fonts.semiBold,
  },
  title: {
    ...typography.heading,
    fontSize: 26,
  },
  count: {
    color: colors.muted,
    fontSize: 13,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  grid: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  gridRow: {
    gap: spacing.md,
  },
  cardWrap: {
    flex: 1,
  },
  remove: {
    color: colors.danger,
    fontSize: 12,
    fontFamily: fonts.semiBold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
