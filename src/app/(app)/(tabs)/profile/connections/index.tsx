import React, { useEffect, useState, useCallback } from 'react';
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
import { useTheme } from '@/contexts/ThemeContext';

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
    const { theme } = useTheme();
    const [connections, setConnections] = useState<SocialLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [connecting, setConnecting] = useState<string | null>(null);

    const platforms = [
        {
            id: 'instagram',
            name: 'Instagram',
            icon: 'instagram' as SocialPlatform,
            description: 'Connect your Instagram Business account'
        },
        {
            id: 'tiktok',
            name: 'TikTok',
            icon: 'tiktok' as SocialPlatform,
            description: 'Connect your TikTok account'
        },
        {
            id: 'youtube',
            name: 'YouTube',
            icon: 'youtube' as SocialPlatform,
            description: 'Connect your YouTube channel'
        }
    ];

    useEffect(() => {
        if (profile) {
            fetchConnections();
        }
    }, [profile]);

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

            if (result.type === 'success' || result.type === 'dismiss') {
                console.log('Auth session completed, checking connection status...');
                await new Promise(resolve => setTimeout(resolve, 1000));
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

                            const { error: socialError } = await supabase
                                .from('social_links')
                                .delete()
                                .eq('user_id', profile?.id)
                                .eq('platform', platformId);

                            if (socialError) throw socialError;

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
            <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            {/* Header */}
            <View className="px-6 py-4 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <Text className="text-2xl font-bold" style={{ color: theme.text }}>Connections</Text>
                <Text className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                    Connect your social media accounts
                </Text>
            </View>

            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                <View className="px-4 py-6">
                    {/* Info Card */}
                    <View className="rounded-xl p-4 mb-6 border" style={{ backgroundColor: theme.primaryLight, borderColor: theme.border }}>
                        <View className="flex-row items-start">
                            <Feather name="info" size={18} color={theme.primaryDark} />
                            <View className="flex-1 ml-3">
                                <Text className="text-sm font-medium mb-1" style={{ color: theme.primaryDark }}>
                                    Why Connect?
                                </Text>
                                <Text className="text-xs leading-5" style={{ color: theme.primaryDark }}>
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
                                className="rounded-xl p-5 mb-4 border"
                                style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                            >
                                <View className="flex-row items-center mb-4">
                                    <SocialIcon platform={platform.icon} />
                                    <View className="flex-1 ml-3">
                                        <Text className="text-lg font-semibold" style={{ color: theme.text }}>
                                            {platform.name}
                                        </Text>
                                        <Text className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                                            {platform.description}
                                        </Text>
                                    </View>
                                    {connected && (
                                        <View className="px-2 py-1 rounded-full" style={{ backgroundColor: theme.successLight }}>
                                            <Text className="text-xs font-semibold" style={{ color: theme.success }}>
                                                Connected
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Stats (if connected) */}
                                {connected && connection && (
                                    <View className="rounded-lg p-3 mb-4" style={{ backgroundColor: theme.surfaceSecondary }}>
                                        <View className="flex-row justify-between">
                                            <View className="items-center flex-1">
                                                <Text className="text-xs mb-1" style={{ color: theme.textTertiary }}>Followers</Text>
                                                <Text className="text-sm font-bold" style={{ color: theme.text }}>
                                                    {formatNumber(connection.follower_count)}
                                                </Text>
                                            </View>
                                            <View className="items-center flex-1">
                                                <Text className="text-xs mb-1" style={{ color: theme.textTertiary }}>Views</Text>
                                                <Text className="text-sm font-bold" style={{ color: theme.text }}>
                                                    {formatNumber(connection.total_views_count)}
                                                </Text>
                                            </View>
                                            <View className="items-center flex-1">
                                                <Text className="text-xs mb-1" style={{ color: theme.textTertiary }}>Likes</Text>
                                                <Text className="text-sm font-bold" style={{ color: theme.text }}>
                                                    {formatNumber(connection.total_likes_count)}
                                                </Text>
                                            </View>
                                        </View>
                                        {connection.handle && (
                                            <Text className="text-xs text-center mt-2" style={{ color: theme.textSecondary }}>
                                                @{connection.handle}
                                            </Text>
                                        )}
                                    </View>
                                )}

                                {/* Action Button */}
                                <TouchableOpacity
                                    onPress={() => connected ? handleDisconnect(platform.id) : handleConnect(platform.id)}
                                    disabled={isLoading}
                                    className="rounded-lg p-3"
                                    style={{
                                        backgroundColor: connected ? theme.errorLight : theme.primary,
                                        borderWidth: connected ? 1 : 0,
                                        borderColor: theme.error
                                    }}
                                    activeOpacity={0.8}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={connected ? theme.error : theme.surface} />
                                    ) : (
                                        <Text className="text-center font-semibold" style={{ color: connected ? theme.error : theme.surface }}>
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
