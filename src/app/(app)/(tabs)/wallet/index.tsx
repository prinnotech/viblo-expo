import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useWallet } from '@/hooks/useWallet';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const WalletScreen = () => {
    const { profile } = useAuth()
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { totalEarnings, hasPayoutMethod, loading, error } = useWallet(profile?.id);
    const router = useRouter();

    // Helper function to calculate the next Friday
    const getNextPayoutDate = () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // Sunday = 0, Friday = 5
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
        const nextFriday = new Date(today);
        nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
        return nextFriday.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
        });
    };

    // Helper to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center p-4" style={{ backgroundColor: theme.background }}>
                <Text style={{ color: theme.error, textAlign: 'center' }}>{t('walletIndex.failed_load_wallet')}</Text>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <View className="mb-8">
                    <Text className="text-center text-sm font-medium" style={{ color: theme.textSecondary }}>
                        {t('walletIndex.available_balance')}
                    </Text>
                    <Text className="text-center text-5xl font-bold mt-2" style={{ color: theme.text }}>
                        {formatCurrency(totalEarnings)}
                    </Text>
                </View>

                {/* Payout Info Card */}
                <View className="rounded-xl p-6 border shadow-sm" style={{ backgroundColor: theme.surface, borderColor: theme.borderLight }}>
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-sm font-medium" style={{ color: theme.textSecondary }}>{t('walletIndex.next_payout')}</Text>
                            <Text className="text-lg font-semibold mt-1" style={{ color: theme.text }}>
                                {getNextPayoutDate()}
                            </Text>
                        </View>
                        <View className="p-3 rounded-full" style={{ backgroundColor: theme.primaryLight }}>
                            <Feather name="calendar" size={24} color={theme.primary} />
                        </View>
                    </View>

                    <View className="border-t my-4" style={{ borderColor: theme.borderLight }} />

                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-sm font-medium" style={{ color: theme.textSecondary }}>{t('walletIndex.payout_method')}</Text>
                            <Text className="text-lg font-semibold mt-1" style={{ color: hasPayoutMethod ? theme.success : theme.warning }}>
                                {hasPayoutMethod ? t('walletIndex.connected') : t('walletIndex.not_connected')}
                            </Text>
                        </View>
                        <View className="p-3 rounded-full" style={{ backgroundColor: hasPayoutMethod ? theme.successLight : theme.warningLight }}>
                            <Feather name={hasPayoutMethod ? "check-circle" : "alert-circle"} size={24} color={hasPayoutMethod ? theme.success : theme.warning} />
                        </View>
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    className="rounded-lg py-4 mt-8"
                    style={{ backgroundColor: theme.primary }}
                    activeOpacity={0.8}
                    onPress={() => router.push('/wallet/connect')}
                >
                    <Text className="text-center font-bold text-base" style={{ color: theme.surface }}>
                        {t('walletIndex.connect_new_payout_method')}
                    </Text>
                </TouchableOpacity>

                {/* Payout History (Placeholder) */}
                <View className="mt-10">
                    <Text className="text-lg font-bold" style={{ color: theme.text }}>{t('walletIndex.payout_history')}</Text>
                    <View className="rounded-xl p-6 mt-4 border shadow-sm items-center" style={{ backgroundColor: theme.surface, borderColor: theme.borderLight }}>
                        <Feather name="clock" size={32} color={theme.textTertiary} />
                        <Text className="mt-2" style={{ color: theme.textSecondary }}>{t('walletIndex.payout_history_placeholder')}</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default WalletScreen;