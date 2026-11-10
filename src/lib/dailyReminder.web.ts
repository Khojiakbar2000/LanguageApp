export async function setDailyLearningReminder(enabled: boolean) {
  if (enabled) throw new Error('Daily reminders are available in the mobile app.');
}

export async function syncDailyLearningReminder(_enabled: boolean) {}
