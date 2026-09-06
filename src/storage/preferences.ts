import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  onboardingComplete: '@snapmind/onboarding_complete',
  dailyCleanupReminder: '@snapmind/daily_cleanup_reminder',
  defaultCategory: '@snapmind/default_category',
  screenshotQuickActions: '@snapmind/screenshot_quick_actions',
  screenshotQuickLastScan: '@snapmind/screenshot_quick_last_scan',
} as const;

export async function getPreference(key: keyof typeof KEYS): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS[key]);
  } catch {
    return null;
  }
}

export async function setPreference(
  key: keyof typeof KEYS,
  value: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS[key], value);
  } catch {
    // Preferences are non-critical; fail quietly.
  }
}

export const preferenceKeys = KEYS;
