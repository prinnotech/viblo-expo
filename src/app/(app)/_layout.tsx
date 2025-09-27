import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'

const Layout = () => {

    const { user, isLoading } = useAuth();

    console.log("user", user)

    const isSignedIn = user ? true : false

    if(isLoading){
        return (
            <View className='flex-1 items-center justify-center'>
                <ActivityIndicator size='large' color='#0000ff'/>
            </View>
        )
    }

    return (
        <Stack>
            <Stack.Protected guard={isSignedIn}>
                <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
            </Stack.Protected>

            <Stack.Protected guard={!isSignedIn}>
                <Stack.Screen name='sign-in' options={{ headerShown: false }} />
                <Stack.Screen name='sign-up' options={{ headerShown: false }} />
            </Stack.Protected>
        </Stack>
    )
}

export default Layout

