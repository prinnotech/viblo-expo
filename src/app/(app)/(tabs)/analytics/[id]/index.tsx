// app/(app)/(tabs)/analytics/[id]/index.tsx
import {
    Text,
    View,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Image,
    TouchableOpacity,
} from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCampaignAnalytics } from '@/hooks/useCampaignAnalytics';
import AntDesign from '@expo/vector-icons/AntDesign';

const CampaignAnalytics = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const campaignId = Array.isArray(id) ? id[0] : id;

    const { campaign, stats, influencers, loading, refreshing, error, refresh } = useCampaignAnalytics(campaignId);

    const navigation = useNavigation();
    navigation.setOptions({ title: campaign?.title });

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="mt-4 text-gray-500">Loading analytics...</Text>
            </View>
        );
    }

    if (error || !campaign) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center p-4">
                <AntDesign name="frown" size={48} color="#EF4444" />
                <Text className="text-center mt-4 text-red-500 text-lg">
                    {error || 'Campaign not found'}
                </Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-4 bg-blue-500 px-6 py-3 rounded-full"
                >
                    <Text className="text-white font-semibold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const budgetRemaining = campaign.total_budget - campaign.total_paid;
    const budgetPercentage = (campaign.total_paid / campaign.total_budget) * 100;

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        colors={['#3B82F6']}
                        tintColor="#3B82F6"
                    />
                }
            >
                {/* Campaign Header */}
                <View className="bg-white p-4 border-b border-gray-200">
                    <Text className="text-2xl font-bold text-gray-800 mb-2">
                        {campaign.title}
                    </Text>
                    <View className="flex-row items-center gap-2">
                        <View className="bg-green-100 px-3 py-1 rounded-full">
                            <Text className="text-green-800 text-xs font-semibold uppercase">
                                {campaign.status}
                            </Text>
                        </View>
                        <Text className="text-sm text-gray-500">
                            {formatCurrency(campaign.rate_per_view * 1000)}/1K views
                        </Text>
                    </View>
                </View>

                {/* Budget Overview */}
                <View className="bg-white m-4 p-4 rounded-xl border border-gray-200">
                    <Text className="text-base font-semibold text-gray-800 mb-3">Budget Overview</Text>
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-gray-600">Total Budget</Text>
                        <Text className="text-base font-bold text-gray-800">
                            {formatCurrency(campaign.total_budget)}
                        </Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-gray-600">Spent</Text>
                        <Text className="text-base font-bold text-red-600">
                            {formatCurrency(campaign.total_paid)}
                        </Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-sm text-gray-600">Remaining</Text>
                        <Text className="text-base font-bold text-green-600">
                            {formatCurrency(budgetRemaining)}
                        </Text>
                    </View>
                    {/* Progress bar */}
                    <View className="w-full bg-gray-200 rounded-full h-2.5">
                        <View
                            className={`h-2.5 rounded-full ${budgetPercentage > 85 ? 'bg-red-500' :
                                    budgetPercentage > 50 ? 'bg-yellow-500' :
                                        'bg-green-500'
                                }`}
                            style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                        />
                    </View>
                </View>

                {/* Stats Grid */}
                <View className="px-4 mb-4">
                    <View className="flex-row gap-3 mb-3">
                        <View className="flex-1 bg-white p-4 rounded-xl border border-gray-200">
                            <AntDesign name="eye" size={24} color="#3B82F6" />
                            <Text className="text-2xl font-bold text-gray-800 mt-2">
                                {formatNumber(stats.total_views)}
                            </Text>
                            <Text className="text-sm text-gray-500">Total Views</Text>
                        </View>
                        <View className="flex-1 bg-white p-4 rounded-xl border border-gray-200">
                            <AntDesign name="heart" size={24} color="#EF4444" />
                            <Text className="text-2xl font-bold text-gray-800 mt-2">
                                {formatNumber(stats.total_likes)}
                            </Text>
                            <Text className="text-sm text-gray-500">Total Likes</Text>
                        </View>
                    </View>
                    <View className="flex-row gap-3">
                        <View className="flex-1 bg-white p-4 rounded-xl border border-gray-200">
                            <AntDesign name="message" size={24} color="#10B981" />
                            <Text className="text-2xl font-bold text-gray-800 mt-2">
                                {formatNumber(stats.total_comments)}
                            </Text>
                            <Text className="text-sm text-gray-500">Comments</Text>
                        </View>
                        <View className="flex-1 bg-white p-4 rounded-xl border border-gray-200">
                            <AntDesign name="team" size={24} color="#8B5CF6" />
                            <Text className="text-2xl font-bold text-gray-800 mt-2">
                                {stats.active_influencers}
                            </Text>
                            <Text className="text-sm text-gray-500">Active Creators</Text>
                        </View>
                    </View>
                </View>

                {/* Influencers List */}
                <View className="mx-4">
                    <Text className="text-lg font-bold text-gray-800 mb-3">
                        Creator Performance
                    </Text>
                    {influencers.length === 0 ? (
                        <View className="bg-white p-8 rounded-xl border border-gray-200 items-center">
                            <AntDesign name="inbox" size={48} color="#D1D5DB" />
                            <Text className="text-gray-500 mt-4 text-center">
                                No live content yet. Influencers will appear here once their content is posted.
                            </Text>
                        </View>
                    ) : (
                        influencers.map((influencer) => (
                            <View
                                key={influencer.submission_id}
                                className="bg-white p-4 rounded-xl border border-gray-200 mb-3"
                            >
                                {/* Influencer Header */}
                                <View className="flex-row items-center mb-3">
                                    <Image
                                        source={{
                                            uri: influencer.influencer_avatar || 'https://placehold.co/48x48/E2E8F0/4A5568?text=I'
                                        }}
                                        className="w-12 h-12 rounded-full mr-3"
                                    />
                                    <View className="flex-1">
                                        <Text className="text-base font-bold text-gray-800">
                                            {influencer.influencer_name}
                                        </Text>
                                        <Text className="text-sm text-gray-500">
                                            @{influencer.influencer_username}
                                        </Text>
                                    </View>
                                    <View className={`px-3 py-1 rounded-full ${influencer.submission_status === 'completed'
                                            ? 'bg-blue-100'
                                            : 'bg-green-100'
                                        }`}>
                                        <Text className={`text-xs font-semibold ${influencer.submission_status === 'completed'
                                                ? 'text-blue-800'
                                                : 'text-green-800'
                                            }`}>
                                            {influencer.submission_status === 'completed' ? 'Completed' : 'Live'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Stats */}
                                <View className="flex-row justify-between bg-gray-50 p-3 rounded-lg">
                                    <View className="items-center">
                                        <Text className="text-base font-bold text-gray-800">
                                            {formatNumber(influencer.view_count)}
                                        </Text>
                                        <Text className="text-xs text-gray-500">Views</Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-base font-bold text-gray-800">
                                            {formatNumber(influencer.like_count)}
                                        </Text>
                                        <Text className="text-xs text-gray-500">Likes</Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-base font-bold text-gray-800">
                                            {formatNumber(influencer.comment_count)}
                                        </Text>
                                        <Text className="text-xs text-gray-500">Comments</Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-base font-bold text-green-600">
                                            {formatCurrency(influencer.earned_amount)}
                                        </Text>
                                        <Text className="text-xs text-gray-500">Earned</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default CampaignAnalytics;