import {
    Image,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Profile as ProfileData } from '@/lib/db_interface';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { registerForPushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// Constants
const INFLUENCER_NICHES = [
    'Fashion', 'Beauty', 'Fitness', 'Food', 'Travel', 'Lifestyle',
    'Technology', 'Gaming', 'Sports', 'Music', 'Art', 'Photography',
    'Parenting', 'Business', 'Education', 'Health', 'DIY', 'Comedy'
];

const BRAND_INDUSTRIES = [
    'Fashion & Apparel', 'Beauty & Cosmetics', 'Health & Wellness', 'Food & Beverage',
    'Technology', 'Travel & Hospitality', 'Sports & Fitness', 'Entertainment',
    'Automotive', 'Finance', 'Real Estate', 'Education', 'Healthcare', 'E-commerce'
];

const Onboarding = () => {
    const { user, getProfile } = useAuth();
    const router = useRouter();
    const { theme } = useTheme();
    const { t } = useLanguage();

    // State Management
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const [profileData, setProfileData] = useState<ProfileData>({
        id: '',
        created_at: '',
        avatar_url: '',
        is_verified: false,
        username: '',
        user_type: null,
        first_name: '',
        last_name: '',
        company_name: '',
        bio: '',
        website_url: '',
        location: '',
        industry: '',
        niches: [],
        push_token: null,
        updated_at: ''
    });

    const totalSteps = 4;

    // Helper Functions
    const updateProfileData = (field: keyof ProfileData, value: any) => {
        setProfileData(prev => ({ ...prev, [field]: value }));
    };

    const toggleNiche = (niche: string) => {
        setProfileData(prev => ({
            ...prev,
            niches: prev.niches.includes(niche)
                ? prev.niches.filter(n => n !== niche)
                : prev.niches.length < 5 ? [...prev.niches, niche] : prev.niches
        }));
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('onboarding.permission_needed'), t('onboarding.photo_permission_message'));
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
                    Alert.alert(t('onboarding.file_too_large'), t('onboarding.file_size_message'));
                    return;
                }
                await uploadAvatar(asset);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert(t('onboarding.error'), t('onboarding.pick_image_error'));
        }
    };

    const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
        if (!user || !asset.uri) {
            Alert.alert(t('onboarding.error'), t('onboarding.no_image_selected'));
            return;
        }
        setUploadingAvatar(true);
        try {
            const response = await fetch(asset.uri);
            const arrayBuffer = await response.arrayBuffer();
            const fileExtension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
            const filePath = `${user.id}/profile_image.${fileExtension}`;

            const { error } = await supabase.storage
                .from('profile_avatars')
                .upload(filePath, arrayBuffer, {
                    contentType: asset.mimeType || `image/${fileExtension}`,
                    upsert: true,
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('profile_avatars')
                .getPublicUrl(filePath);

            updateProfileData('avatar_url', publicUrlData.publicUrl);
            Alert.alert(t('onboarding.success'), t('onboarding.avatar_uploaded'));
        } catch (err) {
            const error = err as Error;
            console.error('Error uploading avatar:', error.message);
            Alert.alert(t('onboarding.error'), t('onboarding.upload_avatar_error'));
        } finally {
            setUploadingAvatar(false);
        }
    };

    const removeAvatar = async () => {
        if (!profileData.avatar_url) return;
        Alert.alert(
            t('onboarding.remove_avatar'),
            t('onboarding.remove_avatar_confirm'),
            [
                { text: t('onboarding.cancel'), style: 'cancel' },
                {
                    text: t('onboarding.remove'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (profileData.avatar_url.includes('profile_avatars')) {
                                const urlParts = profileData.avatar_url.split('/');
                                const fileName = urlParts[urlParts.length - 1];
                                const filePath = `${user?.id}/${fileName}`;
                                await supabase.storage
                                    .from('profile_avatars')
                                    .remove([filePath]);
                            }
                            updateProfileData('avatar_url', '');
                        } catch (error) {
                            console.error('Error removing avatar:', error);
                        }
                    }
                }
            ]
        );
    };

    // Validation Functions
    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                return !!profileData.user_type;
            case 2:
                if (!profileData.username.trim()) return false;
                if (profileData.user_type === 'influencer') {
                    return !!profileData.first_name?.trim() && !!profileData.last_name?.trim();
                } else {
                    return !!profileData.company_name?.trim();
                }
            case 3:
            case 4:
                return true;
            default:
                return false;
        }
    };

    // Navigation Functions
    const nextStep = async () => {
        if (!validateStep(currentStep)) {
            Alert.alert(t('onboarding.error'), t('onboarding.fill_required_fields'));
            return;
        }
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        } else {
            await completeOnboarding();
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const skipStep = async () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        } else {
            await completeOnboarding();
        }
    };

    // Complete Onboarding
    const completeOnboarding = async () => {
        if (!user) {
            Alert.alert(t('onboarding.error'), t('onboarding.auth_error'));
            return;
        }
        setLoading(true);
        try {
            const dataToSave: any = {
                id: user.id,
                username: profileData.username.trim(),
                user_type: profileData.user_type,
                bio: profileData.bio.trim() || null,
                website_url: profileData.website_url.trim() || null,
                location: profileData.location.trim() || null,
                updated_at: new Date().toISOString(),
            };
            if (profileData.user_type === 'influencer') {
                dataToSave.first_name = profileData.first_name.trim();
                dataToSave.last_name = profileData.last_name.trim();
                dataToSave.niches = profileData.niches.length > 0 ? profileData.niches : null;
            } else {
                dataToSave.company_name = profileData.company_name.trim();
                dataToSave.industry = profileData.industry || null;
            }
            const { error } = await supabase.from('profiles').upsert(dataToSave);
            if (error) {
                console.error('Error saving profile:', error);
                Alert.alert(t('onboarding.error'), `${t('onboarding.save_profile_error')}: ${error.message}`);
            } else {
                await getProfile();
                router.replace('/(tabs)');
            }
        } catch (error) {
            console.error('Error completing onboarding:', error);
            const message = error instanceof Error ? error.message : 'Something went wrong.';
            Alert.alert(t('onboarding.error'), message);
        } finally {
            setLoading(false);
        }
    };

    const renderAvatarSection = () => (
        <View className="items-center mb-6 my-6">
            <Text className="font-medium mb-4" style={{ color: theme.textSecondary }}>
                {t('onboarding.profile_picture')}
            </Text>
            <View className="relative">
                <TouchableOpacity
                    onPress={pickImage}
                    disabled={uploadingAvatar}
                    className="w-24 h-24 rounded-full border-2 border-dashed items-center justify-center overflow-hidden"
                    style={{ backgroundColor: theme.surfaceSecondary, borderColor: theme.borderLight }}
                >
                    {uploadingAvatar ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                    ) : profileData.avatar_url ? (
                        <Image
                            source={{ uri: profileData.avatar_url }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="items-center">
                            <Ionicons name="camera" size={24} color={theme.textSecondary} />
                            <Text className="text-xs mt-1" style={{ color: theme.textTertiary }}>
                                {t('onboarding.add_photo')}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                {profileData.avatar_url && !uploadingAvatar && (
                    <TouchableOpacity
                        onPress={removeAvatar}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full items-center justify-center"
                        style={{ backgroundColor: theme.error }}
                    >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                )}
            </View>
            <Text className="text-xs mt-2 text-center" style={{ color: theme.textTertiary }}>
                {t('onboarding.upload_avatar_text')}
            </Text>
        </View>
    );

    // Step Components
    const renderUserTypeStep = () => (
        <View className="flex-1 p-6">
            {/* Language Switcher at the top */}
            <View className="mb-6">
                <LanguageSwitcher variant="compact" />
            </View>

            <Text className="text-2xl font-bold mb-2" style={{ color: theme.text }}>
                {t('onboarding.user_type_title')}
            </Text>
            <Text className="mb-8" style={{ color: theme.textSecondary }}>
                {t('onboarding.user_type_subtitle')}
            </Text>
            <View className="space-y-4">
                <TouchableOpacity
                    onPress={() => updateProfileData('user_type', 'influencer')}
                    className={`p-6 rounded-xl border-2 my-2`}
                    style={{
                        borderColor: profileData.user_type === 'influencer' ? theme.primary : theme.border,
                        backgroundColor: theme.surface,
                    }}
                >
                    <View className="flex-row items-center">
                        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4`}
                            style={{ backgroundColor: theme.surfaceSecondary }}>
                            <Ionicons
                                name="person"
                                size={24}
                                color={profileData.user_type === 'influencer' ? theme.primary : theme.textSecondary}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className={`text-lg font-semibold`} style={{ color: profileData.user_type === 'influencer' ? theme.primary : theme.text }}>
                                {t('onboarding.influencer_title')}
                            </Text>
                            <Text className="mt-1" style={{ color: theme.textSecondary }}>
                                {t('onboarding.influencer_subtitle')}
                            </Text>
                        </View>
                        {profileData.user_type === 'influencer' && (
                            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                        )}
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => updateProfileData('user_type', 'brand')}
                    className={`p-6 rounded-xl border-2 my-2`}
                    style={{
                        borderColor: profileData.user_type === 'brand' ? theme.primary : theme.border,
                        backgroundColor: theme.surface,
                    }}
                >
                    <View className="flex-row items-center">
                        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4`}
                            style={{ backgroundColor: theme.surfaceSecondary }}>
                            <Ionicons
                                name="business"
                                size={24}
                                color={profileData.user_type === 'brand' ? theme.primary : theme.textSecondary}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className={`text-lg font-semibold`} style={{ color: profileData.user_type === 'brand' ? theme.primary : theme.text }}>
                                {t('onboarding.brand_title')}
                            </Text>
                            <Text className="mt-1" style={{ color: theme.textSecondary }}>
                                {t('onboarding.brand_subtitle')}
                            </Text>
                        </View>
                        {profileData.user_type === 'brand' && (
                            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderBasicInfoStep = () => (
        <ScrollView className="flex-1 p-6">
            <Text className="text-2xl font-bold mb-2" style={{ color: theme.text }}>
                {t('onboarding.basic_info_title')}
            </Text>
            <Text className="mb-8" style={{ color: theme.textSecondary }}>
                {profileData.user_type === 'influencer'
                    ? t('onboarding.basic_info_subtitle_influencer')
                    : t('onboarding.basic_info_subtitle_brand')}
            </Text>
            <View className="gap-4">
                <View>
                    <Text className="font-medium mb-2" style={{ color: theme.textSecondary }}>
                        {t('onboarding.username')} *
                    </Text>
                    <TextInput
                        value={profileData.username}
                        onChangeText={(text) => updateProfileData('username', text)}
                        placeholder={t('onboarding.username_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                        className="w-full px-4 py-3 rounded-lg text-base"
                        style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, borderWidth: 1, color: theme.text }}
                        autoCapitalize="none"
                    />
                </View>
                {profileData.user_type === 'influencer' ? (
                    <>
                        <View>
                            <Text className="font-medium mb-2" style={{ color: theme.textSecondary }}>
                                {t('onboarding.first_name')} *
                            </Text>
                            <TextInput
                                value={profileData.first_name}
                                onChangeText={(text) => updateProfileData('first_name', text)}
                                placeholder={t('onboarding.first_name_placeholder')}
                                placeholderTextColor={theme.textTertiary}
                                className="w-full px-4 py-3 rounded-lg text-base"
                                style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, borderWidth: 1, color: theme.text }}
                            />
                        </View>
                        <View>
                            <Text className="font-medium mb-2" style={{ color: theme.textSecondary }}>
                                {t('onboarding.last_name')} *
                            </Text>
                            <TextInput
                                value={profileData.last_name}
                                onChangeText={(text) => updateProfileData('last_name', text)}
                                placeholder={t('onboarding.last_name_placeholder')}
                                placeholderTextColor={theme.textTertiary}
                                className="w-full px-4 py-3 rounded-lg text-base"
                                style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, borderWidth: 1, color: theme.text }}
                            />
                        </View>
                    </>
                ) : (
                    <View>
                        <Text className="font-medium mb-2" style={{ color: theme.textSecondary }}>
                            {t('onboarding.company_name')} *
                        </Text>
                        <TextInput
                            value={profileData.company_name}
                            onChangeText={(text) => updateProfileData('company_name', text)}
                            placeholder={t('onboarding.company_name_placeholder')}
                            placeholderTextColor={theme.textTertiary}
                            className="w-full px-4 py-3 rounded-lg text-base"
                            style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, borderWidth: 1, color: theme.text }}
                        />
                    </View>
                )}
            </View>
            {renderAvatarSection()}
        </ScrollView>
    );

    const renderProfileDetailsStep = () => (
        <View className="flex-1 p-6">
            <Text className="text-2xl font-bold mb-2" style={{ color: theme.text }}>
                {t('onboarding.profile_details_title')}
            </Text>
            <Text className="mb-8" style={{ color: theme.textSecondary }}>
                {t('onboarding.profile_details_subtitle')}
            </Text>
            <View className="space-y-4 gap-4">
                <View>
                    <Text className="font-medium mb-2" style={{ color: theme.textSecondary }}>
                        {t('onboarding.bio')}
                    </Text>
                    <TextInput
                        value={profileData.bio}
                        onChangeText={(text) => updateProfileData('bio', text)}
                        placeholder={profileData.user_type === 'influencer'
                            ? t('onboarding.bio_placeholder_influencer')
                            : t('onboarding.bio_placeholder_brand')}
                        placeholderTextColor={theme.textTertiary}
                        className="w-full px-4 py-3 rounded-lg text-base h-24"
                        style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, borderWidth: 1, color: theme.text }}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>
                <View>
                    <Text className="font-medium mb-2" style={{ color: theme.textSecondary }}>
                        {t('onboarding.website')}
                    </Text>
                    <TextInput
                        value={profileData.website_url}
                        onChangeText={(text) => updateProfileData('website_url', text)}
                        placeholder={t('onboarding.website_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                        className="w-full px-4 py-3 rounded-lg text-base"
                        style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, borderWidth: 1, color: theme.text }}
                        autoCapitalize="none"
                        keyboardType="url"
                    />
                </View>
                <View style={{ zIndex: 1 }}>
                    <Text className="font-medium mb-2" style={{ color: theme.textSecondary }}>
                        {t('onboarding.location')}
                    </Text>
                    <GooglePlacesAutocomplete
                        placeholder={t('onboarding.location_placeholder')}
                        onPress={(data, details = null) => {
                            updateProfileData('location', data.description);
                        }}
                        onFail={(error) => console.error("Google Places API Error:", error)}
                        query={{
                            key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
                            language: 'en',
                            types: '(cities)',
                        }}
                        fetchDetails={false}
                        debounce={300}
                        styles={{
                            textInput: {
                                height: 48,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: theme.borderLight,
                                backgroundColor: theme.surface,
                                paddingHorizontal: 16,
                                fontSize: 16,
                                color: theme.text
                            },
                            listView: {
                                borderWidth: 1,
                                borderColor: theme.borderLight,
                                backgroundColor: theme.surface,
                                borderRadius: 8,
                                marginTop: 8,
                            },
                        }}
                    />
                </View>
            </View>
        </View>
    );

    const renderPreferencesStep = () => (
        <ScrollView className="flex-1 p-6">
            <Text className="text-2xl font-bold mb-2" style={{ color: theme.text }}>
                {profileData.user_type === 'influencer'
                    ? t('onboarding.preferences_title_influencer')
                    : t('onboarding.preferences_title_brand')}
            </Text>
            <Text className="mb-8" style={{ color: theme.textSecondary }}>
                {profileData.user_type === 'influencer'
                    ? t('onboarding.preferences_subtitle_influencer')
                    : t('onboarding.preferences_subtitle_brand')}
            </Text>
            {profileData.user_type === 'influencer' ? (
                <View>
                    <Text className="font-medium mb-4" style={{ color: theme.textSecondary }}>
                        {t('onboarding.content_niches')}
                    </Text>
                    <View className="flex-row flex-wrap">
                        {INFLUENCER_NICHES.map((niche) => (
                            <TouchableOpacity
                                key={niche}
                                onPress={() => toggleNiche(niche)}
                                className={`px-3 py-2 rounded-full mr-2 mb-2 border`}
                                style={{
                                    backgroundColor: profileData.niches.includes(niche) ? theme.surfaceSecondary : theme.surface,
                                    borderColor: profileData.niches.includes(niche) ? theme.primary : theme.borderLight
                                }}
                            >
                                <Text className={`text-sm`} style={{ color: profileData.niches.includes(niche) ? theme.primary : theme.textSecondary }}>
                                    {niche}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text className="text-sm mt-2" style={{ color: theme.textTertiary }}>
                        {t('onboarding.selected')}: {profileData.niches.length}/5
                    </Text>
                </View>
            ) : (
                <View>
                    <Text className="font-medium mb-4" style={{ color: theme.textSecondary }}>
                        {t('onboarding.industry')}
                    </Text>
                    <View className="flex-row flex-wrap">
                        {BRAND_INDUSTRIES.map((industry) => (
                            <TouchableOpacity
                                key={industry}
                                onPress={() => updateProfileData('industry', profileData.industry === industry ? '' : industry)}
                                className={`px-3 py-2 rounded-full mr-2 mb-2 border`}
                                style={{
                                    backgroundColor: profileData.industry === industry ? theme.surfaceSecondary : theme.surface,
                                    borderColor: profileData.industry === industry ? theme.primary : theme.borderLight
                                }}
                            >
                                <Text className={`text-sm`} style={{ color: profileData.industry === industry ? theme.primary : theme.textSecondary }}>
                                    {industry}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: return renderUserTypeStep();
            case 2: return renderBasicInfoStep();
            case 3: return renderProfileDetailsStep();
            case 4: return renderPreferencesStep();
            default: return null;
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
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <View className="px-6 py-4" style={{ backgroundColor: theme.surface }}>
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm" style={{ color: theme.textSecondary }}>
                            {t('onboarding.step_of').replace('{{current}}', currentStep.toString()).replace('{{total}}', totalSteps.toString())}
                        </Text>
                        <Text className="text-sm" style={{ color: theme.textSecondary }}>
                            {Math.round((currentStep / totalSteps) * 100)}%
                        </Text>
                    </View>
                    <View className="w-full h-2 rounded-full" style={{ backgroundColor: theme.surfaceSecondary }}>
                        <View
                            className="h-2 rounded-full"
                            style={{
                                width: `${(currentStep / totalSteps) * 100}%`,
                                backgroundColor: theme.primary
                            }}
                        />
                    </View>
                </View>

                {renderStepContent()}

                <View className="p-6 border-t" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    <View className="flex-row space-x-3">
                        {currentStep > 1 && (
                            <TouchableOpacity
                                onPress={prevStep}
                                className="flex-1 py-3 rounded-lg mx-1"
                                style={{ backgroundColor: theme.surfaceSecondary }}
                            >
                                <Text className="text-center font-medium" style={{ color: theme.textSecondary }}>
                                    {t('onboarding.back')}
                                </Text>
                            </TouchableOpacity>
                        )}
                        {currentStep > 2 && (
                            <TouchableOpacity
                                onPress={skipStep}
                                className="flex-1 py-3 rounded-lg mx-1"
                                style={{ backgroundColor: theme.surfaceSecondary }}
                            >
                                <Text className="text-center font-medium" style={{ color: theme.textSecondary }}>
                                    {t('onboarding.skip')}
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={nextStep}
                            disabled={loading || !validateStep(currentStep)}
                            className={`flex-1 py-3 rounded-lg mx-1`}
                            style={{ backgroundColor: validateStep(currentStep) && !loading ? theme.primary : theme.textTertiary }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text className="text-center font-medium" style={{ color: '#FFFFFF' }}>
                                    {currentStep === totalSteps ? t('onboarding.complete') : t('onboarding.next')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default Onboarding;
