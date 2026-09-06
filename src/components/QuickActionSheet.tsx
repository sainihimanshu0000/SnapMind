import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LocalImage } from './LocalImage';
import { colors, fonts, radii, spacing, typography } from '../constants/theme';
import { INTENT_LABELS, INTENTS, type Intent } from '../constants/intents';
import { CATEGORIES, type Category } from '../constants/categories';
import {
  suggestedActionsForCategory,
  type ScreenshotAsset,
  type ScreenshotDetectorCapabilities,
} from '../screenshotDetection';
import {
  deleteDetectedScreenshot,
  dismissDetectedScreenshot,
  extractTextFromAsset,
  saveDetectedScreenshot,
} from '../screenshotActions';
import { screenshotDetector } from '../screenshotDetection';
import {
  addScreenshotToCollection,
  createCollection,
  listCollections,
} from '../services/collectionsRepository';
import {
  scheduleScreenshotReminder,
} from '../notifications';
import { updateScreenshot } from '../services/screenshotsRepository';
import type { Collection, ScreenshotWithMeta } from '../types';
import { detectCategory } from '../categorization';

type Step = 'main' | 'remind' | 'organize' | 'extract' | 'delete';

type QuickActionSheetProps = {
  asset: ScreenshotAsset | null;
  previewUri: string | null;
  capabilities: ScreenshotDetectorCapabilities;
  onDone: (refresh: boolean) => void;
};

function laterToday(): Date {
  const date = new Date();
  date.setHours(18, 0, 0, 0);
  if (date.getTime() <= Date.now()) {
    date.setTime(Date.now() + 3 * 60 * 60 * 1000);
  }
  return date;
}

function tomorrowMorning(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

function nextWeek(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(9, 0, 0, 0);
  return date;
}

export function QuickActionSheet({
  asset,
  previewUri,
  capabilities,
  onDone,
}: QuickActionSheetProps) {
  const [step, setStep] = useState<Step>('main');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [shot, setShot] = useState<ScreenshotWithMeta | null>(null);
  const [extracted, setExtracted] = useState('');
  const [intent, setIntent] = useState<Intent>('other');
  const [category, setCategory] = useState<Category>('Other');
  const [notes, setNotes] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [newCollection, setNewCollection] = useState('');

  useEffect(() => {
    setStep('main');
    setBusy(false);
    setStatus(null);
    setShot(null);
    setExtracted('');
    setIntent('other');
    setCategory('Other');
    setNotes('');
    setFavorite(false);
    setCollectionId(null);
    setNewCollection('');
  }, [asset?.id]);

  const suggestions = suggestedActionsForCategory(category);

  const ensureSaved = useCallback(async () => {
    if (!asset) {
      return null;
    }
    if (shot) {
      return shot;
    }
    const result = await saveDetectedScreenshot(asset, { favorite });
    if (!result.ok || !result.screenshot) {
      setStatus(result.message);
      return null;
    }
    setShot(result.screenshot);
    setCategory(result.screenshot.category);
    if (result.screenshot.intent) {
      setIntent(result.screenshot.intent);
    }
    return result.screenshot;
  }, [asset, favorite, shot]);

  if (!asset) {
    return null;
  }

  const run = async (task: () => Promise<void>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await task();
    } catch {
      setStatus("We couldn't process this screenshot, but nothing was deleted.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => onDone(false)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {previewUri ? (
            <LocalImage uri={previewUri} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={[styles.preview, styles.previewFallback]} />
          )}
          <Text style={styles.kicker}>SnapMind</Text>
          <Text style={styles.title}>{suggestions.title}</Text>
          <Text style={styles.body}>What do you want to do?</Text>
          {!capabilities.automaticBackground ? (
            <Text style={styles.limit}>
              Detected because SnapMind is open or just became active. iOS cannot
              alert you the instant you screenshot another app in the background.
            </Text>
          ) : null}

          {status ? <Text style={styles.status}>{status}</Text> : null}
          {busy ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}

          {step === 'main' ? (
            <View style={styles.grid}>
              <ActionButton
                label="Save"
                onPress={() =>
                  run(async () => {
                    const result = await saveDetectedScreenshot(asset);
                    setStatus(result.message);
                    if (result.ok) {
                      setTimeout(() => onDone(true), 600);
                    }
                  })
                }
              />
              <ActionButton
                label="Delete"
                danger
                onPress={() => setStep('delete')}
              />
              <ActionButton label="Remind" onPress={() => setStep('remind')} />
              <ActionButton label="Organize" onPress={() => setStep('organize')} />
              <ActionButton
                label="Extract Text"
                wide
                onPress={() =>
                  run(async () => {
                    const result = await extractTextFromAsset(asset);
                    setShot(result.screenshot ?? null);
                    setExtracted(result.text);
                    setStatus(result.message);
                    if (result.text) {
                      setCategory(detectCategory(result.text));
                    }
                    setStep('extract');
                  })
                }
              />
              <ActionButton
                label="Favorite"
                onPress={() =>
                  run(async () => {
                    const result = await saveDetectedScreenshot(asset, {
                      favorite: true,
                    });
                    setStatus(result.ok ? 'Saved and favorited' : result.message);
                    if (result.ok) {
                      setTimeout(() => onDone(true), 600);
                    }
                  })
                }
              />
            </View>
          ) : null}

          {step === 'delete' ? (
            <View style={styles.stack}>
              <Text style={styles.section}>
                Delete this screenshot from Photos? iOS will ask you to confirm.
              </Text>
              <ActionButton
                label="Delete from Photos"
                danger
                wide
                onPress={() =>
                  run(async () => {
                    const result = await deleteDetectedScreenshot(asset);
                    setStatus(result.message);
                    if (result.ok) {
                      setTimeout(() => onDone(false), 600);
                    }
                  })
                }
              />
              <Pressable onPress={() => setStep('main')}>
                <Text style={styles.back}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'remind' ? (
            <View style={styles.stack}>
              <Text style={styles.section}>Remind me about this screenshot</Text>
              {[
                { label: 'Later today', at: laterToday },
                { label: 'Tomorrow', at: tomorrowMorning },
                { label: 'Next week', at: nextWeek },
              ].map(option => (
                <ActionButton
                  key={option.label}
                  label={option.label}
                  wide
                  onPress={() =>
                    run(async () => {
                      const saved = await ensureSaved();
                      if (!saved) {
                        return;
                      }
                      const at = option.at();
                      const scheduled = await scheduleScreenshotReminder({
                        screenshotId: saved.id,
                        fireAt: at,
                        title: 'SnapMind reminder',
                        body: "We'll remind you about this screenshot.",
                      });
                      if (!scheduled) {
                        setStatus(
                          'Allow notifications so SnapMind can remind you later.',
                        );
                        return;
                      }
                      await updateScreenshot(saved.id, {
                        reminderDate: at.toISOString(),
                      });
                      setStatus('Reminder set');
                      setTimeout(() => onDone(true), 700);
                    })
                  }
                />
              ))}
              <Pressable onPress={() => setStep('main')}>
                <Text style={styles.back}>Back</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'organize' ? (
            <ScrollView style={styles.organize} contentContainerStyle={styles.stack}>
              <Text style={styles.section}>Why did you save this?</Text>
              <View style={styles.chips}>
                {INTENTS.map(value => (
                  <Pressable
                    key={value}
                    onPress={() => setIntent(value)}
                    style={[
                      styles.chip,
                      intent === value ? styles.chipOn : null,
                    ]}>
                    <Text style={styles.chipLabel}>{INTENT_LABELS[value]}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.section}>Category</Text>
              <View style={styles.chips}>
                {CATEGORIES.slice(0, 8).map(value => (
                  <Pressable
                    key={value}
                    onPress={() => setCategory(value)}
                    style={[
                      styles.chip,
                      category === value ? styles.chipOn : null,
                    ]}>
                    <Text style={styles.chipLabel}>{value}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={() => setFavorite(value => !value)}
                style={styles.row}>
                <Text style={styles.rowLabel}>Favorite</Text>
                <Text style={styles.rowValue}>{favorite ? 'On' : 'Off'}</Text>
              </Pressable>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <Pressable
                onPress={() => {
                  listCollections().then(setCollections).catch(() => undefined);
                }}
                style={styles.row}>
                <Text style={styles.rowLabel}>Collection</Text>
                <Text style={styles.rowValue}>
                  {collections.find(item => item.id === collectionId)?.name ?? 'None'}
                </Text>
              </Pressable>
              {collections.map(item => (
                <Pressable
                  key={item.id}
                  onPress={() => setCollectionId(item.id)}
                  style={styles.row}>
                  <Text style={styles.rowLabel}>{item.name}</Text>
                </Pressable>
              ))}
              <TextInput
                value={newCollection}
                onChangeText={setNewCollection}
                placeholder="New collection name"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              <ActionButton
                label="Save organized"
                wide
                onPress={() =>
                  run(async () => {
                    const saved = await ensureSaved();
                    if (!saved) {
                      return;
                    }
                    let nextCollection = collectionId;
                    if (newCollection.trim()) {
                      const created = await createCollection(newCollection.trim());
                      nextCollection = created.id;
                    }
                    await updateScreenshot(saved.id, {
                      intent,
                      category,
                      notes: notes.trim() || null,
                      isFavorite: favorite,
                      collectionId: nextCollection,
                    });
                    if (nextCollection) {
                      await addScreenshotToCollection(nextCollection, saved.id);
                    }
                    setStatus('Organized in SnapMind');
                    setTimeout(() => onDone(true), 600);
                  })
                }
              />
              <Pressable onPress={() => setStep('main')}>
                <Text style={styles.back}>Back</Text>
              </Pressable>
            </ScrollView>
          ) : null}

          {step === 'extract' ? (
            <View style={styles.stack}>
              <Text style={styles.section}>
                {extracted ? 'Text detected' : 'No selectable text in the image'}
              </Text>
              <Text selectable style={styles.extracted}>
                {extracted ||
                  'The original image does not support native Live Text here. Copy from this view when text is found.'}
              </Text>
              {extracted ? (
                <ActionButton
                  label="Copy all"
                  wide
                  onPress={() =>
                    run(async () => {
                      const copied = await screenshotDetector.setClipboard(extracted);
                      setStatus(copied ? 'Copied' : 'Could not copy text.');
                    })
                  }
                />
              ) : null}
              <Pressable onPress={() => setStep('main')}>
                <Text style={styles.back}>Back</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            onPress={() =>
              run(async () => {
                await dismissDetectedScreenshot(asset);
                onDone(false);
              })
            }>
            <Text style={styles.dismiss}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ActionButton({
  label,
  onPress,
  danger,
  wide,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.action, wide ? styles.actionWide : null, danger ? styles.actionDanger : null]}>
      <Text style={[styles.actionLabel, danger ? styles.actionDangerLabel : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    maxHeight: '92%',
  },
  preview: {
    width: '100%',
    height: 140,
    borderRadius: radii.lg,
    backgroundColor: colors.softLavender,
    marginBottom: spacing.md,
  },
  previewFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    ...typography.eyebrow,
    marginBottom: 6,
  },
  title: {
    ...typography.title,
  },
  body: {
    ...typography.body,
    marginTop: 6,
    color: colors.secondary,
  },
  limit: {
    ...typography.meta,
    marginTop: spacing.sm,
    color: colors.muted,
  },
  status: {
    ...typography.meta,
    color: colors.accent,
    marginTop: spacing.sm,
  },
  spinner: {
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  stack: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  organize: {
    maxHeight: 360,
  },
  action: {
    width: '48%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionWide: {
    width: '100%',
  },
  actionDanger: {
    borderColor: '#E7C4C0',
  },
  actionLabel: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
    fontSize: 14,
  },
  actionDangerLabel: {
    color: colors.danger,
  },
  dismiss: {
    textAlign: 'center',
    color: colors.muted,
    fontFamily: fonts.medium,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  back: {
    color: colors.accent,
    fontFamily: fonts.semiBold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  section: {
    ...typography.meta,
    marginTop: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.accent,
    backgroundColor: '#F4E7DF',
  },
  chipLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLabel: {
    ...typography.body,
  },
  rowValue: {
    ...typography.meta,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    color: colors.primary,
    backgroundColor: colors.surface,
  },
  extracted: {
    ...typography.body,
    lineHeight: 22,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 90,
  },
});
