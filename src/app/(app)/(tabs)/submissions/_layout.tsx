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
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
                name="[id]/index"
                options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Loading Campaign...',
                }}
            />
        </Stack>
    );
}

export default Layout;
