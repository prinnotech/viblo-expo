// components/ProfileCreatorForm.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    TextInput,
    Alert,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { registerForPushNotifications } from '@/hooks/usePushNotifications';
import { Profile } from '@/lib/db_interface';

const AVAILABLE_NICHES = [
    'Technology', 'Gaming', 'Sports', 'Lifestyle', 'Fashion',
    'Beauty', 'Food', 'Travel', 'Fitness', 'Music', 'Education'
];

const FormInput = ({ label, value, onChangeText, placeholder, multiline = false }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    multiline?: boolean;
}) => (
    <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-600 mb-2">{label}</Text>
        <TextInput
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            multiline={multiline}
            style={multiline ? { height: 100, textAlignVertical: 'top' } : {}}
        />
    </View>
);

const ProfileCreatorForm = ({ profile }: { profile: Profile }) => {
    const router = useRouter();
    const { session } = useAuth();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
            setUsername(profile.username || '');
            setBio(profile.bio || '');
            setWebsite(profile.website_url || '');
            setAvatarUrl(profile.avatar_url);
            setSelectedNiches(profile.niches || []);
            setNotificationsEnabled(!!profile.push_token);
        }
    }, [profile]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need access to your photos to upload an avatar.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setAvatarUrl(result.assets[0].uri);
        }
    };

    const toggleNiche = (niche: string) => {
        setSelectedNiches(prev =>
            prev.includes(niche) ? prev.filter(n => n !== niche) : [...prev, niche]
        );
    };

    const handleUpdateProfile = async () => {
        if (!session?.user) return;

        setUpdating(true);

        try {
            let publicAvatarUrl = profile?.avatar_url;

            if (avatarUrl && avatarUrl.startsWith('file:') && avatarUrl !== profile?.avatar_url) {
                const response = await fetch(avatarUrl);
                const arrayBuffer = await response.arrayBuffer();
                const fileExtension = avatarUrl.split('.').pop()?.toLowerCase() || 'jpg';
                const filePath = `${session.user.id}/profile_image.${fileExtension}`;

                const { error: uploadError } = await supabase.storage
                    .from('profile_avatars')
                    .upload(filePath, arrayBuffer, {
                        contentType: `image/${fileExtension}`,
                        upsert: true,
                    });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('profile_avatars').getPublicUrl(filePath);
                publicAvatarUrl = `${data.publicUrl}?t=${Date.now()}`;
            }

            const updates = {
                first_name: firstName,
                last_name: lastName,
                username,
                bio,
                website_url: website,
                avatar_url: publicAvatarUrl,
                niches: selectedNiches,
                updated_at: new Date().toISOString(),
            };

            const { error: updateError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', session.user.id);

            if (updateError) throw updateError;

            Alert.alert("Success", "Your profile has been updated.");
            router.back();
        } catch (error: any) {
            console.error('Error:', error);
            Alert.alert("Error", error.message || "Failed to update profile.");
        } finally {
            setUpdating(false);
        }
    };

    const handleNotificationToggle = async (value: boolean) => {
        setNotificationsEnabled(value);

        if (value) {
            const token = await registerForPushNotifications();
            if (token) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ push_token: token })
                    .eq('id', session?.user?.id);

                if (error) {
                    Alert.alert('Error', 'Failed to enable notifications');
                    setNotificationsEnabled(false);
                } else {
                    Alert.alert('Success', 'Notifications enabled!');
                }
            } else {
                Alert.alert('Permission Denied', 'Please enable notifications in your device settings');
                setNotificationsEnabled(false);
            }
        } else {
            await supabase
                .from('profiles')
                .update({ push_token: null })
                .eq('id', session?.user?.id);
            Alert.alert('Success', 'Notifications disabled');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Avatar Section */}
                <View className="items-center mb-6">
                    <Image
                        source={{ uri: avatarUrl || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=??' }}
                        className="w-28 h-28 rounded-full"
                    />
                    <TouchableOpacity onPress={pickImage} className="mt-4">
                        <Text className="text-blue-500 font-semibold">Change Photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Form Inputs */}
                <FormInput label="First Name" value={firstName} onChangeText={setFirstName} placeholder="Your first name" />
                <FormInput label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Your last name" />
                <FormInput label="Username" value={username} onChangeText={setUsername} placeholder="Your public username" />
                <FormInput label="Bio" value={bio} onChangeText={setBio} placeholder="Tell us about yourself" multiline />
                <FormInput label="Website" value={website} onChangeText={setWebsite} placeholder="https://yourwebsite.com" />

                {/* Niches Selection */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-600 mb-2">Content Niches</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_NICHES.map((niche) => (
                            <TouchableOpacity
                                key={niche}
                                onPress={() => toggleNiche(niche)}
                                className={`px-4 py-2 rounded-full border ${selectedNiches.includes(niche)
                                        ? 'bg-purple-500 border-purple-500'
                                        : 'bg-white border-gray-300'
                                    }`}
                            >
                                <Text
                                    className={`text-sm font-medium ${selectedNiches.includes(niche) ? 'text-white' : 'text-gray-700'
                                        }`}
                                >
                                    {niche}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Notifications Toggle */}
                <View className="mb-6 bg-white border border-gray-300 rounded-lg px-4 py-4">
                    <View className="flex-row justify-between items-center">
                        <View className="flex-1 mr-4">
                            <Text className="text-base font-semibold text-gray-800">Push Notifications</Text>
                            <Text className="text-sm text-gray-600 mt-1">
                                Receive updates about campaigns, messages, and activity
                            </Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={handleNotificationToggle}
                            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                            thumbColor={notificationsEnabled ? '#3b82f6' : '#f3f4f6'}
                        />
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    onPress={handleUpdateProfile}
                    className={`bg-blue-500 py-4 rounded-lg flex-row justify-center items-center mt-4 ${updating ? 'opacity-70' : ''}`}
                    disabled={updating}
                >
                    {updating ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Feather name="save" size={18} color="#fff" />
                            <Text className="text-white text-base font-semibold ml-2">Save Changes</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileCreatorForm;