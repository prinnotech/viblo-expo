// app/(app)/(tabs)/profile/settings/index.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    Linking,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { registerForPushNotifications, checkNotificationPermissions, openAppSettings } from '@/hooks/usePushNotifications';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.214:3001';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

const SettingsPage = () => {
    const router = useRouter();
    const { profile, session } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const { theme, themeMode, isDark, setThemeMode } = useTheme();
    const { t, language } = useLanguage();

    useEffect(() => {
        if (profile) {
            setNotificationsEnabled(!!profile.push_token);
            setLoading(false);
        }
    }, [profile]);

    const handleNotificationToggle = async (value: boolean) => {
        if (value) {
            // Check current permission state first
            const { granted, canAskAgain } = await checkNotificationPermissions();

            if (!granted && !canAskAgain) {
                // Permission was permanently denied, show dialog to go to settings
                Alert.alert(
                    t('profileSettings.permission_denied'),
                    t('profileSettings.notification_permission_settings'),
                    [
                        { text: t('profileSettings.cancel'), style: 'cancel' },
                        {
                            text: t('profileSettings.open_settings'),
                            onPress: () => openAppSettings()
                        }
                    ]
                );
                return;
            }

            const token = await registerForPushNotifications();

            if (token === 'PERMISSION_DENIED_GO_TO_SETTINGS') {
                // User denied and can't be asked again
                Alert.alert(
                    t('profileSettings.permission_denied'),
                    t('profileSettings.notification_permission_settings'),
                    [
                        { text: t('profileSettings.cancel'), style: 'cancel' },
                        {
                            text: t('profileSettings.open_settings'),
                            onPress: () => openAppSettings()
                        }
                    ]
                );
                setNotificationsEnabled(false);
                return;
            }

            if (token) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ push_token: token })
                    .eq('id', session?.user?.id);

                if (error) {
                    Alert.alert(t('profileSettings.error'), t('profileSettings.failed_enable_notifications'));
                    setNotificationsEnabled(false);
                } else {
                    Alert.alert(t('profileSettings.success'), t('profileSettings.notifications_enabled'));
                    setNotificationsEnabled(true);
                }
            } else {
                Alert.alert(t('profileSettings.permission_denied'), t('profileSettings.enable_notifications_settings'));
                setNotificationsEnabled(false);
            }
        } else {
            const { error } = await supabase
                .from('profiles')
                .update({ push_token: null })
                .eq('id', session?.user?.id);

            if (error) {
                console.error('Error clearing push token:', error);
            } else {
                Alert.alert(t('profileSettings.success'), t('profileSettings.notifications_disabled'));
                setNotificationsEnabled(false);
            }
        }
    };

    const openURL = async (url: string) => {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        } else {
            Alert.alert(t('profileSettings.error'), t('profileSettings.cannot_open_url'));
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('profileSettings.delete_account_title'),
            t('profileSettings.delete_account_confirm'),
            [
                { text: t('profileSettings.cancel'), style: 'cancel' },
                {
                    text: t('profileSettings.delete'),
                    style: 'destructive',
                    onPress: confirmDelete,
                },
            ]
        );
    };

    const confirmDelete = async () => {
        setDeleting(true);

        try {
            // Call backend to deactivate account
            const response = await fetch(`${BACKEND_URL}/api/users/delete-account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY!,
                },
                body: JSON.stringify({
                    userId: session?.user?.id,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete account');
            }

            // Don't wait for backend - logout immediately
            await supabase.auth.signOut();
            Alert.alert(
                t('profileSettings.account_deleted'),
                t('profileSettings.account_deleted_message')
            );
        } catch (error: any) {
            console.error('Error deleting account:', error);
            Alert.alert(t('profileSettings.error'), t('profileSettings.failed_delete_account'));
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className='flex-1' style={{ backgroundColor: theme.background }}>
            <ScrollView className="flex-1">

                {/* Notifications Section */}
                <View className="mt-4 mx-4">
                    <Text className="text-sm font-semibold  mb-2 px-2" style={{ color: theme.textTertiary }}>{t('profileSettings.notifications')}</Text>
                    <View className=" rounded-xl" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                        <View className="flex-row justify-between items-center p-4">
                            <View className="flex-1 mr-4">
                                <Text className="text-base font-semibold " style={{ color: theme.text }}>{t('profileSettings.push_notifications')}</Text>
                                <Text className="text-sm  mt-1" style={{ color: theme.textTertiary }}>
                                    {t('profileSettings.push_notifications_description')}
                                </Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={handleNotificationToggle}
                                trackColor={{ false: theme.border, true: theme.primaryLight }}
                                thumbColor={notificationsEnabled ? theme.primary : theme.surfaceSecondary}
                            />
                        </View>
                    </View>
                </View>

                {/* Appearance Section */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold  mb-2 px-2" style={{ color: theme.textTertiary }}>{t('profileSettings.appearance')}</Text>
                    <View className=" rounded-xl" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                        <TouchableOpacity
                            onPress={() => setThemeMode('light')}
                            className="flex-row items-center justify-between p-4"
                            style={{ borderBottomColor: theme.border, borderBottomWidth: 1 }}
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="sun" size={20} color={theme.textSecondary} />
                                <Text className="text-base ml-3" style={{ color: theme.text }}>{t('profileSettings.light_mode')}</Text>
                            </View>
                            {themeMode === 'light' && (
                                <Feather name="check" size={20} color={theme.primary} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setThemeMode('dark')}
                            className="flex-row items-center justify-between p-4"
                            style={{ borderBottomColor: theme.border, borderBottomWidth: 1 }}
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="moon" size={20} color={theme.textSecondary} />
                                <Text className="text-base ml-3" style={{ color: theme.text }}>{t('profileSettings.dark_mode')}</Text>
                            </View>
                            {themeMode === 'dark' && (
                                <Feather name="check" size={20} color={theme.primary} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setThemeMode('system')}
                            className="flex-row items-center justify-between p-4"
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="smartphone" size={20} color={theme.textSecondary} />
                                <View className="ml-3 flex-1">
                                    <Text className="text-base " style={{ color: theme.text }}>{t('profileSettings.system')}</Text>
                                    <Text className="text-sm mt-1" style={{ color: theme.textTertiary }}>
                                        {t('profileSettings.follow_device_settings')}
                                    </Text>
                                </View>
                            </View>
                            {themeMode === 'system' && (
                                <Feather name="check" size={20} color={theme.primary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Language Section */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold mb-2 px-2" style={{ color: theme.textTertiary }}>{t('profileSettings.language')}</Text>
                    <View className="rounded-xl p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                        <Text className="text-sm mb-4" style={{ color: theme.textSecondary }}>
                            {t('profileSettings.select_language')}
                        </Text>
                        <LanguageSwitcher variant="default" />
                    </View>
                </View>

                {/* Privacy & Legal */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold mb-2 px-2" style={{ color: theme.textTertiary }}>{t('profileSettings.privacy_legal')}</Text>
                    <View className="rounded-xl" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                        <TouchableOpacity
                            onPress={() => openURL(`https://viblo.io/${language}/privacy`)}
                            className="flex-row items-center justify-between p-4"
                            style={{ borderBottomColor: theme.border, borderBottomWidth: 1 }}
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="shield" size={20} color={theme.textSecondary} />
                                <Text className="text-base ml-3" style={{ color: theme.text }}>{t('profileSettings.privacy_policy')}</Text>
                            </View>
                            <Feather name="external-link" size={18} color={theme.textTertiary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => openURL(`https://viblo.io/${language}/terms`)}
                            className="flex-row items-center justify-between p-4"
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="file-text" size={20} color={theme.textSecondary} />
                                <Text className="text-base ml-3" style={{ color: theme.text }}>{t('profileSettings.terms_of_service')}</Text>
                            </View>
                            <Feather name="external-link" size={18} color={theme.textTertiary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Support */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold mb-2 px-2" style={{ color: theme.textTertiary }}>{t('profileSettings.support')}</Text>
                    <View className="rounded-xl" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                        <TouchableOpacity
                            onPress={() => openURL(`https://viblo.io/${language}/contact`)}
                            className="flex-row items-center justify-between p-4"
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="help-circle" size={20} color={theme.textSecondary} />
                                <Text className="text-base ml-3" style={{ color: theme.text }}>{t('profileSettings.contact_support')}</Text>
                            </View>
                            <Feather name="external-link" size={18} color={theme.textTertiary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* About */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold mb-2 px-2" style={{ color: theme.textTertiary }}>{t('profileSettings.about')}</Text>
                    <View className="rounded-xl p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                        <View className="flex-row items-center mb-2">
                            <Feather name="info" size={20} color={theme.textSecondary} />
                            <Text className="text-base font-semibold ml-3" style={{ color: theme.text }}>{t('profileSettings.viblo')}</Text>
                        </View>
                        <Text className="text-sm" style={{ color: theme.textTertiary }}>{t('profileSettings.version')}</Text>
                        <Text className="text-sm mt-2" style={{ color: theme.textTertiary }}>
                            {t('profileSettings.app_description')}
                        </Text>
                    </View>
                </View>

                {/* Danger Zone */}
                <View className="mt-6 mx-4 mb-8">
                    <Text className="text-sm font-semibold mb-2 px-2" style={{ color: theme.textTertiary }}>{t('profileSettings.danger_zone')}</Text>
                    <TouchableOpacity
                        onPress={handleDeleteAccount}
                        disabled={deleting}
                        className="rounded-xl p-4"
                        style={{ backgroundColor: theme.surface, borderColor: theme.error, borderWidth: 2 }}
                    >
                        {deleting ? (
                            <View className="flex-row items-center justify-center">
                                <ActivityIndicator color={theme.error} />
                                <Text className="font-semibold ml-2" style={{ color: theme.error }}>{t('profileSettings.deleting')}</Text>
                            </View>
                        ) : (
                            <View className="flex-row items-center">
                                <Feather name="trash-2" size={20} color={theme.error} />
                                <View className="ml-3 flex-1">
                                    <Text className="text-base font-semibold" style={{ color: theme.error }}>{t('profileSettings.delete_account')}</Text>
                                    <Text className="text-sm mt-1" style={{ color: theme.textTertiary }}>
                                        {t('profileSettings.delete_account_description')}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsPage;