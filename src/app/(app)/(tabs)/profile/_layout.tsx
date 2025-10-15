import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

function Layout() {
    const { theme } = useTheme();
    const { t } = useLanguage();

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: theme.surface,
                },
                headerTintColor: theme.text,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                contentStyle: {
                    backgroundColor: theme.background,
                }
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />

            <Stack.Screen
                name="edit/index"
                options={{
                    presentation: 'card',
                    headerShown: true,
                    title: t('profileLayout.edit_profile'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />

            <Stack.Screen
                name="connections/index"
                options={{
                    presentation: 'card',
                    headerShown: true,
                    title: t('profileLayout.connected_accounts'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />

            <Stack.Screen
                name="analytics/index"
                options={{
                    presentation: 'card',
                    headerShown: true,
                    title: t('profileLayout.your_stats'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />

            <Stack.Screen
                name="payments"
                options={{
                    presentation: 'card',
                    headerShown: true,
                    title: t('profileLayout.payments'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />

            <Stack.Screen
                name="settings/index"
                options={{
                    presentation: 'card',
                    headerShown: true,
                    title: t('profileLayout.settings'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />
        </Stack>
    );
}

export default Layout;