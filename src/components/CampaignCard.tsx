import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/db_interface';

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
    // FIX: Default 'paid' to 0 if it's null or undefined to prevent NaN result.
    const percentage = total > 0 ? ((paid || 0) / total) * 100 : 0;

    // Determine color based on percentage
    let barColor = 'bg-green-500'; // Default to green
    if (percentage > 50) barColor = 'bg-yellow-500';
    if (percentage > 85) barColor = 'bg-red-500';

    return (
        <View className="mb-4">
            <View className="flex-row justify-between items-center mb-1">
                <Text className="text-xs font-medium text-gray-500">Budget Used  ${paid}</Text>
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


const CampaignCard = ({ campaign }: { campaign: Campaign }) => {
    const [brand, setBrand] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

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
            <TouchableOpacity className="m-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Card Header */}
                <View className="p-4 flex-row items-center gap-4 bg-gray-50 border-b border-gray-200">
                    {loading ? (
                        <ActivityIndicator />
                    ) : (
                        <Image source={{ uri: avatarUrl }} className="w-12 h-12 rounded-full" />
                    )}
                    <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-800" numberOfLines={1}>
                            {campaign.title}
                        </Text>
                        <Link href={`/brand/${brand?.id}`} asChild>
                            <Text className="text-sm text-gray-500" numberOfLines={1}>
                                {brand?.company_name || brand?.username || '...'}
                            </Text>
                        </Link>
                    </View>
                </View>

                {/* Card Body */}
                <View className="p-4">
                    <Text className="text-base text-gray-600 mb-4" numberOfLines={2}>
                        {campaign.description || 'No description provided.'}
                    </Text>
                    {campaign.target_niches && campaign.target_niches.length > 0 && (
                        <View className="flex-row flex-wrap gap-2 mb-4">
                            {campaign.target_niches.slice(0, 3).map((niche) => (
                                <View key={niche} className="bg-blue-100 px-3 py-1 rounded-full">
                                    <Text className="text-blue-800 text-xs font-medium">{niche}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    {/* New Progress Bar */}
                    <BudgetProgressBar total={campaign.total_budget} paid={campaign.total_paid} />
                </View>

                {/* Card Footer */}
                <View className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex-row justify-between items-center">
                    <View className="flex-row gap-6">
                        {/* Total Budget */}
                        <View>
                            <Text className="text-sm font-semibold text-gray-800">
                                {formatCurrency(campaign.total_budget, { notation: 'compact' })}
                            </Text>
                            <Text className="text-xs text-gray-500">Budget</Text>
                        </View>
                        {/* Rate Per View */}
                        <View>
                            <Text className="text-sm font-semibold text-gray-800">
                                {formatCurrency(campaign.rate_per_view, { maximumFractionDigits: 4 })}
                            </Text>
                            <Text className="text-xs text-gray-500">Rate/View</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Text className="text-sm text-gray-600">View Details</Text>
                        <AntDesign name="arrow-right" size={16} color="#4B5563" />
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
};

export default CampaignCard;

