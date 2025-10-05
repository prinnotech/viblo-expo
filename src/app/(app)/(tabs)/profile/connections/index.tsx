import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
    Linking,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import { SocialIcon } from '@/components/getSocialIcons';
import { SocialPlatform } from '@/lib/enum_types';

WebBrowser.maybeCompleteAuthSession();

interface SocialLink {
    id: string;
    platform: string;
    handle: string | null;
    follower_count: number | null;
    total_views_count: number | null;
    total_likes_count: number | null;
    updated_at: string;
}

const ConnectionsPage = () => {
    const { profile } = useAuth();
    const [connections, setConnections] = useState<SocialLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [connecting, setConnecting] = useState<string | null>(null);

    const platforms = [
        {
            id: 'instagram',
            name: 'Instagram',
            icon: 'instagram' as SocialPlatform,
            color: 'bg-pink-500',
            description: 'Connect your Instagram Business account'
        },
        {
            id: 'tiktok',
            name: 'TikTok',
            icon: 'tiktok' as SocialPlatform,
            color: 'bg-black',
            description: 'Connect your TikTok account'
        },
        {
            id: 'youtube',
            name: 'YouTube',
            icon: 'youtube' as SocialPlatform,
            color: 'bg-red-600',
            description: 'Connect your YouTube channel'
        }
    ];

    useEffect(() => {
        if (profile) {
            fetchConnections();
        }

        // Listen for deep link redirects after OAuth
        /* const subscription = Linking.addEventListener('url', handleDeepLink);

        return () => {
            subscription.remove();
        }; */
    }, [profile]);

    const handleDeepLink = ({ url }: { url: string }) => {
        console.log('Deep link received:', url);

        // Parse URL - the URL comes back as: exp://192.168.1.214:8081?success=true&platform=tiktok
        // Remove the check for 'connections' since it won't be in the redirect URL
        try {
            // Handle both URL formats
            const urlObj = url.includes('?') ? new URL(url) : null;

            if (!urlObj) return;

            const success = urlObj.searchParams.get('success');
            const error = urlObj.searchParams.get('error');
            const platform = urlObj.searchParams.get('platform');

            if (success === 'true' && platform) {
                Alert.alert('Success', `${platform} connected successfully!`);
                fetchConnections();
            } else if (error) {
                Alert.alert('Error', decodeURIComponent(error));
            }
        } catch (e) {
            console.error('Error parsing deep link:', e);
        }
    };

    const fetchConnections = async () => {
        if (!profile) return;

        try {
            const { data, error } = await supabase
                .from('social_links')
                .select('*')
                .eq('user_id', profile.id);

            if (error) throw error;
            setConnections(data || []);
        } catch (error) {
            console.error('Error fetching connections:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchConnections();
    };

    const handleConnect = async (platformId: string) => {
        setConnecting(platformId);

        try {
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://viblo-backend-production.up.railway.app';

            let authUrl = '';

            switch (platformId) {
                case 'instagram':
                    authUrl = `${backendUrl}/api/instagram/authorize?user_id=${profile?.id}`;
                    break;
                case 'tiktok':
                    authUrl = `${backendUrl}/api/tiktok/authorize?user_id=${profile?.id}`;
                    break;
                case 'youtube':
                    authUrl = `${backendUrl}/api/youtube/authorize?user_id=${profile?.id}`;
                    break;
                default:
                    Alert.alert('Error', 'Platform not supported');
                    setConnecting(null);
                    return;
            }

            const result = await WebBrowser.openAuthSessionAsync(
                authUrl,
                'exp://192.168.1.214:8081'
            );

            // After auth session completes, check the database directly
            if (result.type === 'success' || result.type === 'dismiss') {
                console.log('Auth session completed, checking connection status...');

                // Wait a moment for backend to complete
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Check if connection was successful by fetching from database
                const { data, error } = await supabase
                    .from('social_links')
                    .select('*')
                    .eq('user_id', profile?.id)
                    .eq('platform', platformId)
                    .single();

                if (data && !error) {
                    Alert.alert('Success', `${platformId} connected successfully!`);
                    fetchConnections();
                } else {
                    Alert.alert('Error', 'Connection was not completed. Please try again.');
                }
            } else if (result.type === 'cancel') {
                Alert.alert('Cancelled', 'Authorization was cancelled');
            }

        } catch (error) {
            console.error('Connection error:', error);
            Alert.alert('Error', 'Failed to connect. Please try again.');
        } finally {
            setConnecting(null);
        }
    };

    const handleDisconnect = async (platformId: string) => {
        Alert.alert(
            'Disconnect Account',
            `Are you sure you want to disconnect your ${platformId} account?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://viblo-backend-production.up.railway.app';

                            // Revoke OAuth token first
                            if (platformId === 'tiktok' || platformId === 'youtube') {
                                try {
                                    await fetch(`${backendUrl}/api/${platformId}/revoke?user_id=${profile?.id}`, {
                                        method: 'POST',
                                        headers: {
                                            'x-api-key': process.env.EXPO_PUBLIC_API_KEY || 'fb52e30a-274d-4871-bdce-bebb6464bcf1',
                                        },
                                    });
                                } catch (e) {
                                    console.error('Token revocation failed:', e);
                                }
                            }

                            // Delete from database
                            const { error: socialError } = await supabase
                                .from('social_links')
                                .delete()
                                .eq('user_id', profile?.id)
                                .eq('platform', platformId);

                            if (socialError) throw socialError;

                            // Also delete OAuth tokens
                            const { error: tokenError } = await supabase
                                .from('oauth_tokens')
                                .delete()
                                .eq('user_id', profile?.id)
                                .eq('platform', platformId);

                            if (tokenError) console.error('Token deletion error:', tokenError);

                            Alert.alert('Disconnected', `${platformId} account disconnected. You can now connect a different account.`);
                            fetchConnections();
                        } catch (error) {
                            console.error('Disconnect error:', error);
                            Alert.alert('Error', 'Failed to disconnect');
                        }
                    }
                }
            ]
        );
    };

    const isConnected = (platformId: string) => {
        return connections.some(c => c.platform === platformId);
    };

    const getConnection = (platformId: string) => {
        return connections.find(c => c.platform === platformId);
    };

    const formatNumber = (num: number | null) => {
        if (num === null) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-gray-200">
                <Text className="text-2xl font-bold text-gray-900">Connections</Text>
                <Text className="text-sm text-gray-600 mt-1">
                    Connect your social media accounts
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                <View className="px-4 py-6">
                    {/* Info Card */}
                    <View className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
                        <View className="flex-row items-start">
                            <Feather name="info" size={18} color="#2563eb" />
                            <View className="flex-1 ml-3">
                                <Text className="text-sm text-blue-900 font-medium mb-1">
                                    Why Connect?
                                </Text>
                                <Text className="text-xs text-blue-700 leading-5">
                                    Connect your accounts to automatically sync your stats, find matching campaigns, and get paid for your content.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Platform Cards */}
                    {platforms.map((platform) => {
                        const connected = isConnected(platform.id);
                        const connection = getConnection(platform.id);
                        const isLoading = connecting === platform.id;

                        return (
                            <View
                                key={platform.id}
                                className="bg-white rounded-xl p-5 mb-4 border border-gray-200"
                            >
                                <View className="flex-row items-center mb-4">
                                    <SocialIcon platform={platform.icon} />
                                    <View className="flex-1 ml-3">
                                        <Text className="text-lg font-semibold text-gray-900">
                                            {platform.name}
                                        </Text>
                                        <Text className="text-xs text-gray-600 mt-1">
                                            {platform.description}
                                        </Text>
                                    </View>
                                    {connected && (
                                        <View className="bg-green-100 px-2 py-1 rounded-full">
                                            <Text className="text-xs font-semibold text-green-600">
                                                Connected
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Stats (if connected) */}
                                {connected && connection && (
                                    <View className="bg-gray-50 rounded-lg p-3 mb-4">
                                        <View className="flex-row justify-between">
                                            <View className="items-center flex-1">
                                                <Text className="text-xs text-gray-500 mb-1">Followers</Text>
                                                <Text className="text-sm font-bold text-gray-900">
                                                    {formatNumber(connection.follower_count)}
                                                </Text>
                                            </View>
                                            <View className="items-center flex-1">
                                                <Text className="text-xs text-gray-500 mb-1">Views</Text>
                                                <Text className="text-sm font-bold text-gray-900">
                                                    {formatNumber(connection.total_views_count)}
                                                </Text>
                                            </View>
                                            <View className="items-center flex-1">
                                                <Text className="text-xs text-gray-500 mb-1">Likes</Text>
                                                <Text className="text-sm font-bold text-gray-900">
                                                    {formatNumber(connection.total_likes_count)}
                                                </Text>
                                            </View>
                                        </View>
                                        {connection.handle && (
                                            <Text className="text-xs text-gray-600 text-center mt-2">
                                                @{connection.handle}
                                            </Text>
                                        )}
                                    </View>
                                )}

                                {/* Action Button */}
                                <TouchableOpacity
                                    onPress={() => connected ? handleDisconnect(platform.id) : handleConnect(platform.id)}
                                    disabled={isLoading}
                                    className={`rounded-lg p-3 ${connected
                                        ? 'bg-red-50 border border-red-200'
                                        : 'bg-blue-600'
                                        }`}
                                    activeOpacity={0.8}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={connected ? '#dc2626' : 'white'} />
                                    ) : (
                                        <Text className={`text-center font-semibold ${connected ? 'text-red-600' : 'text-white'
                                            }`}>
                                            {connected ? 'Disconnect' : `Connect ${platform.name}`}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ConnectionsPage;