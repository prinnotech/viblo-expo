import {
    Text,
    View,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Image,
    TouchableOpacity,
} from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCampaignAnalytics } from '@/hooks/useCampaignAnalytics';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const CampaignAnalytics = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const campaignId = Array.isArray(id) ? id[0] : id;

    const { campaign, stats, influencers, loading, refreshing, error, refresh } = useCampaignAnalytics(campaignId);

    const navigation = useNavigation();
    navigation.setOptions({ title: campaign?.title });

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'completed':
                return {
                    backgroundColor: theme.primaryLight,
                    textColor: theme.primary,
                    text: t('analyticsId.completed')
                };
            case 'posted_live':
            default:
                return {
                    backgroundColor: theme.successLight,
                    textColor: theme.success,
                    text: t('analyticsId.live')
                };
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text className="mt-4" style={{ color: theme.textTertiary }}>{t('analyticsId.loading_analytics')}</Text>
            </View>
        );
    }

    if (error || !campaign) {
        return (
            <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: theme.background }}>
                <AntDesign name="frown" size={48} color={theme.error} />
                <Text className="text-center mt-4 text-lg" style={{ color: theme.error }}>
                    {error || t('analyticsId.campaign_not_found')}
                </Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-4 px-6 py-3 rounded-full"
                    style={{ backgroundColor: theme.primary }}
                >
                    <Text className="font-semibold" style={{ color: theme.surface }}>{t('analyticsId.go_back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const budgetRemaining = campaign.total_budget - campaign.total_paid;
    const budgetPercentage = (campaign.total_paid / campaign.total_budget) * 100;

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        colors={[theme.primary]}
                        tintColor={theme.primary}
                    />
                }
            >
                {/* Campaign Header */}
                <View className="p-4 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <Text className="text-2xl font-bold mb-2" style={{ color: theme.text }}>
                        {campaign.title}
                    </Text>
                    <View className="flex-row items-center gap-2">
                        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: theme.successLight }}>
                            <Text className="text-xs font-semibold uppercase" style={{ color: theme.success }}>
                                {campaign.status}
                            </Text>
                        </View>
                        <Text className="text-sm" style={{ color: theme.textTertiary }}>
                            {formatCurrency(campaign.rate_per_view * 1000)}/1K views
                        </Text>
                    </View>
                </View>

                {/* Budget Overview */}
                <View className="m-4 p-4 rounded-xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <Text className="text-base font-semibold mb-3" style={{ color: theme.text }}>{t('analyticsId.budget_overview')}</Text>
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm" style={{ color: theme.textSecondary }}>{t('analyticsId.total_budget')}</Text>
                        <Text className="text-base font-bold" style={{ color: theme.text }}>
                            {formatCurrency(campaign.total_budget)}
                        </Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm" style={{ color: theme.textSecondary }}>{t('analyticsId.spent')}</Text>
                        <Text className="text-base font-bold" style={{ color: theme.error }}>
                            {formatCurrency(campaign.total_paid)}
                        </Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-sm" style={{ color: theme.textSecondary }}>{t('analyticsId.remaining')}</Text>
                        <Text className="text-base font-bold" style={{ color: theme.success }}>
                            {formatCurrency(budgetRemaining)}
                        </Text>
                    </View>
                    {/* Progress bar */}
                    <View className="w-full rounded-full h-2.5" style={{ backgroundColor: theme.border }}>
                        <View
                            className="h-2.5 rounded-full"
                            style={{
                                width: `${Math.min(budgetPercentage, 100)}%`,
                                backgroundColor: budgetPercentage > 85 ? theme.error : budgetPercentage > 50 ? theme.warning : theme.success,
                            }}
                        />
                    </View>
                </View>

                {/* Stats Grid */}
                <View className="px-4 mb-4">
                    <View className="flex-row gap-3 mb-3">
                        <View className="flex-1 p-4 rounded-xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <AntDesign name="eye" size={24} color={theme.primary} />
                            <Text className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                                {formatNumber(stats.total_views)}
                            </Text>
                            <Text className="text-sm" style={{ color: theme.textTertiary }}>{t('analyticsId.total_views')}</Text>
                        </View>
                        <View className="flex-1 p-4 rounded-xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <AntDesign name="heart" size={24} color={theme.error} />
                            <Text className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                                {formatNumber(stats.total_likes)}
                            </Text>
                            <Text className="text-sm" style={{ color: theme.textTertiary }}>{t('analyticsId.total_likes')}</Text>
                        </View>
                    </View>
                    <View className="flex-row gap-3">
                        <View className="flex-1 p-4 rounded-xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <AntDesign name="message" size={24} color={theme.success} />
                            <Text className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                                {formatNumber(stats.total_comments)}
                            </Text>
                            <Text className="text-sm" style={{ color: theme.textTertiary }}>{t('analyticsId.comments')}</Text>
                        </View>
                        <View className="flex-1 p-4 rounded-xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <AntDesign name="team" size={24} color={'#8B5CF6'} />
                            <Text className="text-2xl font-bold mt-2" style={{ color: theme.text }}>
                                {stats.active_influencers}
                            </Text>
                            <Text className="text-sm" style={{ color: theme.textTertiary }}>{t('analyticsId.active_creators')}</Text>
                        </View>
                    </View>
                </View>

                {/* Influencers List */}
                <View className="mx-4">
                    <Text className="text-lg font-bold mb-3" style={{ color: theme.text }}>
                        {t('analyticsId.creator_performance')}
                    </Text>
                    {influencers.length === 0 ? (
                        <View className="p-8 rounded-xl border items-center" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <AntDesign name="inbox" size={48} color={theme.textTertiary} />
                            <Text className="mt-4 text-center" style={{ color: theme.textTertiary }}>
                                {t('analyticsId.no_live_content')}
                            </Text>
                        </View>
                    ) : (
                        influencers.map((influencer) => {
                            const statusStyle = getStatusStyles(influencer.submission_status);
                            return (
                                <View
                                    key={influencer.submission_id}
                                    className="p-4 rounded-xl border mb-3"
                                    style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                                >
                                    {/* Influencer Header */}
                                    <View className="flex-row items-center mb-3">
                                        <Image
                                            source={{
                                                uri: influencer.influencer_avatar || 'https://placehold.co/48x48/E2E8F0/4A5568?text=I'
                                            }}
                                            className="w-12 h-12 rounded-full mr-3"
                                        />
                                        <View className="flex-1">
                                            <Text className="text-base font-bold" style={{ color: theme.text }}>
                                                {influencer.influencer_name}
                                            </Text>
                                            <Text className="text-sm" style={{ color: theme.textTertiary }}>
                                                @{influencer.influencer_username}
                                            </Text>
                                        </View>
                                        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: statusStyle.backgroundColor }}>
                                            <Text className="text-xs font-semibold" style={{ color: statusStyle.textColor }}>
                                                {statusStyle.text}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Stats */}
                                    <View className="p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
                                        <View className="flex-row justify-between">
                                            <View className="items-center">
                                                <Text className="text-base font-bold" style={{ color: theme.text }}>
                                                    {formatNumber(influencer.view_count)}
                                                </Text>
                                                <Text className="text-xs" style={{ color: theme.textTertiary }}>{t('analyticsId.views')}</Text>
                                            </View>
                                            <View className="items-center">
                                                <Text className="text-base font-bold" style={{ color: theme.text }}>
                                                    {formatNumber(influencer.like_count)}
                                                </Text>
                                                <Text className="text-xs" style={{ color: theme.textTertiary }}>{t('analyticsId.likes')}</Text>
                                            </View>
                                            <View className="items-center">
                                                <Text className="text-base font-bold" style={{ color: theme.text }}>
                                                    {formatNumber(influencer.comment_count)}
                                                </Text>
                                                <Text className="text-xs" style={{ color: theme.textTertiary }}>{t('analyticsId.comments')}</Text>
                                            </View>
                                            <View className="items-center">
                                                <Text className="text-base font-bold" style={{ color: theme.success }}>
                                                    {formatCurrency(influencer.earned_amount)}
                                                </Text>
                                                <Text className="text-xs" style={{ color: theme.textTertiary }}>{t('analyticsId.earned')}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )
                        })
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default CampaignAnalytics;