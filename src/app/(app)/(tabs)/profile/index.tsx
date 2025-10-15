import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Alert,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const MenuItem = ({ icon, text, onPress }: { icon: any; text: string; onPress: () => void; }) => {
    const { theme } = useTheme();
    return (
        <TouchableOpacity
            className="flex-row items-center p-4 rounded-xl border"
            style={{ backgroundColor: theme.surface, borderColor: theme.borderLight }}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <Feather name={icon} size={22} color={theme.textSecondary} />
            <Text className="text-base ml-4 flex-1" style={{ color: theme.text }}>{text}</Text>
            <Feather name="chevron-right" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
    );
};

const ProfileScreen = () => {
    const { profile, loading, refetch } = useUserProfile();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const { theme } = useTheme();
    const { t } = useLanguage();

    const isBrand = profile?.user_type === 'brand';
    const isInfluencer = profile?.user_type === 'influencer';

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    async function signOut() {
        Alert.alert(t('profileIndex.sign_out'), t('profileIndex.sign_out_confirm'), [
            { text: t('profileIndex.cancel'), style: "cancel" },
            {
                text: t('profileIndex.sign_out'),
                style: "destructive",
                onPress: async () => {
                    await supabase.auth.signOut();
                }
            }
        ]);
    }

    if (loading && !refreshing) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.primary}
                        colors={[theme.primary]}
                    />
                }
            >
                {/* Profile Header */}
                <View className="items-center p-6 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <Image
                        source={{ uri: profile?.avatar_url || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=??' }}
                        className="w-24 h-24 rounded-full"
                    />
                    <Text className="text-2xl font-bold mt-4" style={{ color: theme.text }}>
                        {isBrand ? profile?.company_name : profile?.first_name || profile?.username}
                    </Text>
                    <Text className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                        @{profile?.username}
                    </Text>
                    {isBrand && profile?.industry && (
                        <Text className="text-sm mt-1" style={{ color: theme.textTertiary }}>
                            {profile.industry}
                        </Text>
                    )}
                </View>

                {/* Menu Section */}
                <View className="mt-6 px-6 gap-2">
                    <MenuItem
                        icon="user"
                        text={t('profileIndex.edit_profile')}
                        onPress={() => router.push('/profile/edit')}
                    />

                    {/* Influencer Only */}
                    {isInfluencer && (
                        <>
                            <MenuItem
                                icon="share-2"
                                text={t('profileIndex.connected_accounts')}
                                onPress={() => router.push('/profile/connections')}
                            />
                            <MenuItem
                                icon="bar-chart-2"
                                text={t('profileIndex.analytics')}
                                onPress={() => router.push('/profile/analytics')}
                            />
                        </>
                    )}

                    {/* brand only */}
                    {isBrand && (
                        <>
                            <MenuItem
                                icon="credit-card"
                                text={t('profileIndex.payments')}
                                onPress={() => router.push('/profile/payments')}
                            />
                        </>
                    )}

                    {/* Both */}
                    <MenuItem
                        icon="eye"
                        text={t('profileIndex.view_public_profile')}
                        onPress={() => router.push(isBrand ? `/brand/${profile?.id}` : `/creators/${profile?.id}`)}
                    />

                    <MenuItem
                        icon="settings"
                        text={t('profileIndex.settings')}
                        onPress={() => router.push('/profile/settings')}
                    />
                </View>

                {/* Sign Out Button */}
                <View className="p-4 mt-6">
                    <TouchableOpacity
                        onPress={signOut}
                        className="w-full border py-3 rounded-lg flex-row justify-center items-center"
                        style={{ backgroundColor: theme.surface, borderColor: theme.errorLight }}
                    >
                        <Feather name="log-out" size={18} color={theme.error} />
                        <Text className="text-base font-semibold ml-2" style={{ color: theme.error }}>{t('profileIndex.sign_out')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileScreen;