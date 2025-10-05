import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/db_interface';

interface PlatformStats {
    platform: 'youtube' | 'instagram' | 'tiktok';
    username: string;
    handle: string;
    profileUrl: string;
    followers: number;
    views: number;
    likes: number;
    comments: number;
}


interface PublicProfileData {
    profile: Profile;
    totalFollowers: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    platforms: PlatformStats[];
}

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://viblo-backend-production.up.railway.app';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'fb52e30a-274d-4871-bdce-bebb6464bcf1';

const fetchHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
};

export const usePublicProfile = (userId: string | undefined) => {
    const [data, setData] = useState<PublicProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchYouTubeData = async (uid: string): Promise<PlatformStats | null> => {
        try {
            const [channelRes, videosRes] = await Promise.all([
                fetch(`${API_BASE}/api/youtube/channel?user_id=${uid}`, { headers: fetchHeaders }),
                fetch(`${API_BASE}/api/youtube/videos?user_id=${uid}`, { headers: fetchHeaders }),
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
            };
        } catch (err) {
            console.error('YouTube fetch error:', err);
            return null;
        }
    };

    const fetchInstagramData = async (uid: string): Promise<PlatformStats | null> => {
        try {
            const [profileRes, mediaRes] = await Promise.all([
                fetch(`${API_BASE}/api/instagram/profile?user_id=${uid}`, { headers: fetchHeaders }),
                fetch(`${API_BASE}/api/instagram/media?user_id=${uid}&limit=50`, { headers: fetchHeaders }),
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
            };
        } catch (err) {
            console.error('Instagram fetch error:', err);
            return null;
        }
    };

    const fetchTikTokData = async (uid: string): Promise<PlatformStats | null> => {
        try {
            const [userRes, videosRes] = await Promise.all([
                fetch(`${API_BASE}/api/tiktok/user?user_id=${uid}`, { headers: fetchHeaders }),
                fetch(`${API_BASE}/api/tiktok/videos?user_id=${uid}`, {
                    method: 'POST',
                    headers: fetchHeaders,
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
            };
        } catch (err) {
            console.error('TikTok fetch error:', err);
            return null;
        }
    };

    const fetchPublicProfile = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch profile data from Supabase (only public fields)
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;
            if (!profileData) throw new Error('Profile not found');

            // Fetch platform stats
            const [youtubeData, instagramData, tiktokData] = await Promise.all([
                fetchYouTubeData(userId),
                fetchInstagramData(userId),
                fetchTikTokData(userId),
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

            setData({
                profile: profileData,
                totalFollowers: totals.followers,
                totalViews: totals.views,
                totalLikes: totals.likes,
                totalComments: totals.comments,
                platforms,
            });
        } catch (err: any) {
            console.error('Public profile fetch error:', err);
            setError(err.message || 'Failed to fetch profile');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchPublicProfile();
    }, [fetchPublicProfile]);

    return {
        data,
        loading,
        error,
        refetch: fetchPublicProfile,
    };
};