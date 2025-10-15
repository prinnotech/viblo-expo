import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CampaignsLayout() {
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
                    color: theme.text,
                },
            }}
        >
            {/* This screen is for your main campaigns list (index.tsx) */}
            {/* We hide its header because it's the base screen. */}
            <Stack.Screen name="index" options={{ headerShown: false }} />

            {/* This screen is for your details page ([id]/index.tsx) */}
            <Stack.Screen
                name="[id]/index"
                options={{
                    presentation: 'card',
                    headerShown: true,
                    title: t('campaignsLayout.loading_campaign'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />

            {/* This screen is for apply page ([id]/apply.tsx) */}
            <Stack.Screen
                name="[id]/apply"
                options={{
                    presentation: 'card',
                    headerShown: true,
                    title: t('campaignsLayout.apply_to_campaign'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />

            {/* This screen is for edit page ([id]/edit.tsx) */}
            <Stack.Screen
                name="[id]/edit"
                options={{
                    presentation: 'card',
                    headerShown: true,
                    title: t('campaignsLayout.edit_campaign'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />

            {/* This screen is for the create campaign page (create/index.tsx) */}
            <Stack.Screen
                name="create/index"
                options={{
                    presentation: 'card',
                    headerShown: true,
                    title: t('campaignsLayout.create_campaign'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />

            {/* This screen is for the payment page ([id]/payment.tsx) */}
            <Stack.Screen
                name="[id]/payment"
                options={{
                    presentation: 'card',
                    headerShown: false,
                    title: t('campaignsLayout.checkout'),
                    headerBackButtonDisplayMode: 'minimal'
                }}
            />
        </Stack>
    );
}