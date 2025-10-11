import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    TextInput,
    FlatList
} from "react-native";
import { supabase } from "@/lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ContentSubmission } from "@/lib/db_interface";
import { SubmissionStatus } from "@/lib/enum_types";
import Feather from "@expo/vector-icons/Feather";
import { useSubmissions } from "@/hooks/useSubmissions";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Page() {
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">('all');
    const [searchQuery, setSearchQuery] = useState('');
    const { theme } = useTheme();
    const { t } = useLanguage();
    const router = useRouter();

    const STATUS_LABELS: Record<SubmissionStatus | 'all', string> = {
        all: t('submissionsIndex.all'),
        pending_review: t('submissionsIndex.pending_review'),
        needs_revision: t('submissionsIndex.needs_revision'),
        approved: t('submissionsIndex.approved'),
        posted_live: t('submissionsIndex.posted_live'),
        completed: t('submissionsIndex.completed'),
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
        refetch().finally(() => setRefreshing(false));
    };

    const getStatusStyle = (status: SubmissionStatus) => {
        switch (status) {
            case 'approved':
                return { backgroundColor: theme.successLight, borderColor: theme.success, textColor: theme.success };
            case 'needs_revision':
                return { backgroundColor: theme.errorLight, borderColor: theme.error, textColor: theme.error };
            case 'posted_live':
                return { backgroundColor: theme.primaryLight, borderColor: theme.primary, textColor: theme.primaryDark };
            default:
                return { backgroundColor: theme.warningLight, borderColor: theme.warning, textColor: theme.warning };
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

    if (loading && !refreshing) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text className="mt-4" style={{ color: theme.textSecondary }}>{t('submissionsIndex.loading_submissions')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <View className="px-6 py-4 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <Text className="text-2xl font-bold" style={{ color: theme.text }}>{t('submissionsIndex.my_submissions')}</Text>
                <Text className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                    {submissions.length !== 1
                        ? t('submissionsIndex.total_submissions_plural').replace('{{count}}', submissions.length.toString())
                        : t('submissionsIndex.total_submissions').replace('{{count}}', submissions.length.toString())
                    }
                </Text>
            </View>

            {/* Search Bar */}
            <View className="px-4 py-3 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <View className="flex-row items-center rounded-lg px-3 py-2" style={{ backgroundColor: theme.surfaceSecondary }}>
                    <Feather name="search" size={20} color={theme.textTertiary} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={t('submissionsIndex.search_campaigns')}
                        className="flex-1 ml-2"
                        style={{ color: theme.text }}
                        placeholderTextColor={theme.textTertiary}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Feather name="x" size={20} color={theme.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>


            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="py-4 max-h-20"
                style={{ backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
            >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <TouchableOpacity
                        key={key}
                        onPress={() => setStatusFilter(key as SubmissionStatus | 'all')}
                        className="border rounded-lg px-3 py-2"
                        style={{
                            backgroundColor: statusFilter === key ? theme.primary : theme.surface,
                            borderColor: statusFilter === key ? theme.primary : theme.border
                        }}
                        activeOpacity={0.7}
                    >
                        <Text className="text-sm font-medium" style={{ color: statusFilter === key ? theme.surface : theme.text }}>
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <FlatList
                data={filteredSubmissions}
                keyExtractor={(item) => item.id}
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
                }
                ListEmptyComponent={
                    <View className="flex-1 justify-center items-center py-20">
                        <Text className="text-6xl mb-4">📋</Text>
                        <Text className="text-lg font-semibold" style={{ color: theme.text }}>
                            {searchQuery ? t('submissionsIndex.no_results_found') : t('submissionsIndex.no_submissions_yet')}
                        </Text>
                        <Text className="mt-2 text-center px-8" style={{ color: theme.textSecondary }}>
                            {searchQuery
                                ? t('submissionsIndex.no_submissions_match').replace('{{query}}', searchQuery)
                                : t('submissionsIndex.submissions_appear_here')
                            }
                        </Text>
                    </View>
                }
                renderItem={({ item: submission }) => {
                    const statusStyles = getStatusStyle(submission.status);
                    return (
                        <TouchableOpacity
                            key={submission.id}
                            className="rounded-lg p-4 mb-3 border shadow-sm"
                            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
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
                                    <Text className="text-lg font-semibold" style={{ color: theme.text }} numberOfLines={1}>
                                        {typeof submission.campaign_id === 'object' && submission.campaign_id?.title || t('submissionsIndex.campaign_title')}
                                    </Text>
                                </View>
                                <View className="px-3 py-1 rounded-full border" style={{ backgroundColor: statusStyles.backgroundColor, borderColor: statusStyles.borderColor }}>
                                    <Text className="text-xs font-semibold uppercase" style={{ color: statusStyles.textColor }}>
                                        {submission.status.replace('_', ' ')}
                                    </Text>
                                </View>
                            </View>

                            {/* Metrics Row */}
                            {submission.status === 'posted_live' && (
                                <View className="flex-row justify-between mb-3 py-2 border-t" style={{ borderColor: theme.borderLight }}>
                                    <View className="items-center">
                                        <Text className="text-xs" style={{ color: theme.textSecondary }}>{t('submissionsIndex.views')}</Text>
                                        <Text className="text-sm font-semibold mt-1" style={{ color: theme.text }}>
                                            {formatNumber(submission.view_count)}
                                        </Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-xs" style={{ color: theme.textSecondary }}>{t('submissionsIndex.likes')}</Text>
                                        <Text className="text-sm font-semibold mt-1" style={{ color: theme.text }}>
                                            {formatNumber(submission.like_count)}
                                        </Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-xs" style={{ color: theme.textSecondary }}>{t('submissionsIndex.comments')}</Text>
                                        <Text className="text-sm font-semibold mt-1" style={{ color: theme.text }}>
                                            {formatNumber(submission.comment_count)}
                                        </Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-xs" style={{ color: theme.textSecondary }}>{t('submissionsIndex.earned')}</Text>
                                        <Text className="text-sm font-semibold mt-1" style={{ color: theme.success }}>
                                            ${submission.earned_amount.toFixed(0)}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Date Info */}
                            <View className="flex-row justify-between items-center pt-2 border-t" style={{ borderColor: theme.borderLight }}>
                                <Text className="text-xs" style={{ color: theme.textTertiary }}>
                                    {t('submissionsIndex.submitted').replace('{{date}}', formatDate(submission.submitted_at))}
                                </Text>
                                {submission.posted_at && (
                                    <Text className="text-xs" style={{ color: theme.textTertiary }}>
                                        {t('submissionsIndex.posted').replace('{{date}}', formatDate(submission.posted_at))}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </SafeAreaView>
    );
}