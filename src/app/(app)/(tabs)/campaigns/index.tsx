import { Text, View, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaigns } from '@/hooks/useCampaigns';
import CampaignCard, { Campaign } from '@/components/CampaignCard';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const Campaigns = () => {
    const router = useRouter();
    const { profile } = useAuth();
    const { theme } = useTheme();
    const { t } = useLanguage();
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
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            {/* Header */}
            <View className="p-4 flex-row justify-between items-center" style={{ backgroundColor: theme.surface, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
                <View>
                    <Text className="text-2xl font-bold" style={{ color: theme.text }}>{t('campaignsIndex.my_campaigns')}</Text>
                    <Text className="text-sm" style={{ color: theme.textTertiary }}>
                        {t('campaignsIndex.manage_track_campaigns')}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleCreateCampaign}
                    className="px-4 py-2 rounded-full flex-row items-center gap-2"
                    style={{ backgroundColor: theme.primary }}
                >
                    <AntDesign name="plus" size={16} color={theme.surface} />
                    <Text className="font-semibold" style={{ color: theme.surface }}>{t('campaignsIndex.new')}</Text>
                </TouchableOpacity>
            </View>

            {/* Campaign Count */}
            {!loading && (
                <View className="px-4 py-2" style={{ backgroundColor: theme.background }}>
                    <Text className="text-sm" style={{ color: theme.textSecondary }}>
                        {uniqueCampaigns.length} {uniqueCampaigns.length === 1 ? t('campaignsIndex.campaign') : t('campaignsIndex.campaigns')}
                    </Text>
                </View>
            )}

            {/* Campaigns List */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text className="mt-4" style={{ color: theme.textTertiary }}>{t('campaignsIndex.loading_campaigns')}</Text>
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
                            <AntDesign name="inbox" size={64} color={theme.textTertiary} />
                            <Text className="text-center mt-6 text-xl font-semibold" style={{ color: theme.textSecondary }}>
                                {t('campaignsIndex.no_campaigns_yet')}
                            </Text>
                            <Text className="text-center mt-2 text-base" style={{ color: theme.textTertiary }}>
                                {t('campaignsIndex.create_first_campaign')}
                            </Text>
                            <TouchableOpacity
                                onPress={handleCreateCampaign}
                                className="mt-6 px-8 py-4 rounded-full flex-row items-center gap-2"
                                style={{ backgroundColor: theme.primary }}
                            >
                                <AntDesign name="plus" size={20} color={theme.surface} />
                                <Text className="font-semibold text-base" style={{ color: theme.surface }}>
                                    {t('campaignsIndex.create_campaign')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={refresh}
                            colors={[theme.primary]}
                            tintColor={theme.primary}
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View className="py-4">
                                <ActivityIndicator size="small" color={theme.primary} />
                            </View>
                        ) : !hasMore && uniqueCampaigns.length > 0 ? (
                            <View className="py-4">
                                <Text className="text-center text-sm" style={{ color: theme.textTertiary }}>
                                    {t('campaignsIndex.reached_end')}
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