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
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const revolut_img = require('@/../assets/bank_icons/revolut.png');
const wise_img = require('@/../assets/bank_icons/wise.png');
const paypal_img = require('@/../assets/bank_icons/paypal.png');
const bank_img = require('@/../assets/bank_icons/transfer.png');


const PayoutMethodPage = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { theme } = useTheme();
    const { t } = useLanguage();

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
            Alert.alert(t('walletId.error'), t('walletId.failed_load_payout_method'));
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const populateFields = (data: PayoutMethod) => {
        setIsPrimary(data.is_primary);
        const details = data.details as any;

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
                return t('walletId.paypal');
            case 'wise':
                return t('walletId.wise');
            case 'revolut':
                return t('walletId.revolut');
            case 'bank_transfer':
                return t('walletId.bank_transfer');
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
                        Alert.alert(t('walletId.error'), t('walletId.fill_required_fields'));
                        setSubmitting(false);
                        return;
                    }
                    details = { name, email };
                    break;
                case 'wise':
                    if (!name || !email || !tagId) {
                        Alert.alert(t('walletId.error'), t('walletId.fill_required_fields'));
                        setSubmitting(false);
                        return;
                    }
                    details = { name, email, wise_id: tagId };
                    break;
                case 'revolut':
                    if (!name || !email || !tagId) {
                        Alert.alert(t('walletId.error'), t('walletId.fill_required_fields'));
                        setSubmitting(false);
                        return;
                    }
                    details = { name, email, revolut_tag: tagId };
                    break;
                case 'bank_transfer':
                    if (!iban || !accountOwner || !swift || !bankName || !bankAddress) {
                        Alert.alert(t('walletId.error'), t('walletId.fill_required_fields'));
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

            Alert.alert(t('walletId.success'), t('walletId.payout_method_updated'), [
                { text: t('walletId.ok'), onPress: () => router.back() }
            ]);

        } catch (error) {
            console.error('Error updating payout method:', error);
            Alert.alert(t('walletId.error'), t('walletId.failed_update'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            t('walletId.delete_payout_method'),
            t('walletId.delete_confirm'),
            [
                { text: t('walletId.cancel'), style: 'cancel' },
                {
                    text: t('walletId.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('payout_methods')
                                .delete()
                                .eq('id', id);

                            if (error) throw error;

                            Alert.alert(t('walletId.deleted'), t('walletId.payout_method_deleted'), [
                                { text: t('walletId.ok'), onPress: () => router.back() }
                            ]);
                        } catch (error) {
                            console.error('Error deleting payout method:', error);
                            Alert.alert(t('walletId.error'), t('walletId.failed_delete'));
                        }
                    }
                }
            ]
        );
    };

    const renderViewMode = () => {
        if (!method) return null;

        const details = method.details as any;

        return (
            <View className="px-4 py-6">
                {/* Method Header */}
                <View className="rounded-xl p-6 mb-4 items-center border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <Image
                        source={getMethodImage(method.method_type)}
                        className="w-20 h-20 mb-4"
                        resizeMode="contain"
                    />
                    <Text className="text-2xl font-bold mb-2" style={{ color: theme.text }}>
                        {getMethodTitle(method.method_type)}
                    </Text>
                    {method.is_primary && (
                        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: theme.primaryLight }}>
                            <Text className="text-xs font-semibold" style={{ color: theme.primary }}>
                                {t('walletId.primary_method')}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Details Card */}
                <View className="rounded-xl p-5 mb-4 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <Text className="text-lg font-semibold mb-4" style={{ color: theme.text }}>{t('walletId.details')}</Text>

                    {method.method_type === 'paypal' && (
                        <>
                            <DetailRow label={t('walletId.name')} value={details.name} />
                            <DetailRow label={t('walletId.email')} value={details.email} isLast />
                        </>
                    )}

                    {method.method_type === 'wise' && (
                        <>
                            <DetailRow label={t('walletId.name')} value={details.name} />
                            <DetailRow label={t('walletId.email')} value={details.email} />
                            <DetailRow label={t('walletId.wise_id')} value={details.wise_id} isLast />
                        </>
                    )}

                    {method.method_type === 'revolut' && (
                        <>
                            <DetailRow label={t('walletId.name')} value={details.name} />
                            <DetailRow label={t('walletId.email')} value={details.email} />
                            <DetailRow label={t('walletId.revolut_tag')} value={details.revolut_tag} isLast />
                        </>
                    )}

                    {method.method_type === 'bank_transfer' && (
                        <>
                            <DetailRow label={t('walletId.account_owner')} value={details.account_owner} />
                            <DetailRow label={t('walletId.iban')} value={details.iban} />
                            <DetailRow label={t('walletId.swift_bic')} value={details.swift_bic} />
                            <DetailRow label={t('walletId.bank_name')} value={details.bank_name} />
                            <DetailRow label={t('walletId.bank_address')} value={details.bank_address} isLast />
                        </>
                    )}
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                    onPress={() => setEditing(true)}
                    className="rounded-xl p-4 mb-3"
                    style={{ backgroundColor: theme.primary }}
                    activeOpacity={0.8}
                >
                    <Text className="font-semibold text-base text-center" style={{ color: theme.surface }}>
                        {t('walletId.edit_details')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleDelete}
                    className="border rounded-xl p-4"
                    style={{ backgroundColor: theme.errorLight, borderColor: theme.error }}
                    activeOpacity={0.8}
                >
                    <Text className="font-semibold text-base text-center" style={{ color: theme.error }}>
                        {t('walletId.delete_method')}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderEditForm = () => {
        if (!method) return null;

        return (
            <View className="px-4 py-6">
                <Text className="text-lg font-semibold mb-4" style={{ color: theme.text }}>
                    {t('walletId.edit_payment_details')}
                </Text>

                {method.method_type === 'paypal' && (
                    <View className="flex-col gap-2 space-y-4">
                        <View>
                            <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>{t('walletId.full_name')}</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                className="border rounded-lg px-4 py-3"
                                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>{t('walletId.email_label')}</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                className="border rounded-lg px-4 py-3"
                                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>
                    </View>
                )}

                {(method.method_type === 'wise' || method.method_type === 'revolut') && (
                    <View className="flex-col gap-2 space-y-4">
                        <View>
                            <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>{t('walletId.full_name')}</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                className="border rounded-lg px-4 py-3"
                                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>{t('walletId.email_label')}</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                className="border rounded-lg px-4 py-3"
                                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>
                                {method.method_type === 'wise' ? t('walletId.wise_id_label') : t('walletId.revolut_tag_label')}
                            </Text>
                            <TextInput
                                value={tagId}
                                onChangeText={setTagId}
                                autoCapitalize="none"
                                className="border rounded-lg px-4 py-3"
                                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>
                    </View>
                )}

                {method.method_type === 'bank_transfer' && (
                    <View className="flex-col gap-2 space-y-4">
                        <View>
                            <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>{t('walletId.account_owner_label')}</Text>
                            <TextInput
                                value={accountOwner}
                                onChangeText={setAccountOwner}
                                className="border rounded-lg px-4 py-3"
                                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>{t('walletId.iban_label')}</Text>
                            <TextInput
                                value={iban}
                                onChangeText={setIban}
                                autoCapitalize="characters"
                                className="border rounded-lg px-4 py-3"
                                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>{t('walletId.swift_bic_label')}</Text>
                            <TextInput
                                value={swift}
                                onChangeText={setSwift}
                                autoCapitalize="characters"
                                className="border rounded-lg px-4 py-3"
                                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>{t('walletId.bank_name_label')}</Text>
                            <TextInput
                                value={bankName}
                                onChangeText={setBankName}
                                className="border rounded-lg px-4 py-3"
                                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>
                        <View>
                            <Text className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>{t('walletId.bank_address_label')}</Text>
                            <TextInput
                                value={bankAddress}
                                onChangeText={setBankAddress}
                                multiline
                                numberOfLines={2}
                                className="border rounded-lg px-4 py-3"
                                style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, height: 80, textAlignVertical: 'top' }}
                                placeholderTextColor={theme.textTertiary}
                            />
                        </View>
                    </View>
                )}

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
                    <Text className="font-medium" style={{ color: theme.text }}>{t('walletId.set_as_primary')}</Text>
                </TouchableOpacity>
            </View>
        );
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
            <ScrollView className="flex-1">
                {editing ? renderEditForm() : renderViewMode()}
            </ScrollView>

            {/* Action Buttons (Edit Mode) */}
            {editing && (
                <View className="p-4 border-t" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <TouchableOpacity
                        onPress={handleUpdate}
                        disabled={submitting}
                        className="rounded-xl p-4 mb-3 items-center justify-center"
                        style={{ backgroundColor: submitting ? theme.primaryLight : theme.primary }}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator color={theme.surface} />
                        ) : (
                            <Text className="font-semibold text-base" style={{ color: theme.surface }}>
                                {t('walletId.save_changes')}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            populateFields(method!);
                            setEditing(false);
                        }}
                        className="border rounded-xl p-4"
                        style={{ borderColor: theme.border }}
                        activeOpacity={0.8}
                    >
                        <Text className="font-semibold text-base text-center" style={{ color: theme.textSecondary }}>
                            {t('walletId.cancel')}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const DetailRow = ({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) => {
    const { theme } = useTheme();
    return (
        <View className={`py-3 ${!isLast ? 'border-b' : ''}`} style={{ borderColor: theme.borderLight }}>
            <Text className="text-xs mb-1" style={{ color: theme.textSecondary }}>{label}</Text>
            <Text className="text-base font-medium" style={{ color: theme.text }}>{value}</Text>
        </View>
    );
};

export default PayoutMethodPage;