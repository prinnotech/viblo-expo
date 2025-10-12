import { Alert, Image, View, TextInput, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { Link, useRouter } from 'expo-router'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { makeRedirectUri } from 'expo-auth-session'

const imageFavicon = require('@/../assets/favicon.png')

const ForgotPassword = () => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter();

    // This must point to the screen where the user can reset their password.
    // The deep link handler in _layout.tsx will create the session.
    const redirectTo = __DEV__
        ? 'exp://192.168.1.214:8081/--/reset-password'  // Development: custom scheme
        : makeRedirectUri({        // Production: proper redirect
            scheme: 'viblo',
            path: 'reset-password'
        })

    async function sendPasswordResetEmail() {
        setLoading(true)
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectTo,
        })

        if (error) {
            Alert.alert(t('forgot_password.error_title'), error.message)
        } else {
            Alert.alert(t('forgot_password.success_title'), t('forgot_password.success_message'))
            router.push('/sign-in');
        }
        setLoading(false)
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

                    <Text className="text-3xl font-bold text-center mb-2" style={{ color: theme.text }}>
                        {t('forgot_password.title')}
                    </Text>
                    <Text className="text-center mb-6" style={{ color: theme.textTertiary }}>
                        {t('forgot_password.subtitle')}
                    </Text>

                    <TextInput
                        className="w-full px-4 py-3 mb-4 rounded-lg text-base"
                        style={{
                            backgroundColor: theme.background,
                            borderColor: theme.borderLight,
                            borderWidth: 1,
                            color: theme.textSecondary,
                        }}
                        onChangeText={(text) => setEmail(text)}
                        value={email}
                        placeholder={t('forgot_password.email_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                        autoCapitalize={'none'}
                        keyboardType="email-address"
                    />

                    <TouchableOpacity
                        onPress={sendPasswordResetEmail}
                        disabled={loading}
                        className="w-full py-3 rounded-lg flex-row justify-center items-center"
                        style={{ backgroundColor: loading ? theme.textTertiary : theme.primary }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                                {t('forgot_password.send_link_button')}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <Text className="text-center mt-6" style={{ color: theme.textTertiary }}>
                        <Link href="/sign-in">
                            <Text className="font-semibold" style={{ color: theme.primary }}>
                                {t('forgot_password.back_to_signin')}
                            </Text>
                        </Link>
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default ForgotPassword
