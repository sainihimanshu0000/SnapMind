import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, radii, spacing, typography } from '../constants/theme';

export type NoticePayload = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export type SheetOption = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type NoticeContextValue = {
  showNotice: (payload: NoticePayload) => void;
  showSheet: (payload: {
    title: string;
    body?: string;
    options: SheetOption[];
  }) => void;
};

const NoticeContext = createContext<NoticeContextValue | null>(null);

export function NoticeProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<NoticePayload | null>(null);
  const [sheet, setSheet] = useState<{
    title: string;
    body?: string;
    options: SheetOption[];
  } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeY = useRef(new Animated.Value(-80)).current;
  const sheetY = useRef(new Animated.Value(400)).current;
  const dim = useRef(new Animated.Value(0)).current;

  const clearNoticeTimer = useCallback(() => {
    if (noticeTimer.current) {
      clearTimeout(noticeTimer.current);
      noticeTimer.current = null;
    }
  }, []);

  const hideNotice = useCallback(() => {
    clearNoticeTimer();
    Animated.timing(noticeY, {
      toValue: -80,
      duration: 180,
      useNativeDriver: true,
    }).start();
    noticeTimer.current = setTimeout(() => {
      setNotice(null);
      noticeTimer.current = null;
    }, 180);
  }, [clearNoticeTimer, noticeY]);

  const showNotice = useCallback(
    (payload: NoticePayload) => {
      clearNoticeTimer();
      setNotice(payload);
      noticeY.setValue(-80);
      Animated.timing(noticeY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      noticeTimer.current = setTimeout(hideNotice, 2800);
    },
    [clearNoticeTimer, hideNotice, noticeY],
  );

  const hideSheet = useCallback(() => {
    if (sheetHideTimer.current) {
      clearTimeout(sheetHideTimer.current);
    }
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 400,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(dim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    sheetHideTimer.current = setTimeout(() => {
      setSheet(null);
      sheetHideTimer.current = null;
    }, 200);
  }, [dim, sheetY]);

  const showSheet = useCallback(
    (payload: {
      title: string;
      body?: string;
      options: SheetOption[];
    }) => {
      if (sheetHideTimer.current) {
        clearTimeout(sheetHideTimer.current);
        sheetHideTimer.current = null;
      }
      setSheet(payload);
      sheetY.setValue(400);
      dim.setValue(0);
      Animated.parallel([
        Animated.timing(sheetY, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(dim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [dim, sheetY],
  );

  useEffect(
    () => () => {
      clearNoticeTimer();
      if (sheetHideTimer.current) {
        clearTimeout(sheetHideTimer.current);
      }
    },
    [clearNoticeTimer],
  );

  const value = useMemo(
    () => ({ showNotice, showSheet }),
    [showNotice, showSheet],
  );

  return (
    <NoticeContext.Provider value={value}>
      <View style={styles.root} collapsable={false}>
        <View style={styles.fill} collapsable={false}>
          {children}
        </View>

        <View style={styles.toastSlot} pointerEvents="none">
          {notice ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.toast, { transform: [{ translateY: noticeY }] }]}>
              <Text style={styles.toastTitle}>{notice.title}</Text>
              {notice.body ? (
                <Text style={styles.toastBody}>{notice.body}</Text>
              ) : null}
            </Animated.View>
          ) : null}
        </View>

        {sheet ? (
          <View style={styles.sheetRoot} pointerEvents="auto">
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={hideSheet}
              accessibilityRole="button"
              accessibilityLabel="Dismiss">
              <Animated.View style={[styles.sheetDim, { opacity: dim }]} />
            </Pressable>
            <Animated.View
              style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
              <Text style={styles.sheetTitle}>{sheet.title}</Text>
              {sheet.body ? (
                <Text style={styles.sheetBody}>{sheet.body}</Text>
              ) : null}
              {sheet.options.map(option => (
                <Pressable
                  key={option.label}
                  style={styles.sheetRow}
                  onPress={() => {
                    const run = option.onPress;
                    hideSheet();
                    run();
                  }}>
                  <Text
                    style={[
                      styles.sheetLabel,
                      option.destructive ? styles.sheetDanger : null,
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable style={styles.sheetRow} onPress={hideSheet}>
                <Text style={styles.sheetCancel}>Cancel</Text>
              </Pressable>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const ctx = useContext(NoticeContext);
  if (!ctx) {
    throw new Error('useNotice must be used within NoticeProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  toastSlot: {
    position: 'absolute',
    top: 8,
    left: spacing.lg,
    right: spacing.lg,
    height: 0,
    overflow: 'visible',
    zIndex: 999,
  },
  toast: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  toastTitle: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
    fontSize: 14,
  },
  toastBody: {
    ...typography.meta,
    marginTop: 4,
  },
  sheetRoot: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  sheetDim: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.35)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    paddingBottom: 28,
  },
  sheetTitle: {
    ...typography.title,
  },
  sheetBody: {
    ...typography.meta,
    marginTop: 6,
    marginBottom: spacing.md,
  },
  sheetRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetLabel: {
    ...typography.body,
    fontFamily: fonts.semiBold,
  },
  sheetDanger: {
    color: colors.danger,
  },
  sheetCancel: {
    ...typography.meta,
    textAlign: 'center',
    marginTop: 4,
  },
});
