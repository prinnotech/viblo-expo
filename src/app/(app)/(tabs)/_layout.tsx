import React from 'react';
import { Tabs } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const Layout = () => {
    const { profile, isLoading } = useAuth();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isBrand = profile?.user_type === 'brand';
    const isInfluencer = profile?.user_type === 'influencer';

    const { unreadCount } = useConversations();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.primary,
                tabBarInactiveTintColor: theme.textTertiary,
                tabBarStyle: {
                    backgroundColor: theme.surface,
                    borderTopColor: theme.border,
                },
                headerStyle: {
                    backgroundColor: theme.surface,
                },
                headerTintColor: theme.text,
            }}
        >
            {/* 1. Shared Index Screen with Conditional Options */}
            <Tabs.Screen
                name="index"
                options={{
                    title: isBrand ? t('tabsLayout.dashboard') : t('tabsLayout.discover'),
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <AntDesign name={isBrand ? 'dashboard' : 'search'} size={size} color={color} />
                    ),
                }}
            />

            {/* 2. Influencer-Only Screens (Hidden for Brands) */}
            <Tabs.Screen
                name="submissions"
                options={{
                    title: t('tabsLayout.my_submissions'),
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <AntDesign name="solution" size={size} color={color} />,
                    // This is the key: hide the tab if the user is not an influencer
                    href: isInfluencer ? '/submissions' : null,
                }}
            />
            <Tabs.Screen
                name="wallet"
                options={{
                    title: t('tabsLayout.wallet'),
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <AntDesign name="wallet" size={size} color={color} />,
                    // This is the key: hide the tab if the user is not an influencer
                    href: isInfluencer ? '/wallet' : null,
                }}
            />

            {/* 3. Brand-Only Screens (Hidden for Influencers) */}
            <Tabs.Screen
                name="campaigns"
                options={{
                    title: t('tabsLayout.campaigns'),
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <AntDesign name="flag" size={size} color={color} />,
                    // This is the key: hide the tab if the user is not a brand
                    href: isBrand ? '/campaigns' : null,
                }}
            />
            <Tabs.Screen
                name="analytics"
                options={{
                    title: t('tabsLayout.analytics'),
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <Ionicons name="analytics" size={size} color={color} />,
                    // This is the key: hide the tab if the user is not a brand
                    href: isBrand ? '/analytics' : null,
                }}
            />

            {/* 4. Common Screens (Always Visible) */}
            <Tabs.Screen
                name="inbox"
                options={{
                    title: t('tabsLayout.inbox'),
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <View>
                            <AntDesign name="inbox" size={size} color={color} />
                            {unreadCount > 0 && (
                                <View
                                    className="absolute -right-2 -top-1 rounded-full w-4 h-4 justify-center items-center"
                                    style={{ backgroundColor: theme.error }}
                                >
                                    <Text className="text-[10px] font-bold" style={{ color: theme.surface }}>
                                        {unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: t('tabsLayout.profile'),
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <AntDesign name="user" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
};

export default Layout;