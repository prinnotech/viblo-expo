// app/(app)/(tabs)/profile/payments/index.tsx
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { usePayments } from '@/hooks/usePayments';
import { Feather } from '@expo/vector-icons';

const PaymentsPage = () => {
    const router = useRouter();
    const { profile } = useAuth();
    const { payments, loading, refreshing, totalSpent, refresh } = usePayments(profile?.id);

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'succeeded':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={refresh}
                        tintColor="#3b82f6"
                    />
                }
            >
                {/* Summary Card */}
                <View className="m-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <Text className="text-sm text-gray-500 mb-2">Total Spent</Text>
                    <Text className="text-4xl font-bold text-gray-900">
                        {formatCurrency(totalSpent)}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-2">
                        {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
                    </Text>
                </View>

                {/* Payments List */}
                <View className="mx-4 mb-4">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Payment History</Text>

                    {payments.length === 0 ? (
                        <View className="bg-white rounded-2xl p-8 items-center">
                            <Feather name="credit-card" size={48} color="#D1D5DB" />
                            <Text className="text-gray-500 mt-4 text-center">
                                No payments yet. Your payment history will appear here.
                            </Text>
                        </View>
                    ) : (
                        payments.map((payment) => (
                            <TouchableOpacity
                                key={payment.id}
                                onPress={() => router.push(`/profile/payments/${payment.id}`)}
                                className="bg-white rounded-xl p-4 mb-3 border border-gray-200"
                            >
                                <View className="flex-row justify-between items-start mb-2">
                                    <View className="flex-1">
                                        <Text className="text-base font-semibold text-gray-800" numberOfLines={1}>
                                            {payment.campaign_title}
                                        </Text>
                                        <Text className="text-sm text-gray-500 mt-1">
                                            {formatDate(payment.created_at || '')}
                                        </Text>
                                    </View>
                                    <View className="items-end ml-3">
                                        <Text className="text-lg font-bold text-gray-900">
                                            {formatCurrency(parseFloat(payment.amount as any))}
                                        </Text>
                                        <View className={`px-2 py-1 rounded-full mt-1 ${getStatusColor(payment.status)}`}>
                                            <Text className="text-xs font-semibold capitalize">
                                                {payment.status}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View className="flex-row items-center">
                                    <Text className="text-sm text-blue-600">View Details</Text>
                                    <Feather name="chevron-right" size={16} color="#2563eb" />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default PaymentsPage;