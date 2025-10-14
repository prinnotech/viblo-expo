import { Alert, Image, View, TextInput, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import PasswordInput from '@/components/PasswordInput'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'

const imageFavicon = require('@/../assets/favicon.png')

const ResetPassword = () => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { user, profile, getProfile } = useAuth();
    const router = useRouter();

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const email = user?.email || '';

    // Check if user needs onboarding
    const hasProfile = profile && profile?.username && profile?.user_type;

    async function updatePassword() {
        if (password !== confirmPassword) {
            Alert.alert(t('reset_password.error_title'), t('reset_password.passwords_not_match'));
            return;
        }
        if (password.length < 6) {
            Alert.alert(t('reset_password.error_title'), t('reset_password.password_too_short'));
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) {
                Alert.alert(t('reset_password.error_title'), error.message);
                setLoading(false);
                return;
            }

            // Refresh the profile to ensure we have the latest data
            await getProfile();

            Alert.alert(
                t('reset_password.success_title'),
                t('reset_password.success_message'),
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setLoading(false);
                            // Navigate based on profile completion
                            if (hasProfile) {
                                router.replace('/(tabs)');
                            } else {
                                router.replace('/onboarding');
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error updating password:', error);
            Alert.alert(t('reset_password.error_title'), 'An unexpected error occurred');
            setLoading(false);
        }
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className='flex-1 justify-center p-4'
            >
                <View className="p-8 mx-auto w-full max-w-sm rounded-xl shadow-lg" style={{ backgroundColor: theme.surface }}>
                    <View>
                        <Image
                            source={imageFavicon}
                            className="w-20 h-20 mx-auto mb-4"
                            resizeMode="contain"
                        />
                    </View>

                    <Text className="text-3xl font-bold text-center mb-6" style={{ color: theme.text }}>
                        {t('reset_password.title')}
                    </Text>

                    <TextInput
                        className="w-full px-4 py-3 mb-4 rounded-lg text-base"
                        style={{
                            backgroundColor: theme.background,
                            borderColor: theme.borderLight,
                            borderWidth: 1,
                            color: theme.textTertiary,
                        }}
                        value={email}
                        editable={false}
                    />

                    <PasswordInput
                        onChangeText={(text) => setPassword(text)}
                        value={password}
                        placeholder={t('reset_password.password_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                    />

                    <PasswordInput
                        onChangeText={(text) => setConfirmPassword(text)}
                        value={confirmPassword}
                        placeholder={t('reset_password.confirm_password_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                    />

                    <TouchableOpacity
                        onPress={updatePassword}
                        disabled={loading}
                        className="w-full py-3 rounded-lg flex-row justify-center items-center mt-2"
                        style={{ backgroundColor: loading ? theme.textTertiary : theme.primary }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                                {t('reset_password.update_button')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default ResetPassword;