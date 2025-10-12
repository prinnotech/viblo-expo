import {
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Switch,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AntDesign from '@expo/vector-icons/AntDesign';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CampaignStatus } from '@/lib/enum_types';
import { Campaign as BaseCampaign } from '@/lib/db_interface';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Campaign extends BaseCampaign {
    brand_id: string;
    title: string;
    description: string | null;
    content_requirements: string | null;
    status: CampaignStatus;
    total_budget: number;
    total_paid: number;
    rate_per_view: number;
    target_niches: string[] | null;
    target_audience_age: string | null;
    target_audience_locations: string[] | null;
    target_platforms: string[] | null;
    start_date: string | null;
}

interface SubmissionStats {
    total: number;
    pending_review: number;
    approved: number;
    posted_live: number;
    completed: number;
}

const AVAILABLE_NICHES = [
    'Technology', 'Gaming', 'Sports', 'Lifestyle', 'Fashion',
    'Beauty', 'Food', 'Travel', 'Fitness', 'Music', 'Education'
];

const AVAILABLE_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook', 'twitter_x'];

const AVAILABLE_LOCATIONS = [
    'United States', 'Canada', 'United Kingdom', 'Australia',
    'Germany', 'France', 'Italy', 'Spain', 'Brazil', 'Mexico',
    'India', 'Japan', 'South Korea', 'Global'
];

const EditCampaignPage = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { profile } = useAuth();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const campaignId = Array.isArray(id) ? id[0] : id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [submissionStats, setSubmissionStats] = useState<SubmissionStats | null>(null);

    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [contentRequirements, setContentRequirements] = useState('');
    const [status, setStatus] = useState<CampaignStatus>('draft');
    const [totalBudget, setTotalBudget] = useState('');
    const [ratePerView, setRatePerView] = useState('');
    const [targetAudienceAge, setTargetAudienceAge] = useState('');
    const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Fetch campaign and submission stats
    useEffect(() => {
        const fetchData = async () => {
            if (!campaignId || !profile) return;

            setLoading(true);

            // Fetch campaign
            const { data: campaignData, error: campaignError } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', campaignId)
                .eq('brand_id', profile.id)
                .single();

            if (campaignError) {
                console.error('Error fetching campaign:', campaignError);
                Alert.alert(t('campaignIdEdit.error'), t('campaignIdEdit.failed_load'));
                router.back();
                return;
            }

            // Fetch submission stats
            const { data: submissionsData, error: submissionsError } = await supabase
                .from('content_submissions')
                .select('status')
                .eq('campaign_id', campaignId);

            if (!submissionsError && submissionsData) {
                const stats: SubmissionStats = {
                    total: submissionsData.length,
                    pending_review: submissionsData.filter(s => s.status === 'pending_review').length,
                    approved: submissionsData.filter(s => s.status === 'approved').length,
                    posted_live: submissionsData.filter(s => s.status === 'posted_live').length,
                    completed: submissionsData.filter(s => s.status === 'completed').length,
                };
                setSubmissionStats(stats);
            }

            // Populate form
            setCampaign(campaignData);
            setTitle(campaignData.title);
            setDescription(campaignData.description || '');
            setContentRequirements(campaignData.content_requirements || '');
            setStatus(campaignData.status);
            setTotalBudget(campaignData.total_budget.toString());
            setRatePerView(campaignData.rate_per_view.toString());
            setTargetAudienceAge(campaignData.target_audience_age || '');
            setSelectedNiches(campaignData.target_niches || []);
            setSelectedPlatforms(campaignData.target_platforms || []);
            setSelectedLocations(campaignData.target_audience_locations || []);
            setStartDate(campaignData.start_date ? new Date(campaignData.start_date) : null);

            setLoading(false);
        };

        fetchData();
    }, [campaignId, profile]);

    // Determine if campaign can be deleted or edited
    const hasActiveSubmissions = submissionStats && (
        submissionStats.pending_review > 0 ||
        submissionStats.approved > 0 ||
        submissionStats.posted_live > 0
    );

    const canEditFinancials = !hasActiveSubmissions && campaign?.total_paid === 0;
    const canEditCampaignDetails = !hasActiveSubmissions;

    const handleSave = async () => {
        if (!campaign || !profile) return;

        // Validation
        if (!title.trim()) {
            Alert.alert(t('campaignIdEdit.validation_error'), t('campaignIdEdit.enter_title'));
            return;
        }

        if (!totalBudget || parseFloat(totalBudget) <= 0) {
            Alert.alert(t('campaignIdEdit.validation_error'), t('campaignIdEdit.enter_valid_budget'));
            return;
        }

        if (!ratePerView || parseFloat(ratePerView) <= 0) {
            Alert.alert(t('campaignIdEdit.validation_error'), t('campaignIdEdit.enter_valid_rate'));
            return;
        }

        if (selectedNiches.length === 0) {
            Alert.alert(t('campaignIdEdit.validation_error'), t('campaignIdEdit.select_niche'));
            return;
        }

        if (selectedPlatforms.length === 0) {
            Alert.alert(t('campaignIdEdit.validation_error'), t('campaignIdEdit.select_platform'));
            return;
        }

        // Check if activating a draft campaign
        const wasActivating = campaign.status === 'draft' && status === 'active';

        // Check if campaign has been paid for
        const { data: payments } = await supabase
            .from('payments')
            .select('id')
            .eq('campaign_id', campaign.id)
            .eq('status', 'succeeded')
            .limit(1);

        const hasPaidPayment = payments && payments.length > 0;

        // If trying to activate and hasn't been paid, redirect to payment
        if (wasActivating && !hasPaidPayment) {
            Alert.alert(
                t('campaignIdEdit.payment_required'),
                t('campaignIdEdit.payment_required_message'),
                [
                    { text: t('campaignIdEdit.cancel'), style: 'cancel' },
                    {
                        text: t('campaignIdEdit.pay_now'),
                        onPress: () => {
                            // Save other changes first (without status change)
                            saveCampaignWithoutStatusChange().then(() => {
                                router.push(`/(tabs)/campaigns/${campaign.id}/payment`);
                            });
                        }
                    }
                ]
            );
            return;
        }

        setSaving(true);

        const updates = {
            title: title.trim(),
            description: description.trim() || null,
            content_requirements: contentRequirements.trim() || null,
            status,
            total_budget: parseFloat(totalBudget),
            rate_per_view: parseFloat(ratePerView),
            target_niches: selectedNiches,
            target_platforms: selectedPlatforms,
            target_audience_locations: selectedLocations.length > 0 ? selectedLocations : null,
            target_audience_age: targetAudienceAge.trim() || null,
            start_date: startDate?.toISOString() || null,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('campaigns')
            .update(updates)
            .eq('id', campaign.id);

        setSaving(false);

        if (error) {
            console.error('Error updating campaign:', error);
            Alert.alert(t('campaignIdEdit.error'), t('campaignIdEdit.failed_update'));
        } else {
            Alert.alert(t('campaignIdEdit.success'), t('campaignIdEdit.campaign_updated'), [
                { text: 'OK', onPress: () => router.back() }
            ]);
        }
    };

    // Helper function to save campaign without changing status
    const saveCampaignWithoutStatusChange = async () => {
        if (!campaign) return;

        const updates = {
            title: title.trim(),
            description: description.trim() || null,
            content_requirements: contentRequirements.trim() || null,
            total_budget: parseFloat(totalBudget),
            rate_per_view: parseFloat(ratePerView),
            target_niches: selectedNiches,
            target_platforms: selectedPlatforms,
            target_audience_locations: selectedLocations.length > 0 ? selectedLocations : null,
            target_audience_age: targetAudienceAge.trim() || null,
            start_date: startDate?.toISOString() || null,
            updated_at: new Date().toISOString(),
        };

        await supabase
            .from('campaigns')
            .update(updates)
            .eq('id', campaign.id);
    };


    const handleDelete = () => {
        if (!campaign) return;

        if (hasActiveSubmissions) {
            Alert.alert(
                t('campaignIdEdit.cannot_delete'),
                t('campaignIdEdit.cannot_delete_message')
            );
            return;
        }

        Alert.alert(
            t('campaignIdEdit.delete_confirmation'),
            t('campaignIdEdit.delete_confirmation_message'),
            [
                { text: t('campaignIdEdit.cancel'), style: 'cancel' },
                {
                    text: t('campaignIdEdit.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase
                            .from('campaigns')
                            .delete()
                            .eq('id', campaign.id);

                        if (error) {
                            Alert.alert(t('campaignIdEdit.error'), t('campaignIdEdit.failed_delete'));
                        } else {
                            Alert.alert(t('campaignIdEdit.success'), t('campaignIdEdit.campaign_deleted'), [
                                { text: 'OK', onPress: () => router.replace('/(tabs)/campaigns') }
                            ]);
                        }
                    }
                }
            ]
        );
    };

    const toggleNiche = (niche: string) => {
        if (!canEditCampaignDetails) return;
        setSelectedNiches(prev =>
            prev.includes(niche)
                ? prev.filter(n => n !== niche)
                : [...prev, niche]
        );
    };

    const togglePlatform = (platform: string) => {
        if (!canEditCampaignDetails) return;
        setSelectedPlatforms(prev =>
            prev.includes(platform)
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        );
    };

    const toggleLocation = (location: string) => {
        if (!canEditCampaignDetails) return;
        setSelectedLocations(prev =>
            prev.includes(location)
                ? prev.filter(l => l !== location)
                : [...prev, location]
        );
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (!campaign) {
        return (
            <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: theme.background }}>
                <Text className="text-center" style={{ color: theme.error }}>{t('campaignIdEdit.campaign_not_found')}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-2xl font-bold" style={{ color: theme.text }}>{t('campaignIdEdit.edit_campaign')}</Text>
                    {submissionStats && submissionStats.total > 0 && (
                        <View className="mt-2 p-3 rounded-lg" style={{ backgroundColor: theme.primaryLight }}>
                            <Text className="text-sm font-medium" style={{ color: theme.primaryDark }}>
                                📊 {submissionStats.total} {t('campaignIdEdit.total_submissions')}
                            </Text>
                            {hasActiveSubmissions && (
                                <Text className="text-xs mt-1" style={{ color: theme.primary }}>
                                    {t('campaignIdEdit.fields_locked')}
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Title */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                        {t('campaignIdEdit.campaign_title')} <Text style={{ color: theme.error }}>*</Text>
                    </Text>
                    <TextInput
                        className="border rounded-lg px-4 py-3 text-base"
                        style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                        value={title}
                        onChangeText={setTitle}
                        placeholder={t('campaignIdEdit.enter_campaign_title')}
                        placeholderTextColor={theme.textTertiary}
                    />
                </View>

                {/* Description */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>{t('campaignIdEdit.description')}</Text>
                    <TextInput
                        className="border rounded-lg px-4 py-3 text-base"
                        style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, height: 100, textAlignVertical: 'top' }}
                        value={description}
                        onChangeText={setDescription}
                        placeholder={t('campaignIdEdit.describe_campaign')}
                        placeholderTextColor={theme.textTertiary}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* Content Requirements */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
                            {t('campaignIdEdit.content_requirements')}
                        </Text>
                        {!canEditCampaignDetails && (
                            <View className="flex-row items-center">
                                <AntDesign name="lock" size={12} color={theme.error} />
                                <Text className="text-xs ml-1" style={{ color: theme.error }}>{t('campaignIdEdit.locked')}</Text>
                            </View>
                        )}
                    </View>
                    <TextInput
                        className="border rounded-lg px-4 py-3 text-base"
                        style={{
                            backgroundColor: canEditCampaignDetails ? theme.surface : theme.surfaceSecondary,
                            borderColor: theme.border,
                            color: canEditCampaignDetails ? theme.text : theme.textTertiary,
                            height: 100,
                            textAlignVertical: 'top'
                        }}
                        value={contentRequirements}
                        onChangeText={setContentRequirements}
                        placeholder={t('campaignIdEdit.content_requirements_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                        multiline
                        numberOfLines={4}
                        editable={canEditCampaignDetails}
                    />
                </View>

                {/* Status */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
                            {t('campaignIdEdit.campaign_status')} <Text style={{ color: theme.error }}>*</Text>
                        </Text>
                        {!canEditCampaignDetails && (
                            <View className="flex-row items-center">
                                <AntDesign name="lock" size={12} color={theme.error} />
                                <Text className="text-xs ml-1" style={{ color: theme.error }}>{t('campaignIdEdit.locked')}</Text>
                            </View>
                        )}
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                        {['draft', 'active', 'paused', 'completed'].map((s) => (
                            <TouchableOpacity
                                key={s}
                                onPress={() => canEditCampaignDetails && setStatus(s as CampaignStatus)}
                                disabled={!canEditCampaignDetails}
                                className="px-4 py-2 rounded-full border"
                                style={{
                                    backgroundColor: status === s ? theme.primary : (canEditCampaignDetails ? theme.surface : theme.surfaceSecondary),
                                    borderColor: status === s ? theme.primary : theme.border,
                                    opacity: canEditCampaignDetails ? 1 : 0.6
                                }}
                            >
                                <Text
                                    className="text-sm font-medium capitalize"
                                    style={{ color: status === s ? theme.surface : theme.text }}
                                >
                                    {t(`campaignIdEdit.${s}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Budget Fields */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
                            {t('campaignIdEdit.total_budget')} <Text style={{ color: theme.error }}>*</Text>
                        </Text>
                        {!canEditFinancials && (
                            <View className="flex-row items-center">
                                <AntDesign name="lock" size={12} color={theme.error} />
                                <Text className="text-xs ml-1" style={{ color: theme.error }}>{t('campaignIdEdit.locked')}</Text>
                            </View>
                        )}
                    </View>
                    <TextInput
                        className="border rounded-lg px-4 py-3 text-base"
                        style={{
                            backgroundColor: canEditFinancials ? theme.surface : theme.surfaceSecondary,
                            borderColor: theme.border,
                            color: canEditFinancials ? theme.text : theme.textTertiary
                        }}
                        value={totalBudget}
                        onChangeText={setTotalBudget}
                        placeholder="0.00"
                        placeholderTextColor={theme.textTertiary}
                        keyboardType="decimal-pad"
                        editable={canEditFinancials}
                    />
                    {campaign.total_paid > 0 && (
                        <Text className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                            ${campaign.total_paid.toFixed(2)} {t('campaignIdEdit.already_paid')}
                        </Text>
                    )}
                </View>

                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
                            {t('campaignIdEdit.rate_per_view')} <Text style={{ color: theme.error }}>*</Text>
                        </Text>
                        {!canEditFinancials && (
                            <View className="flex-row items-center">
                                <AntDesign name="lock" size={12} color={theme.error} />
                                <Text className="text-xs ml-1" style={{ color: theme.error }}>{t('campaignIdEdit.locked')}</Text>
                            </View>
                        )}
                    </View>
                    <TextInput
                        className="border rounded-lg px-4 py-3 text-base"
                        style={{
                            backgroundColor: canEditFinancials ? theme.surface : theme.surfaceSecondary,
                            borderColor: theme.border,
                            color: canEditFinancials ? theme.text : theme.textTertiary
                        }}
                        value={ratePerView}
                        onChangeText={setRatePerView}
                        placeholder="0.50"
                        placeholderTextColor={theme.textTertiary}
                        keyboardType="decimal-pad"
                        editable={canEditFinancials}
                    />
                </View>

                {/* Target Niches */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
                            {t('campaignIdEdit.target_niches')} <Text style={{ color: theme.error }}>*</Text>
                        </Text>
                        {!canEditCampaignDetails && (
                            <View className="flex-row items-center">
                                <AntDesign name="lock" size={12} color={theme.error} />
                                <Text className="text-xs ml-1" style={{ color: theme.error }}>{t('campaignIdEdit.locked')}</Text>
                            </View>
                        )}
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_NICHES.map((niche) => (
                            <TouchableOpacity
                                key={niche}
                                onPress={() => toggleNiche(niche)}
                                disabled={!canEditCampaignDetails}
                                className="px-4 py-2 rounded-full border"
                                style={{
                                    backgroundColor: selectedNiches.includes(niche) ? theme.primary : (canEditCampaignDetails ? theme.surface : theme.surfaceSecondary),
                                    borderColor: selectedNiches.includes(niche) ? theme.primary : theme.border,
                                    opacity: canEditCampaignDetails ? 1 : 0.6
                                }}
                            >
                                <Text
                                    className="text-sm font-medium"
                                    style={{ color: selectedNiches.includes(niche) ? theme.surface : theme.text }}
                                >
                                    {niche}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Target Platforms */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
                            {t('campaignIdEdit.target_platforms')} <Text style={{ color: theme.error }}>*</Text>
                        </Text>
                        {!canEditCampaignDetails && (
                            <View className="flex-row items-center">
                                <AntDesign name="lock" size={12} color={theme.error} />
                                <Text className="text-xs ml-1" style={{ color: theme.error }}>{t('campaignIdEdit.locked')}</Text>
                            </View>
                        )}
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_PLATFORMS.map((platform) => (
                            <TouchableOpacity
                                key={platform}
                                onPress={() => togglePlatform(platform)}
                                disabled={!canEditCampaignDetails}
                                className="px-4 py-2 rounded-full border"
                                style={{
                                    backgroundColor: selectedPlatforms.includes(platform) ? theme.primary : (canEditCampaignDetails ? theme.surface : theme.surfaceSecondary),
                                    borderColor: selectedPlatforms.includes(platform) ? theme.primary : theme.border,
                                    opacity: canEditCampaignDetails ? 1 : 0.6
                                }}
                            >
                                <Text
                                    className="text-sm font-medium capitalize"
                                    style={{ color: selectedPlatforms.includes(platform) ? theme.surface : theme.text }}
                                >
                                    {platform.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Target Locations */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
                            {t('campaignIdEdit.target_locations')}
                        </Text>
                        {!canEditCampaignDetails && (
                            <View className="flex-row items-center">
                                <AntDesign name="lock" size={12} color={theme.error} />
                                <Text className="text-xs ml-1" style={{ color: theme.error }}>{t('campaignIdEdit.locked')}</Text>
                            </View>
                        )}
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_LOCATIONS.map((location) => (
                            <TouchableOpacity
                                key={location}
                                onPress={() => toggleLocation(location)}
                                disabled={!canEditCampaignDetails}
                                className="px-4 py-2 rounded-full border"
                                style={{
                                    backgroundColor: selectedLocations.includes(location) ? theme.success : (canEditCampaignDetails ? theme.surface : theme.surfaceSecondary),
                                    borderColor: selectedLocations.includes(location) ? theme.success : theme.border,
                                    opacity: canEditCampaignDetails ? 1 : 0.6
                                }}
                            >
                                <Text
                                    className="text-sm font-medium"
                                    style={{ color: selectedLocations.includes(location) ? theme.surface : theme.text }}
                                >
                                    {location}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Target Audience Age */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                        {t('campaignIdEdit.target_audience_age')}
                    </Text>
                    <TextInput
                        className="border rounded-lg px-4 py-3 text-base"
                        style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                        value={targetAudienceAge}
                        onChangeText={setTargetAudienceAge}
                        placeholder={t('campaignIdEdit.age_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                    />
                </View>

                {/* Dates */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>{t('campaignIdEdit.start_date')}</Text>
                        {!canEditCampaignDetails && (
                            <View className="flex-row items-center">
                                <AntDesign name="lock" size={12} color={theme.error} />
                                <Text className="text-xs ml-1" style={{ color: theme.error }}>{t('campaignIdEdit.locked')}</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={() => canEditCampaignDetails && setShowStartPicker(true)}
                        disabled={!canEditCampaignDetails}
                        className="border rounded-lg px-4 py-3"
                        style={{
                            backgroundColor: canEditCampaignDetails ? theme.surface : theme.surfaceSecondary,
                            borderColor: theme.border,
                            opacity: canEditCampaignDetails ? 1 : 0.6
                        }}
                    >
                        <Text className="text-base" style={{ color: startDate ? theme.text : theme.textTertiary }}>
                            {startDate ? startDate.toLocaleDateString() : t('campaignIdEdit.select_start_date')}
                        </Text>
                    </TouchableOpacity>
                    {showStartPicker && canEditCampaignDetails && (
                        <DateTimePicker
                            value={startDate || new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowStartPicker(false);
                                if (selectedDate) setStartDate(selectedDate);
                            }} />
                    )}
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                    onPress={handleDelete}
                    disabled={hasActiveSubmissions}
                    className="py-3 rounded-lg border-2 mb-4"
                    style={{
                        borderColor: hasActiveSubmissions ? theme.border : theme.error,
                        backgroundColor: hasActiveSubmissions ? theme.surfaceSecondary : theme.surface
                    }}
                >
                    <Text
                        className="text-center font-semibold"
                        style={{ color: hasActiveSubmissions ? theme.textTertiary : theme.error }}
                    >
                        {hasActiveSubmissions ? t('campaignIdEdit.cannot_delete_active') : t('campaignIdEdit.delete_campaign')}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Fixed Bottom Save Button */}
            <View className="absolute bottom-0 left-0 right-0 p-4 border-t" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    className="py-4 rounded-xl items-center justify-center"
                    style={{ backgroundColor: saving ? theme.textTertiary : theme.primary }}
                >
                    {saving ? (
                        <ActivityIndicator color={theme.surface} />
                    ) : (
                        <Text className="text-lg font-bold" style={{ color: theme.surface }}>{t('campaignIdEdit.save_changes')}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default EditCampaignPage;