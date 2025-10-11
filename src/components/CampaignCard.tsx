import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/db_interface';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

// Updated Campaign type to include total_paid
export type Campaign = {
    id: string;
    brand_id: string;
    title: string;
    description: string | null;
    total_budget: number;
    total_paid: number; // Added this new field
    rate_per_view: number;
    target_niches: string[] | null;
    status: string;
};

// --- New Progress Bar Component ---
const BudgetProgressBar = ({ total, paid }: { total: number; paid: number }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    // FIX: Default 'paid' to 0 if it's null or undefined to prevent NaN result.
    const percentage = total > 0 ? ((paid || 0) / total) * 100 : 0;

    // Determine color based on percentage
    const getBarColor = () => {
        if (percentage > 85) return theme.error;
        if (percentage > 50) return theme.warning;
        return theme.success;
    };

    return (
        <View className="mb-4">
            <View className="flex-row justify-between items-center mb-1">
                <Text className="text-xs font-medium" style={{ color: theme.textTertiary }}>{t('campaignCard.budget_used')}  ${paid}</Text>
                <Text className="text-xs font-bold" style={{ color: theme.textSecondary }}>{Math.round(percentage)}%</Text>
            </View>
            <View className="w-full rounded-full h-2.5" style={{ backgroundColor: theme.border }}>
                <View
                    className="h-2.5 rounded-full"
                    style={{ width: `${percentage}%`, backgroundColor: getBarColor() }}
                />
            </View>
        </View>
    );
};


const CampaignCard = ({ campaign }: { campaign: Campaign }) => {
    const [brand, setBrand] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();
    const { t } = useLanguage();

    useEffect(() => {
        const fetchBrandProfile = async () => {
            if (!campaign.brand_id) {
                setLoading(false);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', campaign.brand_id)
                .single();

            if (error) {
                console.error('Error fetching brand profile for card:', error.message);
            } else {
                setBrand(data);
            }
            setLoading(false);
        };

        fetchBrandProfile();
    }, [campaign.brand_id]);

    const formatCurrency = (amount: number, options?: Intl.NumberFormatOptions) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', ...options }).format(amount);
    };

    const avatarUrl = brand?.avatar_url || 'https://placehold.co/64x64/EBF4FF/1E293B?text=B';

    return (
        <Link href={`/(tabs)/campaigns/${campaign.id}`} asChild>
            <TouchableOpacity className="m-4 rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                {/* Card Header */}
                <View className="p-4 flex-row items-center gap-4" style={{ backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
                    {loading ? (
                        <ActivityIndicator />
                    ) : (
                        <Image source={{ uri: avatarUrl }} className="w-12 h-12 rounded-full" />
                    )}
                    <View className="flex-1">
                        <Text className="text-lg font-bold" style={{ color: theme.text }} numberOfLines={1}>
                            {campaign.title}
                        </Text>
                        <Link href={`/brand/${brand?.id}`} asChild>
                            <Text className="text-sm" style={{ color: theme.textTertiary }} numberOfLines={1}>
                                {brand?.company_name || brand?.username || '...'}
                            </Text>
                        </Link>
                    </View>
                </View>

                {/* Card Body */}
                <View className="p-4">
                    <Text className="text-base mb-4" style={{ color: theme.textSecondary }} numberOfLines={2}>
                        {campaign.description || t('campaignCard.no_description')}
                    </Text>
                    {campaign.target_niches && campaign.target_niches.length > 0 && (
                        <View className="flex-row flex-wrap gap-2 mb-4">
                            {campaign.target_niches.slice(0, 3).map((niche) => (
                                <View key={niche} className="px-3 py-1 rounded-full" style={{ backgroundColor: theme.primaryLight }}>
                                    <Text className="text-xs font-medium" style={{ color: theme.primary }}>{niche}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    {/* New Progress Bar */}
                    <BudgetProgressBar total={campaign.total_budget} paid={campaign.total_paid} />
                </View>

                {/* Card Footer */}
                <View className="px-4 py-3 flex-row justify-between items-center" style={{ backgroundColor: theme.background, borderTopColor: theme.border, borderTopWidth: 1 }}>
                    <View className="flex-row gap-6">
                        {/* Total Budget */}
                        <View>
                            <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                                {formatCurrency(campaign.total_budget, { notation: 'compact' })}
                            </Text>
                            <Text className="text-xs" style={{ color: theme.textTertiary }}>{t('campaignCard.budget')}</Text>
                        </View>
                        {/* Rate Per View */}
                        <View>
                            <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                                {formatCurrency(campaign.rate_per_view, { maximumFractionDigits: 4 })}
                            </Text>
                            <Text className="text-xs" style={{ color: theme.textTertiary }}>{t('campaignCard.rate_view')}</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Text className="text-sm" style={{ color: theme.textSecondary }}>{t('campaignCard.view_details')}</Text>
                        <AntDesign name="arrow-right" size={16} color={theme.textSecondary} />
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
};

export default CampaignCard;