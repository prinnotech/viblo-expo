// hooks/usePushNotifications.ts
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
import { router } from 'expo-router';

// Configure how notifications behave when app is open
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export interface NotificationPermissionStatus {
    granted: boolean;
    canAskAgain: boolean;
    status: string;
}

/**
 * Register for push notifications
 * @returns Push token string, 'PERMISSION_DENIED_GO_TO_SETTINGS' if permanently denied, or null if denied
 */
export async function registerForPushNotifications(): Promise<string | null> {
    try {
        // Must use physical device
        if (!Device.isDevice) {
            console.log('Must use physical device for push notifications');
            return null;
        }

        // CRITICAL: On Android 13+, create notification channel BEFORE requesting permissions
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default Notifications',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#4A90E2',
                sound: 'default',
                enableVibrate: true,
                showBadge: true,
            });
        }

        // Check existing permission status
        const { status: existingStatus, canAskAgain: existingCanAskAgain } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        console.log('Current permission status:', existingStatus, 'Can ask again:', existingCanAskAgain);

        // If not granted, request permission
        if (existingStatus !== 'granted') {
            // Check if we can ask for permission
            if (!existingCanAskAgain) {
                console.log('Permission permanently denied, user needs to go to settings');
                return 'PERMISSION_DENIED_GO_TO_SETTINGS';
            }

            // Request permissions
            const { status, canAskAgain } = await Notifications.requestPermissionsAsync({
                ios: {
                    allowAlert: true,
                    allowBadge: true,
                    allowSound: true,
                },
            });

            finalStatus = status;

            console.log('Permission request result:', status, 'Can ask again:', canAskAgain);

            // If still not granted after request
            if (finalStatus !== 'granted') {
                if (!canAskAgain) {
                    console.log('Permission denied permanently');
                    return 'PERMISSION_DENIED_GO_TO_SETTINGS';
                }
                console.log('Permission denied, but can ask again');
                return null;
            }
        }

        // Get the Expo push token
        const token = (await Notifications.getExpoPushTokenAsync({
            projectId: 'f729ec49-9c1d-42f3-a307-dc1801a5ea0b'
        })).data;

        console.log('✅ Push token obtained:', token);
        return token;

    } catch (error) {
        console.error('❌ Error registering for push notifications:', error);
        return null;
    }
}

/**
 * Check notification permission status without requesting
 */
export async function checkNotificationPermissions(): Promise<NotificationPermissionStatus> {
    try {
        const { status, canAskAgain } = await Notifications.getPermissionsAsync();

        return {
            granted: status === 'granted',
            canAskAgain: canAskAgain,
            status: status,
        };
    } catch (error) {
        console.error('Error checking notification permissions:', error);
        return {
            granted: false,
            canAskAgain: false,
            status: 'undetermined',
        };
    }
}

/**
 * Open app settings so user can manually enable notifications
 */
export async function openAppSettings(): Promise<void> {
    try {
        if (Platform.OS === 'ios') {
            // For iOS, this opens the app's settings page
            await Linking.openSettings();
        } else {
            // For Android, this opens the app's settings page
            await Linking.openSettings();
        }
    } catch (error) {
        console.error('Error opening settings:', error);
    }
}

/**
 * Hook to handle notification routing and listeners
 * Call this in your root layout or app component
 */
export function useNotificationObserver() {
    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

    useEffect(() => {
        // Handle notification received while app is in foreground
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('📬 Notification received in foreground:', notification);
        });

        // Handle notification tap/interaction
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('👆 Notification tapped:', response);

            const data = response.notification.request.content.data;
            handleNotificationNavigation(data);
        });

        // Check if app was opened from a notification
        checkInitialNotification();

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);
}

/**
 * Check if app was opened from a notification tap
 */
async function checkInitialNotification() {
    const response = await Notifications.getLastNotificationResponseAsync();

    if (response) {
        console.log('🚀 App opened from notification:', response);
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
    }
}

/**
 * Handle navigation based on notification data
 */
function handleNotificationNavigation(data: any) {
    try {
        // Handle different notification types
        if (data?.url) {
            router.push(data.url);
        } else if (data?.screen) {
            router.push(data.screen);
        } else if (data?.type) {
            switch (data.type) {
                case 'message':
                    if (data.chatId) {
                        router.push(`/(app)/chats/${data.chatId}`);
                    } else {
                        router.push('/(app)/(tabs)/chats');
                    }
                    break;

                case 'friend_request':
                    router.push('/(app)/(tabs)/friends');
                    break;

                case 'profile_view':
                    if (data.userId) {
                        router.push(`/(app)/profile/${data.userId}`);
                    }
                    break;

                case 'notification':
                    router.push('/(app)/(tabs)/notifications');
                    break;

                default:
                    router.push('/(app)/(tabs)');
                    break;
            }
        }
    } catch (error) {
        console.error('Error navigating from notification:', error);
    }
}

/**
 * Send a local test notification
 */
export async function sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Test Notification 📬",
            body: 'This is a test notification!',
            data: {
                type: 'notification',
                url: '/(app)/(tabs)/notifications'
            },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 2,
        },
    });
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<boolean> {
    return await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}