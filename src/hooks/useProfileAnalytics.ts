import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface PlatformStats {
    platform: 'youtube' | 'instagram' | 'tiktok';
    username: string;
    handle: string;
    profileUrl: string;
    followers: number;
    views: number;
    likes: number;
    comments: number;
    isConnected: boolean;
}

interface AnalyticsData {
    totalEarnings: number;
    totalFollowers: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    platforms: PlatformStats[];
    lastUpdated: Date;
}

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://e2a4125f8426.ngrok-free.app';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'fb52e30a-274d-4871-bdce-bebb6464bcf1'
const fetchHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
};


export const useProfileAnalytics = (profileId: string) => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchYouTubeData = async (userId: string): Promise<PlatformStats | null> => {
        try {
            const [channelRes, videosRes] = await Promise.all([
                // --- ✨ THE FIX: Added headers ---
                fetch(`${API_BASE}/api/youtube/channel?user_id=${userId}`, { headers: fetchHeaders }),
                fetch(`${API_BASE}/api/youtube/videos?user_id=${userId}`, { headers: fetchHeaders }),
            ]);

            if (!channelRes.ok) return null;

            const channelData = await channelRes.json();
            const videosData = await videosRes.json();

            const totalViews = parseInt(channelData.statistics?.viewCount || '0');
            const totalLikes = videosData.items?.reduce(
                (sum: number, video: any) => sum + parseInt(video.statistics?.likeCount || '0'),
                0
            ) || 0;
            const totalComments = videosData.items?.reduce(
                (sum: number, video: any) => sum + parseInt(video.statistics?.commentCount || '0'),
                0
            ) || 0;

            return {
                platform: 'youtube',
                username: channelData.snippet?.title || '',
                handle: channelData.snippet?.customUrl || channelData.snippet?.title || '',
                profileUrl: `https://youtube.com/channel/${channelData.id}`,
                followers: parseInt(channelData.statistics?.subscriberCount || '0'),
                views: totalViews,
                likes: totalLikes,
                comments: totalComments,
                isConnected: true,
            };
        } catch (err) {
            console.error('YouTube fetch error:', err);
            return null;
        }
    };

    const fetchInstagramData = async (userId: string): Promise<PlatformStats | null> => {
        try {
            const [profileRes, mediaRes] = await Promise.all([
                // --- ✨ THE FIX: Added headers ---
                fetch(`${API_BASE}/api/instagram/profile?user_id=${userId}`, { headers: fetchHeaders }),
                fetch(`${API_BASE}/api/instagram/media?user_id=${userId}&limit=50`, { headers: fetchHeaders }),
            ]);

            if (!profileRes.ok) return null;

            const profileData = await profileRes.json();
            const mediaData = await mediaRes.json();

            const totalLikes = mediaData.data?.reduce(
                (sum: number, post: any) => sum + (post.like_count || 0),
                0
            ) || 0;
            const totalComments = mediaData.data?.reduce(
                (sum: number, post: any) => sum + (post.comments_count || 0),
                0
            ) || 0;

            return {
                platform: 'instagram',
                username: profileData.name || profileData.username || '',
                handle: `@${profileData.username}`,
                profileUrl: `https://instagram.com/${profileData.username}`,
                followers: profileData.followers_count || 0,
                views: 0,
                likes: totalLikes,
                comments: totalComments,
                isConnected: true,
            };
        } catch (err) {
            console.error('Instagram fetch error:', err);
            return null;
        }
    };

    const fetchTikTokData = async (userId: string): Promise<PlatformStats | null> => {
        try {
            const [userRes, videosRes] = await Promise.all([
                // --- ✨ THE FIX: Added headers ---
                fetch(`${API_BASE}/api/tiktok/user?user_id=${userId}`, { headers: fetchHeaders }),
                fetch(`${API_BASE}/api/tiktok/videos?user_id=${userId}`, {
                    method: 'POST',
                    headers: fetchHeaders // Added headers here
                }),
            ]);

            if (!userRes.ok) return null;

            const userData = await userRes.json();
            const videosData = await videosRes.json();

            const totalViews = videosData.videos?.reduce(
                (sum: number, video: any) => sum + (video.view_count || 0),
                0
            ) || 0;
            const totalLikes = videosData.videos?.reduce(
                (sum: number, video: any) => sum + (video.like_count || 0),
                0
            ) || 0;
            const totalComments = videosData.videos?.reduce(
                (sum: number, video: any) => sum + (video.comment_count || 0),
                0
            ) || 0;

            return {
                platform: 'tiktok',
                username: userData.display_name || userData.username || '',
                handle: `@${userData.username}`,
                profileUrl: userData.profile_deep_link || `https://tiktok.com/@${userData.username}`,
                followers: userData.follower_count || 0,
                views: totalViews,
                likes: totalLikes,
                comments: totalComments,
                isConnected: true,
            };
        } catch (err) {
            console.error('TikTok fetch error:', err);
            return null;
        }
    };

    const fetchEarnings = async (userId: string): Promise<number> => {
        try {
            // Query Supabase directly
            const { data, error } = await supabase
                .from('payouts')
                .select('amount')
                .eq('influencer_id', userId)
                .eq('status', 'completed');

            if (error) throw error;
            if (!data) return 0;

            // Sum the amounts of completed payouts
            const total = data.reduce((sum, payout) => sum + (payout.amount || 0), 0);
            return total;

        } catch (err) {
            console.error('Supabase earnings fetch error:', err);
            return 0; // Return 0 if there's an error
        }
    };

    const fetchAnalytics = useCallback(async (isRefresh = false) => {
        if (!profileId) {
            setLoading(false);
            return;
        }

        try {
            if (!isRefresh) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }
            setError(null);

            const [earnings, youtubeData, instagramData, tiktokData] = await Promise.all([
                fetchEarnings(profileId),
                fetchYouTubeData(profileId),
                fetchInstagramData(profileId),
                fetchTikTokData(profileId),
            ]);

            const platforms = [youtubeData, instagramData, tiktokData].filter(
                (p): p is PlatformStats => p !== null
            );

            const totals = platforms.reduce(
                (acc, platform) => ({
                    followers: acc.followers + platform.followers,
                    views: acc.views + platform.views,
                    likes: acc.likes + platform.likes,
                    comments: acc.comments + platform.comments,
                }),
                { followers: 0, views: 0, likes: 0, comments: 0 }
            );

            setAnalytics({
                totalEarnings: earnings,
                totalFollowers: totals.followers,
                totalViews: totals.views,
                totalLikes: totals.likes,
                totalComments: totals.comments,
                platforms,
                lastUpdated: new Date(),
            });
        } catch (err: any) {
            console.error('Analytics fetch error:', err);
            setError(err.message || 'Failed to fetch analytics');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [profileId]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const refresh = () => fetchAnalytics(true);

    return {
        analytics,
        loading,
        refreshing,
        error,
        refresh,
    };
};

