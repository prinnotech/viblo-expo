import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, Linking } from 'react-native';

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

export async function registerForPushNotifications(): Promise<string | null> {
    try {
        let token = null;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            // If permission was previously denied, we need to handle it differently
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Push notification permission denied');

                // Check if we can ask again or if user needs to go to settings
                const { canAskAgain } = await Notifications.getPermissionsAsync();

                if (!canAskAgain) {
                    // Permission was permanently denied, guide user to settings
                    return 'PERMISSION_DENIED_GO_TO_SETTINGS';
                }

                return null;
            }

            token = (await Notifications.getExpoPushTokenAsync({
                projectId: 'f729ec49-9c1d-42f3-a307-dc1801a5ea0b'
            })).data;

            console.log('Push token:', token);
        } else {
            console.log('Must use physical device for push notifications');
        }

        return token;
    } catch (error) {
        console.error('Error registering for push notifications:', error);
        return null;
    }
}

export async function checkNotificationPermissions(): Promise<{
    granted: boolean;
    canAskAgain: boolean;
}> {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return {
        granted: status === 'granted',
        canAskAgain: canAskAgain
    };
}

export function openAppSettings() {
    if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
    } else {
        Linking.openSettings();
    }
}