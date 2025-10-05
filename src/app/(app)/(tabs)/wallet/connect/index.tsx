import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { PayoutMethod } from '@/lib/db_interface';

const revolut_img = require('@/../assets/bank_icons/revolut.png')
const wise_img = require('@/../assets/bank_icons/wise.png')
const paypal_img = require('@/../assets/bank_icons/paypal.png')
const bank_img = require('@/../assets/bank_icons/transfer.png')


const ConnectPage = () => {
    const { profile } = useAuth();
    const router = useRouter();
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
        const details = method.details;
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
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View className="px-6 py-6 bg-white border-b border-gray-200">
                    <Text className="text-2xl font-bold text-gray-900">Payout Methods</Text>
                    <Text className="text-sm text-gray-600 mt-1">
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
                                        className="bg-white rounded-xl p-5 mb-3 border border-gray-200 shadow-sm"
                                        activeOpacity={0.7}
                                    >
                                        <View className="flex-row items-center">
                                            <View className={` rounded-full p-3 mr-4`}>
                                                <Image
                                                    source={getMethodIcon(method.method_type)}
                                                    className="w-12 h-12 "
                                                    resizeMode="contain"
                                                />
                                            </View>

                                            <View className="flex-1">
                                                <View className="flex-row items-center">
                                                    <Text className="text-lg font-semibold text-gray-900">
                                                        {getMethodTitle(method.method_type)}
                                                    </Text>
                                                    {method.is_primary && (
                                                        <View className="ml-2 bg-blue-100 px-2 py-1 rounded-full">
                                                            <Text className="text-xs font-semibold text-blue-600">
                                                                Primary
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text className="text-sm text-gray-600 mt-1">
                                                    {getMethodSubtitle(method)}
                                                </Text>
                                            </View>

                                            <Feather name="chevron-right" size={20} color="#9ca3af" />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : (
                        <View className="bg-white rounded-xl p-8 mb-4 items-center border border-gray-200">
                            <View className="bg-gray-100 rounded-full p-4 mb-3">
                                <Feather name="credit-card" size={32} color="#9ca3af" />
                            </View>
                            <Text className="text-gray-900 font-semibold text-center mb-1">
                                No Payout Methods
                            </Text>
                            <Text className="text-sm text-gray-600 text-center">
                                Add a payout method to receive your earnings
                            </Text>
                        </View>
                    )}

                    {/* Add New Method Button */}
                    <TouchableOpacity
                        onPress={() => router.push('/wallet/new')}
                        className="bg-blue-600 rounded-xl p-5 flex-row items-center justify-center shadow-lg"
                        activeOpacity={0.8}
                    >
                        <Feather name="plus-circle" size={20} color="white" />
                        <Text className="text-white font-semibold text-base ml-2">
                            Add New Method
                        </Text>
                    </TouchableOpacity>

                    {/* Info Card */}
                    <View className="bg-blue-50 rounded-xl p-4 mt-4 border border-blue-100">
                        <View className="flex-row items-start">
                            <Feather name="info" size={18} color="#2563eb" />
                            <View className="flex-1 ml-3">
                                <Text className="text-sm text-blue-900 font-medium mb-1">
                                    About Payouts
                                </Text>
                                <Text className="text-xs text-blue-700 leading-5">
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