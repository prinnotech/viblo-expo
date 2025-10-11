import { Text, View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import CampaignAnalyticsCard from '@/components/CampaignAnalyticsCard';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

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
    const { theme } = useTheme();
    const { t } = useLanguage();
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
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text className="mt-4" style={{ color: theme.textTertiary }}>{t('analyticsIndex.loading_analytics')}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            {/* Header */}
            <View className="p-4 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <Text className="text-2xl font-bold" style={{ color: theme.text }}>{t('analyticsIndex.campaign_analytics')}</Text>
                <Text className="text-sm mt-1" style={{ color: theme.textTertiary }}>
                    {t('analyticsIndex.track_performance')}
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
                        colors={[theme.primary]}
                        tintColor={theme.primary}
                    />
                }
                ListEmptyComponent={
                    <View className="flex-1 justify-center items-center p-8 mt-20">
                        <AntDesign name="bar-chart" size={64} color={theme.textTertiary} />
                        <Text className="text-center mt-6 text-xl font-semibold" style={{ color: theme.textSecondary }}>
                            {t('analyticsIndex.no_campaigns_yet')}
                        </Text>
                        <Text className="text-center mt-2 text-base" style={{ color: theme.textTertiary }}>
                            {t('analyticsIndex.create_first_campaign')}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

export default AnalyticsPage;