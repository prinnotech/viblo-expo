import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useWallet } from '@/hooks/useWallet';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const WalletScreen = () => {
    const { profile } = useAuth()

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
            <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center p-4">
                <Text className="text-red-500 text-center">Failed to load wallet data. Please try again.</Text>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <View className="mb-8">
                    <Text className="text-center text-sm font-medium text-gray-500">
                        Available Balance
                    </Text>
                    <Text className="text-center text-5xl font-bold text-gray-900 mt-2">
                        {formatCurrency(totalEarnings)}
                    </Text>
                </View>

                {/* Payout Info Card */}
                <View className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-sm font-medium text-gray-500">Next Payout</Text>
                            <Text className="text-lg font-semibold text-gray-900 mt-1">
                                {getNextPayoutDate()}
                            </Text>
                        </View>
                        <View className="bg-blue-100 p-3 rounded-full">
                            <Feather name="calendar" size={24} color="#3b82f6" />
                        </View>
                    </View>

                    <View className="border-t border-gray-100 my-4" />

                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-sm font-medium text-gray-500">Payout Method</Text>
                            <Text className={`text-lg font-semibold mt-1 ${hasPayoutMethod ? 'text-green-600' : 'text-yellow-600'}`}>
                                {hasPayoutMethod ? 'Connected' : 'Not Connected'}
                            </Text>
                        </View>
                        <View className={`p-3 rounded-full ${hasPayoutMethod ? 'bg-green-100' : 'bg-yellow-100'}`}>
                            <Feather name={hasPayoutMethod ? "check-circle" : "alert-circle"} size={24} color={hasPayoutMethod ? '#16a34a' : '#f59e0b'} />
                        </View>
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    className="bg-blue-600 rounded-lg py-4 mt-8"
                    activeOpacity={0.8}
                    onPress={() => router.push('/wallet/connect')}
                >
                    <Text className="text-white text-center font-bold text-base">
                        Connect New Payout Method
                    </Text>
                </TouchableOpacity>

                {/* Payout History (Placeholder) */}
                <View className="mt-10">
                    <Text className="text-lg font-bold text-gray-800">Payout History</Text>
                    <View className="bg-white rounded-xl p-6 mt-4 border border-gray-100 shadow-sm items-center">
                        <Feather name="clock" size={32} color="#9ca3af" />
                        <Text className="text-gray-500 mt-2">Your payout history will appear here.</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default WalletScreen;
