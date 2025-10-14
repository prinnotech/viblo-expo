import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    TextInput,
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
    const [couponCode, setCouponCode] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [validatedCoupon, setValidatedCoupon] = useState<any>(null);

    const campaignId = Array.isArray(id) ? id[0] : id;

    useEffect(() => {
        fetchCampaign();
    }, [campaignId]);

    const fetchCampaign = async () => {
        setLoading(true);
        try {
            const { data: campaignData, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            if (error || !campaignData) {
                Alert.alert(t('campaignIdPayment.error'), t('campaignIdPayment.campaign_not_found'));
                router.back();
                return;
            }

            setCampaign(campaignData);
        } catch (err: any) {
            console.error('Campaign fetch error:', err);
            Alert.alert(t('campaignIdPayment.error'), 'Failed to load campaign');
        }
        setLoading(false);
    };

    const handleValidateCoupon = async () => {
        if (!couponCode.trim()) {
            Alert.alert(t('campaignIdPayment.error'), 'Please enter a coupon code');
            return;
        }

        setValidatingCoupon(true);

        try {
            const validateResponse = await fetch(`${BACKEND_URL}/api/payments/validate-coupon`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY!,
                },
                body: JSON.stringify({
                    couponCode: couponCode.trim().toUpperCase(),
                }),
            });

            const contentType = validateResponse.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await validateResponse.text();
                console.error('Non-JSON response:', text);
                throw new Error('Server error');
            }

            const validateData = await validateResponse.json();

            if (!validateResponse.ok) {
                throw new Error(validateData.error || 'Invalid coupon code');
            }

            setValidatedCoupon(validateData);
            Alert.alert('Success!', `Coupon applied: ${validateData.percentOff ? validateData.percentOff + '% off' : '$' + (validateData.amountOff / 100) + ' off'}`);
        } catch (err: any) {
            console.error('Coupon validation error:', err);
            Alert.alert(t('campaignIdPayment.error'), err.message || 'Invalid coupon code');
            setValidatedCoupon(null);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handlePayment = async () => {
        setProcessing(true);

        try {
            // Create payment intent with optional coupon
            const response = await fetch(`${BACKEND_URL}/api/payments/create-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY!,
                },
                body: JSON.stringify({
                    campaignId: campaignId,
                    userId: profile?.id,
                    couponCode: validatedCoupon?.couponId || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || t('campaignIdPayment.failed_initialize'));
            }

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

            if (initError) {
                throw new Error(initError.message);
            }

            // Present the payment sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                Alert.alert(t('campaignIdPayment.payment_cancelled'), presentError.message);
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
                    paymentIntentId: data.paymentIntent.split('_secret_')[0],
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

    if (!campaign) return null;

    // Calculate amounts
    const subtotal = parseFloat(campaign.total_budget);
    let discount = 0;
    if (validatedCoupon) {
        if (validatedCoupon.percentOff) {
            discount = subtotal * (validatedCoupon.percentOff / 100);
        } else if (validatedCoupon.amountOff) {
            discount = validatedCoupon.amountOff / 100;
        }
    }
    const subtotalAfterDiscount = subtotal - discount;
    const processingFee = subtotalAfterDiscount * 0.03;
    const total = subtotalAfterDiscount + processingFee;

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

                    <View className="p-3 rounded-lg" style={{ backgroundColor: theme.primaryLight }}>
                        <Text className="text-xs" style={{ color: theme.primaryDark }}>
                            ${(campaign.rate_per_view * 1000).toFixed(2)} {t('campaignIdPayment.per_1k_views')}
                        </Text>
                    </View>
                </View>

                {/* Coupon Code Section */}
                <View className="rounded-2xl p-4 mb-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <View className="flex-row items-center mb-3">
                        <AntDesign name="tags" size={24} color={theme.textSecondary} />
                        <Text className="text-base font-semibold ml-3" style={{ color: theme.text }}>
                            {t('campaignIdPayment.discountTitle')}
                        </Text>
                    </View>
                    <Text className="text-sm mb-3" style={{ color: theme.textTertiary }}>
                        {t('campaignIdPayment.discountMessage')}
                    </Text>

                    <View className="flex-row items-center">
                        <TextInput
                            value={couponCode}
                            onChangeText={(text) => setCouponCode(text.toUpperCase())}
                            placeholder="Enter coupon code"
                            placeholderTextColor={theme.textTertiary}
                            editable={!validatedCoupon && !validatingCoupon}
                            autoCapitalize="characters"
                            className="flex-1 p-3 rounded-lg text-base font-semibold"
                            style={{
                                backgroundColor: theme.surfaceSecondary,
                                color: theme.text,
                                borderWidth: 1,
                                borderColor: validatedCoupon ? theme.primary : theme.border,
                            }}
                        />
                        <TouchableOpacity
                            onPress={handleValidateCoupon}
                            disabled={validatingCoupon || !!validatedCoupon || !couponCode.trim()}
                            className="ml-2 px-4 py-3 rounded-lg"
                            style={{
                                backgroundColor: validatedCoupon
                                    ? theme.primary
                                    : (!couponCode.trim() || validatingCoupon)
                                        ? theme.textTertiary
                                        : theme.primary
                            }}
                        >
                            {validatingCoupon ? (
                                <ActivityIndicator size="small" color={theme.surface} />
                            ) : (
                                <Text className="text-sm font-semibold" style={{ color: theme.surface }}>
                                    {validatedCoupon ? '✓' : 'Apply'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {validatedCoupon && discount > 0 && (
                        <View className="mt-3 p-2 rounded-lg" style={{ backgroundColor: theme.primaryLight }}>
                            <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
                                ✓ {validatedCoupon.percentOff
                                    ? `${validatedCoupon.percentOff}% off`
                                    : `$${discount.toFixed(2)} off`} applied
                            </Text>
                        </View>
                    )}
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

                    {discount > 0 && (
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-base" style={{ color: theme.primary }}>Discount</Text>
                            <Text className="text-base font-semibold" style={{ color: theme.primary }}>
                                -${discount.toFixed(2)}
                            </Text>
                        </View>
                    )}

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
                    disabled={processing}
                    className="py-4 rounded-xl items-center justify-center"
                    style={{ backgroundColor: processing ? theme.textTertiary : theme.primary }}
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