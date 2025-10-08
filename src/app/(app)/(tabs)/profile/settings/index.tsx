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
                <ActivityIndicator size="large" color="#3b82f6" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className='flex-1' style={{ backgroundColor: theme.background }}>
            <ScrollView className="flex-1">

                {/* Notifications Section */}
                <View className="mt-4 mx-4">
                    <Text className="text-sm font-semibold  mb-2 px-2" style={{ color: theme.textTertiary }}>NOTIFICATIONS</Text>
                    <View className=" rounded-xl border border-gray-200" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
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
                                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                                thumbColor={notificationsEnabled ? '#3b82f6' : '#f3f4f6'}
                            />
                        </View>
                    </View>
                </View>

                {/* Appearance Section */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold  mb-2 px-2" style={{ color: theme.textTertiary }}>APPEARANCE</Text>
                    <View className=" rounded-xl border " style={{ backgroundColor: theme.background, borderColor: theme.border }}>
                        <TouchableOpacity
                            onPress={() => setThemeMode('light')}
                            className="flex-row items-center justify-between p-4 border-b "
                            style={{ borderColor: theme.border }}
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="sun" size={20} color="#6b7280" />
                                <Text className="text-base text-gray-800 ml-3" style={{ color: theme.text }}>Light Mode</Text>
                            </View>
                            {themeMode === 'light' && (
                                <Feather name="check" size={20} color="#3b82f6" />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setThemeMode('dark')}
                            className="flex-row items-center justify-between p-4 border-b "
                            style={{ borderColor: theme.border }}
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="moon" size={20} color="#6b7280" />
                                <Text className="text-base ml-3" style={{ color: theme.text }}>Dark Mode</Text>
                            </View>
                            {themeMode === 'dark' && (
                                <Feather name="check" size={20} color="#3b82f6" />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setThemeMode('system')}
                            className="flex-row items-center justify-between p-4"
                            style={{ borderColor: theme.border }}
                        >
                            <View className="flex-row items-center gap-2 flex-1">
                                <Feather name="smartphone" size={20} color="#6b7280" />
                                <View className="flex-1">
                                    <Text className="text-base " style={{ color: theme.text }}>System</Text>
                                    <Text className="text-sm  mt-1" style={{ color: theme.textTertiary }}>
                                        Follow device settings
                                    </Text>
                                </View>
                            </View>
                            {themeMode === 'system' && (
                                <Feather name="check" size={20} color="#3b82f6" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>


                {/* Privacy & Legal */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold mb-2 px-2" style={{ color: theme.textTertiary }}>PRIVACY & LEGAL</Text>
                    <View className="bg-white rounded-xl border border-gray-200">
                        <TouchableOpacity
                            onPress={() => openURL('https://viblo.io/privacy')}
                            className="flex-row items-center justify-between p-4 border-b border-gray-200"
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="shield" size={20} color="#6b7280" />
                                <Text className="text-base text-gray-800 ml-3">Privacy Policy</Text>
                            </View>
                            <Feather name="external-link" size={18} color="#9ca3af" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => openURL('https://viblo.io/terms')}
                            className="flex-row items-center justify-between p-4"
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="file-text" size={20} color="#6b7280" />
                                <Text className="text-base text-gray-800 ml-3">Terms of Service</Text>
                            </View>
                            <Feather name="external-link" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Support */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold text-gray-500 mb-2 px-2">SUPPORT</Text>
                    <View className="bg-white rounded-xl border border-gray-200">
                        <TouchableOpacity
                            onPress={() => openURL('https://viblo.io/en/contact')}
                            className="flex-row items-center justify-between p-4"
                        >
                            <View className="flex-row items-center flex-1">
                                <Feather name="help-circle" size={20} color="#6b7280" />
                                <Text className="text-base text-gray-800 ml-3">Contact Support</Text>
                            </View>
                            <Feather name="external-link" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* About */}
                <View className="mt-6 mx-4">
                    <Text className="text-sm font-semibold text-gray-500 mb-2 px-2">ABOUT</Text>
                    <View className="bg-white rounded-xl border border-gray-200 p-4">
                        <View className="flex-row items-center mb-2">
                            <Feather name="info" size={20} color="#6b7280" />
                            <Text className="text-base font-semibold text-gray-800 ml-3">Viblo</Text>
                        </View>
                        <Text className="text-sm text-gray-500">Version 1.0</Text>
                        <Text className="text-sm text-gray-500 mt-2">
                            Connecting brands with creators for authentic influencer marketing campaigns.
                        </Text>
                    </View>
                </View>

                {/* Danger Zone */}
                <View className="mt-6 mx-4 mb-8">
                    <Text className="text-sm font-semibold text-gray-500 mb-2 px-2">DANGER ZONE</Text>
                    <TouchableOpacity
                        onPress={handleDeleteAccount}
                        disabled={deleting}
                        className="bg-white rounded-xl border-2 border-red-300 p-4"
                    >
                        {deleting ? (
                            <View className="flex-row items-center justify-center">
                                <ActivityIndicator color="#ef4444" />
                                <Text className="text-red-600 font-semibold ml-2">Deleting...</Text>
                            </View>
                        ) : (
                            <View className="flex-row items-center">
                                <Feather name="trash-2" size={20} color="#ef4444" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-base font-semibold text-red-600">Delete Account</Text>
                                    <Text className="text-sm text-gray-500 mt-1">
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