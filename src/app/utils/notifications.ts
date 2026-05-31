/**
 * Toast Notification Utility
 * 
 * Replaces alert() calls with proper toast notifications
 * Uses sonner library (already installed)
 */

import { toast as sonnerToast } from 'sonner';

export const notify = {
  /**
   * Success notification
   */
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Error notification
   */
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 6000, // Errors stay longer
    });
  },

  /**
   * Warning notification
   */
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 5000,
    });
  },

  /**
   * Info notification
   */
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Loading notification (returns id to dismiss later)
   */
  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, {
      description,
    });
  },

  /**
   * Dismiss a loading notification
   */
  dismiss: (toastId: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  /**
   * Promise-based notification (auto handles loading/success/error)
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },

  /**
   * Custom notification with action button
   */
  action: (
    message: string,
    actionLabel: string,
    onAction: () => void,
    description?: string
  ) => {
    sonnerToast(message, {
      description,
      action: {
        label: actionLabel,
        onClick: onAction,
      },
      duration: 6000,
    });
  },
};

// Legacy compatibility - can be used as drop-in alert() replacement
export const alertCompat = (message: string) => {
  // Parse common alert patterns
  if (message.toLowerCase().includes('success') || message.includes('✅')) {
    notify.success(message);
  } else if (message.toLowerCase().includes('error') || message.toLowerCase().includes('fail') || message.includes('❌')) {
    notify.error(message);
  } else if (message.toLowerCase().includes('warning') || message.includes('⚠️')) {
    notify.warning(message);
  } else {
    notify.info(message);
  }
};
