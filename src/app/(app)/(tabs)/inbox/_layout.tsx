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
            {/* This screen is for your main campaigns list (index.tsx) */}
            {/* We hide its header because it's the base screen. */}
            <Stack.Screen name="index" options={{ headerShown: false }} />

            <Stack.Screen
                name="[id]/index"
                options={{
                    // This makes the screen slide up from the bottom
                    presentation: 'card',

                    // This ensures the header is visible
                    headerShown: true,

                    // Set a default title that shows while data is loading
                    title: t('inboxLayout.loading_messages'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />
            <Stack.Screen
                name="new/index"
                options={{
                    // This makes the screen slide up from the bottom
                    presentation: 'card',

                    // This ensures the header is visible
                    headerShown: true,

                    // Set a default title that shows while data is loading
                    title: t('inboxLayout.create_new_message'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />
        </Stack>
    );

}

export default Layout;