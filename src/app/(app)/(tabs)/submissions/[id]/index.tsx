import { ActivityIndicator, Text, View, Pressable, Alert, ScrollView, TextInput } from 'react-native';
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


const SubmissionPage = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const navigation = useNavigation();

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
        if (!publicPostUrl.trim() || !submission) {
            Alert.alert("Error", "Please enter a valid URL.");
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

            Alert.alert("Success!", "Your post URL has been submitted.");
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
        return <ActivityIndicator className="flex-1" size="large" />;
    }

    if (error || !campaign) {
        return <View className="flex-1 justify-center items-center p-4"><Text className="text-red-500">{error || "Campaign not found."}</Text></View>;
    }

    if (profile?.user_type === 'brand') {
        return <View className="flex-1 justify-center items-center p-4"><Text className="text-lg">Brands cannot apply to campaigns.</Text></View>
    }

    // Render based on submission status
    const renderContent = () => {
        if (!submission) {
            // No submission yet - show initial application form
            return (
                <>
                    <Text className="text-2xl font-bold mb-1">Submitting for:</Text>
                    <Text className="text-3xl font-extrabold text-blue-600 mb-6">{campaign.title}</Text>

                    <View className="items-center justify-center w-full h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
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
                                <Feather name="upload-cloud" size={48} color="gray" />
                                <Text className="mt-2 text-lg font-semibold text-gray-600">Upload Your Video</Text>
                                <Text className="text-sm text-gray-400">Max file size: 500MB</Text>
                            </Pressable>
                        )}
                    </View>

                    {selectedVideo && (
                        <Pressable onPress={pickVideo} className="mt-2">
                            <Text className="text-center text-blue-600 font-semibold">Change video</Text>
                        </Pressable>
                    )}

                    <View className="p-4 bg-white rounded-lg mt-4">
                        <Text className="font-semibold mb-2">Content Requirements:</Text>
                        <Text className="text-gray-600">{campaign.content_requirements || 'No specific requirements'}</Text>
                    </View>
                </>
            );
        }

        // Has submission - show status-specific UI
        switch (submission.status) {
            case 'pending_review':
                return (
                    <View className="flex-1 items-center justify-center p-6">
                        <Feather name="clock" size={64} color="#F59E0B" />
                        <Text className="text-2xl font-bold mt-4 text-center">Under Review</Text>
                        <Text className="text-gray-600 text-center mt-2">Your submission is being reviewed by the brand. We'll notify you once they make a decision.</Text>
                    </View>
                );

            case 'needs_revision':
                return (
                    <>
                        <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <View className="flex-row items-center mb-2">
                                <Feather name="alert-circle" size={24} color="#F59E0B" />
                                <Text className="text-lg font-bold ml-2">Revision Requested</Text>
                            </View>
                            {submission.rating !== null && (
                                <View className="flex-row items-center mb-2">
                                    <Text className="font-semibold">Rating: </Text>
                                    <Text className="text-yellow-600 font-bold">{submission.rating}/10</Text>
                                </View>
                            )}
                            {submission.message && (
                                <View className="mb-2">
                                    <Text className="font-semibold">Feedback:</Text>
                                    <Text className="text-gray-700 mt-1">{submission.message}</Text>
                                </View>
                            )}
                            {submission.justify && (
                                <View>
                                    <Text className="font-semibold">Details:</Text>
                                    <Text className="text-gray-700 mt-1">{submission.justify}</Text>
                                </View>
                            )}
                        </View>

                        <Text className="text-xl font-bold mb-4">Submit Revised Video</Text>

                        <View className="items-center justify-center w-full h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
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
                                    <Feather name="upload-cloud" size={48} color="gray" />
                                    <Text className="mt-2 text-lg font-semibold text-gray-600">Upload Revised Video</Text>
                                </Pressable>
                            )}
                        </View>

                        {selectedVideo && (
                            <Pressable onPress={pickVideo} className="mt-2">
                                <Text className="text-center text-blue-600 font-semibold">Change video</Text>
                            </Pressable>
                        )}
                    </>
                );

            case 'approved':
                return (
                    <>
                        <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <View className="flex-row items-center mb-2">
                                <Feather name="check-circle" size={24} color="#10B981" />
                                <Text className="text-lg font-bold ml-2 text-green-700">Approved!</Text>
                            </View>
                            {submission.rating !== null && (
                                <View className="flex-row items-center mb-2">
                                    <Text className="font-semibold">Rating: </Text>
                                    <Text className="text-green-600 font-bold">{submission.rating}/10</Text>
                                </View>
                            )}
                            {submission.message && (
                                <Text className="text-gray-700 mt-2">{submission.message}</Text>
                            )}
                        </View>

                        <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <Text className="font-bold text-blue-900 mb-2">⏰ Action Required</Text>
                            <Text className="text-gray-700 mb-1">Post your video on {campaign.target_platforms?.join(', ') || 'the platform'} within 24 hours.</Text>
                            {submission.approved_at && (
                                <Text className="text-sm text-red-600 font-semibold">{getTimeRemaining(submission.approved_at)}</Text>
                            )}
                        </View>

                        <Text className="text-lg font-semibold mb-2">Post URL</Text>
                        <Text className="text-sm text-gray-600 mb-2">After posting, paste the link to your public post here:</Text>

                        <TextInput
                            value={publicPostUrl}
                            onChangeText={setPublicPostUrl}
                            placeholder="https://tiktok.com/@user/video/..."
                            className="border border-gray-300 rounded-lg p-3 mb-4 bg-white"
                        />
                    </>
                );

            case 'posted_live':
            case 'completed':
                return (
                    <>
                        <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <View className="flex-row items-center mb-2">
                                <Feather name="check-circle" size={24} color="#10B981" />
                                <Text className="text-lg font-bold ml-2 text-green-700">
                                    {submission.status === 'posted_live' ? 'Posted Live!' : 'Completed!'}
                                </Text>
                            </View>
                            {submission.rating !== null && (
                                <View className="flex-row items-center">
                                    <Text className="font-semibold">Rating: </Text>
                                    <Text className="text-green-600 font-bold">{submission.rating}/10</Text>
                                </View>
                            )}
                        </View>

                        <Text className="text-2xl font-bold mb-4">Performance Stats</Text>

                        <View className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="eye" size={20} color="#6B7280" />
                                    <Text className="ml-2 text-gray-600">Views</Text>
                                </View>
                                <Text className="text-xl font-bold">{submission.view_count?.toLocaleString() || '0'}</Text>
                            </View>
                        </View>

                        <View className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="heart" size={20} color="#6B7280" />
                                    <Text className="ml-2 text-gray-600">Likes</Text>
                                </View>
                                <Text className="text-xl font-bold">{submission.like_count?.toLocaleString() || '0'}</Text>
                            </View>
                        </View>

                        <View className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="message-circle" size={20} color="#6B7280" />
                                    <Text className="ml-2 text-gray-600">Comments</Text>
                                </View>
                                <Text className="text-xl font-bold">{submission.comment_count?.toLocaleString() || '0'}</Text>
                            </View>
                        </View>

                        <View className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <Feather name="dollar-sign" size={20} color="#10B981" />
                                    <Text className="ml-2 text-gray-600">Earned</Text>
                                </View>
                                <Text className="text-2xl font-bold text-green-600">${submission.earned_amount?.toFixed(2) || '0.00'}</Text>
                            </View>
                        </View>

                        {submission.public_post_url && (
                            <Pressable
                                onPress={() => Alert.alert('Open Post', 'Open in browser: ' + submission.public_post_url)}
                                className="mt-4 bg-blue-600 py-3 rounded-lg"
                            >
                                <Text className="text-white text-center font-semibold">View Public Post</Text>
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
                    className={`py-4 rounded-xl items-center justify-center shadow-lg ${(!selectedVideo || isSubmitting) ? 'bg-gray-400' : 'bg-blue-600'}`}
                    onPress={handleSubmit}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-lg font-bold">Submit Application</Text>
                    )}
                </Pressable>
            );
        }

        if (submission.status === 'needs_revision') {
            return (
                <Pressable
                    disabled={!selectedVideo || isSubmitting}
                    className={`py-4 rounded-xl items-center justify-center shadow-lg ${(!selectedVideo || isSubmitting) ? 'bg-gray-400' : 'bg-blue-600'}`}
                    onPress={handleResubmit}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-lg font-bold">Resubmit Video</Text>
                    )}
                </Pressable>
            );
        }

        if (submission.status === 'approved') {
            return (
                <Pressable
                    disabled={!publicPostUrl.trim() || isUpdatingUrl}
                    className={`py-4 rounded-xl items-center justify-center shadow-lg ${(!publicPostUrl.trim() || isUpdatingUrl) ? 'bg-gray-400' : 'bg-green-600'}`}
                    onPress={handleUpdatePostUrl}
                >
                    {isUpdatingUrl ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-lg font-bold">Submit Post URL</Text>
                    )}
                </Pressable>
            );
        }

        return null;
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
                {renderContent()}
            </ScrollView>

            {renderButton() && (
                <View className="p-4 bg-white border-t border-gray-200">
                    {renderButton()}
                </View>
            )}
        </SafeAreaView>
    );
};

export default SubmissionPage;