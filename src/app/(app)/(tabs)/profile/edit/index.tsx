import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProfileBrandForm from '@/components/ProfileBrandForm';
import ProfileCreatorForm from '@/components/ProfileCreatorForm';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const EditPage = () => {
    const { profile, isLoading } = useAuth();
    const { theme } = useTheme();

    if (isLoading || !profile) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }

    return profile?.user_type === 'brand'
        ? <ProfileBrandForm profile={profile} />
        : <ProfileCreatorForm profile={profile} />;
}

export default EditPage;
