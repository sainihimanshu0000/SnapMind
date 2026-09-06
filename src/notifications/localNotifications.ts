import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { countScreenshots, listOldScreenshots } from '../services/screenshotsRepository';

const CHANNEL_ID = 'snapmind-reminders';
const DAILY_CLEANUP_ID = 'snapmind-daily-cleanup';

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'SnapMind Reminders',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

function reminderNotificationId(screenshotId: string): string {
  return `screenshot-reminder-${screenshotId}`;
}

export async function scheduleScreenshotReminder(input: {
  screenshotId: string;
  fireAt: Date;
  title?: string;
  body?: string;
}): Promise<boolean> {
  try {
    const allowed = await requestNotificationPermission();
    if (!allowed) {
      return false;
    }

    await ensureChannel();
    await notifee.cancelNotification(reminderNotificationId(input.screenshotId));

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: input.fireAt.getTime(),
    };

    await notifee.createTriggerNotification(
      {
        id: reminderNotificationId(input.screenshotId),
        title: input.title ?? 'SnapMind reminder',
        body:
          input.body ??
          'You saved a screenshot for later. Open SnapMind to act on it.',
        data: { screenshotId: input.screenshotId },
        android: {
          channelId: CHANNEL_ID,
          pressAction: { id: 'default' },
        },
      },
      trigger,
    );
    return true;
  } catch {
    return false;
  }
}

export async function cancelScreenshotReminder(
  screenshotId: string,
): Promise<void> {
  try {
    await notifee.cancelNotification(reminderNotificationId(screenshotId));
  } catch {
    // Ignore cancel failures.
  }
}

export async function scheduleDailyCleanupReminder(
  hour = 20,
  minute = 0,
): Promise<boolean> {
  try {
    const allowed = await requestNotificationPermission();
    if (!allowed) {
      return false;
    }

    await ensureChannel();
    await notifee.cancelNotification(DAILY_CLEANUP_ID);

    const fireAt = new Date();
    fireAt.setHours(hour, minute, 0, 0);
    if (fireAt.getTime() <= Date.now()) {
      fireAt.setDate(fireAt.getDate() + 1);
    }

    const oldCount = (await listOldScreenshots(30)).length;
    const total = await countScreenshots();
    const body =
      oldCount > 0
        ? `You have ${oldCount} old screenshots to review. Take 2 minutes to clean them up.`
        : total > 0
          ? `Your library has ${total} screenshots. A quick cleanup keeps things useful.`
          : 'Import a few screenshots and SnapMind will help you stay organized.';

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: fireAt.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
    };

    await notifee.createTriggerNotification(
      {
        id: DAILY_CLEANUP_ID,
        title: 'SnapMind',
        body,
        android: {
          channelId: CHANNEL_ID,
          pressAction: { id: 'default' },
        },
      },
      trigger,
    );
    return true;
  } catch {
    return false;
  }
}

export async function cancelDailyCleanupReminder(): Promise<void> {
  try {
    await notifee.cancelNotification(DAILY_CLEANUP_ID);
  } catch {
    // Ignore cancel failures.
  }
}
