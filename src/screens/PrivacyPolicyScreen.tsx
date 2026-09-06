import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts, spacing, typography } from '../constants/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

export function PrivacyPolicyScreen({ navigation }: Props) {
  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.meta}>Last updated: September 6, 2026</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.p}>
          SnapMind (“we”, “the app”) is a personal screenshot organizer. This
          policy explains what data the app handles and how.
        </Text>

        <Text style={styles.h}>1. Summary</Text>
        <Text style={styles.p}>
          SnapMind is designed to keep your screenshots on your device. We do
          not operate a SnapMind cloud account that receives your images by
          default. Processing such as text reading (OCR) happens on-device when
          available.
        </Text>

        <Text style={styles.h}>2. Data stored on your device</Text>
        <Text style={styles.p}>
          Depending on how you use the app, SnapMind may store locally:
          screenshot image files you import or save; OCR text extracted from
          those images; categories, tags, notes, favorites, collections,
          reminders; and app preferences (for example, whether screenshot quick
          actions are enabled).
        </Text>

        <Text style={styles.h}>3. Permissions</Text>
        <Text style={styles.p}>
          Photos / media images: used to import screenshots you select and,
          only if you enable Screenshot Quick Actions, to detect new screenshots
          so you can save, dismiss, or delete them. Notifications: used for
          optional reminders and, if enabled, the Android screenshot watcher
          notification. Background / boot: used only when Screenshot Quick
          Actions is enabled, so watching can resume after reboot.
        </Text>

        <Text style={styles.h}>4. Sharing</Text>
        <Text style={styles.p}>
          SnapMind does not sell your personal information. Export and Share
          features only send data when you explicitly choose a destination (for
          example Files, Mail, or Drive) through the system share sheet.
        </Text>

        <Text style={styles.h}>5. Children</Text>
        <Text style={styles.p}>
          SnapMind is not directed at children under 13. Do not use the app to
          collect personal information from children.
        </Text>

        <Text style={styles.h}>6. Deletion</Text>
        <Text style={styles.p}>
          You can delete individual screenshots or use Settings → Delete all
          data to erase the local SnapMind library on this device. Uninstalling
          the app also removes app-private storage.
        </Text>

        <Text style={styles.h}>7. Contact</Text>
        <Text style={styles.p}>
          For privacy questions about SnapMind, contact the developer listed on
          the Google Play store listing for this app.
        </Text>

        <Text style={styles.note}>
          Host a copy of this policy at a public HTTPS URL and paste that URL
          into Play Console → App content → Privacy policy before publishing.
        </Text>
      </ScrollView>
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
    paddingBottom: spacing.md,
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
    marginTop: 8,
  },
  meta: {
    ...typography.meta,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: 48,
  },
  h: {
    ...typography.title,
    marginTop: spacing.lg,
    marginBottom: 6,
  },
  p: {
    ...typography.body,
    color: colors.secondary,
    lineHeight: 22,
  },
  note: {
    ...typography.meta,
    marginTop: spacing.xl,
    color: colors.muted,
  },
});
