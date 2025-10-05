import { Stack } from "expo-router";
import React from "react";

function Layout() {
    return (
        <Stack>
            {/* This screen is for your main campaigns list (index.tsx) */}
            {/* We hide its header because it's the base screen. */}
            <Stack.Screen name="index" options={{ headerShown: false }} />

            <Stack.Screen
                name="[id]/index"
                options={{
                    // This makes the screen slide up from the bottom
                    presentation: 'modal',

                    // This ensures the header is visible
                    headerShown: true,

                    // Set a default title that shows while data is loading
                    title: 'Loading messages...',
                }}
            />
            <Stack.Screen
                name="new/index"
                options={{
                    // This makes the screen slide up from the bottom
                    presentation: 'modal',

                    // This ensures the header is visible
                    headerShown: true,

                    // Set a default title that shows while data is loading
                    title: 'Create new message',
                }}
            />
        </Stack>
    );

}

export default Layout;
