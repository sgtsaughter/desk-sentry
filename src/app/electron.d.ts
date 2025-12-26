// Type definitions for our custom Electron API
export interface ElectronAPI {
  sendNotification: (data: NotificationData) => void;
  onNotificationClick: (callback: () => void) => void;
}

export interface NotificationData {
  title: string;
  body: string;
  urgency?: 'low' | 'normal' | 'critical';
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
