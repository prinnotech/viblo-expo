import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/contexts/ThemeContext";

function Layout() {
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
                contentStyle: {
                    backgroundColor: theme.background,
                }
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />

            <Stack.Screen
                name="edit/index"
                options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Edit Profile',
                }}
            />

            <Stack.Screen
                name="connections/index"
                options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Connected Accounts',
                }}
            />

            <Stack.Screen
                name="analytics/index"
                options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Your Stats',
                }}
            />

            <Stack.Screen
                name="payments"
                options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Payments',
                }}
            />

            <Stack.Screen
                name="settings/index"
                options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Settings',
                }}
            />
        </Stack>
    );
}

export default Layout;
