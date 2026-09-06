import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation';
import { useDatabase } from './src/hooks';
import { ScreenshotsProvider } from './src/context/ScreenshotsContext';
import { NoticeProvider } from './src/context/NoticeContext';
import { OnboardingScreen } from './src/screens';
import { getPreference } from './src/storage';
import { colors, fonts, spacing, typography } from './src/constants/theme';

function App() {
  const { status, error } = useDatabase();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    getPreference('onboardingComplete')
      .then(value => {
        setShowOnboarding(value !== '1');
      })
      .finally(() => setOnboardingReady(true));
  }, []);

  const booting = status === 'loading' || !onboardingReady;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {booting ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Preparing SnapMind…</Text>
          </View>
        ) : null}

        {status === 'error' ? (
          <View style={styles.centered}>
            <Text style={styles.errorTitle}>Couldn’t open local storage</Text>
            <Text style={styles.errorBody}>
              {error ?? 'Something went wrong initializing the database.'}
            </Text>
            <Text style={styles.errorHint}>
              Your screenshots stay on this device. Try restarting the app.
            </Text>
          </View>
        ) : null}

        {status === 'ready' && onboardingReady && showOnboarding ? (
          <OnboardingScreen onDone={() => setShowOnboarding(false)} />
        ) : null}

        {status === 'ready' && onboardingReady && !showOnboarding ? (
          <ScreenshotsProvider>
            <NoticeProvider>
              <View style={styles.appShell}>
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </View>
            </NoticeProvider>
          </ScreenshotsProvider>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appShell: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  loadingText: {
    ...typography.meta,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.title,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: fonts.regular,
    color: colors.secondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorHint: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

export default App;
