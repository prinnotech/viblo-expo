import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { useAuth } from '@/contexts/AuthContext';
import ProfileBrandForm from '@/components/ProfileBrandForm';
import ProfileCreatorForm from '@/components/ProfileCreatorForm';

const EditPage = () => {
    const { profile, isLoading } = useAuth();
    
    if (isLoading) return <ActivityIndicator size="large" color="#3B82F6" />;
    
    return profile?.user_type === 'brand' 
        ? <ProfileBrandForm profile={profile} />
        : <ProfileCreatorForm profile={profile} />;
}

export default EditPage

