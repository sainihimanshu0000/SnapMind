import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenHeader } from '../components';
import { colors, radii, spacing, typography, fonts } from '../constants/theme';
import { useNotice } from '../context/NoticeContext';
import { useScreenshots } from '../context/ScreenshotsContext';
import { deleteAllScreenshots } from '../services/screenshotsRepository';
import { shareLibraryExport } from '../services/exportLibrary';
import { getPreference, setPreference } from '../storage';
import {
  cancelDailyCleanupReminder,
  scheduleDailyCleanupReminder,
  setupScreenshotNotificationHandlers,
} from '../notifications';
import {
  screenshotDetector,
  notifyQuickActionsPrefChanged,
} from '../screenshotDetection';
import type { RootStackParamList } from '../navigation/types';

/** Hosted privacy policy URL for Play Console. Update before publishing. */
export const PRIVACY_POLICY_URL = 'https://example.com/snapmind-privacy';

const APP_VERSION = '1.0.0';

export function SettingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { refresh } = useScreenshots();
  const { showNotice } = useNotice();
  const [dailyReminder, setDailyReminder] = useState(false);
  const [quickActions, setQuickActions] = useState(false);
  const [capabilityNote, setCapabilityNote] = useState('');

  React.useEffect(() => {
    getPreference('dailyCleanupReminder').then(value => {
      setDailyReminder(value === '1');
    });
    getPreference('screenshotQuickActions').then(value => {
      setQuickActions(value === '1');
    });
    screenshotDetector.getCapabilities().then(caps => {
      setCapabilityNote(caps.summary);
    });
  }, []);

  return (
    <View style={styles.page}>
      <ScreenHeader title="Quietly yours." subtitle="SETTINGS" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.privacy}>
          <Text style={styles.privacyTitle}>
            Your screenshots stay on your device.
          </Text>
          <Text style={styles.privacyBody}>
            SnapMind does not upload your screenshots by default. Photo access
            is only used to organize screenshots you choose to save.
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Screenshot Quick Actions</Text>
            <Text style={styles.rowMeta}>
              Optional. When enabled, SnapMind may watch for new screenshots and
              shows a persistent Android watcher notification. You can turn this
              off anytime.
            </Text>
          </View>
          <Switch
            value={quickActions}
            onValueChange={async value => {
              if (!value) {
                setQuickActions(false);
                await setPreference('screenshotQuickActions', '0');
                notifyQuickActionsPrefChanged();
                return;
              }
              Alert.alert(
                'Turn on screenshot actions?',
                'SnapMind needs access to your photos to detect and organize screenshots you choose to save. A persistent notification is shown while watching.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Enable',
                    onPress: async () => {
                      const status = await screenshotDetector.requestPermission();
                      if (status !== 'authorized' && status !== 'limited') {
                        Alert.alert(
                          'Permission needed',
                          'Allow photo access in Settings to use screenshot quick actions.',
                        );
                        setQuickActions(false);
                        await setPreference('screenshotQuickActions', '0');
                        notifyQuickActionsPrefChanged();
                        return;
                      }
                      const notified = await setupScreenshotNotificationHandlers();
                      if (!notified) {
                        Alert.alert(
                          'Notifications off',
                          'Allow notifications so SnapMind can show a banner after a screenshot. You can still use the in-app sheet.',
                        );
                      }
                      setQuickActions(true);
                      await setPreference('screenshotQuickActions', '1');
                      await setPreference(
                        'screenshotQuickLastScan',
                        String(Date.now()),
                      );
                      await screenshotDetector.start();
                      notifyQuickActionsPrefChanged();
                    },
                  },
                ],
              );
            }}
            trackColor={{ true: colors.accent, false: colors.borderMuted }}
          />
        </View>
        {capabilityNote ? (
          <Text style={styles.capability}>{capabilityNote}</Text>
        ) : null}

        <View style={styles.row}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Daily cleanup reminder</Text>
            <Text style={styles.rowMeta}>Local notification around 8:00 PM</Text>
          </View>
          <Switch
            value={dailyReminder}
            onValueChange={async value => {
              if (value) {
                Alert.alert(
                  'Enable cleanup reminders?',
                  'SnapMind will ask for notification permission and nudge you once a day. Nothing is uploaded.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Enable',
                      onPress: async () => {
                        const scheduled =
                          await scheduleDailyCleanupReminder(20, 0);
                        if (!scheduled) {
                          Alert.alert(
                            'Permission needed',
                            'Enable notifications in system Settings to get daily cleanup reminders.',
                          );
                          setDailyReminder(false);
                          await setPreference('dailyCleanupReminder', '0');
                          return;
                        }
                        setDailyReminder(true);
                        await setPreference('dailyCleanupReminder', '1');
                      },
                    },
                  ],
                );
                return;
              }
              setDailyReminder(false);
              await setPreference('dailyCleanupReminder', '0');
              await cancelDailyCleanupReminder();
            }}
            trackColor={{ true: colors.accent, false: colors.borderMuted }}
          />
        </View>

        <Pressable
          style={styles.row}
          onPress={async () => {
            try {
              await shareLibraryExport();
            } catch (error) {
              const body =
                error instanceof Error
                  ? error.message
                  : 'Could not export your local data.';
              showNotice({ title: 'Export failed', body });
            }
          }}>
          <Text style={styles.rowTitle}>Export data</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('PrivacyPolicy')}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Privacy policy</Text>
            <Text style={styles.rowMeta}>How SnapMind handles your data</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          style={styles.row}
          onPress={() => {
            Linking.openURL(PRIVACY_POLICY_URL).catch(() => {
              showNotice({
                title: 'Link unavailable',
                body: 'Update PRIVACY_POLICY_URL in Settings before Play release, or open Privacy policy in the app.',
              });
            });
          }}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Privacy policy (web)</Text>
            <Text style={styles.rowMeta}>Opens the hosted policy URL</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.row}>
          <Text style={styles.rowTitle}>OCR</Text>
          <Text style={styles.rowMeta}>On-device</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowTitle}>Storage</Text>
          <Text style={styles.rowMeta}>Local only</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowTitle}>Ads / tracking</Text>
          <Text style={styles.rowMeta}>None</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowTitle}>Version</Text>
          <Text style={styles.rowMeta}>{APP_VERSION}</Text>
        </View>

        <Pressable
          onPress={() => {
            Alert.alert(
              'Delete all data?',
              'This permanently deletes every screenshot, tag, collection, and reminder stored in SnapMind on this device.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete everything',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteAllScreenshots();
                    await refresh();
                    Alert.alert('Deleted', 'Your SnapMind library is empty.');
                  },
                },
              ],
            );
          }}>
          <Text style={styles.danger}>Delete all data</Text>
        </Pressable>
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
  privacy: {
    backgroundColor: colors.softMint,
    borderRadius: radii.lg,
    padding: 18,
    marginBottom: spacing.md,
  },
  privacyTitle: {
    color: '#163C37',
    fontSize: 17,
    fontFamily: fonts.bold,
  },
  privacyBody: {
    color: '#3E6A63',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rowTitle: {
    ...typography.body,
    fontFamily: fonts.semiBold,
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  chevron: {
    color: colors.accent,
    fontSize: 18,
  },
  danger: {
    color: colors.danger,
    fontSize: 15,
    fontFamily: fonts.semiBold,
    marginTop: 30,
  },
  capability: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
});
