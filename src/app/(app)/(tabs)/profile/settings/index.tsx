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
import { registerForPushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/contexts/ThemeContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.214:3001';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

const SettingsPage = () => {
    const router = useRouter();
    const { profile, session } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const { theme, themeMode, isDark, setThemeMode } = useTheme();


    useEffect(() => {
        if (profile) {
            setNotificationsEnabled(!!profile.push_token);
            setLoading(false);
        }
    }, [profile]);

    const handleNotificationToggle = async (value: boolean) => {
        setNotificationsEnabled(value);

        if (value) {
            const token = await registerForPushNotifications();
            if (token) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ push_token: token })
                    .eq('id', session?.user?.id);

                if (error) {
                    Alert.alert('Error', 'Failed to enable notifications');
                    setNotificationsEnabled(false);
                } else {
                    Alert.alert('Success', 'Notifications enabled!');
                }
            } else {
                Alert.alert('Permission Denied', 'Please enable notifications in your device settings');
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
                Alert.alert('Success', 'Notifications disabled');
            }
        }
    };

    const openURL = async (url: string) => {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'Cannot open URL');
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone. Your account will be deactivated and all your data will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
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
                'Account Deleted',
                'Your account has been scheduled for deletion. You will be logged out now.'
            );
        } catch (error: any) {
            console.error('Error deleting account:', error);
            Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
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
                    <Text className="text-sm font-semibold  mb-2 px-2" style={{ color: theme.textTertiary }}>NOTIFICATIONS</Text>
                    <View className=" rounded-xl" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                        <View className="flex-row justify-between items-center p-4">
                            <View className="flex-1 mr-4">
                                <Text className="text-base font-semibold " style={{ color: theme.text }}>Push Notifications</Text>
                                <Text className="text-sm  mt-1" style={{ color: theme.textTertiary }}>
                                    Receive updates about campaigns, messages, and activity
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
                    <Text className="text-sm font-semibold  mb-2 px-2" style={{ color: theme.textTertiary }}>APPEARANCE</Text>
                    <View className=" rounded-xl" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                        <TouchableOpacity
                            onPress={() => setThemeMode('light')}
                            className="flex-row items-center justify-between p-4"
                            style={{ borderBottomColor: theme.border, borderBottomWidth: 1 }}
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="sun" size={20} color={theme.textSecondary} />
                                <Text className="text-base ml-3" style={{ color: theme.text }}>Light Mode</Text>
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
                                <Text className="text-base ml-3" style={{ color: theme.text }}>Dark Mode</Text>
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
                                    <Text className="text-base " style={{ color: theme.text }}>System</Text>
                                    <Text className="text-sm mt-1" style={{ color: theme.textTertiary }}>
                                        Follow device settings
                                    </Text>
                                </View>
                            </View>
                            {themeMode === 'system' && (
                                <Feather name="check" size={20} color={theme.primary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>


                {/* Privacy & Legal */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold mb-2 px-2" style={{ color: theme.textTertiary }}>PRIVACY & LEGAL</Text>
                    <View className="rounded-xl" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                        <TouchableOpacity
                            onPress={() => openURL('https://viblo.io/privacy')}
                            className="flex-row items-center justify-between p-4"
                            style={{ borderBottomColor: theme.border, borderBottomWidth: 1 }}
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="shield" size={20} color={theme.textSecondary} />
                                <Text className="text-base ml-3" style={{ color: theme.text }}>Privacy Policy</Text>
                            </View>
                            <Feather name="external-link" size={18} color={theme.textTertiary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => openURL('https://viblo.io/terms')}
                            className="flex-row items-center justify-between p-4"
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="file-text" size={20} color={theme.textSecondary} />
                                <Text className="text-base ml-3" style={{ color: theme.text }}>Terms of Service</Text>
                            </View>
                            <Feather name="external-link" size={18} color={theme.textTertiary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Support */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold mb-2 px-2" style={{ color: theme.textTertiary }}>SUPPORT</Text>
                    <View className="rounded-xl" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                        <TouchableOpacity
                            onPress={() => openURL('https://viblo.io/en/contact')}
                            className="flex-row items-center justify-between p-4"
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="help-circle" size={20} color={theme.textSecondary} />
                                <Text className="text-base ml-3" style={{ color: theme.text }}>Contact Support</Text>
                            </View>
                            <Feather name="external-link" size={18} color={theme.textTertiary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* About */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold mb-2 px-2" style={{ color: theme.textTertiary }}>ABOUT</Text>
                    <View className="rounded-xl p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                        <View className="flex-row items-center mb-2">
                            <Feather name="info" size={20} color={theme.textSecondary} />
                            <Text className="text-base font-semibold ml-3" style={{ color: theme.text }}>Viblo</Text>
                        </View>
                        <Text className="text-sm" style={{ color: theme.textTertiary }}>Version 1.0</Text>
                        <Text className="text-sm mt-2" style={{ color: theme.textTertiary }}>
                            Connecting brands with creators for authentic influencer marketing campaigns.
                        </Text>
                    </View>
                </View>

                {/* Danger Zone */}
                <View className="mt-6 mx-4 mb-8">
                    <Text className="text-sm font-semibold mb-2 px-2" style={{ color: theme.textTertiary }}>DANGER ZONE</Text>
                    <TouchableOpacity
                        onPress={handleDeleteAccount}
                        disabled={deleting}
                        className="rounded-xl p-4"
                        style={{ backgroundColor: theme.surface, borderColor: theme.error, borderWidth: 2 }}
                    >
                        {deleting ? (
                            <View className="flex-row items-center justify-center">
                                <ActivityIndicator color={theme.error} />
                                <Text className="font-semibold ml-2" style={{ color: theme.error }}>Deleting...</Text>
                            </View>
                        ) : (
                            <View className="flex-row items-center">
                                <Feather name="trash-2" size={20} color={theme.error} />
                                <View className="ml-3 flex-1">
                                    <Text className="text-base font-semibold" style={{ color: theme.error }}>Delete Account</Text>
                                    <Text className="text-sm mt-1" style={{ color: theme.textTertiary }}>
                                        Permanently delete your account and all data
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
