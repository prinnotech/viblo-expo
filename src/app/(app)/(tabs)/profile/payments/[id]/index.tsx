// app/(app)/(tabs)/profile/payments/[id]/index.tsx
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'succeeded':
                return 'bg-green-500';
            case 'pending':
                return 'bg-yellow-500';
            case 'failed':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
            </SafeAreaView>
        );
    }

    if (!payment) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center p-4">
                <Text className="text-red-500">Payment not found</Text>
            </SafeAreaView>
        );
    }

    const subtotal = parseFloat(payment.amount as any) / 1.03;
    const processingFee = parseFloat(payment.amount as any) - subtotal;

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                className="p-4"
                contentContainerStyle={{ paddingBottom: 40 }}
            >

                {/* Status Card */}
                <View className="bg-white rounded-2xl p-6 mb-4 items-center border border-gray-200">
                    <View className={`w-16 h-16 rounded-full ${getStatusColor(payment.status)} items-center justify-center mb-4`}>
                        <Feather
                            name={payment.status === 'succeeded' ? 'check' : payment.status === 'failed' ? 'x' : 'clock'}
                            size={32}
                            color="white"
                        />
                    </View>
                    <Text className="text-2xl font-bold text-gray-900 mb-1">
                        {formatCurrency(parseFloat(payment.amount as any))}
                    </Text>
                    <Text className="text-base text-gray-500 capitalize">{payment.status}</Text>
                </View>

                {/* Payment Details */}
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                    <Text className="text-lg font-bold text-gray-800 mb-4">Payment Details</Text>

                    <View className="mb-3 pb-3 border-b border-gray-200">
                        <Text className="text-sm text-gray-500 mb-1">Campaign</Text>
                        <TouchableOpacity
                            onPress={() => payment.campaign && router.push(`/(tabs)/campaigns/${payment.campaign.id}`)}
                        >
                            <Text className="text-base font-semibold text-blue-600">
                                {payment.campaign?.title || 'Deleted Campaign'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mb-3 pb-3 border-b border-gray-200">
                        <Text className="text-sm text-gray-500 mb-1">Transaction ID</Text>
                        <Text className="text-base text-gray-800 font-mono">
                            {payment.processor_payment_id}
                        </Text>
                    </View>

                    <View className="mb-3 pb-3 border-b border-gray-200">
                        <Text className="text-sm text-gray-500 mb-1">Date</Text>
                        <Text className="text-base text-gray-800">{formatDate(payment.created_at)}</Text>
                    </View>

                    <View>
                        <Text className="text-sm text-gray-500 mb-1">Payment Method</Text>
                        <Text className="text-base text-gray-800">Credit Card (Stripe)</Text>
                    </View>
                </View>

                {/* Breakdown */}
                <View className="bg-white rounded-2xl p-4 border border-gray-200">
                    <Text className="text-lg font-bold text-gray-800 mb-4">Breakdown</Text>

                    <View className="flex-row justify-between mb-2">
                        <Text className="text-base text-gray-600">Campaign Budget</Text>
                        <Text className="text-base text-gray-800">{formatCurrency(subtotal)}</Text>
                    </View>

                    <View className="flex-row justify-between mb-3 pb-3 border-b border-gray-200">
                        <Text className="text-base text-gray-600">Processing Fee (3%)</Text>
                        <Text className="text-base text-gray-800">{formatCurrency(processingFee)}</Text>
                    </View>

                    <View className="flex-row justify-between">
                        <Text className="text-lg font-bold text-gray-800">Total</Text>
                        <Text className="text-lg font-bold text-gray-900">
                            {formatCurrency(parseFloat(payment.amount as any))}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default PaymentDetailPage;