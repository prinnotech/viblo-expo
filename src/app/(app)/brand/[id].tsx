import { Text, View, ScrollView, ActivityIndicator, Image, TouchableOpacity, Linking } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import CampaignCard, { Campaign } from '@/components/CampaignCard';
import { useTheme } from '@/contexts/ThemeContext';


interface BrandData {
    id: string;
    username: string;
    company_name: string | null;
    industry: string | null;
    bio: string | null;
    website_url: string | null;
    avatar_url: string | null;
    is_verified: boolean;
}

interface BrandStats {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSpent: number;
    creatorsWorkedWith: number;
}

const BrandPublicPage = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { theme } = useTheme();

    const [brand, setBrand] = useState<BrandData | null>(null);
    const [stats, setStats] = useState<BrandStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);

    const brandId = Array.isArray(id) ? id[0] : id;


    useEffect(() => {
        if (brandId) {
            fetchBrandData();
        }
    }, [brandId]);

    const fetchBrandData = async () => {
        if (!brandId) return;

        try {
            // Fetch brand profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, company_name, industry, bio, website_url, avatar_url, is_verified')
                .eq('id', brandId)
                .eq('user_type', 'brand')
                .single();

            if (profileError) throw profileError;
            setBrand(profileData);

            // Fetch ALL campaigns for stats (not just active)
            const { data: allCampaignsData, error: allCampaignsError } = await supabase
                .from('campaigns')
                .select('id, status, total_paid')
                .eq('brand_id', brandId);

            if (allCampaignsError) throw allCampaignsError;

            // Fetch only ACTIVE campaigns for display
            const { data: activeCampaignsData, error: activeCampaignsError } = await supabase
                .from('campaigns')
                .select('id, brand_id, title, description, total_budget, total_paid, rate_per_view, target_niches, status')
                .eq('brand_id', brandId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (activeCampaignsError) throw activeCampaignsError;
            setCampaigns(activeCampaignsData || []);

            // Calculate stats using allCampaignsData (not campaigns state)
            const totalCampaigns = allCampaignsData?.length || 0;
            const activeCampaigns = allCampaignsData?.filter(c => c.status === 'active').length || 0;
            const totalSpent = allCampaignsData?.reduce((sum, c) => sum + parseFloat(c.total_paid as any), 0) || 0;

            // Get unique creators worked with
            const { data: submissions } = await supabase
                .from('content_submissions')
                .select('influencer_id, campaign_id')
                .in('campaign_id', allCampaignsData?.map(c => c.id) || [])
                .in('status', ['approved', 'posted_live', 'completed']);

            const uniqueCreators = new Set(submissions?.map(s => s.influencer_id) || []);

            setStats({
                totalCampaigns,
                activeCampaigns,
                totalSpent,
                creatorsWorkedWith: uniqueCreators.size,
            });

        } catch (err: any) {
            console.error('Error fetching brand data:', err);
            setError(err.message || 'Failed to load brand profile');
        } finally {
            setLoading(false);
        }
    };


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
        }).format(amount);
    };

    const openURL = async (url: string) => {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text className="mt-4 text-base" style={{ color: theme.textSecondary }}>Loading brand profile...</Text>
            </View>
        );
    }

    if (error || !brand) {
        return (
            <View className="flex-1 justify-center items-center px-5" style={{ backgroundColor: theme.background }}>
                <Ionicons name="alert-circle-outline" size={64} color={theme.error} />
                <Text className="mt-4 text-base text-center" style={{ color: theme.error }}>
                    {error || 'Brand profile not found'}
                </Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-6 px-6 py-3 rounded-xl"
                    style={{ backgroundColor: theme.primary }}
                >
                    <Text className="font-semibold" style={{ color: theme.surface }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1" style={{ backgroundColor: theme.background }}>
            {/* Header with Back Button */}
            <View className="px-5 pt-12 pb-4 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <TouchableOpacity onPress={() => router.back()} className="mb-4">
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            {/* Brand Header */}
            <View className="bg-white px-5 pb-6" style={{ backgroundColor: theme.surface }}>
                <View className="items-center -mt-16">
                    {brand.avatar_url ? (
                        <Image
                            source={{ uri: brand.avatar_url }}
                            className="w-32 h-32 rounded-full border-4 shadow-lg"
                            style={{ borderColor: theme.surface }}
                        />
                    ) : (
                        <View className="w-32 h-32 rounded-full border-4 shadow-lg items-center justify-center" style={{ borderColor: theme.surface, backgroundColor: theme.surfaceSecondary }}>
                            <Ionicons name="business" size={48} color={theme.primary} />
                        </View>
                    )}

                    <View className="flex-row items-center mt-4">
                        <Text className="text-2xl font-bold" style={{ color: theme.text }}>
                            {brand.company_name || brand.username}
                        </Text>
                        {brand.is_verified && (
                            <Ionicons name="checkmark-circle" size={24} color={theme.primary} className="ml-2" />
                        )}
                    </View>

                    <Text className="text-base mt-1" style={{ color: theme.textSecondary }}>@{brand.username}</Text>

                    {brand.industry && (
                        <View className="px-4 py-1 rounded-full mt-2" style={{ backgroundColor: theme.primaryLight }}>
                            <Text className="text-sm font-medium" style={{ color: theme.primaryDark }}>{brand.industry}</Text>
                        </View>
                    )}

                    {brand.bio && (
                        <Text className="text-sm text-center mt-4 px-6" style={{ color: theme.textSecondary }}>
                            {brand.bio}
                        </Text>
                    )}

                    {brand.website_url && (
                        <TouchableOpacity
                            onPress={() => openURL(brand.website_url!)}
                            className="flex-row items-center mt-3"
                        >
                            <Ionicons name="globe" size={16} color={theme.primary} />
                            <Text className="text-sm ml-1 underline" style={{ color: theme.primary }}>
                                {brand.website_url}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View className="p-5">
                {/* Stats Overview */}
                <View className="rounded-2xl p-5 mb-4 shadow-sm" style={{ backgroundColor: theme.surface }}>
                    <Text className="text-lg font-bold mb-4" style={{ color: theme.text }}>Brand Stats</Text>
                    <View className="flex-row flex-wrap justify-between">
                        <View className="w-[48%] mb-4">
                            <View className="flex-row items-center mb-2">
                                <LinearGradient
                                    colors={['#3b82f6', '#2563eb']}
                                    className="w-10 h-10 rounded-lg justify-center items-center mr-3"
                                >
                                    <Ionicons name="megaphone" size={20} color="#fff" />
                                </LinearGradient>
                                <View>
                                    <Text className="text-2xl font-bold" style={{ color: theme.text }}>
                                        {stats?.totalCampaigns || 0}
                                    </Text>
                                    <Text className="text-xs" style={{ color: theme.textSecondary }}>Total Campaigns</Text>
                                </View>
                            </View>
                        </View>

                        <View className="w-[48%] mb-4">
                            <View className="flex-row items-center mb-2">
                                <LinearGradient
                                    colors={['#10b981', '#059669']}
                                    className="w-10 h-10 rounded-lg justify-center items-center mr-3"
                                >
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                </LinearGradient>
                                <View>
                                    <Text className="text-2xl font-bold" style={{ color: theme.text }}>
                                        {stats?.activeCampaigns || 0}
                                    </Text>
                                    <Text className="text-xs" style={{ color: theme.textSecondary }}>Active Now</Text>
                                </View>
                            </View>
                        </View>

                        <View className="w-[48%]">
                            <View className="flex-row items-center mb-2">
                                <LinearGradient
                                    colors={['#f59e0b', '#f97316']}
                                    className="w-10 h-10 rounded-lg justify-center items-center mr-3"
                                >
                                    <Ionicons name="people" size={20} color="#fff" />
                                </LinearGradient>
                                <View>
                                    <Text className="text-2xl font-bold" style={{ color: theme.text }}>
                                        {stats?.creatorsWorkedWith || 0}
                                    </Text>
                                    <Text className="text-xs" style={{ color: theme.textSecondary }}>Creators</Text>
                                </View>
                            </View>
                        </View>

                        <View className="w-[48%]">
                            <View className="flex-row items-center mb-2">
                                <LinearGradient
                                    colors={['#8b5cf6', '#7c3aed']}
                                    className="w-10 h-10 rounded-lg justify-center items-center mr-3"
                                >
                                    <Ionicons name="cash" size={20} color="#fff" />
                                </LinearGradient>
                                <View>
                                    <Text className="text-2xl font-bold" style={{ color: theme.text }}>
                                        {formatCurrency(stats?.totalSpent || 0)}
                                    </Text>
                                    <Text className="text-xs" style={{ color: theme.textSecondary }}>Total Spent</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="mb-4">
                    <Text className="text-lg font-bold mb-3" style={{ color: theme.text }}>
                        Active Campaigns
                    </Text>
                    {campaigns.length === 0 ? (
                        <View className="rounded-2xl p-4 items-center shadow-sm" style={{ backgroundColor: theme.surface }}>
                            <Ionicons name="megaphone-outline" size={48} color={theme.textTertiary} />
                            <Text className="mt-4 text-base font-semibold" style={{ color: theme.textSecondary }}>
                                No active campaigns
                            </Text>
                            <Text className="text-sm mt-1" style={{ color: theme.textTertiary }}>
                                This brand doesn't have any active campaigns at the moment
                            </Text>
                        </View>
                    ) : (
                        campaigns.map((campaign) => (
                            <CampaignCard key={campaign.id} campaign={campaign} />
                        ))
                    )}
                </View>

            </View>

            {/* Bottom Padding */}
            <View className="h-8" />
        </ScrollView>
    );
};

export default BrandPublicPage;
