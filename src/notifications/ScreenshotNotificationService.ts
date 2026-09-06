import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  type Event,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import type { ScreenshotAsset } from '../screenshotDetection';
import {
  dismissDetectedScreenshot,
  saveDetectedScreenshot,
} from '../screenshotActions';

const CHANNEL_ID = 'snapmind-quick-actions';
const CATEGORY_ID = 'screenshot-quick';

export async function setupScreenshotNotificationHandlers(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    const allowed =
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Screenshot quick actions',
        importance: AndroidImportance.HIGH,
      });
    }

    await notifee.setNotificationCategories([
      {
        id: CATEGORY_ID,
        actions: [
          { id: 'save', title: 'Save' },
          { id: 'dismiss', title: 'Dismiss' },
        ],
      },
    ]);

    return allowed;
  } catch {
    return false;
  }
}

function parseAsset(data?: Record<string, unknown>): ScreenshotAsset | null {
  const id = data?.assetId;
  if (typeof id !== 'string' || !id) {
    return null;
  }
  return {
    id,
    createdAt: Number(data?.createdAt ?? Date.now()),
    width: Number(data?.width ?? 0),
    height: Number(data?.height ?? 0),
    filename: typeof data?.filename === 'string' ? data.filename : undefined,
  };
}

export async function handleQuickActionEvent(event: Event): Promise<void> {
  const asset = parseAsset(
    event.detail.notification?.data as Record<string, unknown>,
  );
  if (!asset) {
    return;
  }

  if (event.type === EventType.ACTION_PRESS) {
    const pressId = event.detail.pressAction?.id;
    if (pressId === 'save') {
      await saveDetectedScreenshot(asset);
    }
    if (pressId === 'dismiss') {
      await dismissDetectedScreenshot(asset);
    }
  }
}

export async function notifyNewScreenshot(
  asset: ScreenshotAsset,
): Promise<boolean> {
  try {
    const allowed = await setupScreenshotNotificationHandlers();
    if (!allowed) {
      return false;
    }

    await notifee.displayNotification({
      id: `quick-${asset.id}`,
      title: 'New screenshot',
      body: 'Save, remind, or organize it in SnapMind.',
      data: {
        assetId: asset.id,
        createdAt: String(asset.createdAt),
        width: String(asset.width),
        height: String(asset.height),
        filename: asset.filename ?? '',
      },
      ios: {
        categoryId: CATEGORY_ID,
        interruptionLevel: 'active',
        sound: 'default',
        foregroundPresentationOptions: {
          banner: true,
          list: true,
          sound: true,
          badge: false,
        },
      },
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: 'default' },
        importance: AndroidImportance.HIGH,
        actions: [
          { title: 'Save', pressAction: { id: 'save' } },
          { title: 'Dismiss', pressAction: { id: 'dismiss' } },
        ],
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelQuickNotification(assetId: string): Promise<void> {
  try {
    await notifee.cancelNotification(`quick-${assetId}`);
  } catch {
    // Ignore.
  }
}
