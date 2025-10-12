import { ActivityIndicator, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Stack, useRouter, usePathname } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

const Layout = () => {
    const { user, isLoading, profile } = useAuth();
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();

    // Track if we're in password recovery flow
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

    const isSignedIn = user ? true : false
    const hasProfile = profile && profile?.username && profile?.user_type ? true : false;

    // Don't trigger onboarding if we're in password recovery
    const needsOnboarding = isSignedIn && !hasProfile && !isPasswordRecovery;

    useEffect(() => {
        const createSessionFromUrl = async (url: string) => {
            const urlFragment = url.split('#')[1];
            if (!urlFragment) return;

            const params = new URLSearchParams(urlFragment);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const type = params.get('type');

            if (!accessToken || !refreshToken) {
                return;
            }

            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (error) {
                console.error("Error setting session from URL:", error);
            } else {
                if (type === 'recovery') {
                    // Mark that we're in recovery mode to bypass onboarding
                    setIsPasswordRecovery(true);
                    router.replace('/reset-password');
                }
            }
        };

        Linking.getInitialURL().then(url => {
            if (url) createSessionFromUrl(url);
        });

        const subscription = Linking.addEventListener('url', (event) => {
            createSessionFromUrl(event.url);
        });

        return () => {
            subscription.remove();
        };
    }, [router]);

    // Reset recovery flag when leaving reset-password screen
    useEffect(() => {
        if (pathname !== '/reset-password' && isPasswordRecovery) {
            setIsPasswordRecovery(false);
        }
    }, [pathname, isPasswordRecovery]);

    if (isLoading) {
        return (
            <View className='flex-1 items-center justify-center' style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size='large' color={theme.primary} />
            </View>
        )
    }

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
                <Stack.Screen name='forgot-password' options={{ headerShown: false }} />
            </Stack.Protected>

            {/* Reset password is accessible regardless of auth state */}
            <Stack.Screen name='reset-password' options={{ headerShown: false }} />
        </Stack>
    )
}

export default Layout