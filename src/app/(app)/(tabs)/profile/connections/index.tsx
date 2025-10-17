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
import { useLanguage } from '@/contexts/LanguageContext';
import { makeRedirectUri } from 'expo-auth-session';

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
    const { t } = useLanguage();
    const [connections, setConnections] = useState<SocialLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [connecting, setConnecting] = useState<string | null>(null);

    const platforms = [
        {
            id: 'instagram',
            name: t('profileConnections.instagram'),
            icon: 'instagram' as SocialPlatform,
            description: t('profileConnections.connect_instagram')
        },
        {
            id: 'tiktok',
            name: t('profileConnections.tiktok'),
            icon: 'tiktok' as SocialPlatform,
            description: t('profileConnections.connect_tiktok')
        },
        {
            id: 'youtube',
            name: t('profileConnections.youtube'),
            icon: 'youtube' as SocialPlatform,
            description: t('profileConnections.connect_youtube')
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

            // Create dynamic redirect URI based on environment
            const redirectUri = __DEV__
                ? 'exp://192.168.1.214:8081' // Development - goes back to app root
                : makeRedirectUri({
                    scheme: 'viblo',
                    path: 'profile/connections' // Will create: viblo://profile/connections
                });

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
                    Alert.alert(t('profileConnections.error'), t('profileConnections.platform_not_supported'));
                    setConnecting(null);
                    return;
            }

            const result = await WebBrowser.openAuthSessionAsync(
                authUrl,
                redirectUri
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
                    Alert.alert(t('profileConnections.success'), t('profileConnections.connected_successfully').replace('{{platform}}', platformId));
                    fetchConnections();
                } else {
                    Alert.alert(t('profileConnections.error'), t('profileConnections.connection_not_completed'));
                }
            } else if (result.type === 'cancel') {
                Alert.alert(t('profileConnections.cancelled'), t('profileConnections.authorization_cancelled'));
            }

        } catch (error) {
            console.error('Connection error:', error);
            Alert.alert(t('profileConnections.error'), t('profileConnections.failed_connect'));
        } finally {
            setConnecting(null);
        }
    };

    const handleDisconnect = async (platformId: string) => {
        Alert.alert(
            t('profileConnections.disconnect_account'),
            t('profileConnections.disconnect_confirm').replace('{{platform}}', platformId),
            [
                { text: t('profileConnections.cancel'), style: 'cancel' },
                {
                    text: t('profileConnections.disconnect'),
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

                            Alert.alert(t('profileConnections.disconnected'), t('profileConnections.disconnected_message').replace('{{platform}}', platformId));
                            fetchConnections();
                        } catch (error) {
                            console.error('Disconnect error:', error);
                            Alert.alert(t('profileConnections.error'), t('profileConnections.failed_disconnect'));
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
                <Text className="text-2xl font-bold" style={{ color: theme.text }}>{t('profileConnections.connections')}</Text>
                <Text className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                    {t('profileConnections.connect_social_media')}
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
                                    {t('profileConnections.why_connect')}
                                </Text>
                                <Text className="text-xs leading-5" style={{ color: theme.primaryDark }}>
                                    {t('profileConnections.why_connect_description')}
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
                                                {t('profileConnections.connected')}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Stats (if connected) */}
                                {connected && connection && (
                                    <View className="rounded-lg p-3 mb-4" style={{ backgroundColor: theme.surfaceSecondary }}>
                                        <View className="flex-row justify-between">
                                            <View className="items-center flex-1">
                                                <Text className="text-xs mb-1" style={{ color: theme.textTertiary }}>{t('profileConnections.followers')}</Text>
                                                <Text className="text-sm font-bold" style={{ color: theme.text }}>
                                                    {formatNumber(connection.follower_count)}
                                                </Text>
                                            </View>
                                            <View className="items-center flex-1">
                                                <Text className="text-xs mb-1" style={{ color: theme.textTertiary }}>{t('profileConnections.views')}</Text>
                                                <Text className="text-sm font-bold" style={{ color: theme.text }}>
                                                    {formatNumber(connection.total_views_count)}
                                                </Text>
                                            </View>
                                            <View className="items-center flex-1">
                                                <Text className="text-xs mb-1" style={{ color: theme.textTertiary }}>{t('profileConnections.likes')}</Text>
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
                                            {connected ? t('profileConnections.disconnect') : t('profileConnections.connect').replace('{{platform}}', platform.name)}
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