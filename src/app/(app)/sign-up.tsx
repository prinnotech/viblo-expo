import { Alert, Image, View, AppState, TextInput, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { Link } from 'expo-router'
import PasswordInput from '@/components/PasswordInput'
import { useTheme } from '@/contexts/ThemeContext'

const imageFavicon = require('@/../assets/favicon.png')

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground.
AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh()
    } else {
        supabase.auth.stopAutoRefresh()
    }
})

const SignUp = () => {
    const { theme } = useTheme();
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    async function signUpWithEmail() {
        setLoading(true)
        const {
            data: { session },
            error,
        } = await supabase.auth.signUp({
            email: email,
            password: password,
        })
        if (error) Alert.alert(error.message)
        if (!session) Alert.alert('Please check your inbox for email verification!')
        setLoading(false)
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className='flex-1 justify-center p-4'
            >
                <View className="p-8 mx-auto w-full max-w-sm rounded-xl shadow-lg" style={{ backgroundColor: theme.surface }}>

                    {/* Logo */}
                    <View>
                        <Image
                            source={imageFavicon}
                            className="w-20 h-20 mx-auto mb-4"
                            resizeMode="contain"
                        />
                    </View>

                    <Text className="text-3xl font-bold text-center mb-6" style={{ color: theme.text }}>Welcome!</Text>

                    {/* Email Input */}
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
                        placeholder="email@address.com"
                        placeholderTextColor={theme.textTertiary}
                        autoCapitalize={'none'}
                        keyboardType="email-address"
                    />

                    {/* Password Input */}
                    <PasswordInput
                        onChangeText={(text) => setPassword(text)}
                        value={password}
                        placeholder="Password"
                        placeholderTextColor={theme.textTertiary}
                    />


                    {/* Sign Up Button */}
                    <TouchableOpacity
                        onPress={signUpWithEmail}
                        disabled={loading}
                        className="w-full py-3 rounded-lg flex-row justify-center items-center"
                        style={{ backgroundColor: loading ? theme.textTertiary : theme.primary }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    {/* Sign In Link */}
                    <Text className="text-center mt-6" style={{ color: theme.textTertiary }}>
                        Already have an account?{' '}
                        <Link href="/sign-in">
                            <Text className="font-semibold" style={{ color: theme.primary }}>
                                Sign In
                            </Text>
                        </Link>
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default SignUp
