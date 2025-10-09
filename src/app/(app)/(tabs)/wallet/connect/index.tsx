import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { PayoutMethod } from '@/lib/db_interface';
import { useTheme } from '@/contexts/ThemeContext';

const revolut_img = require('@/../assets/bank_icons/revolut.png')
const wise_img = require('@/../assets/bank_icons/wise.png')
const paypal_img = require('@/../assets/bank_icons/paypal.png')
const bank_img = require('@/../assets/bank_icons/transfer.png')


const ConnectPage = () => {
    const { profile } = useAuth();
    const router = useRouter();
    const { theme } = useTheme();
    const [methods, setMethods] = useState<PayoutMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPayoutMethods = async () => {
        if (!profile) return;

        try {
            const { data, error } = await supabase
                .from('payout_methods')
                .select('*')
                .eq('user_id', profile.id)
                .order('is_primary', { ascending: false });

            if (error) throw error;
            setMethods(data || []);
        } catch (error) {
            console.error('Error fetching payout methods:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPayoutMethods();
    }, [profile]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPayoutMethods();
    };

    const getMethodIcon = (type: string) => {
        switch (type) {
            case 'paypal':
                return paypal_img;
            case 'wise':
                return wise_img;
            case 'bank_transfer':
                return bank_img;
            case 'revolut':
                return revolut_img;
            default:
                return bank_img;
        }
    };


    const getMethodTitle = (type: string) => {
        switch (type) {
            case 'paypal':
                return 'PayPal';
            case 'wise':
                return 'Wise';
            case 'bank_transfer':
                return 'Bank Transfer';
            case 'revolut':
                return 'Revolut';
            default:
                return type;
        }
    };

    const getMethodSubtitle = (method: PayoutMethod) => {
        const details = method.details as any;
        switch (method.method_type) {
            case 'paypal':
                return details?.email || 'PayPal Account';
            case 'wise':
                return details?.email || 'Wise Account';
            case 'bank_transfer':
                return details?.account_number
                    ? `•••• ${details.account_number.slice(-4)}`
                    : 'Bank Account';
            case 'revolut':
                return details?.email || 'Revolut Account';
            default:
                return 'Payment Method';
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
                }
            >
                {/* Header */}
                <View className="px-6 py-6 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <Text className="text-2xl font-bold" style={{ color: theme.text }}>Payout Methods</Text>
                    <Text className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                        Manage how you receive payments
                    </Text>
                </View>

                <View className="px-4 py-6">
                    {/* Methods List */}
                    {methods.length > 0 ? (
                        <View className="mb-4">
                            {methods.map((method) => {
                                return (
                                    <TouchableOpacity
                                        key={method.id}
                                        onPress={() => router.push(`/wallet/${method.id}`)}
                                        className="rounded-xl p-5 mb-3 border shadow-sm"
                                        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                                        activeOpacity={0.7}
                                    >
                                        <View className="flex-row items-center">
                                            <View className="rounded-full p-3 mr-4">
                                                <Image
                                                    source={getMethodIcon(method.method_type)}
                                                    className="w-12 h-12"
                                                    resizeMode="contain"
                                                />
                                            </View>

                                            <View className="flex-1">
                                                <View className="flex-row items-center">
                                                    <Text className="text-lg font-semibold" style={{ color: theme.text }}>
                                                        {getMethodTitle(method.method_type)}
                                                    </Text>
                                                    {method.is_primary && (
                                                        <View className="ml-2 px-2 py-1 rounded-full" style={{ backgroundColor: theme.primaryLight }}>
                                                            <Text className="text-xs font-semibold" style={{ color: theme.primary }}>
                                                                Primary
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                                                    {getMethodSubtitle(method)}
                                                </Text>
                                            </View>

                                            <Feather name="chevron-right" size={20} color={theme.textTertiary} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : (
                        <View className="rounded-xl p-8 mb-4 items-center border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <View className="rounded-full p-4 mb-3" style={{ backgroundColor: theme.surfaceSecondary }}>
                                <Feather name="credit-card" size={32} color={theme.textTertiary} />
                            </View>
                            <Text className="font-semibold text-center mb-1" style={{ color: theme.text }}>
                                No Payout Methods
                            </Text>
                            <Text className="text-sm text-center" style={{ color: theme.textSecondary }}>
                                Add a payout method to receive your earnings
                            </Text>
                        </View>
                    )}

                    {/* Add New Method Button */}
                    <TouchableOpacity
                        onPress={() => router.push('/wallet/new')}
                        className="rounded-xl p-5 flex-row items-center justify-center shadow-lg"
                        style={{ backgroundColor: theme.primary }}
                        activeOpacity={0.8}
                    >
                        <Feather name="plus-circle" size={20} color={theme.surface} />
                        <Text className="font-semibold text-base ml-2" style={{ color: theme.surface }}>
                            Add New Method
                        </Text>
                    </TouchableOpacity>

                    {/* Info Card */}
                    <View className="rounded-xl p-4 mt-4 border" style={{ backgroundColor: theme.primaryLight, borderColor: theme.borderLight }}>
                        <View className="flex-row items-start">
                            <Feather name="info" size={18} color={theme.primaryDark} />
                            <View className="flex-1 ml-3">
                                <Text className="text-sm font-medium mb-1" style={{ color: theme.primaryDark }}>
                                    About Payouts
                                </Text>
                                <Text className="text-xs leading-5" style={{ color: theme.primaryDark }}>
                                    Payments are processed every Friday. Make sure your payment details are up to date to avoid delays.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ConnectPage;
