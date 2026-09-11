import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CATEGORIES } from '../constants/categories';
import { INTENT_LABELS, INTENTS } from '../constants/intents';
import type { Intent } from '../constants/intents';
import { colors, radii, spacing, typography, fonts } from '../constants/theme';
import { useScreenshots } from '../context/ScreenshotsContext';
import { LocalImage, Icon, ExtractedFieldsEditor } from '../components';
import { useNotice } from '../context/NoticeContext';
import {
  addScreenshotToCollection,
  createCollection,
  listCollections,
} from '../services/collectionsRepository';
import { retryOcrForScreenshot } from '../services/importScreenshots';
import {
  correctExtractedField,
  deleteScreenshot,
  getScreenshotById,
  setScreenshotTags,
  updateScreenshot,
} from '../services/screenshotsRepository';
import {
  cancelScreenshotReminder,
  scheduleScreenshotReminder,
} from '../notifications';
import type { ScreenshotWithMeta } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ScreenshotDetail'>;

export function ScreenshotDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { refresh } = useScreenshots();
  const { showNotice, showSheet } = useNotice();
  const [shot, setShot] = useState<ScreenshotWithMeta | null>(null);
  const [notes, setNotes] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const autoOcrRef = useRef(false);

  const load = useCallback(async () => {
    const item = await getScreenshotById(id);
    setShot(item);
    setNotes(item?.notes ?? '');
    setSourceUrl(item?.sourceUrl ?? '');
  }, [id]);

  useEffect(() => {
    autoOcrRef.current = false;
    load();
  }, [load]);

  const runOcr = useCallback(
    async (current: ScreenshotWithMeta, silent = false) => {
      setBusy(true);
      if (!silent) {
        setOcrStatus('Reading text…');
      }
      try {
        const result = await retryOcrForScreenshot(current);
        setShot(result.screenshot);
        await refresh();
        if (result.ok) {
          setOcrStatus(null);
          if (!silent) {
            showNotice({ title: 'Text found', body: result.message });
          }
        } else {
          setOcrStatus(result.message);
          if (!silent) {
            showNotice({ title: 'No text found', body: result.message });
          }
        }
      } catch {
        setOcrStatus('Could not read text. The screenshot is still saved.');
      } finally {
        setBusy(false);
      }
    },
    [refresh, showNotice],
  );

  useEffect(() => {
    if (!shot || shot.ocrText || autoOcrRef.current || busy) {
      return;
    }
    autoOcrRef.current = true;
    runOcr(shot, true).catch(() => undefined);
  }, [busy, runOcr, shot]);

  const persist = useCallback(
    async (patch: Parameters<typeof updateScreenshot>[1]) => {
      const updated = await updateScreenshot(id, patch);
      if (updated) {
        setShot(updated);
        await refresh();
      }
    },
    [id, refresh],
  );

  if (!shot) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Icon name="back" color={colors.accent} size={16} />
          <Text style={styles.close}>Back</Text>
        </Pressable>
        <Pressable onPress={() => persist({ isFavorite: !shot.isFavorite })}>
          <Icon
            name={shot.isFavorite ? 'star' : 'starOutline'}
            color={colors.accent}
            size={18}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
      <LocalImage uri={shot.imageUri} style={styles.image} resizeMode="contain" />

      <Text style={styles.why}>Why did you save this?</Text>
      <View style={styles.intentRow}>
        {INTENTS.map(intent => {
          const active = shot.intent === intent;
          return (
            <Pressable
              key={intent}
              onPress={() => persist({ intent: intent as Intent })}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {INTENT_LABELS[intent]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>CATEGORY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.intentRow}>
          {CATEGORIES.map(category => {
            const active = shot.category === category;
            return (
              <Pressable
                key={category}
                onPress={() => persist({ category })}
                style={[styles.chip, active && styles.chipActive]}>
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}>
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Text style={styles.label}>TAGS</Text>
      <Text style={styles.tags}>
        {shot.tags.length
          ? shot.tags.map(tag => `#${tag}`).join('   ')
          : 'No tags yet'}
      </Text>
      <View style={styles.tagRow}>
        <TextInput
          value={tagDraft}
          onChangeText={setTagDraft}
          placeholder="+ Add tag"
          placeholderTextColor={colors.muted}
          style={styles.tagInput}
          autoCapitalize="none"
        />
        <Pressable
          style={styles.smallButton}
          onPress={async () => {
            if (!tagDraft.trim()) {
              return;
            }
            const next = [...shot.tags, tagDraft];
            await setScreenshotTags(shot.id, next);
            setTagDraft('');
            await load();
            await refresh();
          }}>
          <Text style={styles.smallButtonText}>Add</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>NOTES</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        onBlur={() => persist({ notes })}
        placeholder="Add a note..."
        placeholderTextColor={colors.muted}
        multiline
        style={styles.note}
      />

      <Text style={styles.label}>SOURCE URL</Text>
      <TextInput
        value={sourceUrl}
        onChangeText={setSourceUrl}
        onBlur={() => persist({ sourceUrl: sourceUrl.trim() || null })}
        placeholder="Paste URL"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="url"
        style={styles.url}
      />

      <ExtractedFieldsEditor
        analysis={shot.analysis}
        onCorrectField={async (fieldKey, value) => {
          const updated = await correctExtractedField({
            screenshotId: shot.id,
            fieldKey,
            correctedValue: value,
          });
          if (updated) {
            setShot(updated);
            await refresh();
            showNotice({
              title: 'Field updated',
              body: 'Correction saved for local learning.',
            });
          }
        }}
      />

      {shot.ocrText ? (
        <>
          <Text style={styles.label}>OCR TEXT</Text>
          <Text selectable style={styles.ocr}>
            {shot.ocrText}
          </Text>
        </>
      ) : (
        <Text style={styles.ocrHint}>
          {ocrStatus ?? (busy ? 'Reading text…' : 'No text found yet. Tap Read text to try again.')}
        </Text>
      )}

      <Pressable
        style={styles.action}
        disabled={busy}
        onPress={() => {
          runOcr(shot, false).catch(() => undefined);
        }}>
        <Text style={styles.actionText}>{busy ? 'Reading…' : 'Read text'}</Text>
      </Pressable>

      <Pressable
        style={styles.action}
        onPress={async () => {
          const collections = await listCollections();
          if (!collections.length) {
            const created = await createCollection('My collection');
            await addScreenshotToCollection(created.id, shot.id);
            await load();
            await refresh();
            showNotice({ title: 'Added', body: `Saved to ${created.name}.` });
            return;
          }

          showSheet({
            title: 'Add to collection',
            body: 'Choose a collection',
            options: [
              ...collections.slice(0, 5).map(collection => ({
                label: collection.name,
                onPress: async () => {
                  await addScreenshotToCollection(collection.id, shot.id);
                  await load();
                  await refresh();
                },
              })),
              {
                label: 'New collection',
                onPress: async () => {
                  const created = await createCollection(
                    `Collection ${collections.length + 1}`,
                  );
                  await addScreenshotToCollection(created.id, shot.id);
                  await load();
                  await refresh();
                },
              },
            ],
          });
        }}>
        <Text style={styles.actionText}>
          {shot.collectionName
            ? `Collection: ${shot.collectionName}`
            : 'Add to collection'}
        </Text>
      </Pressable>

      <Pressable
        style={styles.action}
        onPress={() => {
          const setReminder = async (date: Date, deniedBody: string) => {
            await persist({ reminderDate: date.toISOString() });
            const scheduled = await scheduleScreenshotReminder({
              screenshotId: shot.id,
              fireAt: date,
              title: 'SnapMind reminder',
              body:
                shot.intent === 'buy'
                  ? 'Buy this? Open your saved screenshot.'
                  : 'You saved this screenshot for later.',
            });
            showNotice({
              title: scheduled ? 'Reminder set' : 'Reminder saved',
              body: scheduled
                ? `We'll remind you ${date.toLocaleString()}.`
                : deniedBody,
            });
          };

          showSheet({
            title: 'Set reminder',
            body: 'Local notification only. Nothing leaves your device.',
            options: [
              {
                label: 'In 1 hour',
                onPress: () =>
                  setReminder(
                    new Date(Date.now() + 60 * 60 * 1000),
                    'Date was saved. Enable notifications in Settings to get nudged.',
                  ),
              },
              {
                label: 'Tomorrow 9 AM',
                onPress: () => {
                  const date = new Date();
                  date.setDate(date.getDate() + 1);
                  date.setHours(9, 0, 0, 0);
                  return setReminder(
                    date,
                    'Enable notifications in Settings to get nudged.',
                  );
                },
              },
              {
                label: 'Next week',
                onPress: () => {
                  const date = new Date();
                  date.setDate(date.getDate() + 7);
                  date.setHours(9, 0, 0, 0);
                  return setReminder(date, 'Enable notifications in Settings.');
                },
              },
              {
                label: 'Clear reminder',
                destructive: true,
                onPress: async () => {
                  await persist({ reminderDate: null });
                  await cancelScreenshotReminder(shot.id);
                },
              },
            ],
          });
        }}>
        <Text style={styles.actionText}>
          {shot.reminderDate
            ? `Reminder: ${new Date(shot.reminderDate).toLocaleString()}`
            : 'Set reminder'}
        </Text>
      </Pressable>

      <Pressable
        style={styles.action}
        onPress={async () => {
          try {
            await Share.share({
              url: shot.imageUri,
              message: shot.notes ?? shot.ocrText ?? 'Shared from SnapMind',
            });
          } catch {
            showNotice({
              title: 'Share failed',
              body: 'Could not share this screenshot.',
            });
          }
        }}>
        <Text style={styles.actionText}>Share</Text>
      </Pressable>

      <Pressable
        style={[styles.action, styles.dangerAction]}
        onPress={() => {
          showSheet({
            title: 'Delete screenshot?',
            body: 'This removes the image from SnapMind, not from Photos.',
            options: [
              {
                label: 'Delete',
                destructive: true,
                onPress: async () => {
                  await cancelScreenshotReminder(shot.id);
                  await deleteScreenshot(shot.id);
                  await refresh();
                  navigation.goBack();
                },
              },
            ],
          });
        }}>
        <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
      </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  close: {
    color: colors.accent,
    fontSize: 17,
    fontFamily: fonts.semiBold,
  },
  image: {
    width: '100%',
    height: 320,
    borderRadius: radii.xl,
    backgroundColor: colors.softLavender,
  },
  why: {
    color: colors.secondary,
    fontSize: 14,
    marginTop: 22,
    marginBottom: 12,
  },
  intentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderMuted,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.secondary,
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.surface,
  },
  label: {
    ...typography.eyebrow,
    marginTop: 24,
    marginBottom: 8,
  },
  tags: {
    color: colors.primary,
    fontSize: 14,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tagInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
    color: colors.primary,
    paddingVertical: 8,
  },
  smallButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  smallButtonText: {
    color: colors.surface,
    fontFamily: fonts.bold,
  },
  note: {
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
    color: colors.primary,
    textAlignVertical: 'top',
  },
  url: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
    color: colors.primary,
    paddingVertical: 8,
  },
  ocr: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  ocrHint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.lg,
  },
  action: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    padding: 15,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  actionText: {
    color: colors.surface,
    fontFamily: fonts.bold,
  },
  dangerAction: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerText: {
    color: colors.danger,
  },
});
