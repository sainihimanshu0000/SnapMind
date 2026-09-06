/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { handleQuickActionEvent } from './src/notifications/ScreenshotNotificationService';

notifee.onBackgroundEvent(async event => {
  await handleQuickActionEvent(event);
});

AppRegistry.registerComponent(appName, () => App);
