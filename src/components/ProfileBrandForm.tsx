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
}

const ProfileBrandForm = ({ profile }: { profile: Profile }) => {
    const router = useRouter();
    const { session } = useAuth();
    const { theme } = useTheme();
    const { t } = useLanguage();

    const [companyName, setCompanyName] = useState('');
    const [industry, setIndustry] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (profile) {
            setCompanyName(profile.company_name || '');
            setIndustry(profile.industry || '');
            setUsername(profile.username || '');
            setBio(profile.bio || '');
            setWebsite(profile.website_url || '');
            setAvatarUrl(profile.avatar_url);
            setNotificationsEnabled(!!profile.push_token);
        }
    }, [profile]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('profileBrandForm.permission_needed'), t('profileBrandForm.permission_needed_description'));
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

    const handleUpdateProfile = async () => {
        if (!session?.user) return;

        if (!companyName.trim()) {
            Alert.alert(t('profileBrandForm.validation_error'), t('profileBrandForm.company_name_required'));
            return;
        }

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
                company_name: companyName.trim(),
                industry: industry.trim() || null,
                username,
                bio,
                website_url: website,
                avatar_url: publicAvatarUrl,
                updated_at: new Date().toISOString(),
            };

            const { error: updateError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', session.user.id);

            if (updateError) throw updateError;

            Alert.alert(t('profileBrandForm.success'), t('profileBrandForm.profile_updated'));
            router.back();
        } catch (error: any) {
            console.error('Error:', error);
            Alert.alert(t('profileBrandForm.error'), error.message || t('profileBrandForm.failed_update_profile'));
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
                    Alert.alert(t('profileBrandForm.error'), t('profileBrandForm.failed_enable_notifications'));
                    setNotificationsEnabled(false);
                } else {
                    Alert.alert(t('profileBrandForm.success'), t('profileBrandForm.notifications_enabled'));
                }
            } else {
                Alert.alert(t('profileBrandForm.permission_denied'), t('profileBrandForm.enable_notifications_settings'));
                setNotificationsEnabled(false);
            }
        } else {
            await supabase
                .from('profiles')
                .update({ push_token: null })
                .eq('id', session?.user?.id);
            Alert.alert(t('profileBrandForm.success'), t('profileBrandForm.notifications_disabled'));
        }
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Avatar Section */}
                <View className="items-center mb-6">
                    <Image
                        source={{ uri: avatarUrl || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=B' }}
                        className="w-28 h-28 rounded-full"
                    />
                    <TouchableOpacity onPress={pickImage} className="mt-4">
                        <Text className="font-semibold" style={{ color: theme.primary }}>{t('profileBrandForm.change_photo')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Form Inputs */}
                <FormInput
                    label={t('profileBrandForm.company_name')}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder={t('profileBrandForm.company_name_placeholder')}
                />
                <FormInput
                    label={t('profileBrandForm.industry')}
                    value={industry}
                    onChangeText={setIndustry}
                    placeholder={t('profileBrandForm.industry_placeholder')}
                />
                <FormInput
                    label={t('profileBrandForm.username')}
                    value={username}
                    onChangeText={setUsername}
                    placeholder={t('profileBrandForm.username_placeholder')}
                />
                <FormInput
                    label={t('profileBrandForm.bio')}
                    value={bio}
                    onChangeText={setBio}
                    placeholder={t('profileBrandForm.bio_placeholder')}
                    multiline
                />
                <FormInput
                    label={t('profileBrandForm.website')}
                    value={website}
                    onChangeText={setWebsite}
                    placeholder={t('profileBrandForm.website_placeholder')}
                />

                {/* Notifications Toggle */}
                <View className="mb-6 rounded-lg px-4 py-4" style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, borderWidth: 1 }}>
                    <View className="flex-row justify-between items-center">
                        <View className="flex-1 mr-4">
                            <Text className="text-base font-semibold" style={{ color: theme.text }}>{t('profileBrandForm.push_notifications')}</Text>
                            <Text className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                                {t('profileBrandForm.push_notifications_description')}
                            </Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={handleNotificationToggle}
                            trackColor={{ false: theme.border, true: theme.primaryLight }}
                            thumbColor={notificationsEnabled ? theme.primary : theme.borderLight}
                        />
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
                            <Text className="text-base font-semibold ml-2" style={{ color: '#FFFFFF' }}>{t('profileBrandForm.save_changes')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileBrandForm;