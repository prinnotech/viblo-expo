import React, { useEffect, useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PayoutMethodType } from '@/lib/enum_types';
import { PayoutMethod } from '@/lib/db_interface';

const revolut_img = require('@/../assets/bank_icons/revolut.png');
const wise_img = require('@/../assets/bank_icons/wise.png');
const paypal_img = require('@/../assets/bank_icons/paypal.png');
const bank_img = require('@/../assets/bank_icons/transfer.png');


const PayoutMethodPage = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const [method, setMethod] = useState<PayoutMethod | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
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
    const [isPrimary, setIsPrimary] = useState(false);

    useEffect(() => {
        fetchPayoutMethod();
    }, [id]);

    const fetchPayoutMethod = async () => {
        try {
            const { data, error } = await supabase
                .from('payout_methods')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            setMethod(data);
            populateFields(data);
        } catch (error) {
            console.error('Error fetching payout method:', error);
            Alert.alert('Error', 'Failed to load payout method');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const populateFields = (data: PayoutMethod) => {
        setIsPrimary(data.is_primary);
        const details = data.details;

        switch (data.method_type) {
            case 'paypal':
                setName(details.name || '');
                setEmail(details.email || '');
                break;
            case 'wise':
                setName(details.name || '');
                setEmail(details.email || '');
                setTagId(details.wise_id || '');
                break;
            case 'revolut':
                setName(details.name || '');
                setEmail(details.email || '');
                setTagId(details.revolut_tag || '');
                break;
            case 'bank_transfer':
                setAccountOwner(details.account_owner || '');
                setIban(details.iban || '');
                setSwift(details.swift_bic || '');
                setBankName(details.bank_name || '');
                setBankAddress(details.bank_address || '');
                break;
        }
    };

    const getMethodImage = (type: PayoutMethodType) => {
        switch (type) {
            case 'paypal':
                return paypal_img;
            case 'wise':
                return wise_img;
            case 'revolut':
                return revolut_img;
            case 'bank_transfer':
                return bank_img;
        }
    };

    const getMethodTitle = (type: PayoutMethodType) => {
        switch (type) {
            case 'paypal':
                return 'PayPal';
            case 'wise':
                return 'Wise';
            case 'revolut':
                return 'Revolut';
            case 'bank_transfer':
                return 'Bank Transfer';
        }
    };

    const handleUpdate = async () => {
        if (!method) return;

        setSubmitting(true);

        try {
            let details = {};

            switch (method.method_type) {
                case 'paypal':
                    if (!name || !email) {
                        Alert.alert('Error', 'Please fill in all required fields');
                        setSubmitting(false);
                        return;
                    }
                    details = { name, email };
                    break;
                case 'wise':
                    if (!name || !email || !tagId) {
                        Alert.alert('Error', 'Please fill in all required fields');
                        setSubmitting(false);
                        return;
                    }
                    details = { name, email, wise_id: tagId };
                    break;
                case 'revolut':
                    if (!name || !email || !tagId) {
                        Alert.alert('Error', 'Please fill in all required fields');
                        setSubmitting(false);
                        return;
                    }
                    details = { name, email, revolut_tag: tagId };
                    break;
                case 'bank_transfer':
                    if (!iban || !accountOwner || !swift || !bankName || !bankAddress) {
                        Alert.alert('Error', 'Please fill in all required fields');
                        setSubmitting(false);
                        return;
                    }
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
                .update({
                    details,
                    is_primary: isPrimary
                })
                .eq('id', method.id);

            if (error) throw error;

            Alert.alert('Success', 'Payout method updated successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);

        } catch (error) {
            console.error('Error updating payout method:', error);
            Alert.alert('Error', 'Failed to update payout method. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Payout Method',
            'Are you sure you want to delete this payout method? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('payout_methods')
                                .delete()
                                .eq('id', id);

                            if (error) throw error;

                            Alert.alert('Deleted', 'Payout method deleted successfully', [
                                { text: 'OK', onPress: () => router.back() }
                            ]);
                        } catch (error) {
                            console.error('Error deleting payout method:', error);
                            Alert.alert('Error', 'Failed to delete payout method');
                        }
                    }
                }
            ]
        );
    };

    const renderViewMode = () => {
        if (!method) return null;

        const details = method.details;

        return (
            <View className="px-4 py-6">
                {/* Method Header */}
                <View className="bg-white rounded-xl p-6 mb-4 items-center border border-gray-200">
                    <Image
                        source={getMethodImage(method.method_type)}
                        className="w-20 h-20 mb-4"
                        resizeMode="contain"
                    />
                    <Text className="text-2xl font-bold text-gray-900 mb-2">
                        {getMethodTitle(method.method_type)}
                    </Text>
                    {method.is_primary && (
                        <View className="bg-blue-100 px-3 py-1 rounded-full">
                            <Text className="text-xs font-semibold text-blue-600">
                                Primary Method
                            </Text>
                        </View>
                    )}
                </View>

                {/* Details Card */}
                <View className="bg-white rounded-xl p-5 mb-4 border border-gray-200">
                    <Text className="text-lg font-semibold text-gray-900 mb-4">Details</Text>

                    {method.method_type === 'paypal' && (
                        <>
                            <DetailRow label="Name" value={details.name} />
                            <DetailRow label="Email" value={details.email} />
                        </>
                    )}

                    {method.method_type === 'wise' && (
                        <>
                            <DetailRow label="Name" value={details.name} />
                            <DetailRow label="Email" value={details.email} />
                            <DetailRow label="Wise ID" value={details.wise_id} />
                        </>
                    )}

                    {method.method_type === 'revolut' && (
                        <>
                            <DetailRow label="Name" value={details.name} />
                            <DetailRow label="Email" value={details.email} />
                            <DetailRow label="Revolut Tag" value={details.revolut_tag} />
                        </>
                    )}

                    {method.method_type === 'bank_transfer' && (
                        <>
                            <DetailRow label="Account Owner" value={details.account_owner} />
                            <DetailRow label="IBAN" value={details.iban} />
                            <DetailRow label="SWIFT/BIC" value={details.swift_bic} />
                            <DetailRow label="Bank Name" value={details.bank_name} />
                            <DetailRow label="Bank Address" value={details.bank_address} isLast />
                        </>
                    )}
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                    onPress={() => setEditing(true)}
                    className="bg-blue-600 rounded-xl p-4 mb-3"
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-semibold text-base text-center">
                        Edit Details
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleDelete}
                    className="bg-red-50 border border-red-200 rounded-xl p-4"
                    activeOpacity={0.8}
                >
                    <Text className="text-red-600 font-semibold text-base text-center">
                        Delete Method
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderEditForm = () => {
        if (!method) return null;

        return (
            <View className="px-4 py-6">
                <Text className="text-lg font-semibold text-gray-900 mb-4">
                    Edit Payment Details
                </Text>

                {method.method_type === 'paypal' && (
                    <View className="flex-col gap-2 space-y-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">Full Name *</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">Email *</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                            />
                        </View>
                    </View>
                )}

                {(method.method_type === 'wise' || method.method_type === 'revolut') && (
                    <View className="flex-col gap-2 space-y-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">Full Name *</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">Email *</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">
                                {method.method_type === 'wise' ? 'Wise ID' : 'Revolut Tag'} *
                            </Text>
                            <TextInput
                                value={tagId}
                                onChangeText={setTagId}
                                autoCapitalize="none"
                                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                            />
                        </View>
                    </View>
                )}

                {method.method_type === 'bank_transfer' && (
                    <View className="flex-col gap-2 space-y-4">
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">Account Owner *</Text>
                            <TextInput
                                value={accountOwner}
                                onChangeText={setAccountOwner}
                                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">IBAN *</Text>
                            <TextInput
                                value={iban}
                                onChangeText={setIban}
                                autoCapitalize="characters"
                                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">SWIFT/BIC *</Text>
                            <TextInput
                                value={swift}
                                onChangeText={setSwift}
                                autoCapitalize="characters"
                                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">Bank Name *</Text>
                            <TextInput
                                value={bankName}
                                onChangeText={setBankName}
                                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium text-gray-700 mb-2">Bank Address *</Text>
                            <TextInput
                                value={bankAddress}
                                onChangeText={setBankAddress}
                                multiline
                                numberOfLines={2}
                                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                            />
                        </View>
                    </View>
                )}

                {/* Primary Checkbox */}
                <TouchableOpacity
                    onPress={() => setIsPrimary(!isPrimary)}
                    className="flex-row items-center mt-4 p-4 bg-gray-50 rounded-lg"
                    activeOpacity={0.7}
                >
                    <View className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${isPrimary ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                        }`}>
                        {isPrimary && <Feather name="check" size={16} color="white" />}
                    </View>
                    <Text className="text-gray-900 font-medium">Set as primary payout method</Text>
                </TouchableOpacity>
            </View>
        );
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
            <ScrollView className="flex-1">
                {editing ? renderEditForm() : renderViewMode()}
            </ScrollView>

            {/* Action Buttons (Edit Mode) */}
            {editing && (
                <View className="p-4 bg-white border-t border-gray-200">
                    <TouchableOpacity
                        onPress={handleUpdate}
                        disabled={submitting}
                        className={`rounded-xl p-4 mb-3 items-center justify-center ${submitting ? 'bg-blue-400' : 'bg-blue-600'
                            }`}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-semibold text-base">
                                Save Changes
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            populateFields(method!);
                            setEditing(false);
                        }}
                        className="border border-gray-300 rounded-xl p-4"
                        activeOpacity={0.8}
                    >
                        <Text className="text-gray-700 font-semibold text-base text-center">
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const DetailRow = ({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) => (
    <View className={`py-3 ${!isLast ? 'border-b border-gray-100' : ''}`}>
        <Text className="text-xs text-gray-500 mb-1">{label}</Text>
        <Text className="text-base text-gray-900 font-medium">{value}</Text>
    </View>
);

export default PayoutMethodPage;