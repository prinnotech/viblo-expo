// hooks/useCampaignAnalytics.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface InfluencerPerformance {
    influencer_id: string;
    influencer_name: string;
    influencer_username: string;
    influencer_avatar: string | null;
    submission_status: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    earned_amount: number;
    posted_at: string | null;
    submission_id: string;
}

interface CampaignStats {
    total_views: number;
    total_likes: number;
    total_comments: number;
    total_spent: number;
    active_influencers: number;
    total_submissions: number;
}

interface CampaignAnalytics {
    campaign: {
        id: string;
        title: string;
        description: string | null;
        status: string;
        total_budget: number;
        total_paid: number;
        rate_per_view: number;
        start_date: string | null;
        end_date: string | null;
        created_at: string;
    } | null;
    stats: CampaignStats;
    influencers: InfluencerPerformance[];
    loading: boolean;
    refreshing: boolean;
    error: string | null;
}

export const useCampaignAnalytics = (campaignId: string | null) => {
    const [data, setData] = useState<CampaignAnalytics>({
        campaign: null,
        stats: {
            total_views: 0,
            total_likes: 0,
            total_comments: 0,
            total_spent: 0,
            active_influencers: 0,
            total_submissions: 0,
        },
        influencers: [],
        loading: true,
        refreshing: false,
        error: null,
    });

    const fetchAnalytics = useCallback(async (isRefresh = false) => {
        if (!campaignId) {
            setData(prev => ({ ...prev, loading: false, error: 'No campaign ID provided' }));
            return;
        }

        setData(prev => ({
            ...prev,
            loading: !isRefresh,
            refreshing: isRefresh,
            error: null,
        }));

        try {
            // Fetch campaign details
            const { data: campaignData, error: campaignError } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            if (campaignError) throw campaignError;

            // Fetch submissions with influencer details
            const { data: submissions, error: submissionsError } = await supabase
                .from('content_submissions')
                .select(`*, influencer:profiles!content_submissions_influencer_id_fkey(*)`)
                .eq('campaign_id', campaignId)
                .in('status', ['posted_live', 'completed']);

            if (submissionsError) throw submissionsError;

            // Process submissions data
            const influencersData: InfluencerPerformance[] = (submissions || []).map(sub => ({
                influencer_id: sub.influencer_id,
                influencer_name: sub.influencer
                    ? `${sub.influencer.first_name || ''} ${sub.influencer.last_name || ''}`.trim() || sub.influencer.username
                    : 'Unknown',
                influencer_username: sub.influencer?.username || 'unknown',
                influencer_avatar: sub.influencer?.avatar_url || null,
                submission_status: sub.status,
                view_count: parseFloat(sub.view_count as any) || 0,
                like_count: parseFloat(sub.like_count as any) || 0,
                comment_count: parseFloat(sub.comment_count as any) || 0,
                earned_amount: parseFloat(sub.earned_amount as any) || 0,
                posted_at: sub.posted_at,
                submission_id: sub.id,
            }));

            // Calculate aggregated stats
            const stats: CampaignStats = {
                total_views: influencersData.reduce((sum, inf) => sum + inf.view_count, 0),
                total_likes: influencersData.reduce((sum, inf) => sum + inf.like_count, 0),
                total_comments: influencersData.reduce((sum, inf) => sum + inf.comment_count, 0),
                total_spent: influencersData.reduce((sum, inf) => sum + inf.earned_amount, 0),
                active_influencers: influencersData.length,
                total_submissions: influencersData.length,
            };

            setData({
                campaign: campaignData,
                stats,
                influencers: influencersData,
                loading: false,
                refreshing: false,
                error: null,
            });
        } catch (err: any) {
            console.error('Error fetching campaign analytics:', err);
            setData(prev => ({
                ...prev,
                loading: false,
                refreshing: false,
                error: err.message || 'Failed to load analytics',
            }));
        }
    }, [campaignId]);

    const refresh = useCallback(() => {
        fetchAnalytics(true);
    }, [fetchAnalytics]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return {
        ...data,
        refresh,
    };
};