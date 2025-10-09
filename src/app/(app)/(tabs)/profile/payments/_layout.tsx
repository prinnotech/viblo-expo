import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function PaymentsLayout() {
    const { theme } = useTheme();
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
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="[id]/index"
                options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Payment Details',
                }}
            />
        </Stack>
    );
}
