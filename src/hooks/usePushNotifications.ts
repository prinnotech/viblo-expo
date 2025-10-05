import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

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

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Push notification permission denied');
                return null;
            }

            token = (await Notifications.getExpoPushTokenAsync({
                projectId: '32596c8b-0809-4cbf-b926-6ce31812b361'
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
