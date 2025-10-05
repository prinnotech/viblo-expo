import { Stack } from "expo-router";
import React from "react";

function Layout() {
    return (
        <Stack>
            {/* This screen is for your main campaigns list (index.tsx) */}
            {/* We hide its header because it's the base screen. */}
            <Stack.Screen name="index" options={{ headerShown: false }} />

            {/* This screen is for your details page ([id].tsx) */}
            <Stack.Screen
                name="connect/index"
                options={{
                    // This makes the screen slide up from the bottom
                    presentation: 'modal',

                    // This ensures the header is visible
                    headerShown: false,

                    // Set a default title that shows while data is loading
                    title: 'Loading payments...',
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
                    title: 'New Payment method',
                }}
            />

            <Stack.Screen
                name="[id]/index"
                options={{
                    // This makes the screen slide up from the bottom
                    presentation: 'modal',

                    // This ensures the header is visible
                    headerShown: true,

                    // Set a default title that shows while data is loading
                    title: 'Edit Payment method',
                }}
            />

        </Stack>
    );
}

export default Layout;
