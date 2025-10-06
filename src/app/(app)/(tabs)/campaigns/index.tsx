// campaigns.tsx
import { Text, View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import React, { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaigns } from '@/hooks/useCampaigns';
import CampaignCard from '@/components/CampaignCard';
import { Campaign } from '@/components/CampaignCard'; // Adjust import path
import AntDesign from '@expo/vector-icons/AntDesign';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const Campaigns = () => {
    const router = useRouter();
    const { profile } = useAuth();
    const {
        campaigns,
        loading,
        loadingMore,
        refreshing,
        hasMore,
        loadMore,
        refresh,
    } = useCampaigns(profile);

    // Memoize and filter the campaigns array to ensure all items are unique
    const uniqueCampaigns = useMemo(() => {
        const seen = new Set();
        return campaigns.filter((item: Campaign) => {
            const duplicate = seen.has(item.id);
            seen.add(item.id);
            return !duplicate;
        });
    }, [campaigns]);

    const handleCreateCampaign = () => {
        router.push('/campaigns/create'); // Adjust path as needed
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="p-4 bg-white border-b border-gray-200 flex-row justify-between items-center">
                <View>
                    <Text className="text-2xl font-bold text-gray-800">My Campaigns</Text>
                    <Text className="text-sm text-gray-500">
                        Manage and track your campaigns
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleCreateCampaign}
                    className="bg-blue-500 px-4 py-2 rounded-full flex-row items-center gap-2"
                >
                    <AntDesign name="plus" size={16} color="white" />
                    <Text className="text-white font-semibold">New</Text>
                </TouchableOpacity>
            </View>

            {/* Campaign Count */}
            {!loading && (
                <View className="px-4 py-2 bg-gray-50">
                    <Text className="text-sm text-gray-600">
                        {uniqueCampaigns.length} {uniqueCampaigns.length === 1 ? 'campaign' : 'campaigns'}
                    </Text>
                </View>
            )}

            {/* Campaigns List */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text className="mt-4 text-gray-500">Loading campaigns...</Text>
                </View>
            ) : (
                <FlatList
                    data={uniqueCampaigns}
                    renderItem={({ item }) => (
                        <CampaignCard campaign={item} />
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center p-8 mt-20">
                            <AntDesign name="inbox" size={64} color="#D1D5DB" />
                            <Text className="text-center mt-6 text-gray-700 text-xl font-semibold">
                                No campaigns yet
                            </Text>
                            <Text className="text-center mt-2 text-gray-500 text-base">
                                Create your first campaign to start connecting with influencers
                            </Text>
                            <TouchableOpacity
                                onPress={handleCreateCampaign}
                                className="mt-6 bg-blue-500 px-8 py-4 rounded-full flex-row items-center gap-2"
                            >
                                <AntDesign name="plus" size={20} color="white" />
                                <Text className="text-white font-semibold text-base">
                                    Create Campaign
                                </Text>
                            </TouchableOpacity>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={refresh}
                            colors={['#3B82F6']}
                            tintColor="#3B82F6"
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View className="py-4">
                                <ActivityIndicator size="small" color="#3B82F6" />
                            </View>
                        ) : !hasMore && uniqueCampaigns.length > 0 ? (
                            <View className="py-4">
                                <Text className="text-center text-gray-500 text-sm">
                                    You've reached the end
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default Campaigns;