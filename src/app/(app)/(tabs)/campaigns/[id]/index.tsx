import {
    Text,
    View,
    ActivityIndicator,
    ScrollView,
    Image,
    Pressable,
    RefreshControl,
} from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { SocialIcon } from '@/components/getSocialIcons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

// --- Helper Components ---
const BrandHeader = ({ profile }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    return (
        <View className="flex-row items-center mb-4">
            <Image
                source={{ uri: profile.avatar_url || 'https://placehold.co/100x100/E2E8F0/4A5568?text=Brand' }}
                className="w-14 h-14 rounded-full mr-4"
                style={{ backgroundColor: theme.surfaceSecondary }}
            />
            <View>
                <View className="flex-row items-center">
                    <Link href={`/brand/${profile?.id}`} asChild>
                        <Text className="text-xl font-bold" style={{ color: theme.text }}>{profile.company_name || t('campaignId.brand_name')}</Text>
                    </Link>
                    {profile.is_verified && (
                        <Feather name="check-circle" size={18} color={theme.primary} style={{ marginLeft: 8 }} />
                    )}
                </View>
                <Text className="text-sm" style={{ color: theme.textSecondary }}>{profile.industry || t('campaignId.industry')}</Text>
            </View>
        </View>
    );
};

const CampaignStat = ({ icon, label, value }) => {
    const { theme } = useTheme();
    return (
        <View className="flex-1 items-center p-3 rounded-lg border" style={{ backgroundColor: theme.primaryLight, borderColor: theme.border }}>
            <Feather name={icon} size={24} color={theme.primary} />
            <Text className="text-xs mt-1" style={{ color: theme.textSecondary }}>{label}</Text>
            <Text className="text-base font-bold" style={{ color: theme.text }}>{value}</Text>
        </View>
    );
};

const Tag = ({ text }) => {
    const { theme } = useTheme();
    return (
        <View className="rounded-full px-3 py-1 mr-2 mb-2" style={{ backgroundColor: theme.surfaceSecondary }}>
            <Text className="text-xs font-medium" style={{ color: theme.textSecondary }}>{text}</Text>
        </View>
    );
};

const TagPlatforms = ({ platform }) => {
    return (
        <View className=" rounded-full px-3 py-1 mr-2 mb-2">
            <SocialIcon platform={platform} />
        </View>
    );
};

const InfoSection = ({ title, children }) => {
    const { theme } = useTheme();
    return (
        <View className="mb-6">
            <Text className="text-lg font-semibold mb-2" style={{ color: theme.text }}>{title}</Text>
            {children}
        </View>
    );
};

const BudgetProgressBar = ({ total, paid }: { total: number; paid: number }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const paidAmount = paid || 0;
    const totalAmount = total || 0;
    const percentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    let barColor = theme.success;
    if (percentage > 50) barColor = theme.warning;
    if (percentage > 85) barColor = theme.error;

    return (
        <View className="mb-6">
            <View className="flex-row justify-between items-center mb-1">
                <Text className="text-xs font-medium" style={{ color: theme.textSecondary }}>{t('campaignId.budget_used')} ${paidAmount.toFixed(2)}</Text>
                <Text className="text-xs font-bold" style={{ color: theme.textSecondary }}>{Math.round(percentage)}%</Text>
            </View>
            <View className="w-full rounded-full h-2.5" style={{ backgroundColor: theme.surfaceSecondary }}>
                <View
                    className="h-2.5 rounded-full"
                    style={{ width: `${percentage}%`, backgroundColor: barColor }}
                />
            </View>
        </View>
    );
};


// --- Main Campaign Details Page ---
const CampaignDetailsPage = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const navigation = useNavigation();
    const { theme } = useTheme();
    const { t } = useLanguage();

    const { profile, isLoading: isAuthLoading } = useAuth();
    const isBrand = profile?.user_type === 'brand';
    const isInfluencer = profile?.user_type === 'influencer';

    const campaignId = Array.isArray(id) ? id[0] : id;

    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false); // Add refreshing state
    const [error, setError] = useState(null);

    const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
    const [isStatusLoading, setIsStatusLoading] = useState(true);

    // Extract fetch logic into a separate function
    const fetchCampaignDetails = useCallback(async () => {
        if (!campaignId) {
            setError("Campaign ID is missing.");
            return;
        }

        const { data, error } = await supabase
            .from('campaigns')
            .select(` *, profile:profiles!campaigns_brand_id_fkey(*) `)
            .eq('id', campaignId)
            .single();

        if (error) {
            setError(error.message);
            console.error("Error fetching campaign:", error);
        } else if (data) {
            setCampaign(data);
            navigation.setOptions({ title: data.title });
            setError(null);
        }
    }, [campaignId, navigation]);

    const checkSubmissionStatus = useCallback(async () => {
        if (isInfluencer && profile?.id && campaignId) {
            const { data, error } = await supabase.rpc('get_submission_status', {
                p_influencer_id: profile.id,
                p_campaign_id: campaignId,
            });

            if (error) {
                console.error("Error checking submission status:", error);
            } else {
                setSubmissionStatus(data);
            }
        }
    }, [isInfluencer, profile?.id, campaignId]);

    // Initial fetch
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setIsStatusLoading(true);

            await fetchCampaignDetails();
            await checkSubmissionStatus();

            setLoading(false);
            setIsStatusLoading(false);
        };

        fetchData();
    }, [fetchCampaignDetails, checkSubmissionStatus]);

    // Pull-to-refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        await Promise.all([
            fetchCampaignDetails(),
            checkSubmissionStatus()
        ]);

        setRefreshing(false);
    }, [fetchCampaignDetails, checkSubmissionStatus]);

    // Combined loading state
    if (loading || isAuthLoading || isStatusLoading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (error || !campaign) {
        return (
            <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: theme.background }}>
                <Text className="text-center" style={{ color: theme.error }}>
                    {error || t('campaignId.campaign_not_found')}
                </Text>
            </View>
        );
    }

    const getButtonText = () => {
        switch (submissionStatus) {
            case 'pending_review':
                return t('campaignId.application_submitted');
            case 'completed':
                return t('campaignId.campaign_completed');
            case 'approved':
            case 'posted_live':
                return t('campaignId.view_submission');
            case 'needs_revision':
                return t('campaignId.revise_submission');
            default:
                return t('campaignId.apply_now');
        }
    };

    const isButtonDisabled = submissionStatus === 'pending_review' || submissionStatus === 'completed';

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }} edges={['bottom']}>
            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.primary]} // Android
                        tintColor={theme.primary}  // iOS
                    />
                }
            >

                {campaign.profile && <BrandHeader profile={campaign.profile} />}
                <Text className="text-3xl font-extrabold mb-4" style={{ color: theme.text }}>{campaign.title}</Text>
                <BudgetProgressBar
                    total={parseFloat(campaign.total_budget)}
                    paid={parseFloat(campaign.total_paid)}
                />
                <View className="flex-row space-x-3 mb-6">
                    <CampaignStat icon="dollar-sign" label={t('campaignId.total_budget')} value={`$${campaign.total_budget}`} />
                    <CampaignStat icon="eye" label={t('campaignId.rate_per_view')} value={`$${campaign.rate_per_view}`} />
                </View>
                <InfoSection title={t('campaignId.description')}>
                    <Text className="text-base leading-relaxed" style={{ color: theme.textSecondary }}>{campaign.description}</Text>
                </InfoSection>
                {campaign.content_requirements && (
                    <InfoSection title={t('campaignId.content_requirements')}>
                        <Text className="text-base leading-relaxed" style={{ color: theme.textSecondary }}>{campaign.content_requirements}</Text>
                    </InfoSection>
                )}
                <InfoSection title={t('campaignId.platforms')}>
                    <View className="flex-row flex-wrap">
                        {campaign.target_platforms?.map(p => <TagPlatforms key={p} platform={p} />) || <Tag text={t('campaignId.not_specified')} />}
                    </View>
                </InfoSection>
                <InfoSection title={t('campaignId.target_niches')}>
                    <View className="flex-row flex-wrap">
                        {campaign.target_niches?.map(n => <Tag key={n} text={n} />) || <Tag text={t('campaignId.not_specified')} />}
                    </View>
                </InfoSection>
                <InfoSection title={t('campaignId.target_location')}>
                    <View className="flex-row flex-wrap">
                        {campaign.target_audience_locations?.map(l => <Tag key={l} text={l} />) || <Tag text={t('campaignId.not_specified')} />}
                    </View>
                </InfoSection>
            </ScrollView>

            {/* --- Updated Floating Button Logic --- */}
            <View className="absolute bottom-0 left-0 right-0 p-4 border-t" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                {isBrand ? (
                    <Pressable
                        className="py-4 rounded-xl items-center justify-center shadow-lg"
                        style={{ backgroundColor: theme.primary }}
                        onPress={() => router.push(`/campaigns/${campaignId}/edit`)}
                    >
                        <Text className="text-lg font-bold" style={{ color: theme.surface }}>{t('campaignId.edit')}</Text>
                    </Pressable>
                ) : isInfluencer ? (
                    <Pressable
                        disabled={isButtonDisabled}
                        className="py-4 rounded-xl items-center justify-center shadow-lg"
                        style={{ backgroundColor: isButtonDisabled ? theme.textTertiary : theme.primary }}
                        onPress={() => {
                            router.push(`/campaigns/${campaignId}/apply`);
                        }}
                    >
                        <Text className="text-lg font-bold" style={{ color: theme.surface }}>{getButtonText()}</Text>
                    </Pressable>
                ) : null}
            </View>
        </SafeAreaView>
    );
};

export default CampaignDetailsPage;