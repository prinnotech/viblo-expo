import { Alert, StyleSheet, View, AppState, TextInput, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from 'react-native'
import { supabase } from '@/lib/supabase'
import { Link } from 'expo-router'
import PasswordInput from '@/components/PasswordInput'

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh()
    } else {
        supabase.auth.stopAutoRefresh()
    }
})


const SignIn = () => {

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)


    async function signInWithEmail() {
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        })
        if (error) Alert.alert(error.message)
        setLoading(false)
    }



    return (
        <SafeAreaView className="flex-1  bg-gray-100 ">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className='flex-1 justify-center p-4'
            >
                <View className="p-8 mx-auto w-full max-w-sm bg-white rounded-xl shadow-lg">
                    <Text className="text-3xl font-bold text-center text-gray-800 mb-6">Welcome Back</Text>

                    {/* Email Input */}
                    <TextInput
                        className="w-full px-4 py-3 mb-4 bg-gray-50 border border-gray-300 rounded-lg text-base text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                        onChangeText={(text) => setEmail(text)}
                        value={email}
                        placeholder="email@address.com"
                        autoCapitalize={'none'}
                        keyboardType="email-address"
                    />

                    {/* Password Input */}

                    <PasswordInput
                        onChangeText={(text) => setPassword(text)}
                        value={password}
                        placeholder="Password"
                    />


                    {/* Sign In Button */}
                    <TouchableOpacity
                        onPress={signInWithEmail}
                        disabled={loading}
                        className="w-full bg-blue-600 py-3 rounded-lg flex-row justify-center items-center disabled:bg-gray-400"
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white text-lg font-semibold">Sign In</Text>
                        )}
                    </TouchableOpacity>

                    {/* Sign Up Link */}
                    <Text className="text-center text-gray-500 mt-6">
                        Don't have an account?{' '}
                        <Link href="/sign-up" className="font-semibold text-blue-600">
                            Sign Up
                        </Link>
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default SignIn

