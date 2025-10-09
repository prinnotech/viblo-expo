import { ActivityIndicator, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext';

const Layout = () => {

    const { user, isLoading, profile } = useAuth();
    const { theme } = useTheme();

    const isSignedIn = user ? true : false
    const hasProfile = profile && profile?.username && profile?.user_type ? true : false;
    const needsOnboarding = isSignedIn && !hasProfile;

    if (isLoading) {
        return (
            <View className='flex-1 items-center justify-center' style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size='large' color={theme.primary} />
            </View>
        )
    }

    //console.log('✅ Rendering Stack');

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
                    backgroundColor: theme.background
                }
            }}
        >
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
