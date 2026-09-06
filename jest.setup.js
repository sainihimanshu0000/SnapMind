jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
    createChannel: jest.fn(async () => 'snapmind-reminders'),
    displayNotification: jest.fn(async () => 'id'),
    setNotificationCategories: jest.fn(async () => undefined),
    onForegroundEvent: jest.fn(() => () => undefined),
    createTriggerNotification: jest.fn(async () => 'id'),
    cancelNotification: jest.fn(async () => undefined),
  },
  EventType: { ACTION_PRESS: 1, DISMISSED: 0, PRESS: 3 },
  AndroidImportance: { DEFAULT: 3 },
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2, DENIED: 0 },
  TriggerType: { TIMESTAMP: 0 },
  RepeatFrequency: { DAILY: 1 },
}));
