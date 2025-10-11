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
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />

            <Stack.Screen
                name="connect/index"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    title: t('walletLayout.loading_payments'),
                }}
            />

            <Stack.Screen
                name="new/index"
                options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: t('walletLayout.new_payment_method'),
                }}
            />

            <Stack.Screen
                name="[id]/index"
                options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: t('walletLayout.edit_payment_method'),
                }}
            />
        </Stack>
    );
}

export default Layout;