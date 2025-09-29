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
import { UserType } from '@/lib/enum_types';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';


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
            // Request permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'We need access to your photos to upload an avatar.');
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1], // Square aspect ratio
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];

                // Check file size (50MB = 50 * 1024 * 1024 bytes)
                if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
                    Alert.alert('File too large', 'Please select an image smaller than 50MB.');
                    return;
                }

                await uploadAvatar(asset);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
        if (!user || !asset.uri) {
            Alert.alert('Error', 'No image selected or user not logged in.');
            return;
        }

        setUploadingAvatar(true);

        try {
            // Fetch the image data directly as an ArrayBuffer
            const response = await fetch(asset.uri);
            const arrayBuffer = await response.arrayBuffer();

            // Generate a unique file path
            const fileExtension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
            const filePath = `${user.id}/profile_image.${fileExtension}`;

            const { data, error } = await supabase.storage
                .from('profile_avatars')
                .upload(filePath, arrayBuffer, {
                    contentType: asset.mimeType || `image/${fileExtension}`,
                    upsert: true, // Use upsert to allow overwriting if needed
                });

            if (error) {
                throw error;
            }

            // Get the public URL of the uploaded file
            const { data: publicUrlData } = supabase.storage
                .from('profile_avatars')
                .getPublicUrl(filePath);

            updateProfileData('avatar_url', publicUrlData.publicUrl);
            Alert.alert('Success', 'Avatar uploaded successfully!');

        } catch (err) {
            const error = err as Error;
            console.error('Error uploading avatar:', error.message);
            Alert.alert('Error', 'Failed to upload avatar. Please try again.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const removeAvatar = async () => {
        if (!profileData.avatar_url) return;

        Alert.alert(
            'Remove Avatar',
            'Are you sure you want to remove your avatar?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Extract file path from URL for deletion
                            if (profileData.avatar_url.includes('profile_avatars')) {
                                const urlParts = profileData.avatar_url.split('/');
                                const fileName = urlParts[urlParts.length - 1];
                                const filePath = `${user?.id}/${fileName}`;

                                // Delete from storage
                                await supabase.storage
                                    .from('profile_avatars')
                                    .remove([filePath]);
                            }

                            // Update profile data
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
                return true; // Optional steps
            default:
                return false;
        }
    };

    // Navigation Functions
    const nextStep = async () => {
        if (!validateStep(currentStep)) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        /* if (currentStep === 2) {
            // Check username availability
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', profileData.username.trim())
                .single();

            if (existingUser) {
                Alert.alert('Error', 'Username is already taken');
                return;
            }
        } */

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
            Alert.alert('Error', 'Authentication error. Please try logging out and in again.');
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
                push_token: profileData.push_token || null
            };

            if (profileData.user_type === 'influencer') {
                dataToSave.first_name = profileData.first_name.trim();
                dataToSave.last_name = profileData.last_name.trim();
                dataToSave.niches = profileData.niches.length > 0 ? profileData.niches : null;
            } else {
                dataToSave.company_name = profileData.company_name.trim();
                dataToSave.industry = profileData.industry || null;
            }

            const { error } = await supabase
                .from('profiles')
                .upsert(dataToSave);

            if (error) {
                console.error('Error saving profile:', error);
                Alert.alert('Error', `Failed to save profile: ${error.message}`);
            } else {

                await getProfile();
                // Navigate to main app ONLY on success
                router.replace('/(tabs)');
            }
        } catch (error) {
            console.error('Error completing onboarding:', error);
            const message = error instanceof Error ? error.message : 'Something went wrong.';
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    // Avatar Component
    const renderAvatarSection = () => (
        <View className="items-center mb-6 my-6 bg-gray-100">
            <Text className="text-gray-700 font-medium mb-4">Profile Picture</Text>

            <View className="relative">
                <TouchableOpacity
                    onPress={pickImage}
                    disabled={uploadingAvatar}
                    className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-300 border-dashed items-center justify-center overflow-hidden"
                >
                    {uploadingAvatar ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                    ) : profileData.avatar_url ? (
                        <Image
                            source={{ uri: profileData.avatar_url }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="items-center">
                            <Ionicons name="camera" size={24} color="#6B7280" />
                            <Text className="text-xs text-gray-500 mt-1">Add Photo</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {profileData.avatar_url && !uploadingAvatar && (
                    <TouchableOpacity
                        onPress={removeAvatar}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                    >
                        <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                )}
            </View>

            <Text className="text-xs text-gray-500 mt-2 text-center">
                Upload a profile picture (max 50MB)
            </Text>
        </View>
    );



    // Step Components
    const renderUserTypeStep = () => (
        <View className="flex-1 p-6">
            <Text className="text-2xl font-bold text-gray-800 mb-2">
                What best describes you?
            </Text>
            <Text className="text-gray-600 mb-8">
                This helps us customize your experience
            </Text>

            <View className="space-y-4 ">
                {/* Influencer Option */}
                <TouchableOpacity
                    onPress={() => updateProfileData('user_type', 'influencer')}
                    className={`p-6 rounded-xl border-2 my-2 ${profileData.user_type === 'influencer'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                        }`}
                >
                    <View className="flex-row items-center">
                        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${profileData.user_type === 'influencer' ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                            <Ionicons
                                name="person"
                                size={24}
                                color={profileData.user_type === 'influencer' ? '#3B82F6' : '#6B7280'}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className={`text-lg font-semibold ${profileData.user_type === 'influencer' ? 'text-blue-700' : 'text-gray-800'
                                }`}>
                                Influencer/Creator
                            </Text>
                            <Text className="text-gray-600 mt-1">
                                Share content and collaborate with brands
                            </Text>
                        </View>
                        {profileData.user_type === 'influencer' && (
                            <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                        )}
                    </View>
                </TouchableOpacity>

                {/* Brand Option */}
                <TouchableOpacity
                    onPress={() => updateProfileData('user_type', 'brand')}
                    className={`p-6 rounded-xl border-2 my-2 ${profileData.user_type === 'brand'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                        }`}
                >
                    <View className="flex-row items-center">
                        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${profileData.user_type === 'brand' ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                            <Ionicons
                                name="business"
                                size={24}
                                color={profileData.user_type === 'brand' ? '#3B82F6' : '#6B7280'}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className={`text-lg font-semibold ${profileData.user_type === 'brand' ? 'text-blue-700' : 'text-gray-800'
                                }`}>
                                Brand/Business
                            </Text>
                            <Text className="text-gray-600 mt-1">
                                Connect with influencers and grow your brand
                            </Text>
                        </View>
                        {profileData.user_type === 'brand' && (
                            <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderBasicInfoStep = () => (
        <ScrollView className="flex-1 p-6">
            <Text className="text-2xl font-bold text-gray-800 mb-2">
                Basic Information
            </Text>
            <Text className="text-gray-600 mb-8">
                {profileData.user_type === 'influencer'
                    ? 'Tell us your name and choose a username'
                    : 'Tell us about your business'
                }
            </Text>

            <View className="gap-4">
                {/* Username */}
                <View>
                    <Text className="text-gray-700 font-medium mb-2">Username *</Text>
                    <TextInput
                        value={profileData.username}
                        onChangeText={(text) => updateProfileData('username', text)}
                        placeholder="Choose a unique username"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-base"
                        autoCapitalize="none"
                    />
                </View>

                {profileData.user_type === 'influencer' ? (
                    <>
                        {/* First Name */}
                        <View>
                            <Text className="text-gray-700 font-medium mb-2">First Name *</Text>
                            <TextInput
                                value={profileData.first_name}
                                onChangeText={(text) => updateProfileData('first_name', text)}
                                placeholder="Your first name"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-base"
                            />
                        </View>

                        {/* Last Name */}
                        <View>
                            <Text className="text-gray-700 font-medium mb-2">Last Name *</Text>
                            <TextInput
                                value={profileData.last_name}
                                onChangeText={(text) => updateProfileData('last_name', text)}
                                placeholder="Your last name"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-base"
                            />
                        </View>
                    </>
                ) : (
                    /* Company Name for brands */
                    <View>
                        <Text className="text-gray-700 font-medium mb-2">Company Name *</Text>
                        <TextInput
                            value={profileData.company_name}
                            onChangeText={(text) => updateProfileData('company_name', text)}
                            placeholder="Your company name"
                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-base"
                        />
                    </View>
                )}
            </View>

            {/* Avatar Upload Section */}
            {renderAvatarSection()}

        </ScrollView>
    );

    const renderProfileDetailsStep = () => (
        <View className="flex-1 p-6">
            <Text className="text-2xl font-bold text-gray-800 mb-2">
                Profile Details
            </Text>
            <Text className="text-gray-600 mb-8">
                Add some details to help others discover you
            </Text>

            <View className="space-y-4 gap-4">
                {/* Bio */}
                <View>
                    <Text className="text-gray-700 font-medium mb-2">Bio</Text>
                    <TextInput
                        value={profileData.bio}
                        onChangeText={(text) => updateProfileData('bio', text)}
                        placeholder={`Tell us about ${profileData.user_type === 'influencer' ? 'yourself' : 'your business'}...`}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-base h-24"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Website */}
                <View>
                    <Text className="text-gray-700 font-medium mb-2">Website</Text>
                    <TextInput
                        value={profileData.website_url}
                        onChangeText={(text) => updateProfileData('website_url', text)}
                        placeholder="https://yourwebsite.com"
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-base"
                        autoCapitalize="none"
                        keyboardType="url"
                    />
                </View>

                {/* Location */}
                <View style={{ zIndex: 1 }}>
                    <Text className="text-gray-700 font-medium mb-2">Location</Text>
                    <GooglePlacesAutocomplete
                        placeholder='City, Country'
                        onPress={(data, details = null) => {
                            console.log(data, details);
                            updateProfileData('location', data.description);
                        }}
                        onFail={(error) => console.error("Google Places API Error:", error)}
                        predefinedPlaces={[]}
                        query={{
                            key: 'AIzaSyCd35P5ccI0kfDFY3DS-urVwBik4TLWA_c',
                            language: 'en',
                            types: '(cities)',
                        }}
                        fetchDetails={false}
                        debounce={300}
                        textInputProps={{
                            autoCorrect: false,
                        }}
                        styles={{
                            textInput: {
                                height: 48,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#d1d5db',
                                backgroundColor: '#ffffff',
                                paddingHorizontal: 16,
                                fontSize: 16,
                            },
                            listView: {
                                borderWidth: 1,
                                borderColor: '#d1d5db',
                                backgroundColor: '#ffffff',
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
            <Text className="text-2xl font-bold text-gray-800 mb-2">
                {profileData.user_type === 'influencer' ? 'Content Preferences' : 'Business Details'}
            </Text>
            <Text className="text-gray-600 mb-8">
                {profileData.user_type === 'influencer'
                    ? 'Select up to 5 niches that match your content'
                    : 'Choose your industry to connect with relevant influencers'
                }
            </Text>

            {profileData.user_type === 'influencer' ? (
                <View>
                    <Text className="text-gray-700 font-medium mb-4">
                        Content Niches (Select up to 5)
                    </Text>
                    <View className="flex-row flex-wrap">
                        {/* * NOTE on UI "blur" issue: The logic here is correct. The "blurry" effect you see
                          * is likely the default opacity feedback from TouchableOpacity. When you press it,
                          * it becomes semi-transparent. The state update triggers a re-render, changing the
                          * background color, and the final style appears. This can feel like a flicker or blur.
                          * This is a visual effect, not a logic bug. Using `Pressable` instead of `TouchableOpacity`
                          * could offer more control over the press-in styling if you wish to change this behavior.
                        */}
                        {INFLUENCER_NICHES.map((niche) => (
                            <TouchableOpacity
                                key={niche}
                                onPress={() => toggleNiche(niche)}
                                className={`px-3 py-2 rounded-full mr-2 mb-2 border ${profileData.niches.includes(niche)
                                    ? 'bg-blue-100 border-blue-500'
                                    : 'bg-white border-gray-300'
                                    }`}
                            >
                                <Text className={`text-sm ${profileData.niches.includes(niche)
                                    ? 'text-blue-700'
                                    : 'text-gray-700'
                                    }`}>
                                    {niche}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text className="text-gray-500 text-sm mt-2">
                        Selected: {profileData.niches.length}/5
                    </Text>
                </View>
            ) : (
                <View>
                    <Text className="text-gray-700 font-medium mb-4">Industry</Text>
                    <View className="flex-row flex-wrap">
                        {BRAND_INDUSTRIES.map((industry) => (
                            <TouchableOpacity
                                key={industry}
                                onPress={() => updateProfileData('industry',
                                    profileData.industry === industry ? '' : industry
                                )}
                                className={`px-3 py-2 rounded-full mr-2 mb-2 border ${profileData.industry === industry
                                    ? 'bg-blue-100 border-blue-500'
                                    : 'bg-white border-gray-300'
                                    }`}
                            >
                                <Text className={`text-sm ${profileData.industry === industry
                                    ? 'text-blue-700'
                                    : 'text-gray-700'
                                    }`}>
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
            case 1:
                return renderUserTypeStep();
            case 2:
                return renderBasicInfoStep();
            case 3:
                return renderProfileDetailsStep();
            case 4:
                return renderPreferencesStep();
            default:
                return null;
        }
    };


    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-gray-100">
                <ActivityIndicator size="large" color="#3B82F6" />
            </SafeAreaView>
        );
    }



    return (
        <SafeAreaView className="flex-1 bg-gray-100">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                {/* Progress Bar */}
                <View className="px-6 py-4 bg-white">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-gray-600">
                            Step {currentStep} of {totalSteps}
                        </Text>
                        <Text className="text-sm text-gray-600">
                            {Math.round((currentStep / totalSteps) * 100)}%
                        </Text>
                    </View>
                    <View className="w-full bg-gray-200 rounded-full h-2">
                        <View
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                        />
                    </View>
                </View>

                {/* Step Content */}
                {renderStepContent()}

                {/* Navigation Buttons */}
                <View className="p-6 bg-white border-t border-gray-200">
                    <View className="flex-row space-x-3">
                        {currentStep > 1 && (
                            <TouchableOpacity
                                onPress={prevStep}
                                className="flex-1 bg-gray-200 py-3 rounded-lg mx-1"
                            >
                                <Text className="text-gray-700 text-center font-medium">
                                    Back
                                </Text>
                            </TouchableOpacity>
                        )}

                        {currentStep > 2 && (
                            <TouchableOpacity
                                onPress={skipStep}
                                className="flex-1 bg-gray-100 py-3 rounded-lg mx-1"
                            >
                                <Text className="text-gray-600 text-center font-medium">
                                    Skip
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={nextStep}
                            disabled={loading || !validateStep(currentStep)}
                            className={`flex-1 py-3 rounded-lg mx-1 ${validateStep(currentStep) && !loading
                                ? 'bg-blue-600'
                                : 'bg-gray-400'
                                }`}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-white text-center font-medium">
                                    {currentStep === totalSteps ? 'Complete' : 'Next'}
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