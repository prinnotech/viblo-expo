import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { usePayments } from '@/hooks/usePayments';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const PaymentsPage = () => {
    const router = useRouter();
    const { profile } = useAuth();
    const { payments, loading, refreshing, totalSpent, refresh } = usePayments(profile?.id);
    const { theme } = useTheme();
    const { t } = useLanguage();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'succeeded':
                return { backgroundColor: theme.successLight, color: theme.success };
            case 'pending':
                return { backgroundColor: theme.warningLight, color: theme.warning };
            case 'failed':
                return { backgroundColor: theme.errorLight, color: theme.error };
            default:
                return { backgroundColor: theme.surfaceSecondary, color: theme.text };
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        tintColor={theme.primary}
                        colors={[theme.primary]}
                    />
                }
            >
                {/* Summary Card */}
                <View className="m-4 rounded-2xl p-6 shadow-sm border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <Text className="text-sm mb-2" style={{ color: theme.textSecondary }}>{t('profilePaymentsIndex.total_spent')}</Text>
                    <Text className="text-4xl font-bold" style={{ color: theme.text }}>
                        {formatCurrency(totalSpent)}
                    </Text>
                    <Text className="text-sm mt-2" style={{ color: theme.textSecondary }}>
                        {payments.length} {payments.length === 1 ? t('profilePaymentsIndex.payment') : t('profilePaymentsIndex.payments')}
                    </Text>
                </View>

                {/* Payments List */}
                <View className="mx-4 mb-4">
                    <Text className="text-lg font-bold mb-3" style={{ color: theme.text }}>{t('profilePaymentsIndex.payment_history')}</Text>

                    {payments.length === 0 ? (
                        <View className="rounded-2xl p-8 items-center" style={{ backgroundColor: theme.surface }}>
                            <Feather name="credit-card" size={48} color={theme.border} />
                            <Text className="mt-4 text-center" style={{ color: theme.textSecondary }}>
                                {t('profilePaymentsIndex.no_payments_yet')}
                            </Text>
                        </View>
                    ) : (
                        payments.map((payment) => {
                            const statusStyle = getStatusStyle(payment.status);
                            return (
                                <TouchableOpacity
                                    key={payment.id}
                                    onPress={() => router.push(`/profile/payments/${payment.id}`)}
                                    className="rounded-xl p-4 mb-3 border"
                                    style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                                >
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-1">
                                            <Text className="text-base font-semibold" style={{ color: theme.text }} numberOfLines={1}>
                                                {payment.campaign_title}
                                            </Text>
                                            <Text className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                                                {formatDate(payment.created_at || '')}
                                            </Text>
                                        </View>
                                        <View className="items-end ml-3">
                                            <Text className="text-lg font-bold" style={{ color: theme.text }}>
                                                {formatCurrency(parseFloat(payment.amount as any))}
                                            </Text>
                                            <View className="px-2 py-1 rounded-full mt-1" style={{ backgroundColor: statusStyle.backgroundColor }}>
                                                <Text className="text-xs font-semibold capitalize" style={{ color: statusStyle.color }}>
                                                    {t(`profilePaymentsIndex.${payment.status}`)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Text className="text-sm" style={{ color: theme.primary }}>{t('profilePaymentsIndex.view_details')}</Text>
                                        <Feather name="chevron-right" size={16} color={theme.primary} />
                                    </View>
                                </TouchableOpacity>
                            )
                        })
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default PaymentsPage;