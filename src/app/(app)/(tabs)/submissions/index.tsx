import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    TextInput
} from "react-native";
import { supabase } from "@/lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ContentSubmission } from "@/lib/db_interface";
import { SubmissionStatus } from "@/lib/enum_types";
import Feather from "@expo/vector-icons/Feather";
import { useSubmissions } from "@/hooks/useSubmissions";

export default function Page() {
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">('all');
    const [searchQuery, setSearchQuery] = useState('');

    const router = useRouter();

    // A map to hold user-friendly display names
    const STATUS_LABELS: Record<SubmissionStatus | 'all', string> = {
        all: 'All',
        pending_review: 'Pending Review',
        needs_revision: 'Needs Revision',
        approved: 'Approved',
        posted_live: 'Posted Live',
        completed: 'Completed',
    };

    const { submissions, loading, error, refetch } = useSubmissions(statusFilter)

    const filteredSubmissions = submissions.filter((submission) => {
        const campaignTitle = typeof submission.campaign_id === 'object'
            ? submission.campaign_id.title?.toLowerCase() || ''
            : '';

        return campaignTitle.includes(searchQuery.toLowerCase());
    });


    const onRefresh = () => {
        setRefreshing(true);
        refetch();
    };

    const getStatusColor = (status: SubmissionStatus) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 border-green-300';
            case 'needs_revision':
                return 'bg-red-100 border-red-300';
            case 'posted_live':
                return 'bg-blue-100 border-blue-300';
            default:
                return 'bg-yellow-100 border-yellow-300';
        }
    };

    const getStatusTextColor = (status: SubmissionStatus) => {
        switch (status) {
            case 'approved':
                return 'text-green-700';
            case 'needs_revision':
                return 'text-red-700';
            case 'posted_live':
                return 'text-blue-700';
            default:
                return 'text-yellow-700';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatNumber = (num: number | null) => {
        if (num === null) return 'N/A';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text className="mt-4 text-gray-600">Loading submissions...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="px-6 py-4 bg-white border-b border-gray-200">
                <Text className="text-2xl font-bold text-gray-900">My Submissions</Text>
                <Text className="text-sm text-gray-600 mt-1">
                    {submissions.length} total submission{submissions.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* Search Bar */}
            <View className="px-4 py-3 bg-white border-b border-gray-200">
                <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                    <Feather name="search" size={20} color="#6B7280" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search campaigns..."
                        className="flex-1 ml-2 text-gray-900"
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Feather name="x" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>


            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="px-1 py-4 max-h-20 "
                contentContainerStyle={{ gap: 8 }}
            >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <TouchableOpacity
                        key={key}
                        onPress={() => setStatusFilter(key as SubmissionStatus)}
                        className={`border rounded-lg px-3 py-3 ${statusFilter === key
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-white border-gray-300'
                            }`}
                        activeOpacity={0.7}
                    >
                        <Text className={`text-sm font-medium ${statusFilter === key ? 'text-white' : 'text-gray-700'}`}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {submissions.length === 0 ? (
                    <View className="flex-1 justify-center items-center py-20">
                        <Text className="text-6xl mb-4">📝</Text>
                        <Text className="text-lg font-semibold text-gray-900">
                            {searchQuery ? 'No results found' : 'No submissions yet'}
                        </Text>
                        <Text className="text-gray-600 mt-2 text-center px-8">
                            {searchQuery
                                ? `No submissions match "${searchQuery}"`
                                : 'Your content submissions will appear here'
                            }
                        </Text>
                    </View>
                ) : (
                    <View className="px-4 py-4">
                        {filteredSubmissions?.map((submission) => (
                            <TouchableOpacity
                                key={submission.id}
                                className="bg-white rounded-lg p-4 mb-3 border border-gray-200 shadow-sm"
                                onPress={() => {
                                    if (typeof submission.campaign_id === 'object' && submission.campaign_id.id) {
                                        router.push(`/submissions/${submission.campaign_id.id}`);
                                    } else {
                                        console.error('Invalid campaign_id:', submission.campaign_id);
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                {/* Campaign Info */}
                                <View className="flex-col gap-2 items-start mb-3">
                                    <View className="flex-1">
                                        <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
                                            {typeof submission.campaign_id === 'object' && submission.campaign_id?.title || 'Campaign Title'}
                                        </Text>
                                    </View>
                                    <View className={`px-3 py-1 rounded-full border ${getStatusColor(submission.status)}`}>
                                        <Text className={`text-xs font-semibold uppercase ${getStatusTextColor(submission.status)}`}>
                                            {submission.status}
                                        </Text>
                                    </View>
                                </View>

                                {/* Metrics Row */}
                                {submission.status === 'posted_live' && (
                                    <View className="flex-row justify-between mb-3 py-2 border-t border-gray-100">
                                        <View className="items-center">
                                            <Text className="text-xs text-gray-500">Views</Text>
                                            <Text className="text-sm font-semibold text-gray-900 mt-1">
                                                {formatNumber(submission.view_count)}
                                            </Text>
                                        </View>
                                        <View className="items-center">
                                            <Text className="text-xs text-gray-500">Likes</Text>
                                            <Text className="text-sm font-semibold text-gray-900 mt-1">
                                                {formatNumber(submission.like_count)}
                                            </Text>
                                        </View>
                                        <View className="items-center">
                                            <Text className="text-xs text-gray-500">Comments</Text>
                                            <Text className="text-sm font-semibold text-gray-900 mt-1">
                                                {formatNumber(submission.comment_count)}
                                            </Text>
                                        </View>
                                        <View className="items-center">
                                            <Text className="text-xs text-gray-500">Earned</Text>
                                            <Text className="text-sm font-semibold text-green-600 mt-1">
                                                ${submission.earned_amount.toFixed(0)}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Match & Rating (if approved) */}
                                {(submission.status === 'approved' || submission.status === 'posted_live') && (
                                    <View className="flex-row items-center mb-3 py-2 border-t border-gray-100">
                                        <View className="flex-1">
                                            <Text className="text-xs text-gray-500">Match Score</Text>
                                            <View className="flex-row items-center mt-1">
                                                <View className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                                    <View
                                                        className="bg-blue-500 h-2 rounded-full"
                                                        style={{ width: `${submission.match_percentage}%` }}
                                                    />
                                                </View>
                                                <Text className="text-xs font-semibold text-gray-700">
                                                    {submission.match_percentage}%
                                                </Text>
                                            </View>
                                        </View>
                                        {submission.rating > 0 && (
                                            <View className="ml-4 items-center">
                                                <Text className="text-xs text-gray-500">Rating</Text>
                                                <Text className="text-sm font-semibold text-gray-900 mt-1">
                                                    ⭐ {submission.rating}/5
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Brand Feedback */}
                                {submission.brand_feedback && (
                                    <View className="bg-blue-50 rounded p-3 mb-3">
                                        <Text className="text-xs font-semibold text-blue-900 mb-1">
                                            Brand Feedback
                                        </Text>
                                        <Text className="text-xs text-blue-800" numberOfLines={2}>
                                            {submission.brand_feedback}
                                        </Text>
                                    </View>
                                )}

                                {/* AI feedback */}
                                {submission.status === 'needs_revision' && (
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

                                )}

                                {/* Date Info */}
                                <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
                                    <Text className="text-xs text-gray-500">
                                        Submitted {formatDate(submission.submitted_at)}
                                    </Text>
                                    {submission.posted_at && (
                                        <Text className="text-xs text-gray-500">
                                            Posted {formatDate(submission.posted_at)}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}