import { create } from 'zustand';
import type { Notification } from '../types';
import { notificationsAPI } from '../api/endpoints';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await notificationsAPI.getAll(0, 50);
      const items: Notification[] = response.data ?? response;
      const unread = items.filter(n => !n.is_read).length;
      set({
        notifications: items,
        unreadCount: unread,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ notifications: [], unreadCount: 0, isLoading: false });
    }
  },

  markAsRead: async (id: number) => {
    try {
      await notificationsAPI.markAsRead(id);
      const { notifications } = get();
      set({
        notifications: notifications.map(n =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsAPI.markAllAsRead();
      const { notifications } = get();
      set({
        notifications: notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },
}));
