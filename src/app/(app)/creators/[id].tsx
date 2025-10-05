import { Text, View, ScrollView, ActivityIndicator, Image, TouchableOpacity, Linking } from 'react-native';
import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SocialIcon } from '@/components/getSocialIcons';

const CreatorProfile = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data, loading, error } = usePublicProfile(id);

    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    const getPlatformColors = (platform: string): [string, string] => {
        switch (platform) {
            case 'youtube':
                return ['#FF0000', '#CC0000'];
            case 'instagram':
                return ['#E1306C', '#C13584'];
            case 'tiktok':
                return ['#000000', '#69C9D0'];
            default:
                return ['#667eea', '#764ba2'];
        }
    };

    const openURL = async (url: string) => {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#667eea" />
                <Text className="mt-4 text-base text-gray-600">Loading profile...</Text>
            </View>
        );
    }

    if (error || !data) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50 px-5">
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text className="mt-4 text-base text-red-500 text-center">
                    {error || 'Profile not found'}
                </Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
                >
                    <Text className="text-white font-semibold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const { profile } = data;

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Header with Back Button */}
            <View className="bg-white px-5 pt-12 pb-4 border-b border-gray-200">
                <TouchableOpacity onPress={() => router.back()} className="mb-4">
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
            </View>

            {/* Profile Header */}
            <View className="bg-white px-5 pb-6">
                <View className="items-center -mt-16">
                    {profile.avatar_url ? (
                        <Image
                            source={{ uri: profile.avatar_url }}
                            className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                        />
                    ) : (
                        <View className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-indigo-100 items-center justify-center">
                            <Ionicons name="person" size={48} color="#667eea" />
                        </View>
                    )}

                    <Text className="text-2xl font-bold text-gray-900 mt-4">
                        {profile.first_name} {profile.last_name}
                    </Text>
                    <Text className="text-base text-gray-600 mt-1">@{profile.username}</Text>

                    {profile.bio && (
                        <Text className="text-sm text-gray-700 text-center mt-4 px-6">
                            {profile.bio}
                        </Text>
                    )}

                    {/* Profile Info */}
                    <View className="flex-row flex-wrap justify-center items-center mt-4 gap-4">
                        {profile.location && (
                            <View className="flex-row items-center">
                                <Ionicons name="location" size={16} color="#6b7280" />
                                <Text className="text-sm text-gray-600 ml-1">{profile.location}</Text>
                            </View>
                        )}
                        {profile.website_url && (
                            <TouchableOpacity
                                onPress={() => openURL(profile.website_url!)}
                                className="flex-row items-center"
                            >
                                <Ionicons name="globe" size={16} color="#667eea" />
                                <Text className="text-sm text-indigo-600 ml-1 underline">
                                    {profile.website_url}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            <View className="p-5">
                {/* Stats Overview */}
                <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
                    <Text className="text-lg font-bold text-gray-900 mb-4">Stats Overview</Text>
                    <View className="flex-row flex-wrap justify-between">
                        <View className="w-[48%] mb-4">
                            <View className="flex-row items-center mb-2">
                                <LinearGradient
                                    colors={['#f59e0b', '#f97316']}
                                    className="w-10 h-10 rounded-lg justify-center items-center mr-3"
                                >
                                    <Ionicons name="people" size={20} color="#fff" />
                                </LinearGradient>
                                <View>
                                    <Text className="text-2xl font-bold text-gray-900">
                                        {formatNumber(data.totalFollowers)}
                                    </Text>
                                    <Text className="text-xs text-gray-600">Followers</Text>
                                </View>
                            </View>
                        </View>

                        <View className="w-[48%] mb-4">
                            <View className="flex-row items-center mb-2">
                                <LinearGradient
                                    colors={['#3b82f6', '#2563eb']}
                                    className="w-10 h-10 rounded-lg justify-center items-center mr-3"
                                >
                                    <Ionicons name="eye" size={20} color="#fff" />
                                </LinearGradient>
                                <View>
                                    <Text className="text-2xl font-bold text-gray-900">
                                        {formatNumber(data.totalViews)}
                                    </Text>
                                    <Text className="text-xs text-gray-600">Views</Text>
                                </View>
                            </View>
                        </View>

                        <View className="w-[48%]">
                            <View className="flex-row items-center mb-2">
                                <LinearGradient
                                    colors={['#ec4899', '#db2777']}
                                    className="w-10 h-10 rounded-lg justify-center items-center mr-3"
                                >
                                    <Ionicons name="heart" size={20} color="#fff" />
                                </LinearGradient>
                                <View>
                                    <Text className="text-2xl font-bold text-gray-900">
                                        {formatNumber(data.totalLikes)}
                                    </Text>
                                    <Text className="text-xs text-gray-600">Likes</Text>
                                </View>
                            </View>
                        </View>

                        <View className="w-[48%]">
                            <View className="flex-row items-center mb-2">
                                <LinearGradient
                                    colors={['#8b5cf6', '#7c3aed']}
                                    className="w-10 h-10 rounded-lg justify-center items-center mr-3"
                                >
                                    <Ionicons name="chatbubble" size={20} color="#fff" />
                                </LinearGradient>
                                <View>
                                    <Text className="text-2xl font-bold text-gray-900">
                                        {formatNumber(data.totalComments)}
                                    </Text>
                                    <Text className="text-xs text-gray-600">Comments</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Connected Platforms */}
                <Text className="text-lg font-bold text-gray-900 mb-3">Connected Platforms</Text>

                {data.platforms.length === 0 ? (
                    <View className="bg-white rounded-2xl p-8 items-center shadow-sm">
                        <Ionicons name="link-outline" size={48} color="#9ca3af" />
                        <Text className="mt-4 text-base font-semibold text-gray-700">
                            No platforms connected
                        </Text>
                    </View>
                ) : (
                    data.platforms.map((platform) => (
                        <TouchableOpacity
                            key={platform.platform}
                            onPress={() => openURL(platform.profileUrl)}
                            className="bg-white rounded-2xl mb-3 overflow-hidden shadow-sm"
                        >
                            <LinearGradient
                                colors={getPlatformColors(platform.platform)}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="p-4"
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1">
                                        <SocialIcon platform={platform.platform} color="white" />
                                        <View className="ml-3 flex-1">
                                            <Text className="text-base font-bold text-white">
                                                {platform.platform.toUpperCase()}
                                            </Text>
                                            <Text className="text-sm text-white/90">{platform.handle}</Text>
                                        </View>
                                    </View>
                                    <Ionicons name="arrow-forward" size={20} color="white" />
                                </View>
                            </LinearGradient>

                            <View className="flex-row flex-wrap p-4 bg-gray-50">
                                <View className="w-1/2 py-2">
                                    <Text className="text-xl font-bold text-gray-900">
                                        {formatNumber(platform.followers)}
                                    </Text>
                                    <Text className="text-xs text-gray-600">Followers</Text>
                                </View>

                                {platform.views > 0 && (
                                    <View className="w-1/2 py-2">
                                        <Text className="text-xl font-bold text-gray-900">
                                            {formatNumber(platform.views)}
                                        </Text>
                                        <Text className="text-xs text-gray-600">Views</Text>
                                    </View>
                                )}

                                <View className="w-1/2 py-2">
                                    <Text className="text-xl font-bold text-gray-900">
                                        {formatNumber(platform.likes)}
                                    </Text>
                                    <Text className="text-xs text-gray-600">Likes</Text>
                                </View>

                                <View className="w-1/2 py-2">
                                    <Text className="text-xl font-bold text-gray-900">
                                        {formatNumber(platform.comments)}
                                    </Text>
                                    <Text className="text-xs text-gray-600">Comments</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>

            {/* Bottom Padding */}
            <View className="h-8" />
        </ScrollView>
    );
};

export default CreatorProfile;