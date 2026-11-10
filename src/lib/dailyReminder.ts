import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

const reminderTag = 'haru-daily-learning-reminder';
const channelId = 'haru-daily-learning';

async function scheduleReminder(requestPermission: boolean, hour: number) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Daily Korean practice',
      importance: AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
      lightColor: '#7096D1',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.granted || !requestPermission ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    if (requestPermission)
      throw new Error('Allow notifications in your device settings to turn on daily reminders.');
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🐼 Dori is ready for a little Korean practice!',
      body: 'A small Korean moment is here whenever it suits you.',
      data: { tag: reminderTag },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
  });
}

export async function setDailyLearningReminder(enabled: boolean, hour = 18) {
  if (Platform.OS === 'web') throw new Error('Daily reminders are available in the mobile app.');
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.tag === reminderTag)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
  if (!enabled) return;
  await scheduleReminder(true, hour);
}

export async function syncDailyLearningReminder(enabled: boolean, hour = 18) {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.tag === reminderTag)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
  if (enabled) await scheduleReminder(false, hour);
}
