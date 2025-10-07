// components/CampaignAnalyticsCard.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';

interface CampaignAnalyticsCardProps {
    campaignId: string;
    title: string;
    status: string;
    totalBudget: number;
    totalSpent: number;
    activeCreators: number;
    totalViews: number;
    totalSubmissions: number;
}

const CampaignAnalyticsCard = ({
    campaignId,
    title,
    status,
    totalBudget,
    totalSpent,
    activeCreators,
    totalViews,
    totalSubmissions,
}: CampaignAnalyticsCardProps) => {
    const router = useRouter();

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'paused': return 'bg-yellow-100 text-yellow-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            case 'draft': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const budgetPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return (
        <TouchableOpacity
            onPress={() => router.push(`/(tabs)/analytics/${campaignId}`)}
            className="m-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
            {/* Header */}
            <View className="p-4 border-b border-gray-200">
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-3">
                        <Text className="text-lg font-bold text-gray-800" numberOfLines={2}>
                            {title}
                        </Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${getStatusColor(status)}`}>
                        <Text className="text-xs font-semibold uppercase">
                            {status}
                        </Text>
                    </View>
                </View>

                {/* Budget Progress */}
                <View className="mt-3">
                    <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-xs text-gray-500">
                            {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)}
                        </Text>
                        <Text className="text-xs font-bold text-gray-600">
                            {Math.round(budgetPercentage)}%
                        </Text>
                    </View>
                    <View className="w-full bg-gray-200 rounded-full h-2">
                        <View
                            className={`h-2 rounded-full ${budgetPercentage > 85 ? 'bg-red-500' :
                                budgetPercentage > 50 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                }`}
                            style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                        />
                    </View>
                </View>
            </View>

            {/* Stats Grid */}
            <View className="p-4">
                <View className="flex-row justify-between">
                    <View className="flex-1 items-center">
                        <AntDesign name="eye" size={20} color="#6B7280" />
                        <Text className="text-lg font-bold text-gray-800 mt-1">
                            {formatNumber(totalViews)}
                        </Text>
                        <Text className="text-xs text-gray-500">Views</Text>
                    </View>

                    <View className="flex-1 items-center border-l border-r border-gray-200">
                        <AntDesign name="team" size={20} color="#6B7280" />
                        <Text className="text-lg font-bold text-gray-800 mt-1">
                            {activeCreators}
                        </Text>
                        <Text className="text-xs text-gray-500">Creators</Text>
                    </View>

                    <View className="flex-1 items-center">
                        <AntDesign name="file-text" size={20} color="#6B7280" />
                        <Text className="text-lg font-bold text-gray-800 mt-1">
                            {totalSubmissions}
                        </Text>
                        <Text className="text-xs text-gray-500">Posts</Text>
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex-row justify-between items-center">
                <Text className="text-sm text-gray-600">View Analytics</Text>
                <AntDesign name="arrow-right" size={16} color="#4B5563" />
            </View>
        </TouchableOpacity>
    );
};

export default CampaignAnalyticsCard;