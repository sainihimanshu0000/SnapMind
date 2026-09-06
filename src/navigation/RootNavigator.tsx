import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CleanupScreen,
  CollectionDetailScreen,
  CollectionsScreen,
  HomeScreen,
  SearchScreen,
  SettingsScreen,
  ScreenshotDetailScreen,
  PrivacyPolicyScreen,
} from '../screens';
import { Icon, ScreenshotQuickActionsHost } from '../components';
import { colors, fonts } from '../constants/theme';
import type { RootStackParamList, RootTabParamList } from './types';
import type { IconName } from '../components/Icon';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, IconName> = {
  Home: 'home',
  Search: 'search',
  Collections: 'collections',
  Cleanup: 'cleanup',
  Settings: 'settings',
};

const TAB_BAR_CONTENT_HEIGHT = 56;

function makeTabIcon(
  name: keyof RootTabParamList,
): NonNullable<BottomTabNavigationOptions['tabBarIcon']> {
  return ({ color }) => <Icon name={TAB_ICONS[name]} color={color} size={18} />;
}

const tabIcons = {
  Home: makeTabIcon('Home'),
  Search: makeTabIcon('Search'),
  Collections: makeTabIcon('Collections'),
  Cleanup: makeTabIcon('Cleanup'),
  Settings: makeTabIcon('Settings'),
} as const;

function TabsNavigator() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  const screenOptions: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: {
      height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
      paddingTop: 6,
      paddingBottom: bottomInset,
      backgroundColor: colors.background,
      borderTopColor: colors.border,
    },
    tabBarLabelStyle: {
      fontSize: 10,
      fontFamily: fonts.semiBold,
    },
  };

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: tabIcons.Home }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarIcon: tabIcons.Search }}
      />
      <Tab.Screen
        name="Collections"
        component={CollectionsScreen}
        options={{ tabBarIcon: tabIcons.Collections }}
      />
      <Tab.Screen
        name="Cleanup"
        component={CleanupScreen}
        options={{ tabBarIcon: tabIcons.Cleanup }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: tabIcons.Settings }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <>
      <Stack.Navigator>
        <Stack.Screen
          name="Tabs"
          component={TabsNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ScreenshotDetail"
          component={ScreenshotDetailScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="CollectionDetail"
          component={CollectionDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
      <ScreenshotQuickActionsHost />
    </>
  );
}
