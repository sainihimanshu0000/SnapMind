import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, LocalImage, ScreenHeader, SearchBar } from '../components';
import { colors, radii, spacing, fonts } from '../constants/theme';
import { parseSearchQuery } from '../services/search';
import { searchScreenshots } from '../services/screenshotsRepository';
import type { ScreenshotWithMeta } from '../types';
import type { RootStackParamList } from '../navigation/types';

export function SearchScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScreenshotWithMeta[]>([]);

  const filters = useMemo(() => parseSearchQuery(query), [query]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!query.trim()) {
        if (active) {
          setResults([]);
        }
        return;
      }
      const items = await searchScreenshots(filters);
      if (active) {
        setResults(items);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [filters, query]);

  return (
    <View style={styles.page}>
      <ScreenHeader title="Find what you saved." />
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search your screenshot memory"
      />
      <Text style={styles.helper}>
        Try “shopping”, “buy”, “react”, “favorite”, or “this week”.
      </Text>

      {!query.trim() ? (
        <EmptyState
          title="Search your screenshot memory."
          body="Import screenshots to start finding them instantly — even offline."
        />
      ) : (
        <FlatList
          style={styles.list}
          data={results}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <EmptyState
              title="No matches"
              body="Try another word from OCR text, tags, notes, or intent."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.result}
              onPress={() =>
                navigation.navigate('ScreenshotDetail', { id: item.id })
              }>
              <LocalImage uri={item.imageUri} style={styles.thumb} />
              <View style={styles.resultCopy}>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {item.category}
                  {item.intent ? ` · ${item.intent}` : ''}
                </Text>
                <Text style={styles.resultMeta} numberOfLines={2}>
                  {item.ocrText || item.notes || item.tags.map(t => `#${t}`).join(' ') || 'No text yet'}
                </Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          )}
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
  helper: {
    color: colors.muted,
    fontSize: 13,
    marginVertical: 18,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: radii.sm,
    backgroundColor: colors.softLavender,
  },
  resultCopy: {
    flex: 1,
    paddingHorizontal: 13,
  },
  resultTitle: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  resultMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
  },
  arrow: {
    color: colors.accent,
    fontSize: 18,
  },
});
