export type RootTabParamList = {
  Home: undefined;
  Search: undefined;
  Collections: undefined;
  Cleanup: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  ScreenshotDetail: { id: string };
  CollectionDetail: { id: string; name: string };
  PrivacyPolicy: undefined;
};
