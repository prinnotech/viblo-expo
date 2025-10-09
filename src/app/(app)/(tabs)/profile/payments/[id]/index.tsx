import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface PaymentDetail {
    id: string;
    amount: number;
    currency: string;
    status: string;
    processor_payment_id: string;
    created_at: string;
    campaign?: {
        title: string;
        id: string;
    };
}

const PaymentDetailPage = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { theme } = useTheme();
    const paymentId = Array.isArray(id) ? id[0] : id;

    const [payment, setPayment] = useState<PaymentDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPaymentDetail();
    }, [paymentId]);

    const fetchPaymentDetail = async () => {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    campaign:campaigns(id, title)
                `)
                .eq('id', paymentId)
                .single();

            if (error) throw error;
            setPayment(data);
        } catch (err: any) {
            console.error('Error fetching payment:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'succeeded':
                return theme.success;
            case 'pending':
                return theme.warning;
            case 'failed':
                return theme.error;
            default:
                return theme.textTertiary;
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }

    if (!payment) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center p-4" style={{ backgroundColor: theme.background }}>
                <Text style={{ color: theme.error }}>Payment not found</Text>
            </SafeAreaView>
        );
    }

    const subtotal = parseFloat(payment.amount as any) / 1.03;
    const processingFee = parseFloat(payment.amount as any) - subtotal;

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView
                className="p-4"
                contentContainerStyle={{ paddingBottom: 40 }}
            >

                {/* Status Card */}
                <View className="rounded-2xl p-6 mb-4 items-center border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: getStatusStyle(payment.status) }}>
                        <Feather
                            name={payment.status === 'succeeded' ? 'check' : payment.status === 'failed' ? 'x' : 'clock'}
                            size={32}
                            color="white"
                        />
                    </View>
                    <Text className="text-2xl font-bold mb-1" style={{ color: theme.text }}>
                        {formatCurrency(parseFloat(payment.amount as any))}
                    </Text>
                    <Text className="text-base capitalize" style={{ color: theme.textSecondary }}>{payment.status}</Text>
                </View>

                {/* Payment Details */}
                <View className="rounded-2xl p-4 mb-4 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <Text className="text-lg font-bold mb-4" style={{ color: theme.text }}>Payment Details</Text>

                    <View className="mb-3 pb-3 border-b" style={{ borderColor: theme.border }}>
                        <Text className="text-sm mb-1" style={{ color: theme.textSecondary }}>Campaign</Text>
                        <TouchableOpacity
                            onPress={() => payment.campaign && router.push(`/(tabs)/campaigns/${payment.campaign.id}`)}
                        >
                            <Text className="text-base font-semibold" style={{ color: theme.primary }}>
                                {payment.campaign?.title || 'Deleted Campaign'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mb-3 pb-3 border-b" style={{ borderColor: theme.border }}>
                        <Text className="text-sm mb-1" style={{ color: theme.textSecondary }}>Transaction ID</Text>
                        <Text className="text-base font-mono" style={{ color: theme.text }}>
                            {payment.processor_payment_id}
                        </Text>
                    </View>

                    <View className="mb-3 pb-3 border-b" style={{ borderColor: theme.border }}>
                        <Text className="text-sm mb-1" style={{ color: theme.textSecondary }}>Date</Text>
                        <Text className="text-base" style={{ color: theme.text }}>{formatDate(payment.created_at)}</Text>
                    </View>

                    <View>
                        <Text className="text-sm mb-1" style={{ color: theme.textSecondary }}>Payment Method</Text>
                        <Text className="text-base" style={{ color: theme.text }}>Credit Card (Stripe)</Text>
                    </View>
                </View>

                {/* Breakdown */}
                <View className="rounded-2xl p-4 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <Text className="text-lg font-bold mb-4" style={{ color: theme.text }}>Breakdown</Text>

                    <View className="flex-row justify-between mb-2">
                        <Text className="text-base" style={{ color: theme.textSecondary }}>Campaign Budget</Text>
                        <Text className="text-base" style={{ color: theme.text }}>{formatCurrency(subtotal)}</Text>
                    </View>

                    <View className="flex-row justify-between mb-3 pb-3 border-b" style={{ borderColor: theme.border }}>
                        <Text className="text-base" style={{ color: theme.textSecondary }}>Processing Fee (3%)</Text>
                        <Text className="text-base" style={{ color: theme.text }}>{formatCurrency(processingFee)}</Text>
                    </View>

                    <View className="flex-row justify-between">
                        <Text className="text-lg font-bold" style={{ color: theme.text }}>Total</Text>
                        <Text className="text-lg font-bold" style={{ color: theme.text }}>
                            {formatCurrency(parseFloat(payment.amount as any))}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default PaymentDetailPage;
