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
import { registerForPushNotifications, checkNotificationPermissions, openAppSettings } from '@/hooks/usePushNotifications';
import { Profile } from '@/lib/db_interface';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const FormInput = ({ label, value, onChangeText, placeholder, multiline = false }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    multiline?: boolean;
}) => {
    const { theme } = useTheme();
    return (
        <View className="mb-4">
            <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>{label}</Text>
            <TextInput
                className="rounded-lg px-4 py-3 text-base"
                style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.borderLight,
                    borderWidth: 1,
                    color: theme.text,
                    ...(multiline ? { height: 100, textAlignVertical: 'top' } : {})
                }}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.textTertiary}
                multiline={multiline}
            />
        </View>
    );
};

const ProfileCreatorForm = ({ profile }: { profile: Profile }) => {
    const router = useRouter();
    const { session } = useAuth();
    const { theme } = useTheme();
    const { t } = useLanguage();

    const AVAILABLE_NICHES = [
        t('profileCreatorForm.technology'),
        t('profileCreatorForm.gaming'),
        t('profileCreatorForm.sports'),
        t('profileCreatorForm.lifestyle'),
        t('profileCreatorForm.fashion'),
        t('profileCreatorForm.beauty'),
        t('profileCreatorForm.food'),
        t('profileCreatorForm.travel'),
        t('profileCreatorForm.fitness'),
        t('profileCreatorForm.music'),
        t('profileCreatorForm.education')
    ];

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
            Alert.alert(t('profileCreatorForm.permission_needed'), t('profileCreatorForm.permission_needed_description'));
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

            Alert.alert(t('profileCreatorForm.success'), t('profileCreatorForm.profile_updated'));
            router.back();
        } catch (error: any) {
            console.error('Error:', error);
            Alert.alert(t('profileCreatorForm.error'), error.message || t('profileCreatorForm.failed_update_profile'));
        } finally {
            setUpdating(false);
        }
    };


    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Avatar Section */}
                <View className="items-center mb-6">
                    <Image
                        source={{ uri: avatarUrl || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=??' }}
                        className="w-28 h-28 rounded-full"
                    />
                    <TouchableOpacity onPress={pickImage} className="mt-4">
                        <Text className="font-semibold" style={{ color: theme.primary }}>{t('profileCreatorForm.change_photo')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Form Inputs */}
                <FormInput
                    label={t('profileCreatorForm.first_name')}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder={t('profileCreatorForm.first_name_placeholder')}
                />
                <FormInput
                    label={t('profileCreatorForm.last_name')}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder={t('profileCreatorForm.last_name_placeholder')}
                />
                <FormInput
                    label={t('profileCreatorForm.username')}
                    value={username}
                    onChangeText={setUsername}
                    placeholder={t('profileCreatorForm.username_placeholder')}
                />
                <FormInput
                    label={t('profileCreatorForm.bio')}
                    value={bio}
                    onChangeText={setBio}
                    placeholder={t('profileCreatorForm.bio_placeholder')}
                    multiline
                />
                <FormInput
                    label={t('profileCreatorForm.website')}
                    value={website}
                    onChangeText={setWebsite}
                    placeholder={t('profileCreatorForm.website_placeholder')}
                />

                {/* Niches Selection */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>{t('profileCreatorForm.content_niches')}</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_NICHES.map((niche) => {
                            const isSelected = selectedNiches.includes(niche);
                            return (
                                <TouchableOpacity
                                    key={niche}
                                    onPress={() => toggleNiche(niche)}
                                    className={`px-4 py-2 rounded-full border`}
                                    style={{
                                        backgroundColor: isSelected ? theme.primary : theme.surface,
                                        borderColor: isSelected ? theme.primary : theme.borderLight,
                                    }}
                                >
                                    <Text
                                        className={`text-sm font-medium`}
                                        style={{ color: isSelected ? '#FFFFFF' : theme.textSecondary }}
                                    >
                                        {niche}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    onPress={handleUpdateProfile}
                    className={`py-4 rounded-lg flex-row justify-center items-center mt-4 ${updating ? 'opacity-70' : ''}`}
                    style={{ backgroundColor: theme.primary }}
                    disabled={updating}
                >
                    {updating ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Feather name="save" size={18} color="#FFFFFF" />
                            <Text className="text-base font-semibold ml-2" style={{ color: '#FFFFFF' }}>{t('profileCreatorForm.save_changes')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileCreatorForm;