import { ActivityIndicator, Text, View, Pressable, Alert, ScrollView, TextInput, Image } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ResizeMode, Video } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { ContentSubmission } from '@/lib/db_interface';
import { SubmissionStatus } from '@/lib/enum_types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Campaign } from '@/lib/db_interface';
import { useTheme } from '@/contexts/ThemeContext';

// Add these interfaces at the top of your file
interface VideoItem {
    id: string;
    platform: 'tiktok' | 'youtube' | 'instagram';
    title: string;
    description: string | null;
    thumbnail_url: string;
    url: string;
    view_count: number | null;
    like_count: number | null;
    comment_count: number | null;
    published_at: string;
}

const ApplyPage = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const navigation = useNavigation();
    const { theme } = useTheme();

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

    //states for the video list
    const [selectedPlatform, setSelectedPlatform] = useState<string>('');
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loadingVideos, setLoadingVideos] = useState(false);
    const [selectedVideoApproved, setSelectedVideoApproved] = useState<VideoItem | null>(null);


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
                setError(campaignError.message);
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

    useEffect(() => {
        if (!selectedPlatform || !profile || submission?.status !== 'approved') return;

        const fetchVideos = async () => {
            setLoadingVideos(true);
            setSelectedVideoApproved(null);

            try {
                const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
                const response = await fetch(
                    `${backendUrl}/api/video-list/${selectedPlatform}?user_id=${profile.id}`,
                    {
                        headers: {
                            'x-api-key': process.env.EXPO_PUBLIC_API_KEY || '',
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch videos');
                }

                const data = await response.json();
                setVideos(data);
            } catch (err) {
                console.error('Error fetching videos:', err);
                Alert.alert('Error', `Failed to load ${selectedPlatform} videos. Please try again.`);
                setVideos([]);
            } finally {
                setLoadingVideos(false);
            }
        };

        fetchVideos();
    }, [selectedPlatform, profile, submission?.status]);

    // Initialize selectedPlatform when submission becomes approved
    useEffect(() => {
        if (submission?.status === 'approved' && campaign?.target_platforms && !selectedPlatform) {
            setSelectedPlatform(campaign.target_platforms[0]);
        }
    }, [submission?.status, campaign?.target_platforms, selectedPlatform]);


    const pickVideo = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need access to your videos to submit an application.');
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
                Alert.alert('File too large', 'Please select a video smaller than 500MB.');
                return;
            }
            setSelectedVideo(asset);
        }
    };

    const handleSubmit = async () => {
        if (!selectedVideo || !profile || !campaignId) {
            Alert.alert("Error", "Missing video, profile, or campaign information.");
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

            Alert.alert("Success!", "Your application has been submitted successfully.", [
                { text: "OK", onPress: () => router.back() }
            ]);

        } catch (err) {
            const error = err as Error;
            console.error("Submission failed:", error.message);
            Alert.alert("Submission Failed", "There was an error submitting your application. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResubmit = async () => {
        if (!selectedVideo || !profile || !campaignId || !submission) {
            Alert.alert("Error", "Missing required information.");
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

            Alert.alert("Success!", "Your revised video has been submitted.", [
                { text: "OK", onPress: () => router.back() }
            ]);

        } catch (err) {
            const error = err as Error;
            console.error("Resubmission failed:", error.message);
            Alert.alert("Resubmission Failed", "There was an error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdatePostUrl = async () => {
        if (!selectedVideoApproved || !submission) {
            Alert.alert("Error", "Please select a video.");
            return;
        }
        setIsUpdatingUrl(true);
        try {
            const { error: updateError } = await supabase
                .from('content_submissions')
                .update({
                    video_id: selectedVideoApproved.id,
                    platform: selectedVideoApproved.platform,
                    public_post_url: selectedVideoApproved.url,
                    status: 'posted_live',
                    posted_at: new Date().toISOString(),
                })
                .eq('id', submission.id);

            if (updateError) throw updateError;

            Alert.alert("Success!", "Your post has been submitted and is now live!");

            // Refresh submission data
            const { data } = await supabase
                .from('content_submissions')
                .select('*')
                .eq('id', submission.id)
                .single();
            if (data) setSubmission(data);

        } catch (err) {
            const error = err as Error;
            console.error("Video selection failed:", error.message);
            Alert.alert("Update Failed", "There was an error. Please try again.");
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
        return hours > 0 ? `${hours} hours remaining` : 'Deadline passed';
    };

    if (loading || isAuthLoading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} />;
    }

    if (error || !campaign) {
        return <View className="flex-1 justify-center items-center p-4"><Text style={{ color: theme.error }}>{error || "Campaign not found."}</Text></View>;
    }

    if (profile?.user_type === 'brand') {
        return <View className="flex-1 justify-center items-center p-4"><Text className="text-lg" style={{ color: theme.text }}>Brands cannot apply to campaigns.</Text></View>
    }

    // Render based on submission status
    const renderContent = () => {
        if (!submission) {
            // No submission yet - show initial application form
            return (
                <>
                    <Text className="text-2xl font-bold mb-1" style={{ color: theme.text }}>Submitting for:</Text>
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
                                <Text className="mt-2 text-lg font-semibold" style={{ color: theme.textSecondary }}>Upload Your Video</Text>
                                <Text className="text-sm" style={{ color: theme.textTertiary }}>Max file size: 500MB</Text>
                            </Pressable>
                        )}
                    </View>

                    {selectedVideo && (
                        <Pressable onPress={pickVideo} className="mt-2">
                            <Text className="text-center font-semibold" style={{ color: theme.primary }}>Change video</Text>
                        </Pressable>
                    )}

                    <View className="p-4 rounded-lg mt-4" style={{ backgroundColor: theme.surface }}>
                        <Text className="font-semibold mb-2" style={{ color: theme.text }}>Content Requirements:</Text>
                        <Text style={{ color: theme.textSecondary }}>{campaign.content_requirements || 'No specific requirements'}</Text>
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
                        <Text className="text-2xl font-bold mt-4 text-center" style={{ color: theme.text }}>Under Review</Text>
                        <Text className="text-center mt-2" style={{ color: theme.textSecondary }}>Your submission is being reviewed by the brand. We'll notify you once they make a decision.</Text>
                    </View>
                );

            case 'needs_revision':
                return (
                    <>
                        <View className="border rounded-lg p-4 mb-4" style={{ backgroundColor: theme.warningLight, borderColor: theme.warning }}>
                            <View className="flex-row items-center mb-2">
                                <Feather name="alert-circle" size={24} color={theme.warning} />
                                <Text className="text-lg font-bold ml-2" style={{ color: theme.text }}>Revision Requested</Text>
                            </View>
                            {submission.rating !== null && (
                                <View className="flex-row items-center mb-2">
                                    <Text className="font-semibold" style={{ color: theme.text }}>Rating: </Text>
                                    <Text className="font-bold" style={{ color: theme.warning }}>{submission.rating}/10</Text>
                                </View>
                            )}
                            {submission.message && (
                                <View className="mb-2">
                                    <Text className="font-semibold" style={{ color: theme.text }}>Feedback:</Text>
                                    <Text className="mt-1" style={{ color: theme.textSecondary }}>{submission.message}</Text>
                                </View>
                            )}
                            {submission.justify && (
                                <View>
                                    <Text className="font-semibold" style={{ color: theme.text }}>Details:</Text>
                                    <Text className="mt-1" style={{ color: theme.textSecondary }}>{submission.justify}</Text>
                                </View>
                            )}
                        </View>

                        <Text className="text-xl font-bold mb-4" style={{ color: theme.text }}>Submit Revised Video</Text>

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
                                    <Text className="mt-2 text-lg font-semibold" style={{ color: theme.textSecondary }}>Upload Revised Video</Text>
                                </Pressable>
                            )}
                        </View>

                        {selectedVideo && (
                            <Pressable onPress={pickVideo} className="mt-2">
                                <Text className="text-center font-semibold" style={{ color: theme.primary }}>Change video</Text>
                            </Pressable>
                        )}
                    </>
                );

            case 'approved':
                return (
                    <>
                        <View className="border rounded-lg p-4 mb-4" style={{ backgroundColor: theme.successLight, borderColor: theme.success }}>
                            <View className="flex-row items-center mb-2">
                                <Feather name="check-circle" size={24} color={theme.success} />
                                <Text className="text-lg font-bold ml-2" style={{ color: theme.success }}>Approved!</Text>
                            </View>
                            {submission.rating !== null && (
                                <View className="flex-row items-center mb-2">
                                    <Text className="font-semibold" style={{ color: theme.text }}>Rating: </Text>
                                    <Text className="font-bold" style={{ color: theme.success }}>{submission.rating}/10</Text>
                                </View>
                            )}
                            {submission.message && (
                                <Text className="mt-2" style={{ color: theme.textSecondary }}>{submission.message}</Text>
                            )}
                        </View>

                        <View className="border rounded-lg p-4 mb-4" style={{ backgroundColor: theme.primaryLight, borderColor: theme.primary }}>
                            <Text className="font-bold mb-2" style={{ color: theme.primaryDark }}>⏰ Action Required</Text>
                            <Text className="mb-1" style={{ color: theme.textSecondary }}>
                                Post your video on {campaign.target_platforms?.join(', ') || 'the platform'} within 24 hours,
                                then select it from your videos below.
                            </Text>
                            {submission.approved_at && (
                                <Text className="text-sm font-semibold" style={{ color: theme.error }}>{getTimeRemaining(submission.approved_at)}</Text>
                            )}
                        </View>

                        {/* Platform Tabs */}
                        {campaign.target_platforms && campaign.target_platforms.length > 0 && (
                            <View className="mb-4">
                                <Text className="text-lg font-semibold mb-2" style={{ color: theme.text }}>Select Platform:</Text>
                                <View className="flex-row">
                                    {campaign.target_platforms.map((platform) => (
                                        <Pressable
                                            key={platform}
                                            onPress={() => setSelectedPlatform(platform)}
                                            className={`flex-1 py-3 rounded-lg mr-2 border ${selectedPlatform === platform ? '' : 'border'}`}
                                            style={{
                                                backgroundColor: selectedPlatform === platform ? theme.primary : theme.surface,
                                                borderColor: theme.border
                                            }}
                                        >
                                            <Text
                                                className="text-center font-semibold capitalize"
                                                style={{ color: selectedPlatform === platform ? theme.surface : theme.text }}
                                            >
                                                {platform}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Video List */}
                        <Text className="text-lg font-semibold mb-2" style={{ color: theme.text }}>Select Your Posted Video:</Text>

                        {loadingVideos ? (
                            <View className="items-center justify-center py-8">
                                <ActivityIndicator size="large" color={theme.primary} />
                                <Text className="mt-2" style={{ color: theme.textSecondary }}>Loading your {selectedPlatform} videos...</Text>
                            </View>
                        ) : videos.length === 0 ? (
                            <View className="border rounded-lg p-4 mb-4" style={{ backgroundColor: theme.warningLight, borderColor: theme.warning }}>
                                <Text style={{ color: theme.textSecondary }}>
                                    No videos found. Make sure you've posted the video on {selectedPlatform} and
                                    connected your {selectedPlatform} account.
                                </Text>
                            </View>
                        ) : (
                            <View className="mb-4">
                                {videos.map((video) => (
                                    <Pressable
                                        key={video.id}
                                        onPress={() => setSelectedVideoApproved(video)}
                                        className="mb-3 rounded-lg overflow-hidden border-2"
                                        style={{
                                            backgroundColor: theme.surface,
                                            borderColor: selectedVideoApproved?.id === video.id ? theme.primary : theme.border
                                        }}
                                    >
                                        <View className="flex-row">
                                            <Image
                                                source={{ uri: video.thumbnail_url }}
                                                className="w-32 h-24"
                                                resizeMode="cover"
                                            />
                                            <View className="flex-1 p-3">
                                                <Text className="font-semibold text-sm mb-1" numberOfLines={2} style={{ color: theme.text }}>
                                                    {video.title}
                                                </Text>
                                                <View className="flex-row items-center mt-auto">
                                                    <View className="flex-row items-center mr-3">
                                                        <Feather name="eye" size={14} color={theme.textSecondary} />
                                                        <Text className="text-xs ml-1" style={{ color: theme.textSecondary }}>
                                                            {video.view_count?.toLocaleString() || '0'}
                                                        </Text>
                                                    </View>
                                                    <View className="flex-row items-center">
                                                        <Feather name="heart" size={14} color={theme.textSecondary} />
                                                        <Text className="text-xs ml-1" style={{ color: theme.textSecondary }}>
                                                            {video.like_count?.toLocaleString() || '0'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            {selectedVideoApproved?.id === video.id && (
                                                <View className="absolute top-2 right-2 rounded-full p-1" style={{ backgroundColor: theme.primary }}>
                                                    <Feather name="check" size={16} color={theme.surface} />
                                                </View>
                                            )}
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        )}
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
                                    {submission.status === 'posted_live' ? 'Posted Live!' : 'Completed!'}
                                </Text>
                            </View>
                            {submission.rating !== null && (
                                <View className="flex-row items-center">
                                    <Text className="font-semibold" style={{ color: theme.text }}>Rating: </Text>
                                    <Text className="font-bold" style={{ color: theme.success }}>{submission.rating}/10</Text>
                                </View>
                            )}
                        </View>

                        <Text className="text-2xl font-bold mb-4" style={{ color: theme.text }}>Performance Stats</Text>

                        <View className="rounded-lg p-4 mb-3 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="eye" size={20} color={theme.textSecondary} />
                                    <Text className="ml-2" style={{ color: theme.textSecondary }}>Views</Text>
                                </View>
                                <Text className="text-xl font-bold" style={{ color: theme.text }}>{submission.view_count?.toLocaleString() || '0'}</Text>
                            </View>
                        </View>

                        <View className="rounded-lg p-4 mb-3 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="heart" size={20} color={theme.textSecondary} />
                                    <Text className="ml-2" style={{ color: theme.textSecondary }}>Likes</Text>
                                </View>
                                <Text className="text-xl font-bold" style={{ color: theme.text }}>{submission.like_count?.toLocaleString() || '0'}</Text>
                            </View>
                        </View>

                        <View className="rounded-lg p-4 mb-3 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="message-circle" size={20} color={theme.textSecondary} />
                                    <Text className="ml-2" style={{ color: theme.textSecondary }}>Comments</Text>
                                </View>
                                <Text className="text-xl font-bold" style={{ color: theme.text }}>{submission.comment_count?.toLocaleString() || '0'}</Text>
                            </View>
                        </View>

                        <View className="rounded-lg p-4" style={{ backgroundColor: theme.successLight, borderColor: theme.success, borderWidth: 1 }}>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="dollar-sign" size={20} color={theme.success} />
                                    <Text className="ml-2" style={{ color: theme.textSecondary }}>Earned</Text>
                                </View>
                                <Text className="text-2xl font-bold" style={{ color: theme.success }}>${submission.earned_amount?.toFixed(2) || '0.00'}</Text>
                            </View>
                        </View>

                        {submission.public_post_url && (
                            <Pressable
                                onPress={() => Alert.alert('Open Post', 'Open in browser: ' + submission.public_post_url)}
                                className="mt-4 py-3 rounded-lg"
                                style={{ backgroundColor: theme.primary }}
                            >
                                <Text className="text-center font-semibold" style={{ color: theme.surface }}>View Public Post</Text>
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
                        <Text className="text-lg font-bold" style={{ color: theme.surface }}>Submit Application</Text>
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
                        <Text className="text-lg font-bold" style={{ color: theme.surface }}>Resubmit Video</Text>
                    )}
                </Pressable>
            );
        }

        if (submission.status === 'approved') {
            return (
                <Pressable
                    disabled={!selectedVideoApproved || isUpdatingUrl}
                    className="py-4 rounded-xl items-center justify-center shadow-lg"
                    style={{
                        backgroundColor: (!selectedVideoApproved || isUpdatingUrl) ? theme.textTertiary : theme.success
                    }}
                    onPress={handleUpdatePostUrl}
                >
                    {isUpdatingUrl ? (
                        <ActivityIndicator color={theme.surface} />
                    ) : (
                        <Text className="text-lg font-bold" style={{ color: theme.surface }}>
                            {selectedVideoApproved ? 'Submit Selected Video' : 'Select a Video'}
                        </Text>
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

export default ApplyPage;
