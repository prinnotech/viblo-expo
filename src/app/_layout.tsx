import "../global.css";
import { Slot } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import 'react-native-get-random-values';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from "react";
import { StripeProvider } from '@stripe/stripe-react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import * as Notifications from 'expo-notifications';

SplashScreen.preventAutoHideAsync();

// Configure notification behavior - MUST be at top level
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function Layout() {
    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

    useEffect(() => {
        // Hide splash screen
        setTimeout(() => {
            SplashScreen.hideAsync();
        }, 1000);

        // Listen for notifications received while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('📬 Notification received while app open:', notification);
        });

        // Listen for when user taps on notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('👆 User tapped notification:', response);

            // Handle navigation based on notification data
            const data = response.notification.request.content.data;
            console.log('Notification data:', data);

            // Example: Navigate to specific screen based on data
            // if (data?.screen) {
            //     router.push(data.screen);
            // }
            // if (data?.userId) {
            //     router.push(`/creators/${data.userId}`);
            // }
        });

        // Cleanup listeners on unmount
        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return (
        <LanguageProvider>
            <AuthProvider>
                <ThemeProvider>
                    <StripeProvider
                        publishableKey="pk_test_51SEzaBJ6uKV4HQBES2UANsuTfRy87LuusjmIfjNu1QD4aldmYaqxQwAwp4EUKnQnByt4vBo0MjP4dXSesvK1UtWW0069cfpEO4"
                        merchantIdentifier="io.viblo.app"
                    >
                        <Slot />
                    </StripeProvider>
                </ThemeProvider>
            </AuthProvider>
        </LanguageProvider>
    );
}