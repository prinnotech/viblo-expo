// app/(app)/(tabs)/analytics/index.tsx
import { Text, View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import CampaignAnalyticsCard from '@/components/CampaignAnalyticsCard';
import AntDesign from '@expo/vector-icons/AntDesign';

interface CampaignWithStats {
    id: string;
    title: string;
    status: string;
    total_budget: number;
    total_paid: number;
    total_views: number;
    total_submissions: number;
    active_creators: number;
}

const AnalyticsPage = () => {
    const { profile } = useAuth();
    const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchCampaignsWithStats = useCallback(async (isRefresh = false) => {
        if (!profile || profile.user_type !== 'brand') return;

        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            // Fetch all campaigns for this brand
            const { data: campaignsData, error: campaignsError } = await supabase
                .from('campaigns')
                .select('id, title, status, total_budget, total_paid')
                .eq('brand_id', profile.id)
                .order('created_at', { ascending: false });

            if (campaignsError) throw campaignsError;

            // For each campaign, fetch submission stats
            const campaignsWithStats = await Promise.all(
                (campaignsData || []).map(async (campaign) => {
                    const { data: submissions } = await supabase
                        .from('content_submissions')
                        .select('view_count, influencer_id')
                        .eq('campaign_id', campaign.id)
                        .in('status', ['posted_live', 'completed']);

                    const totalViews = (submissions || []).reduce(
                        (sum, sub) => sum + (parseFloat(sub.view_count as any) || 0),
                        0
                    );

                    const uniqueInfluencers = new Set(
                        (submissions || []).map(sub => sub.influencer_id)
                    );

                    return {
                        ...campaign,
                        total_views: totalViews,
                        total_submissions: submissions?.length || 0,
                        active_creators: uniqueInfluencers.size,
                    };
                })
            );

            setCampaigns(campaignsWithStats);
        } catch (err: any) {
            console.error('Error fetching campaigns with stats:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [profile]);

    useEffect(() => {
        fetchCampaignsWithStats();
    }, [fetchCampaignsWithStats]);

    const onRefresh = useCallback(() => {
        fetchCampaignsWithStats(true);
    }, [fetchCampaignsWithStats]);

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="mt-4 text-gray-500">Loading analytics...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="p-4 bg-white border-b border-gray-200">
                <Text className="text-2xl font-bold text-gray-800">Campaign Analytics</Text>
                <Text className="text-sm text-gray-500 mt-1">
                    Track performance across all your campaigns
                </Text>
            </View>

            {/* Campaign List */}
            <FlatList
                data={campaigns}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <CampaignAnalyticsCard
                        campaignId={item.id}
                        title={item.title}
                        status={item.status}
                        totalBudget={item.total_budget}
                        totalSpent={item.total_paid}
                        activeCreators={item.active_creators}
                        totalViews={item.total_views}
                        totalSubmissions={item.total_submissions}
                    />
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#3B82F6']}
                        tintColor="#3B82F6"
                    />
                }
                ListEmptyComponent={
                    <View className="flex-1 justify-center items-center p-8 mt-20">
                        <AntDesign name="bar-chart" size={64} color="#D1D5DB" />
                        <Text className="text-center mt-6 text-gray-700 text-xl font-semibold">
                            No campaigns yet
                        </Text>
                        <Text className="text-center mt-2 text-gray-500 text-base">
                            Create your first campaign to see analytics here
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

export default AnalyticsPage;