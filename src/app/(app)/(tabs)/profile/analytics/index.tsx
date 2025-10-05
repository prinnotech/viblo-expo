import { Text, View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileAnalytics } from '@/hooks/useProfileAnalytics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SocialIcon } from '@/components/getSocialIcons';

const AnalyticsPage = () => {
    const { profile } = useAuth();
    const { analytics, loading, refreshing, error, refresh } = useProfileAnalytics(profile?.id);

    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
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

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#667eea" />
                <Text className="mt-4 text-base text-gray-600">Loading your analytics...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50 px-5">
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text className="mt-4 text-base text-red-500 text-center">{error}</Text>
                <Text className="mt-3 text-base text-indigo-600 font-semibold" onPress={refresh}>
                    Tap to retry
                </Text>
            </View>
        );
    }

    if (!analytics) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <Ionicons name="analytics-outline" size={64} color="#9ca3af" />
                <Text className="mt-4 text-base text-gray-500">No analytics data available</Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            contentContainerClassName="p-5 pb-10"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#667eea" />
            }
        >
            {/* Header */}
            <View className="mb-6">
                <Text className="text-sm text-gray-600">
                    Last updated: {analytics.lastUpdated.toLocaleTimeString()}
                </Text>
            </View>

            {/* Earnings Card */}
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-3xl p-6 mb-6 shadow-lg"
            >
                <View className="flex-row items-center mb-3">
                    <Ionicons name="wallet-outline" size={32} color="#fff" />
                    <Text className="text-base text-white ml-3 font-semibold">Total Earnings</Text>
                </View>
                <Text className="text-5xl font-bold text-white mb-2">
                    {formatCurrency(analytics.totalEarnings)}
                </Text>
                <View className="flex-row items-center bg-white/20 px-3 py-1.5 rounded-xl self-start">
                    <Ionicons name="trending-up" size={16} color="#10b981" />
                    <Text className="text-white ml-1.5 text-xs font-semibold">All time</Text>
                </View>
            </LinearGradient>

            {/* Stats Grid */}
            <View className="flex-row flex-wrap justify-between mb-6">
                {/* Followers */}
                <View className="w-[48%] bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <LinearGradient
                        colors={['#f59e0b', '#f97316']}
                        className="w-12 h-12 rounded-xl justify-center items-center mb-3"
                    >
                        <Ionicons name="people" size={24} color="#fff" />
                    </LinearGradient>
                    <Text className="text-3xl font-bold text-gray-900 mb-1">
                        {formatNumber(analytics.totalFollowers)}
                    </Text>
                    <Text className="text-sm text-gray-600">Followers</Text>
                </View>

                {/* Views */}
                <View className="w-[48%] bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <LinearGradient
                        colors={['#3b82f6', '#2563eb']}
                        className="w-12 h-12 rounded-xl justify-center items-center mb-3"
                    >
                        <Ionicons name="eye" size={24} color="#fff" />
                    </LinearGradient>
                    <Text className="text-3xl font-bold text-gray-900 mb-1">
                        {formatNumber(analytics.totalViews)}
                    </Text>
                    <Text className="text-sm text-gray-600">Views</Text>
                </View>

                {/* Likes */}
                <View className="w-[48%] bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <LinearGradient
                        colors={['#ec4899', '#db2777']}
                        className="w-12 h-12 rounded-xl justify-center items-center mb-3"
                    >
                        <Ionicons name="heart" size={24} color="#fff" />
                    </LinearGradient>
                    <Text className="text-3xl font-bold text-gray-900 mb-1">
                        {formatNumber(analytics.totalLikes)}
                    </Text>
                    <Text className="text-sm text-gray-600">Likes</Text>
                </View>

                {/* Comments */}
                <View className="w-[48%] bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <LinearGradient
                        colors={['#8b5cf6', '#7c3aed']}
                        className="w-12 h-12 rounded-xl justify-center items-center mb-3"
                    >
                        <Ionicons name="chatbubble" size={24} color="#fff" />
                    </LinearGradient>
                    <Text className="text-3xl font-bold text-gray-900 mb-1">
                        {formatNumber(analytics.totalComments)}
                    </Text>
                    <Text className="text-sm text-gray-600">Comments</Text>
                </View>
            </View>

            {/* Platform Breakdown */}
            <View className="mt-2">
                <Text className="text-2xl font-bold text-gray-900 mb-4">Platform Breakdown</Text>

                {analytics.platforms.length === 0 ? (
                    <View className="bg-white rounded-2xl p-10 items-center shadow-sm">
                        <Ionicons name="link-outline" size={48} color="#9ca3af" />
                        <Text className="mt-4 text-lg font-semibold text-gray-700">
                            No platforms connected
                        </Text>
                        <Text className="mt-2 text-sm text-gray-500 text-center">
                            Connect your social accounts to see analytics
                        </Text>
                    </View>
                ) : (
                    analytics.platforms.map((platform) => (
                        <View key={platform.platform} className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm">
                            <LinearGradient
                                colors={getPlatformColors(platform.platform)}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="p-5"
                            >
                                <View className="flex-row items-center">
                                    <SocialIcon platform={platform.platform} color='white' />
                                    <View className="ml-3">
                                        <Text className="text-lg font-bold text-white">
                                            {platform.platform.toUpperCase()}
                                        </Text>
                                        <Text className="text-sm text-white/90 mt-0.5">{platform.handle}</Text>
                                    </View>
                                </View>
                            </LinearGradient>

                            <View className="flex-row flex-wrap p-4">
                                <View className="w-1/2 py-3">
                                    <Text className="text-2xl font-bold text-gray-900 mb-1">
                                        {formatNumber(platform.followers)}
                                    </Text>
                                    <Text className="text-xs text-gray-600">Followers</Text>
                                </View>

                                {platform.views > 0 && (
                                    <View className="w-1/2 py-3">
                                        <Text className="text-2xl font-bold text-gray-900 mb-1">
                                            {formatNumber(platform.views)}
                                        </Text>
                                        <Text className="text-xs text-gray-600">Views</Text>
                                    </View>
                                )}

                                <View className="w-1/2 py-3">
                                    <Text className="text-2xl font-bold text-gray-900 mb-1">
                                        {formatNumber(platform.likes)}
                                    </Text>
                                    <Text className="text-xs text-gray-600">Likes</Text>
                                </View>

                                <View className="w-1/2 py-3">
                                    <Text className="text-2xl font-bold text-gray-900 mb-1">
                                        {formatNumber(platform.comments)}
                                    </Text>
                                    <Text className="text-xs text-gray-600">Comments</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
};

export default AnalyticsPage;