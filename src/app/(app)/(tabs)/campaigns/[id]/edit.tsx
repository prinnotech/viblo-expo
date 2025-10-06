// app/campaigns/edit/[id].tsx
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
                Alert.alert('Error', 'Failed to load campaign');
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

    const handleSave = async () => {
        if (!campaign || !profile) return;

        // Validation
        if (!title.trim()) {
            Alert.alert('Validation Error', 'Please enter a campaign title');
            return;
        }

        if (!totalBudget || parseFloat(totalBudget) <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid total budget');
            return;
        }

        if (!ratePerView || parseFloat(ratePerView) <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid rate per view');
            return;
        }

        if (selectedNiches.length === 0) {
            Alert.alert('Validation Error', 'Please select at least one niche');
            return;
        }

        if (selectedPlatforms.length === 0) {
            Alert.alert('Validation Error', 'Please select at least one platform');
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
                'Payment Required',
                'To activate this campaign, you need to complete payment first.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Pay Now',
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
            Alert.alert('Error', 'Failed to update campaign');
        } else {
            Alert.alert('Success', 'Campaign updated successfully', [
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
                'Cannot Delete',
                'This campaign has active submissions and cannot be deleted. Please wait until all submissions are completed or cancelled.'
            );
            return;
        }

        Alert.alert(
            'Delete Campaign',
            'Are you sure you want to delete this campaign? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase
                            .from('campaigns')
                            .delete()
                            .eq('id', campaign.id);

                        if (error) {
                            Alert.alert('Error', 'Failed to delete campaign');
                        } else {
                            Alert.alert('Success', 'Campaign deleted successfully', [
                                { text: 'OK', onPress: () => router.replace('/(tabs)/campaigns') }
                            ]);
                        }
                    }
                }
            ]
        );
    };

    const toggleNiche = (niche: string) => {
        setSelectedNiches(prev =>
            prev.includes(niche)
                ? prev.filter(n => n !== niche)
                : [...prev, niche]
        );
    };

    const togglePlatform = (platform: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(platform)
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        );
    };

    const toggleLocation = (location: string) => {
        setSelectedLocations(prev =>
            prev.includes(location)
                ? prev.filter(l => l !== location)
                : [...prev, location]
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (!campaign) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center p-4">
                <Text className="text-red-500 text-center">Campaign not found</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-2xl font-bold text-gray-800">Edit Campaign</Text>
                    {submissionStats && submissionStats.total > 0 && (
                        <View className="mt-2 bg-blue-50 p-3 rounded-lg">
                            <Text className="text-sm text-blue-800 font-medium">
                                📊 {submissionStats.total} total submission(s)
                            </Text>
                            {hasActiveSubmissions && (
                                <Text className="text-xs text-blue-600 mt-1">
                                    ⚠️ Some fields are locked due to active submissions
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Title */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Campaign Title <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Enter campaign title"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                {/* Description */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Description</Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Describe your campaign"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Content Requirements */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Content Requirements
                    </Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={contentRequirements}
                        onChangeText={setContentRequirements}
                        placeholder="What should influencers include in their content?"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Status */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Campaign Status <Text className="text-red-500">*</Text>
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {['draft', 'active', 'paused', 'completed'].map((s) => (
                            <TouchableOpacity
                                key={s}
                                onPress={() => setStatus(s as CampaignStatus)}
                                className={`px-4 py-2 rounded-full border ${status === s
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'bg-white border-gray-300'
                                    }`}
                            >
                                <Text
                                    className={`text-sm font-medium capitalize ${status === s ? 'text-white' : 'text-gray-700'
                                        }`}
                                >
                                    {s}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Budget Fields */}
                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-semibold text-gray-700">
                            Total Budget <Text className="text-red-500">*</Text>
                        </Text>
                        {!canEditFinancials && (
                            <View className="flex-row items-center">
                                <AntDesign name="lock" size={12} color="#EF4444" />
                                <Text className="text-xs text-red-500 ml-1">Locked</Text>
                            </View>
                        )}
                    </View>
                    <TextInput
                        className={`bg-white border rounded-lg px-4 py-3 text-base ${canEditFinancials
                            ? 'border-gray-300 text-gray-800'
                            : 'border-gray-200 text-gray-400 bg-gray-100'
                            }`}
                        value={totalBudget}
                        onChangeText={setTotalBudget}
                        placeholder="0.00"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="decimal-pad"
                        editable={canEditFinancials}
                    />
                    {campaign.total_paid > 0 && (
                        <Text className="text-xs text-gray-500 mt-1">
                            ${campaign.total_paid.toFixed(2)} already paid to influencers
                        </Text>
                    )}
                </View>

                <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-sm font-semibold text-gray-700">
                            Rate Per View <Text className="text-red-500">*</Text>
                        </Text>
                        {!canEditFinancials && (
                            <View className="flex-row items-center">
                                <AntDesign name="lock" size={12} color="#EF4444" />
                                <Text className="text-xs text-red-500 ml-1">Locked</Text>
                            </View>
                        )}
                    </View>
                    <TextInput
                        className={`bg-white border rounded-lg px-4 py-3 text-base ${canEditFinancials
                            ? 'border-gray-300 text-gray-800'
                            : 'border-gray-200 text-gray-400 bg-gray-100'
                            }`}
                        value={ratePerView}
                        onChangeText={setRatePerView}
                        placeholder="0.0000"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="decimal-pad"
                        editable={canEditFinancials}
                    />
                </View>

                {/* Target Niches */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Target Niches <Text className="text-red-500">*</Text>
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_NICHES.map((niche) => (
                            <TouchableOpacity
                                key={niche}
                                onPress={() => toggleNiche(niche)}
                                className={`px-4 py-2 rounded-full border ${selectedNiches.includes(niche)
                                    ? 'bg-purple-500 border-purple-500'
                                    : 'bg-white border-gray-300'
                                    }`}
                            >
                                <Text
                                    className={`text-sm font-medium ${selectedNiches.includes(niche) ? 'text-white' : 'text-gray-700'
                                        }`}
                                >
                                    {niche}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Target Platforms */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Target Platforms <Text className="text-red-500">*</Text>
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_PLATFORMS.map((platform) => (
                            <TouchableOpacity
                                key={platform}
                                onPress={() => togglePlatform(platform)}
                                className={`px-4 py-2 rounded-full border ${selectedPlatforms.includes(platform)
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'bg-white border-gray-300'
                                    }`}
                            >
                                <Text
                                    className={`text-sm font-medium capitalize ${selectedPlatforms.includes(platform) ? 'text-white' : 'text-gray-700'
                                        }`}
                                >
                                    {platform.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Target Locations */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Target Locations (Optional)
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_LOCATIONS.map((location) => (
                            <TouchableOpacity
                                key={location}
                                onPress={() => toggleLocation(location)}
                                className={`px-4 py-2 rounded-full border ${selectedLocations.includes(location)
                                    ? 'bg-green-500 border-green-500'
                                    : 'bg-white border-gray-300'
                                    }`}
                            >
                                <Text
                                    className={`text-sm font-medium ${selectedLocations.includes(location) ? 'text-white' : 'text-gray-700'
                                        }`}
                                >
                                    {location}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Target Audience Age */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Target Audience Age (Optional)
                    </Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={targetAudienceAge}
                        onChangeText={setTargetAudienceAge}
                        placeholder="e.g., 18-35"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                {/* Dates */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Start Date</Text>
                    <TouchableOpacity
                        onPress={() => setShowStartPicker(true)}
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                    >
                        <Text className="text-base text-gray-800">
                            {startDate ? startDate.toLocaleDateString() : 'Select start date'}
                        </Text>
                    </TouchableOpacity>
                    {showStartPicker && (
                        <DateTimePicker
                            value={startDate || new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowStartPicker(false);
                                if (selectedDate) setStartDate(selectedDate);
                            }}
                        />
                    )}
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                    onPress={handleDelete}
                    disabled={hasActiveSubmissions}
                    className={`py-3 rounded-lg border-2 mb-4 ${hasActiveSubmissions
                        ? 'border-gray-300 bg-gray-100'
                        : 'border-red-500 bg-white'
                        }`}
                >
                    <Text
                        className={`text-center font-semibold ${hasActiveSubmissions ? 'text-gray-400' : 'text-red-500'
                            }`}
                    >
                        {hasActiveSubmissions ? 'Cannot Delete (Active Submissions)' : 'Delete Campaign'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Fixed Bottom Save Button */}
            <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    className="bg-blue-600 py-4 rounded-xl items-center justify-center"
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-lg font-bold">Save Changes</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default EditCampaignPage;