import { Stack } from 'expo-router';
import React from 'react';

export default function AnalyticsLayout() {
    return (
        <Stack>
            {/* This screen is for your main campaigns list (index.tsx) */}
            {/* We hide its header because it's the base screen. */}
            <Stack.Screen name="index" options={{ headerShown: false }} />

            {/* This screen is for your details page ([id].tsx) */}
            <Stack.Screen
                name="[id]/index"
                options={{
                    // This makes the screen slide up from the bottom
                    presentation: 'modal',

                    // This ensures the header is visible
                    headerShown: true,

                    // Set a default title that shows while data is loading
                    title: 'Loading Campaign...',
                }}
            />
        </Stack>
    );
}