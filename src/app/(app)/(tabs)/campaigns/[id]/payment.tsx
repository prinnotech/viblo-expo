import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AntDesign from '@expo/vector-icons/AntDesign';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.214:3001';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

const PaymentPage = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { profile } = useAuth();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [campaign, setCampaign] = useState<any>(null);
    const [ready, setReady] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState<any>(null);

    const campaignId = Array.isArray(id) ? id[0] : id;

    console.log("campaign id: ", campaignId)

    useEffect(() => {
        fetchCampaignAndInitPayment();
    }, [campaignId]);

    const fetchCampaignAndInitPayment = async () => {

        console.log('=== PAYMENT DEBUG ===');
        console.log('Raw id param:', id);
        console.log('Extracted campaignId:', campaignId);
        console.log('Profile ID:', profile?.id);

        setLoading(true);

        try {
            // Fetch campaign details
            const { data: campaignData, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            console.log('Campaign query result:', { campaignData, error }); // ADD THIS LINE

            if (error || !campaignData) {
                Alert.alert('Error', 'Campaign not found');
                router.back();
                return;
            }

            setCampaign(campaignData);

            console.log('About to call backend:', {
                url: `${BACKEND_URL}/api/payments/create-intent`,
                campaignId,
                userId: profile?.id,
            });


            // Create payment intent via your backend
            const response = await fetch(`${BACKEND_URL}/api/payments/create-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY!,
                },
                body: JSON.stringify({
                    campaignId: campaignId,
                    userId: profile?.id,
                }),
            });

            console.log('Backend response status:', response.status);
            const data = await response.json();
            console.log('Backend response data:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initialize payment');
            }

            setPaymentDetails(data);

            // Initialize Stripe Payment Sheet
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'Viblo',
                customerId: data.customerId,
                customerEphemeralKeySecret: data.ephemeralKey,
                paymentIntentClientSecret: data.paymentIntent,
                allowsDelayedPaymentMethods: false,
                returnURL: 'viblo://campaigns',
                appearance: {
                    colors: {
                        primary: '#3B82F6',
                        background: '#ffffff',
                        componentBackground: '#f3f4f6',
                        componentText: '#1F2937', // Add this - dark gray text
                        primaryText: '#111827',   // Add this - almost black
                        secondaryText: '#6B7280', // Add this - gray text
                    },
                },
            });

            if (!initError) {
                setReady(true);
            } else {
                throw new Error(initError.message);
            }
        } catch (err: any) {
            console.error('Payment initialization error:', err);
            Alert.alert('Error', err.message || 'Failed to initialize payment');
        }

        setLoading(false);
    };

    const handlePayment = async () => {
        setProcessing(true);

        try {
            // Present the payment sheet
            const { error } = await presentPaymentSheet();

            if (error) {
                Alert.alert('Payment Cancelled', error.message);
                setProcessing(false);
                return;
            }

            // Payment successful - confirm with backend
            const confirmResponse = await fetch(`${BACKEND_URL}/api/payments/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY!,
                },
                body: JSON.stringify({
                    campaignId: campaignId,
                    paymentIntentId: paymentDetails.paymentIntent.split('_secret_')[0],
                }),
            });

            const confirmData = await confirmResponse.json();

            if (!confirmResponse.ok) {
                throw new Error(confirmData.error || 'Failed to confirm payment');
            }

            setProcessing(false);

            Alert.alert(
                'Success!',
                'Your campaign is now active and ready to receive applications from influencers.',
                [
                    {
                        text: 'View Campaign',
                        onPress: () => router.replace(`/(tabs)/campaigns/${campaignId}`),
                    },
                ]
            );
        } catch (err: any) {
            console.error('Payment error:', err);
            setProcessing(false);
            Alert.alert('Error', err.message || 'Payment failed');
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="mt-4 text-gray-500">Setting up payment...</Text>
            </View>
        );
    }

    if (!campaign || !paymentDetails) return null;

    const subtotal = parseFloat(paymentDetails.subtotal);
    const processingFee = parseFloat(paymentDetails.processingFee);
    const total = parseFloat(paymentDetails.total);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="flex-1 p-4">
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-2xl font-bold text-gray-800">Complete Payment</Text>
                    <Text className="text-sm text-gray-500 mt-1">
                        Activate your campaign and start connecting with influencers
                    </Text>
                </View>

                {/* Campaign Summary Card */}
                <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
                    <View className="flex-row items-center mb-4">
                        <View className="w-16 h-16 bg-blue-100 rounded-xl items-center justify-center mr-4">
                            <AntDesign name="notification" size={32} color="#3B82F6" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-gray-800" numberOfLines={2}>
                                {campaign.title}
                            </Text>
                            <Text className="text-sm text-gray-500">
                                Campaign Budget
                            </Text>
                        </View>
                    </View>

                    {/* Rate Details */}
                    <View className="bg-blue-50 p-3 rounded-lg">
                        <Text className="text-xs text-blue-800">
                            ${(campaign.rate_per_view * 1000).toFixed(2)} per 1,000 views
                        </Text>
                    </View>
                </View>

                {/* Payment Method Info */}
                <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
                    <View className="flex-row items-center">
                        <AntDesign name="credit-card" size={24} color="#4B5563" />
                        <Text className="text-base font-semibold text-gray-800 ml-3">
                            Payment Method
                        </Text>
                    </View>
                    <Text className="text-sm text-gray-500 mt-2">
                        Securely processed by Stripe. Your payment method will be saved for future campaigns.
                    </Text>
                </View>

                {/* Cost Breakdown */}
                <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
                    <Text className="text-base font-semibold text-gray-800 mb-4">
                        Payment Summary
                    </Text>

                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-base text-gray-600">Campaign Budget</Text>
                        <Text className="text-base font-semibold text-gray-800">
                            ${subtotal.toFixed(2)}
                        </Text>
                    </View>

                    <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-gray-200">
                        <Text className="text-base text-gray-600">Processing Fee (3%)</Text>
                        <Text className="text-base font-semibold text-gray-800">
                            ${processingFee.toFixed(2)}
                        </Text>
                    </View>

                    <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-bold text-gray-800">Total Amount</Text>
                        <Text className="text-2xl font-bold text-blue-600">
                            ${total.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Info Box */}
                <View className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-200">
                    <View className="flex-row items-start">
                        <AntDesign name="info-circle" size={20} color="#3B82F6" />
                        <View className="flex-1 ml-3">
                            <Text className="text-sm text-blue-800 leading-5">
                                Once payment is complete, your campaign will be activated immediately and visible to influencers on the platform.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View className="p-4 bg-white border-t border-gray-200">
                <TouchableOpacity
                    onPress={handlePayment}
                    disabled={!ready || processing}
                    className={`py-4 rounded-xl items-center justify-center ${ready && !processing ? 'bg-blue-600' : 'bg-gray-400'
                        }`}
                >
                    {processing ? (
                        <View className="flex-row items-center">
                            <ActivityIndicator color="white" size="small" />
                            <Text className="text-white text-base font-semibold ml-2">
                                Processing...
                            </Text>
                        </View>
                    ) : (
                        <View className="flex-row items-center">
                            <Text className="text-white text-lg font-bold mr-2">
                                Pay ${total.toFixed(2)}
                            </Text>
                            <AntDesign name="arrow-right" size={20} color="white" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default PaymentPage;