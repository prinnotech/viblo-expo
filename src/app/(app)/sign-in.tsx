import { Alert, Image, View, AppState, TextInput, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { Link } from 'expo-router'
import PasswordInput from '@/components/PasswordInput'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Feather } from '@expo/vector-icons'

const imageFavicon = require('@/../assets/favicon.png')

// Try to load GoogleSignin dynamically
let GoogleSignin: any = null;
let isGoogleSignInAvailable = false;
try {
    const googleModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleModule.GoogleSignin;
    isGoogleSignInAvailable = true;
    console.log('✅ Google Sign-In available');
} catch (e) {
    console.log('⚠️ Google Sign-In not available');
}

AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh()
    } else {
        supabase.auth.stopAutoRefresh()
    }
})

const SignIn = () => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)

    async function signInWithEmail() {
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        })
        if (error) Alert.alert(error.message)
        setLoading(false)
    }

    async function signInWithGoogle() {
        if (!isGoogleSignInAvailable || !GoogleSignin) {
            Alert.alert('Not Available', 'Google Sign-In requires the latest build. Please use email/password.');
            return;
        }

        try {
            setGoogleLoading(true)
            await GoogleSignin.hasPlayServices()
            const userInfo = await GoogleSignin.signIn()

            if (userInfo.data?.idToken) {
                const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: userInfo.data.idToken,
                })

                if (error) {
                    Alert.alert('Error', error.message)
                }
            } else {
                Alert.alert('Error', 'No ID token present!')
            }
        } catch (error: any) {
            console.error('Google Sign-In Error:', error)
            Alert.alert('Error', error.message || 'Failed to sign in with Google')
        } finally {
            setGoogleLoading(false)
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
                        {t('signin.welcome_back')}
                    </Text>

                    {/* Only show Google button if module is available */}
                    {isGoogleSignInAvailable && (
                        <>
                            <TouchableOpacity
                                onPress={signInWithGoogle}
                                disabled={googleLoading}
                                className="w-full py-3 mb-4 rounded-lg flex-row justify-center items-center border"
                                style={{
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border
                                }}
                            >
                                {googleLoading ? (
                                    <ActivityIndicator color={theme.primary} />
                                ) : (
                                    <>
                                        <Feather name="chrome" size={20} color={theme.text} />
                                        <Text className="ml-2 text-base font-semibold" style={{ color: theme.text }}>
                                            Continue with Google
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <View className="flex-row items-center my-4">
                                <View className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
                                <Text className="mx-4" style={{ color: theme.textTertiary }}>or</Text>
                                <View className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
                            </View>
                        </>
                    )}

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
                        placeholder={t('signin.email_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                        autoCapitalize={'none'}
                        keyboardType="email-address"
                    />

                    <PasswordInput
                        onChangeText={(text) => setPassword(text)}
                        value={password}
                        placeholder={t('signin.password_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                    />

                    <TouchableOpacity
                        onPress={signInWithEmail}
                        disabled={loading}
                        className="w-full py-3 rounded-lg flex-row justify-center items-center"
                        style={{ backgroundColor: loading ? theme.textTertiary : theme.primary }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
                                {t('signin.sign_in_button')}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <Text className="text-center mt-6" style={{ color: theme.textTertiary }}>
                        {t('signin.no_account_prompt')}
                        <Link href="/sign-up">
                            <Text className="font-semibold" style={{ color: theme.primary }}>
                                {t('signin.sign_up_link')}
                            </Text>
                        </Link>
                    </Text>

                    <Text className="text-center mt-6" style={{ color: theme.textTertiary }}>
                        {t('signin.forgot_password')}
                        <Link href="/forgot-password">
                            <Text className="font-semibold" style={{ color: theme.primary }}>
                                {t('signin.forgot_password_link')}
                            </Text>
                        </Link>
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default SignIn