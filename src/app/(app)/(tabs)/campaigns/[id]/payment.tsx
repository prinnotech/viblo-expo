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
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.214:3001';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

const PaymentPage = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { profile } = useAuth();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const { theme } = useTheme();
    const { t } = useLanguage();

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
                Alert.alert(t('campaignIdPayment.error'), t('campaignIdPayment.campaign_not_found'));
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
                throw new Error(data.error || t('campaignIdPayment.failed_initialize'));
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
                        primary: theme.primary,
                        background: theme.surface,
                        componentBackground: theme.surfaceSecondary,
                        componentText: theme.text,
                        primaryText: theme.text,
                        secondaryText: theme.textSecondary,
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
            Alert.alert(t('campaignIdPayment.error'), err.message || t('campaignIdPayment.failed_initialize'));
        }

        setLoading(false);
    };

    const handlePayment = async () => {
        setProcessing(true);

        try {
            // Present the payment sheet
            const { error } = await presentPaymentSheet();

            if (error) {
                Alert.alert(t('campaignIdPayment.payment_cancelled'), error.message);
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
                throw new Error(confirmData.error || t('campaignIdPayment.failed_confirm'));
            }

            setProcessing(false);

            Alert.alert(
                t('campaignIdPayment.success'),
                t('campaignIdPayment.campaign_active_message'),
                [
                    {
                        text: t('campaignIdPayment.view_campaign'),
                        onPress: () => router.replace(`/(tabs)/campaigns/${campaignId}`),
                    },
                ]
            );
        } catch (err: any) {
            console.error('Payment error:', err);
            setProcessing(false);
            Alert.alert(t('campaignIdPayment.error'), err.message || t('campaignIdPayment.payment_failed'));
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text className="mt-4" style={{ color: theme.textTertiary }}>{t('campaignIdPayment.setting_up_payment')}</Text>
            </View>
        );
    }

    if (!campaign || !paymentDetails) return null;

    const subtotal = parseFloat(paymentDetails.subtotal);
    const processingFee = parseFloat(paymentDetails.processingFee);
    const total = parseFloat(paymentDetails.total);

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView className="flex-1 p-4">
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-2xl font-bold" style={{ color: theme.text }}>{t('campaignIdPayment.complete_payment')}</Text>
                    <Text className="text-sm mt-1" style={{ color: theme.textTertiary }}>
                        {t('campaignIdPayment.activate_campaign_subtitle')}
                    </Text>
                </View>

                {/* Campaign Summary Card */}
                <View className="rounded-2xl p-4 mb-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <View className="flex-row items-center mb-4">
                        <View className="w-16 h-16 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: theme.primaryLight }}>
                            <AntDesign name="notification" size={32} color={theme.primary} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-bold" numberOfLines={2} style={{ color: theme.text }}>
                                {campaign.title}
                            </Text>
                            <Text className="text-sm" style={{ color: theme.textTertiary }}>
                                {t('campaignIdPayment.campaign_budget')}
                            </Text>
                        </View>
                    </View>

                    {/* Rate Details */}
                    <View className="p-3 rounded-lg" style={{ backgroundColor: theme.primaryLight }}>
                        <Text className="text-xs" style={{ color: theme.primaryDark }}>
                            ${(campaign.rate_per_view * 1000).toFixed(2)} {t('campaignIdPayment.per_1k_views')}
                        </Text>
                    </View>
                </View>

                {/* Payment Method Info */}
                <View className="rounded-2xl p-4 mb-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <View className="flex-row items-center">
                        <AntDesign name="credit-card" size={24} color={theme.textSecondary} />
                        <Text className="text-base font-semibold ml-3" style={{ color: theme.text }}>
                            {t('campaignIdPayment.payment_method')}
                        </Text>
                    </View>
                    <Text className="text-sm mt-2" style={{ color: theme.textTertiary }}>
                        {t('campaignIdPayment.payment_secure_message')}
                    </Text>
                </View>

                {/* Cost Breakdown */}
                <View className="rounded-2xl p-4 mb-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <Text className="text-base font-semibold mb-4" style={{ color: theme.text }}>
                        {t('campaignIdPayment.payment_summary')}
                    </Text>

                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-base" style={{ color: theme.textSecondary }}>{t('campaignIdPayment.campaign_budget')}</Text>
                        <Text className="text-base font-semibold" style={{ color: theme.text }}>
                            ${subtotal.toFixed(2)}
                        </Text>
                    </View>

                    <View className="flex-row justify-between items-center mb-3 pb-3 border-b" style={{ borderColor: theme.border }}>
                        <Text className="text-base" style={{ color: theme.textSecondary }}>{t('campaignIdPayment.processing_fee')}</Text>
                        <Text className="text-base font-semibold" style={{ color: theme.text }}>
                            ${processingFee.toFixed(2)}
                        </Text>
                    </View>

                    <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-bold" style={{ color: theme.text }}>{t('campaignIdPayment.total_amount')}</Text>
                        <Text className="text-2xl font-bold" style={{ color: theme.primary }}>
                            ${total.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Info Box */}
                <View className="p-4 rounded-xl mb-6 border" style={{ backgroundColor: theme.primaryLight, borderColor: theme.primaryLight }}>
                    <View className="flex-row items-start">
                        <AntDesign name="info-circle" size={20} color={theme.primary} />
                        <View className="flex-1 ml-3">
                            <Text className="text-sm leading-5" style={{ color: theme.primaryDark }}>
                                {t('campaignIdPayment.campaign_activated_info')}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View className="p-4 border-t" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <TouchableOpacity
                    onPress={handlePayment}
                    disabled={!ready || processing}
                    className="py-4 rounded-xl items-center justify-center"
                    style={{ backgroundColor: ready && !processing ? theme.primary : theme.textTertiary }}
                >
                    {processing ? (
                        <View className="flex-row items-center">
                            <ActivityIndicator color={theme.surface} size="small" />
                            <Text className="text-base font-semibold ml-2" style={{ color: theme.surface }}>
                                {t('campaignIdPayment.processing')}
                            </Text>
                        </View>
                    ) : (
                        <View className="flex-row items-center">
                            <Text className="text-lg font-bold mr-2" style={{ color: theme.surface }}>
                                {t('campaignIdPayment.pay').replace('{{amount}}', total.toFixed(2))}
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