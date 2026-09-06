import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, ScreenHeader } from '../components';
import { colors, radii, spacing, typography, fonts } from '../constants/theme';
import {
  createCollection,
  deleteCollection,
  listCollections,
} from '../services/collectionsRepository';
import type { Collection } from '../types';
import type { RootStackParamList } from '../navigation/types';

export function CollectionsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [draft, setDraft] = useState('');

  const refresh = useCallback(async () => {
    setCollections(await listCollections());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.page}>
      <ScreenHeader title="Small sets, big recall." />
      <ScrollView contentContainerStyle={styles.content}>
        {!collections.length ? (
          <EmptyState
            title="No collections yet."
            body="Related screenshots can become sets — like trips, projects, or ideas."
          />
        ) : (
          collections.map(collection => (
            <Pressable
              key={collection.id}
              style={styles.collection}
              onPress={() =>
                navigation.navigate('CollectionDetail', {
                  id: collection.id,
                  name: collection.name,
                })
              }
              onLongPress={() => {
                Alert.alert(collection.name, 'Manage collection', [
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await deleteCollection(collection.id);
                      await refresh();
                    },
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}>
              <View style={styles.row}>
                <Text style={styles.name}>{collection.name}</Text>
                <Text style={styles.count}>
                  {collection.screenshotCount ?? 0} screenshots
                </Text>
              </View>
            </Pressable>
          ))
        )}

        <View style={styles.createBox}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="New collection name"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable
            style={styles.createButton}
            onPress={async () => {
              if (!draft.trim()) {
                return;
              }
              await createCollection(draft);
              setDraft('');
              await refresh();
            }}>
            <Text style={styles.createLabel}>+ Create collection</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  content: {
    paddingBottom: 40,
  },
  collection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...typography.title,
  },
  count: {
    color: colors.muted,
    fontSize: 12,
  },
  createBox: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    color: colors.primary,
    backgroundColor: colors.surface,
  },
  createButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    padding: 14,
    alignItems: 'center',
  },
  createLabel: {
    color: colors.accent,
    fontFamily: fonts.bold,
  },
});
