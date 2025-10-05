import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Alert,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

// A reusable component for each menu item
const MenuItem = ({ icon, text, onPress }: { icon: any; text: string; onPress: () => void; }) => (
    <TouchableOpacity
        className="flex-row items-center p-4 bg-white border border-gray-100 rounded-xl"
        onPress={onPress}
        activeOpacity={0.6}
    >
        <Feather name={icon} size={22} color="#4b5563" />
        <Text className="text-base text-gray-800 ml-4 flex-1">{text}</Text>
        <Feather name="chevron-right" size={20} color="#9ca3af" />
    </TouchableOpacity>
);

const ProfileScreen = () => {
    const { profile, loading, refetch } = useUserProfile();
    const router = useRouter();

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);


    async function signOut() {
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Sign Out",
                style: "destructive",
                onPress: async () => {
                    await supabase.auth.signOut();
                    // The AuthProvider will handle redirecting the user
                }
            }
        ]);
    }

    if (loading && !refreshing) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50" >
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#3b82f6" // Optional: for iOS loading indicator color
                    />
                }
            >
                {/* Profile Header */}
                <View className="items-center p-6 bg-white border-b border-gray-200">
                    <Image
                        source={{ uri: profile?.avatar_url || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=??' }}
                        className="w-24 h-24 rounded-full"
                    />
                    <Text className="text-2xl font-bold text-gray-900 mt-4">
                        {profile?.first_name || profile?.username}
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                        @{profile?.username}
                    </Text>
                </View>

                {/* Menu Section */}
                <View className="mt-6 px-6 gap-2">
                    <MenuItem
                        icon="user"
                        text="Edit Profile"
                        onPress={() => router.push('/profile/edit')}
                    />
                    <MenuItem
                        icon="share-2"
                        text="Connected Accounts"
                        onPress={() => router.push('/profile/connections')}
                    />
                    <MenuItem
                        icon="bar-chart-2"
                        text="Analytics"
                        onPress={() => router.push('/profile/analytics')}
                    />
                    <MenuItem
                        icon="eye"
                        text="View Public Profile"
                        onPress={() => router.push(`/creators/${profile?.id}`)} // Example route
                    />
                </View>

                {/* Sign Out Button */}
                <View className="p-4 mt-6">
                    <TouchableOpacity
                        onPress={signOut}
                        className="w-full bg-white border border-red-200 py-3 rounded-lg flex-row justify-center items-center"
                    >
                        <Feather name="log-out" size={18} color="#ef4444" />
                        <Text className="text-red-500 text-base font-semibold ml-2">Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileScreen;
