export interface NotificationServicePort {
  requestPermissions(): Promise<boolean>;
  scheduleDailyReminder(
    questionId: string,
    timeOfDay: string, // "HH:mm" e.g. "08:00"
    promptPreview: string,
  ): Promise<string | null>;
  cancelReminder(notificationId: string): Promise<void>;
  cancelReminderForQuestion(questionId: string): Promise<void>;
}
