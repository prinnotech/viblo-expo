import { Stack } from 'expo-router';
import React from 'react';

export default function PaymentsLayout() {
    return (
        <Stack>
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