import { Stack } from "expo-router";
import React from "react";

function Layout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />

            <Stack.Screen
                name="edit/index"
                options={{
                    // This makes the screen slide up from the bottom
                    presentation: 'modal',

                    // This ensures the header is visible
                    headerShown: true,

                    // Set a default title that shows while data is loading
                    title: 'Edit Profile',
                }}
            />

            <Stack.Screen
                name="connections/index"
                options={{
                    // This makes the screen slide up from the bottom
                    presentation: 'modal',

                    // This ensures the header is visible
                    headerShown: true,

                    // Set a default title that shows while data is loading
                    title: 'Create a connection',
                }}
            />


        </Stack>
    );
}

export default Layout;
