import React from 'react';
import { Tabs } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import Ionicons from '@expo/vector-icons/Ionicons';

const Layout = () => {
    const { profile, isLoading } = useAuth();
    const isBrand = profile?.user_type === 'brand';
    const isInfluencer = profile?.user_type === 'influencer';

    const { unreadCount } = useConversations();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Tabs>
            {/* 1. Shared Index Screen with Conditional Options */}
            <Tabs.Screen
                name="index"
                options={{
                    title: isBrand ? 'Dashboard' : 'Discover',
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
                    title: 'My Submissions',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <AntDesign name="solution" size={size} color={color} />,
                    // This is the key: hide the tab if the user is not an influencer
                    href: isInfluencer ? '/submissions' : null,
                }}
            />
            <Tabs.Screen
                name="wallet"
                options={{
                    title: 'Wallet',
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
                    title: 'Campaigns',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <AntDesign name="flag" size={size} color={color} />,
                    // This is the key: hide the tab if the user is not a brand
                    href: isBrand ? '/campaigns' : null,
                }}
            />
            <Tabs.Screen
                name="analytics"
                options={{
                    title: 'Analytics',
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
                    title: 'Inbox',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <View>
                            <AntDesign name="inbox" size={size} color={color} />
                            {unreadCount > 0 && (
                                <View className="absolute -right-2 -top-1 bg-red-500 rounded-full w-4 h-4 justify-center items-center">
                                    <Text className="text-white text-[10px] font-bold">
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
                    title: 'Profile',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => <AntDesign name="user" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
};

export default Layout;

