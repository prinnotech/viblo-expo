import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { PayoutMethodType } from '@/lib/enum_types';
import { useTheme } from '@/contexts/ThemeContext';


const revolut_img = require('@/../assets/bank_icons/revolut.png')
const wise_img = require('@/../assets/bank_icons/wise.png')
const paypal_img = require('@/../assets/bank_icons/paypal.png')
const bank_img = require('@/../assets/bank_icons/transfer.png')


const NewMethodPayoutPage = () => {
    const { profile } = useAuth();
    const router = useRouter();
    const { theme } = useTheme();

    const [selectedType, setSelectedType] = useState<PayoutMethodType | null>(null);
    const [isPrimary, setIsPrimary] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [tagId, setTagId] = useState('');
    const [iban, setIban] = useState('');
    const [accountOwner, setAccountOwner] = useState('');
    const [swift, setSwift] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAddress, setBankAddress] = useState('');

    const payoutMethods: Array<{
        type: PayoutMethodType;
        title: string;
        icon: any;
        timing: string;
    }> = [
            {
                type: 'paypal',
                title: 'PayPal',
                icon: paypal_img,
                timing: 'Within 24 hours'
            },
            {
                type: 'wise',
                title: 'Wise',
                icon: wise_img,
                timing: 'Within 24 hours'
            },
            {
                type: 'revolut',
                title: 'Revolut',
                icon: revolut_img,
                timing: 'Within 24 hours'
            },
            {
                type: 'bank_transfer',
                title: 'Bank Transfer',
                icon: bank_img,
                timing: '3-5 business days'
            }
        ];

    const validateForm = () => {
        if (!selectedType) {
            Alert.alert('Error', 'Please select a payout method');
            return false;
        }

        switch (selectedType) {
            case 'paypal':
                if (!name || !email) {
                    Alert.alert('Error', 'Please fill in all required fields');
                    return false;
                }
                if (!email.includes('@')) {
                    Alert.alert('Error', 'Please enter a valid email address');
                    return false;
                }
                break;

            case 'wise':
            case 'revolut':
                if (!name || !email || !tagId) {
                    Alert.alert('Error', 'Please fill in all required fields');
                    return false;
                }
                if (!email.includes('@')) {
                    Alert.alert('Error', 'Please enter a valid email address');
                    return false;
                }
                break;

            case 'bank_transfer':
                if (!iban || !accountOwner || !swift || !bankName || !bankAddress) {
                    Alert.alert('Error', 'Please fill in all required fields');
                    return false;
                }
                break;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm() || !profile) return;

        setSubmitting(true);

        try {
            let details = {};

            switch (selectedType) {
                case 'paypal':
                    details = { name, email };
                    break;
                case 'wise':
                    details = { name, email, wise_id: tagId };
                    break;
                case 'revolut':
                    details = { name, email, revolut_tag: tagId };
                    break;
                case 'bank_transfer':
                    details = {
                        iban,
                        account_owner: accountOwner,
                        swift_bic: swift,
                        bank_name: bankName,
                        bank_address: bankAddress
                    };
                    break;
            }

            const { error } = await supabase
                .from('payout_methods')
                .insert({
                    user_id: profile.id,
                    method_type: selectedType,
                    details,
                    is_primary: isPrimary
                });

            if (error) throw error;

            Alert.alert('Success', 'Payout method added successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);

        } catch (error) {
            console.error('Error adding payout method:', error);
            Alert.alert('Error', 'Failed to add payout method. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderMethodSelection = () => (
        <View className="mb-6">
            <Text className="text-lg font-semibold mb-3" style={{ color: theme.text }}>
                Select Payment Method
            </Text>
            <View className="flex-col space-y-3 gap-2">
                {payoutMethods.map((method) => (
                    <TouchableOpacity
                        key={method.type}
                        onPress={() => setSelectedType(method.type)}
                        className="border-2 rounded-xl p-4"
                        style={{
                            borderColor: selectedType === method.type ? theme.primary : theme.border,
                            backgroundColor: selectedType === method.type ? theme.primaryLight : theme.surface
                        }}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1">
                                <View className="rounded-full p-2 mr-3">
                                    <Image
                                        source={method.icon}
                                        className="w-12 h-12"
                                        resizeMode="contain"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base font-semibold" style={{ color: theme.text }}>
                                        {method.title}
                                    </Text>
                                    <Text className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                                        {method.timing}
                                    </Text>
                                </View>
                            </View>
                            {selectedType === method.type && (
                                <Feather name="check-circle" size={24} color={theme.primary} />
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderPayPalForm = () => (
        <View className="flex-col gap-2 space-y-4">
            <View>
                <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Full Name *</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="John Doe"
                    className="border rounded-lg px-4 py-3"
                    style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                    placeholderTextColor={theme.textTertiary}
                />
            </View>

            <View>
                <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>PayPal Email *</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="border rounded-lg px-4 py-3"
                    style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                    placeholderTextColor={theme.textTertiary}
                />
            </View>
        </View>
    );

    const renderWiseRevolutForm = () => (
        <View className="flex-col gap-2 space-y-4">
            <View>
                <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Full Name *</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="John Doe"
                    className="border rounded-lg px-4 py-3"
                    style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                    placeholderTextColor={theme.textTertiary}
                />
            </View>

            <View>
                <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Email *</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="border rounded-lg px-4 py-3"
                    style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                    placeholderTextColor={theme.textTertiary}
                />
            </View>

            <View>
                <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>
                    {selectedType === 'wise' ? 'Wise ID' : 'Revolut Tag'} *
                </Text>
                <TextInput
                    value={tagId}
                    onChangeText={setTagId}
                    placeholder={selectedType === 'wise' ? 'P12345678' : '@yourtag'}
                    autoCapitalize="none"
                    className="border rounded-lg px-4 py-3"
                    style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                    placeholderTextColor={theme.textTertiary}
                />
            </View>
        </View>
    );

    const renderBankTransferForm = () => (
        <View className="flex-col gap-2 space-y-4">
            <View>
                <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Account Owner Name *</Text>
                <TextInput
                    value={accountOwner}
                    onChangeText={setAccountOwner}
                    placeholder="John Doe"
                    className="border rounded-lg px-4 py-3"
                    style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                    placeholderTextColor={theme.textTertiary}
                />
            </View>

            <View>
                <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>IBAN *</Text>
                <TextInput
                    value={iban}
                    onChangeText={setIban}
                    placeholder="DE89370400440532013000"
                    autoCapitalize="characters"
                    className="border rounded-lg px-4 py-3"
                    style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                    placeholderTextColor={theme.textTertiary}
                />
            </View>

            <View>
                <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>SWIFT/BIC Code *</Text>
                <TextInput
                    value={swift}
                    onChangeText={setSwift}
                    placeholder="DEUTDEFF"
                    autoCapitalize="characters"
                    className="border rounded-lg px-4 py-3"
                    style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                    placeholderTextColor={theme.textTertiary}
                />
            </View>

            <View>
                <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Bank Name *</Text>
                <TextInput
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder="Deutsche Bank"
                    className="border rounded-lg px-4 py-3"
                    style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                    placeholderTextColor={theme.textTertiary}
                />
            </View>

            <View>
                <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Bank Address *</Text>
                <TextInput
                    value={bankAddress}
                    onChangeText={setBankAddress}
                    placeholder="123 Bank Street, City, Country"
                    multiline
                    numberOfLines={2}
                    className="border rounded-lg px-4 py-3"
                    style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, height: 80, textAlignVertical: 'top' }}
                    placeholderTextColor={theme.textTertiary}
                />
            </View>
        </View>
    );

    const renderForm = () => {
        if (!selectedType) return null;

        return (
            <View className="mb-6">
                <Text className="text-lg font-semibold mb-4" style={{ color: theme.text }}>
                    Payment Details
                </Text>

                {selectedType === 'paypal' && renderPayPalForm()}
                {(selectedType === 'wise' || selectedType === 'revolut') && renderWiseRevolutForm()}
                {selectedType === 'bank_transfer' && renderBankTransferForm()}

                {/* Timing Info */}
                <View className="rounded-lg p-3 mt-4 border" style={{ backgroundColor: theme.primaryLight, borderColor: theme.border }}>
                    <View className="flex-row items-center">
                        <Feather name="clock" size={16} color={theme.primaryDark} />
                        <Text className="text-sm ml-2 font-medium" style={{ color: theme.primaryDark }}>
                            Expected processing time: {
                                payoutMethods.find(m => m.type === selectedType)?.timing
                            }
                        </Text>
                    </View>
                </View>

                {/* Primary Checkbox */}
                <TouchableOpacity
                    onPress={() => setIsPrimary(!isPrimary)}
                    className="flex-row items-center mt-4 p-4 rounded-lg"
                    style={{ backgroundColor: theme.surfaceSecondary }}
                    activeOpacity={0.7}
                >
                    <View
                        className="w-6 h-6 rounded border-2 mr-3 items-center justify-center"
                        style={{
                            backgroundColor: isPrimary ? theme.primary : theme.surface,
                            borderColor: isPrimary ? theme.primary : theme.border
                        }}
                    >
                        {isPrimary && <Feather name="check" size={16} color={theme.surface} />}
                    </View>
                    <Text className="font-medium" style={{ color: theme.text }}>Set as primary payout method</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView className="flex-1">
                <View className="px-4 py-6">
                    {renderMethodSelection()}
                    {renderForm()}
                </View>
            </ScrollView>

            {/* Submit Button */}
            {selectedType && (
                <View className="p-4 border-t" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={submitting}
                        className="rounded-xl p-4 items-center justify-center"
                        style={{ backgroundColor: submitting ? theme.primaryLight : theme.primary }}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator color={theme.surface} />
                        ) : (
                            <Text className="font-semibold text-base" style={{ color: theme.surface }}>
                                Add Payout Method
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

export default NewMethodPayoutPage;
