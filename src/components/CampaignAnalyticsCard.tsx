// components/CampaignAnalyticsCard.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useTheme } from '@/contexts/ThemeContext';

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
    const { theme, themeMode, isDark, setThemeMode } = useTheme();

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

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'active':
                return { backgroundColor: theme.successLight, color: theme.success };
            case 'paused':
                return { backgroundColor: theme.warningLight, color: theme.warning };
            case 'completed':
                // Note: using theme.primaryLight for bg-blue-100 equivalent
                return { backgroundColor: theme.primaryLight, color: theme.primary };
            case 'draft':
            default:
                return { backgroundColor: theme.surfaceSecondary, color: theme.text };
        }
    };

    const statusStyles = getStatusStyles(status);
    const budgetPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return (
        <TouchableOpacity
            onPress={() => router.push(`/(tabs)/analytics/${campaignId}`)}
            className="m-4 rounded-2xl shadow-sm overflow-hidden"
            style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}
        >
            {/* Header */}
            <View className="p-4" style={{ borderBottomColor: theme.border, borderBottomWidth: 1 }}>
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-3">
                        <Text className="text-lg font-bold" style={{ color: theme.text }} numberOfLines={2}>
                            {title}
                        </Text>
                    </View>
                    <View className="px-3 py-1 rounded-full" style={{ backgroundColor: statusStyles.backgroundColor }}>
                        <Text className="text-xs font-semibold uppercase" style={{ color: statusStyles.color }}>
                            {status}
                        </Text>
                    </View>
                </View>

                {/* Budget Progress */}
                <View className="mt-3">
                    <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-xs" style={{ color: theme.textTertiary }}>
                            {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)}
                        </Text>
                        <Text className="text-xs font-bold" style={{ color: theme.textSecondary }}>
                            {Math.round(budgetPercentage)}%
                        </Text>
                    </View>
                    <View className="w-full rounded-full h-2" style={{ backgroundColor: theme.border }}>
                        <View
                            className="h-2 rounded-full"
                            style={{
                                width: `${Math.min(budgetPercentage, 100)}%`,
                                backgroundColor:
                                    budgetPercentage > 85
                                        ? theme.error
                                        : budgetPercentage > 50
                                            ? theme.warning
                                            : theme.success,
                            }}
                        />
                    </View>
                </View>
            </View>

            {/* Stats Grid */}
            <View className="p-4">
                <View className="flex-row justify-between">
                    <View className="flex-1 items-center">
                        <AntDesign name="eye" size={20} color={theme.textTertiary} />
                        <Text className="text-lg font-bold mt-1" style={{ color: theme.text }}>
                            {formatNumber(totalViews)}
                        </Text>
                        <Text className="text-xs" style={{ color: theme.textTertiary }}>Views</Text>
                    </View>

                    <View className="flex-1 items-center" style={{ borderLeftColor: theme.border, borderRightColor: theme.border, borderLeftWidth: 1, borderRightWidth: 1 }}>
                        <AntDesign name="team" size={20} color={theme.textTertiary} />
                        <Text className="text-lg font-bold mt-1" style={{ color: theme.text }}>
                            {activeCreators}
                        </Text>
                        <Text className="text-xs" style={{ color: theme.textTertiary }}>Creators</Text>
                    </View>

                    <View className="flex-1 items-center">
                        <AntDesign name="file-text" size={20} color={theme.textTertiary} />
                        <Text className="text-lg font-bold mt-1" style={{ color: theme.text }}>
                            {totalSubmissions}
                        </Text>
                        <Text className="text-xs" style={{ color: theme.textTertiary }}>Posts</Text>
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View className="px-4 py-3 flex-row justify-between items-center" style={{ backgroundColor: theme.background, borderTopColor: theme.border, borderTopWidth: 1 }}>
                <Text className="text-sm" style={{ color: theme.textSecondary }}>View Analytics</Text>
                <AntDesign name="arrow-right" size={16} color={theme.textSecondary} />
            </View>
        </TouchableOpacity>
    );
};

export default CampaignAnalyticsCard;
