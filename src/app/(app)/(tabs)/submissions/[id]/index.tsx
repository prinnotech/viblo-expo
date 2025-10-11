import { ActivityIndicator, Text, View, Pressable, Alert, ScrollView, TextInput } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ResizeMode, Video } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { ContentSubmission } from '@/lib/db_interface';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Campaign } from '@/lib/db_interface';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';


const SubmissionPage = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const navigation = useNavigation();
    const { theme } = useTheme();
    const { t } = useLanguage();

    const { profile, isLoading: isAuthLoading } = useAuth();
    const campaignId = Array.isArray(id) ? id[0] : id;

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [submission, setSubmission] = useState<ContentSubmission | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for video selection and submission
    const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for public post URL
    const [publicPostUrl, setPublicPostUrl] = useState('');
    const [isUpdatingUrl, setIsUpdatingUrl] = useState(false);

    // Fetch campaign details and existing submission
    useEffect(() => {
        if (!campaignId || !profile) return;

        const fetchData = async () => {
            setLoading(true);

            // Fetch campaign
            const { data: campaignData, error: campaignError } = await supabase
                .from('campaigns')
                .select(`*`)
                .eq('id', campaignId)
                .single();

            if (campaignError) {
                setError(campaignError.message as any);
                setLoading(false);
                return;
            }

            setCampaign(campaignData);
            navigation.setOptions({ title: `Apply to ${campaignData.title}` });

            // Check for existing submission
            const { data: submissionData, error: submissionError } = await supabase
                .from('content_submissions')
                .select('*')
                .eq('campaign_id', campaignId)
                .eq('influencer_id', profile.id)
                .single();

            if (submissionData) {
                setSubmission(submissionData);
                setPublicPostUrl(submissionData.public_post_url || '');
            }

            setLoading(false);
        };

        fetchData();
    }, [campaignId, profile, navigation]);

    const pickVideo = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('submissionsId.permission_needed'), t('submissionsId.permission_needed_description'));
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 500 * 1024 * 1024) {
                Alert.alert(t('submissionsId.file_too_large'), t('submissionsId.file_too_large_description'));
                return;
            }
            setSelectedVideo(asset);
        }
    };

    const handleSubmit = async () => {
        if (!selectedVideo || !profile || !campaignId) {
            Alert.alert(t('submissionsId.error'), t('submissionsId.missing_video_info'));
            return;
        }
        setIsSubmitting(true);
        try {
            const videoUrl = await uploadVideoToStorage(selectedVideo);
            if (!videoUrl) throw new Error("Video upload failed and did not return a URL.");

            const { error: submissionError } = await supabase
                .from('content_submissions')
                .insert({
                    influencer_id: profile.id,
                    campaign_id: campaignId,
                    status: 'pending_review',
                    review_video_url: videoUrl,
                });

            if (submissionError) throw submissionError;

            Alert.alert(t('submissionsId.success'), t('submissionsId.application_submitted'), [
                { text: t('submissionsId.ok'), onPress: () => router.back() }
            ]);

        } catch (err) {
            const error = err as Error;
            console.error("Submission failed:", error.message);
            Alert.alert(t('submissionsId.submission_failed'), t('submissionsId.submission_failed_description'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResubmit = async () => {
        if (!selectedVideo || !profile || !campaignId || !submission) {
            Alert.alert(t('submissionsId.error'), t('submissionsId.missing_required_info'));
            return;
        }
        setIsSubmitting(true);
        try {
            const videoUrl = await uploadVideoToStorage(selectedVideo);
            if (!videoUrl) throw new Error("Video upload failed.");

            const { error: updateError } = await supabase
                .from('content_submissions')
                .update({
                    review_video_url: videoUrl,
                    status: 'pending_review',
                })
                .eq('id', submission.id);

            if (updateError) throw updateError;

            Alert.alert(t('submissionsId.success'), t('submissionsId.revised_video_submitted'), [
                { text: t('submissionsId.ok'), onPress: () => router.back() }
            ]);

        } catch (err) {
            const error = err as Error;
            console.error("Resubmission failed:", error.message);
            Alert.alert(t('submissionsId.resubmission_failed'), t('submissionsId.resubmission_failed_description'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdatePostUrl = async () => {
        if (!publicPostUrl.trim() || !submission) {
            Alert.alert(t('submissionsId.error'), t('submissionsId.enter_valid_url'));
            return;
        }
        setIsUpdatingUrl(true);
        try {
            const { error: updateError } = await supabase
                .from('content_submissions')
                .update({
                    public_post_url: publicPostUrl,
                    status: 'posted_live',
                    posted_at: new Date().toISOString(),
                })
                .eq('id', submission.id);

            if (updateError) throw updateError;

            Alert.alert(t('submissionsId.success'), t('submissionsId.post_url_submitted'));
            // Refresh submission data
            const { data } = await supabase
                .from('content_submissions')
                .select('*')
                .eq('id', submission.id)
                .single();
            if (data) setSubmission(data);

        } catch (err) {
            const error = err as Error;
            console.error("URL update failed:", error.message);
            Alert.alert(t('submissionsId.update_failed'), t('submissionsId.update_failed_description'));
        } finally {
            setIsUpdatingUrl(false);
        }
    };

    const uploadVideoToStorage = async (asset: ImagePicker.ImagePickerAsset) => {
        if (!profile) return null;
        try {
            const response = await fetch(asset.uri);
            const arrayBuffer = await response.arrayBuffer();
            const fileExtension = asset.uri.split('.').pop()?.toLowerCase() || 'mp4';
            const filePath = `${profile.id}/${campaignId}.${fileExtension}`;

            const { error } = await supabase.storage
                .from('video_submission')
                .upload(filePath, arrayBuffer, {
                    contentType: asset.mimeType || `video/${fileExtension}`,
                    upsert: true,
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('video_submission')
                .getPublicUrl(filePath);

            return publicUrlData.publicUrl;
        } catch (err) {
            const error = err as Error;
            console.error('Error uploading video:', error.message);
            return null;
        }
    };

    const getTimeRemaining = (approvedAt: string) => {
        const approved = new Date(approvedAt);
        const deadline = new Date(approved.getTime() + 24 * 60 * 60 * 1000);
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        return hours > 0 ? t('submissionsId.hours_remaining').replace('{{hours}}', hours.toString()) : t('submissionsId.deadline_passed');
    };

    if (loading || isAuthLoading) {
        return <ActivityIndicator style={{ flex: 1, backgroundColor: theme.background }} size="large" color={theme.primary} />;
    }

    if (error || !campaign) {
        return <View className="flex-1 justify-center items-center p-4" style={{ backgroundColor: theme.background }}><Text style={{ color: theme.error }}>{error || t('submissionsId.campaign_not_found')}</Text></View>;
    }

    if (profile?.user_type === 'brand') {
        return <View className="flex-1 justify-center items-center p-4" style={{ backgroundColor: theme.background }}><Text className="text-lg" style={{ color: theme.text }}>{t('submissionsId.brands_cannot_apply')}</Text></View>
    }

    // Render based on submission status
    const renderContent = () => {
        if (!submission) {
            // No submission yet - show initial application form
            return (
                <>
                    <Text className="text-2xl font-bold mb-1" style={{ color: theme.text }}>{t('submissionsId.submitting_for')}</Text>
                    <Text className="text-3xl font-extrabold mb-6" style={{ color: theme.primary }}>{campaign.title}</Text>

                    <View className="items-center justify-center w-full h-64 border-2 border-dashed rounded-lg" style={{ backgroundColor: theme.surfaceSecondary, borderColor: theme.border }}>
                        {selectedVideo ? (
                            <View className="w-full h-full rounded-lg overflow-hidden">
                                <Video
                                    source={{ uri: selectedVideo.uri }}
                                    rate={1.0}
                                    volume={1.0}
                                    isMuted={false}
                                    resizeMode={ResizeMode.CONTAIN}
                                    shouldPlay
                                    isLooping
                                    useNativeControls
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </View>
                        ) : (
                            <Pressable onPress={pickVideo} className="items-center">
                                <Feather name="upload-cloud" size={48} color={theme.textTertiary} />
                                <Text className="mt-2 text-lg font-semibold" style={{ color: theme.textSecondary }}>{t('submissionsId.upload_your_video')}</Text>
                                <Text className="text-sm" style={{ color: theme.textTertiary }}>{t('submissionsId.max_file_size')}</Text>
                            </Pressable>
                        )}
                    </View>

                    {selectedVideo && (
                        <Pressable onPress={pickVideo} className="mt-2">
                            <Text className="text-center font-semibold" style={{ color: theme.primary }}>{t('submissionsId.change_video')}</Text>
                        </Pressable>
                    )}

                    <View className="p-4 rounded-lg mt-4" style={{ backgroundColor: theme.surface }}>
                        <Text className="font-semibold mb-2" style={{ color: theme.text }}>{t('submissionsId.content_requirements')}</Text>
                        <Text style={{ color: theme.textSecondary }}>{campaign.content_requirements || t('submissionsId.no_specific_requirements')}</Text>
                    </View>
                </>
            );
        }

        // Has submission - show status-specific UI
        switch (submission.status) {
            case 'pending_review':
                return (
                    <View className="flex-1 items-center justify-center p-6">
                        <Feather name="clock" size={64} color={theme.warning} />
                        <Text className="text-2xl font-bold mt-4 text-center" style={{ color: theme.text }}>{t('submissionsId.under_review')}</Text>
                        <Text className="text-center mt-2" style={{ color: theme.textSecondary }}>{t('submissionsId.under_review_description')}</Text>
                    </View>
                );

            case 'needs_revision':
                return (
                    <>
                        <View className="border rounded-lg p-4 mb-4" style={{ backgroundColor: theme.warningLight, borderColor: theme.warning }}>
                            <View className="flex-row items-center mb-2">
                                <Feather name="alert-circle" size={24} color={theme.warning} />
                                <Text className="text-lg font-bold ml-2" style={{ color: theme.text }}>{t('submissionsId.revision_requested')}</Text>
                            </View>
                            {submission.rating !== null && (
                                <View className="flex-row items-center mb-2">
                                    <Text className="font-semibold" style={{ color: theme.text }}>{t('submissionsId.rating')} </Text>
                                    <Text className="font-bold" style={{ color: theme.warning }}>{submission.rating}/10</Text>
                                </View>
                            )}
                            {submission.message && (
                                <View className="mb-2">
                                    <Text className="font-semibold" style={{ color: theme.text }}>{t('submissionsId.feedback')}</Text>
                                    <Text className="mt-1" style={{ color: theme.textSecondary }}>{submission.message}</Text>
                                </View>
                            )}
                            {submission.justify && (
                                <View>
                                    <Text className="font-semibold" style={{ color: theme.text }}>{t('submissionsId.details')}</Text>
                                    <Text className="mt-1" style={{ color: theme.textSecondary }}>{submission.justify}</Text>
                                </View>
                            )}
                        </View>

                        <Text className="text-xl font-bold mb-4" style={{ color: theme.text }}>{t('submissionsId.submit_revised_video')}</Text>

                        <View className="items-center justify-center w-full h-64 border-2 border-dashed rounded-lg" style={{ backgroundColor: theme.surfaceSecondary, borderColor: theme.border }}>
                            {selectedVideo ? (
                                <View className="w-full h-full rounded-lg overflow-hidden">
                                    <Video
                                        source={{ uri: selectedVideo.uri }}
                                        rate={1.0}
                                        volume={1.0}
                                        isMuted={false}
                                        resizeMode={ResizeMode.CONTAIN}
                                        shouldPlay
                                        isLooping
                                        useNativeControls
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                </View>
                            ) : (
                                <Pressable onPress={pickVideo} className="items-center">
                                    <Feather name="upload-cloud" size={48} color={theme.textTertiary} />
                                    <Text className="mt-2 text-lg font-semibold" style={{ color: theme.textSecondary }}>{t('submissionsId.upload_revised_video')}</Text>
                                </Pressable>
                            )}
                        </View>

                        {selectedVideo && (
                            <Pressable onPress={pickVideo} className="mt-2">
                                <Text className="text-center font-semibold" style={{ color: theme.primary }}>{t('submissionsId.change_video')}</Text>
                            </Pressable>
                        )}
                    </>
                );

            case 'approved':
                const platforms = campaign.target_platforms?.join(', ') || null;
                return (
                    <>
                        <View className="border rounded-lg p-4 mb-4" style={{ backgroundColor: theme.successLight, borderColor: theme.success }}>
                            <View className="flex-row items-center mb-2">
                                <Feather name="check-circle" size={24} color={theme.success} />
                                <Text className="text-lg font-bold ml-2" style={{ color: theme.success }}>{t('submissionsId.approved')}</Text>
                            </View>
                            {submission.rating !== null && (
                                <View className="flex-row items-center mb-2">
                                    <Text className="font-semibold" style={{ color: theme.text }}>{t('submissionsId.rating')} </Text>
                                    <Text className="font-bold" style={{ color: theme.success }}>{submission.rating}/10</Text>
                                </View>
                            )}
                            {submission.message && (
                                <Text className="mt-2" style={{ color: theme.textSecondary }}>{submission.message}</Text>
                            )}
                        </View>

                        <View className="border rounded-lg p-4 mb-4" style={{ backgroundColor: theme.primaryLight, borderColor: theme.border }}>
                            <Text className="font-bold mb-2" style={{ color: theme.primaryDark }}>{t('submissionsId.action_required')}</Text>
                            <Text className="mb-1" style={{ color: theme.textSecondary }}>
                                {platforms
                                    ? t('submissionsId.post_within_24h').replace('{{platforms}}', platforms)
                                    : t('submissionsId.post_within_24h_platform')
                                }
                            </Text>
                            {submission.approved_at && (
                                <Text className="text-sm font-semibold" style={{ color: theme.error }}>{getTimeRemaining(submission.approved_at)}</Text>
                            )}
                        </View>

                        <Text className="text-lg font-semibold mb-2" style={{ color: theme.text }}>{t('submissionsId.post_url')}</Text>
                        <Text className="text-sm mb-2" style={{ color: theme.textSecondary }}>{t('submissionsId.post_url_description')}</Text>

                        <TextInput
                            value={publicPostUrl}
                            onChangeText={setPublicPostUrl}
                            placeholder={t('submissionsId.post_url_placeholder')}
                            className="border rounded-lg p-3 mb-4"
                            style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
                            placeholderTextColor={theme.textTertiary}
                        />
                    </>
                );

            case 'posted_live':
            case 'completed':
                return (
                    <>
                        <View className="border rounded-lg p-4 mb-4" style={{ backgroundColor: theme.successLight, borderColor: theme.success }}>
                            <View className="flex-row items-center mb-2">
                                <Feather name="check-circle" size={24} color={theme.success} />
                                <Text className="text-lg font-bold ml-2" style={{ color: theme.success }}>
                                    {submission.status === 'posted_live' ? t('submissionsId.posted_live') : t('submissionsId.completed')}
                                </Text>
                            </View>
                            {submission.rating !== null && (
                                <View className="flex-row items-center">
                                    <Text className="font-semibold" style={{ color: theme.text }}>{t('submissionsId.rating')} </Text>
                                    <Text className="font-bold" style={{ color: theme.success }}>{submission.rating}/10</Text>
                                </View>
                            )}
                        </View>

                        <Text className="text-2xl font-bold mb-4" style={{ color: theme.text }}>{t('submissionsId.performance_stats')}</Text>

                        <View className="rounded-lg p-4 mb-3 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="eye" size={20} color={theme.textSecondary} />
                                    <Text className="ml-2" style={{ color: theme.textSecondary }}>{t('submissionsId.views')}</Text>
                                </View>
                                <Text className="text-xl font-bold" style={{ color: theme.text }}>{submission.view_count?.toLocaleString() || '0'}</Text>
                            </View>
                        </View>

                        <View className="rounded-lg p-4 mb-3 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="heart" size={20} color={theme.textSecondary} />
                                    <Text className="ml-2" style={{ color: theme.textSecondary }}>{t('submissionsId.likes')}</Text>
                                </View>
                                <Text className="text-xl font-bold" style={{ color: theme.text }}>{submission.like_count?.toLocaleString() || '0'}</Text>
                            </View>
                        </View>

                        <View className="rounded-lg p-4 mb-3 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="message-circle" size={20} color={theme.textSecondary} />
                                    <Text className="ml-2" style={{ color: theme.textSecondary }}>{t('submissionsId.comments')}</Text>
                                </View>
                                <Text className="text-xl font-bold" style={{ color: theme.text }}>{submission.comment_count?.toLocaleString() || '0'}</Text>
                            </View>
                        </View>

                        <View className="rounded-lg p-4 border" style={{ backgroundColor: theme.successLight, borderColor: theme.success }}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="dollar-sign" size={20} color={theme.success} />
                                    <Text className="ml-2" style={{ color: theme.textSecondary }}>{t('submissionsId.earned')}</Text>
                                </View>
                                <Text className="text-2xl font-bold" style={{ color: theme.success }}>${submission.earned_amount?.toFixed(2) || '0.00'}</Text>
                            </View>
                        </View>

                        {submission.public_post_url && (
                            <Pressable
                                onPress={() => Alert.alert(t('submissionsId.open_post'), t('submissionsId.open_in_browser').replace('{{url}}', submission.public_post_url || ''))}
                                className="mt-4 py-3 rounded-lg"
                                style={{ backgroundColor: theme.primary }}
                            >
                                <Text className="text-center font-semibold" style={{ color: theme.surface }}>{t('submissionsId.view_public_post')}</Text>
                            </Pressable>
                        )}
                    </>
                );


            default:
                return null;
        }
    };

    const renderButton = () => {
        if (!submission) {
            return (
                <Pressable
                    disabled={!selectedVideo || isSubmitting}
                    className="py-4 rounded-xl items-center justify-center shadow-lg"
                    style={{ backgroundColor: (!selectedVideo || isSubmitting) ? theme.textTertiary : theme.primary }}
                    onPress={handleSubmit}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={theme.surface} />
                    ) : (
                        <Text className="text-lg font-bold" style={{ color: theme.surface }}>{t('submissionsId.submit_application')}</Text>
                    )}
                </Pressable>
            );
        }

        if (submission.status === 'needs_revision') {
            return (
                <Pressable
                    disabled={!selectedVideo || isSubmitting}
                    className="py-4 rounded-xl items-center justify-center shadow-lg"
                    style={{ backgroundColor: (!selectedVideo || isSubmitting) ? theme.textTertiary : theme.primary }}
                    onPress={handleResubmit}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={theme.surface} />
                    ) : (
                        <Text className="text-lg font-bold" style={{ color: theme.surface }}>{t('submissionsId.resubmit_video')}</Text>
                    )}
                </Pressable>
            );
        }

        if (submission.status === 'approved') {
            return (
                <Pressable
                    disabled={!publicPostUrl.trim() || isUpdatingUrl}
                    className="py-4 rounded-xl items-center justify-center shadow-lg"
                    style={{ backgroundColor: (!publicPostUrl.trim() || isUpdatingUrl) ? theme.textTertiary : theme.success }}
                    onPress={handleUpdatePostUrl}
                >
                    {isUpdatingUrl ? (
                        <ActivityIndicator color={theme.surface} />
                    ) : (
                        <Text className="text-lg font-bold" style={{ color: theme.surface }}>{t('submissionsId.submit_post_url')}</Text>
                    )}
                </Pressable>
            );
        }

        return null;
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }} edges={['bottom']}>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
                {renderContent()}
            </ScrollView>

            {renderButton() && (
                <View className="p-4 border-t" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                    {renderButton()}
                </View>
            )}
        </SafeAreaView>
    );
};

export default SubmissionPage;