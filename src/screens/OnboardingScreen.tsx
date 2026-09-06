import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radii, spacing, typography, fonts } from '../constants/theme';
import { setPreference } from '../storage';

const SLIDES = [
  {
    title: 'Your screenshots deserve\nto be useful.',
    body: 'SnapMind turns screenshot clutter into organized memories.',
  },
  {
    title: 'Capture → Understand → Act',
    body: 'Import, read text, set intent, then find it when you need it.',
  },
  {
    title: 'Your screenshots stay\non your device.',
    body: 'SnapMind is offline-first. Nothing is uploaded by default.',
  },
] as const;

type OnboardingScreenProps = {
  onDone: () => void;
};

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const dots = useMemo(
    () =>
      SLIDES.map((_, i) => (
        <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
      )),
    [index],
  );

  return (
    <View style={styles.page}>
      <Text style={styles.brand}>SnapMind</Text>
      <View style={styles.center}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.dots}>{dots}</View>
        <Pressable
          style={styles.button}
          onPress={async () => {
            if (!isLast) {
              setIndex(index + 1);
              return;
            }
            await setPreference('onboardingComplete', '1');
            onDone();
          }}>
          <Text style={styles.buttonText}>
            {isLast ? 'Get Started' : 'Continue'}
          </Text>
        </Pressable>
        {!isLast ? (
          <Pressable
            onPress={async () => {
              await setPreference('onboardingComplete', '1');
              onDone();
            }}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: 40,
    minHeight: height * 0.85,
  },
  brand: {
    ...typography.eyebrow,
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.heading,
    fontSize: 32,
    lineHeight: 40,
  },
  body: {
    fontFamily: fonts.regular,
    color: colors.secondary,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.lg,
    maxWidth: 320,
  },
  footer: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderMuted,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 20,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 15,
    paddingHorizontal: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.surface,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  skip: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 14,
  },
});
