import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'

const Layout = () => {

    const { user, isLoading, profile } = useAuth();

    //console.log("user", user)
    //console.log("profile", profile)

    const isSignedIn = user ? true : false
    const hasProfile = profile && profile?.username && profile?.user_type ? true : false;
    const needsOnboarding = isSignedIn && !hasProfile;

    if (isLoading) {
        return (
            <View className='flex-1 items-center justify-center'>
                <ActivityIndicator size='large' color='#0000ff' />
            </View>
        )
    }

    console.log('✅ Rendering Stack');

    return (
        <Stack>
            <Stack.Protected guard={isSignedIn && hasProfile}>
                <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
                <Stack.Screen name='creators/[id]' options={{ headerShown: false }} />
                <Stack.Screen name='brand/[id]' options={{ headerShown: false }} />
            </Stack.Protected>

            <Stack.Protected guard={needsOnboarding}>
                <Stack.Screen name='onboarding' options={{ headerShown: false }} />
            </Stack.Protected>

            <Stack.Protected guard={!isSignedIn}>
                <Stack.Screen name='sign-in' options={{ headerShown: false }} />
                <Stack.Screen name='sign-up' options={{ headerShown: false }} />
            </Stack.Protected>
        </Stack>
    )
}


export default Layout

