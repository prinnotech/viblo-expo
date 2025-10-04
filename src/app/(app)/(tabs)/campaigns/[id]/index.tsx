import {
    Text,
    View,
    ActivityIndicator,
    ScrollView,
    Image,
    Pressable,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { SocialIcon } from '@/components/getSocialIcons';
import { useAuth } from '@/contexts/AuthContext';

// --- Helper Components ---
const BrandHeader = ({ profile }) => (
    <View className="flex-row items-center mb-4">
        <Image
            source={{ uri: profile.avatar_url || 'https://placehold.co/100x100/E2E8F0/4A5568?text=Brand' }}
            className="w-14 h-14 rounded-full mr-4 bg-gray-200"
        />
        <View>
            <View className="flex-row items-center">
                <Text className="text-xl font-bold text-gray-800">{profile.company_name || 'Brand Name'}</Text>
                {profile.is_verified && (
                    <Feather name="check-circle" size={18} color="#3B82F6" className="ml-2" />
                )}
            </View>
            <Text className="text-sm text-gray-500">{profile.industry || 'Industry'}</Text>
        </View>
    </View>
);
const CampaignStat = ({ icon, label, value }) => (
    <View className="flex-1 items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
        <Feather name={icon} size={24} color="#3B82F6" />
        <Text className="text-xs text-gray-500 mt-1">{label}</Text>
        <Text className="text-base font-bold text-gray-800">{value}</Text>
    </View>
);
const Tag = ({ text }) => (
    <View className="bg-gray-200 rounded-full px-3 py-1 mr-2 mb-2">
        <Text className="text-xs font-medium text-gray-700">{text}</Text>
    </View>
);
const TagPlatforms = ({ platform }) => (
    <View className=" rounded-full px-3 py-1 mr-2 mb-2">
        <SocialIcon platform={platform} />
    </View>
);
const InfoSection = ({ title, children }) => (
    <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-800 mb-2">{title}</Text>
        {children}
    </View>
);
const BudgetProgressBar = ({ total, paid }: { total: number; paid: number }) => {
    const paidAmount = paid || 0;
    const totalAmount = total || 0;
    const percentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    let barColor = 'bg-green-500';
    if (percentage > 50) barColor = 'bg-yellow-500';
    if (percentage > 85) barColor = 'bg-red-500';
    return (
        <View className="mb-6">
            <View className="flex-row justify-between items-center mb-1">
                <Text className="text-xs font-medium text-gray-500">Budget Used: ${paidAmount.toFixed(2)}</Text>
                <Text className="text-xs font-bold text-gray-600">{Math.round(percentage)}%</Text>
            </View>
            <View className="w-full bg-gray-200 rounded-full h-2.5">
                <View
                    className={`${barColor} h-2.5 rounded-full`}
                    style={{ width: `${percentage}%` }}
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

    const { profile, isLoading: isAuthLoading } = useAuth();
    const isBrand = profile?.user_type === 'brand';
    const isInfluencer = profile?.user_type === 'influencer';

    const campaignId = Array.isArray(id) ? id[0] : id;

    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- New State for Submission Status ---
    const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
    const [isStatusLoading, setIsStatusLoading] = useState(true);

    // Fetch Campaign Details
    useEffect(() => {
        if (!campaignId) {
            setLoading(false);
            setError("Campaign ID is missing.");
            return;
        }
        const fetchCampaignDetails = async () => {
            setLoading(true);
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
            }
            setLoading(false);
        };
        fetchCampaignDetails();
    }, [campaignId, navigation]);

    // --- New Effect to check submission status ---
    useEffect(() => {
        const checkSubmissionStatus = async () => {
            // Only run if the user is a logged-in influencer
            if (isInfluencer && profile?.id && campaignId) {
                setIsStatusLoading(true);
                const { data, error } = await supabase.rpc('get_submission_status', {
                    p_influencer_id: profile.id,
                    p_campaign_id: campaignId,
                });

                if (error) {
                    console.error("Error checking submission status:", error);
                } else {
                    setSubmissionStatus(data); // data is the status string or null
                }
                setIsStatusLoading(false);
            } else {
                setIsStatusLoading(false); // Not an influencer, no status to check
            }
        };
        checkSubmissionStatus();
    }, [profile, campaignId, isInfluencer]);

    // Combined loading state
    if (loading || isAuthLoading || isStatusLoading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (error || !campaign) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center p-4">
                <Text className="text-red-500 text-center">
                    {error || "Campaign not found."}
                </Text>
            </View>
        );
    }

    // Helper function to render the button text
    const getButtonText = () => {
        switch (submissionStatus) {
            case 'pending_review':
                return 'Application Submitted';
            case 'completed':
                return 'Campaign Completed';
            case 'approved':
            case 'posted_live':
                return 'View Submission';
            case 'needs_revision':
                return 'Revise Submission';
            default:
                return 'Apply Now';
        }
    };

    const isButtonDisabled = submissionStatus === 'pending_review' || submissionStatus === 'completed';

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                {campaign.profile && <BrandHeader profile={campaign.profile} />}
                <Text className="text-3xl font-extrabold text-gray-900 mb-4">{campaign.title}</Text>
                <BudgetProgressBar
                    total={parseFloat(campaign.total_budget)}
                    paid={parseFloat(campaign.total_paid)}
                />
                <View className="flex-row space-x-3 mb-6">
                    <CampaignStat icon="dollar-sign" label="Total Budget" value={`$${campaign.total_budget}`} />
                    <CampaignStat icon="eye" label="Rate Per View" value={`$${campaign.rate_per_view}`} />
                </View>
                <InfoSection title="Description">
                    <Text className="text-base text-gray-600 leading-relaxed">{campaign.description}</Text>
                </InfoSection>
                {campaign.content_requirements && (
                    <InfoSection title="Content Requirements">
                        <Text className="text-base text-gray-600 leading-relaxed">{campaign.content_requirements}</Text>
                    </InfoSection>
                )}
                <InfoSection title="Platforms">
                    <View className="flex-row flex-wrap">
                        {campaign.target_platforms?.map(p => <TagPlatforms key={p} platform={p} />) || <Tag text="Not specified" />}
                    </View>
                </InfoSection>
                <InfoSection title="Target Niches">
                    <View className="flex-row flex-wrap">
                        {campaign.target_niches?.map(n => <Tag key={n} text={n} />) || <Tag text="Not specified" />}
                    </View>
                </InfoSection>
                <InfoSection title="Target Location">
                    <View className="flex-row flex-wrap">
                        {campaign.target_audience_locations?.map(l => <Tag key={l} text={l} />) || <Tag text="Not specified" />}
                    </View>
                </InfoSection>
            </ScrollView>

            {/* --- Updated Floating Button Logic --- */}
            <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
                {isBrand ? (
                    <Pressable
                        className="bg-blue-600 py-4 rounded-xl items-center justify-center shadow-lg"
                        onPress={() => router.push(`/campaigns/${campaignId}/edit`)}
                    >
                        <Text className="text-white text-lg font-bold">Edit</Text>
                    </Pressable>
                ) : isInfluencer ? (
                    <Pressable
                        disabled={isButtonDisabled}
                        className={`py-4 rounded-xl items-center justify-center shadow-lg ${isButtonDisabled ? 'bg-gray-400' : 'bg-blue-600'}`}
                        onPress={() => {
                            router.push(`/campaigns/${campaignId}/apply`);
                        }}
                    >
                        <Text className="text-white text-lg font-bold">{getButtonText()}</Text>
                    </Pressable>
                ) : null}
            </View>
        </SafeAreaView>
    );
};

export default CampaignDetailsPage;

