import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useConversations, ConversationWithDetails } from '@/hooks/useConversations';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

// A utility function to format the date/time of the last message
const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// A component for a single conversation item in the list
const ConversationRow = ({ conversation, currentUserId }: { conversation: ConversationWithDetails, currentUserId?: string }) => {
    const router = useRouter();
    const { theme } = useTheme();
    const { other_participant, last_message, id } = conversation;

    const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : '?');

    // A message is unread if it exists, is_read is false, AND it was sent by the other person.
    const isUnread = last_message && !last_message.is_read && last_message.sender_id !== currentUserId;

    return (
        <TouchableOpacity
            className="flex-row items-center p-4 border-b"
            style={{ backgroundColor: theme.surface, borderColor: theme.borderLight }}
            onPress={() => router.push(`/inbox/${id}`)}
            activeOpacity={0.7}
        >
            <View className="w-14 h-14 rounded-full mr-4 justify-center items-center" style={{ backgroundColor: theme.surfaceSecondary }}>
                {other_participant.avatar_url ? (
                    <Image
                        source={{ uri: other_participant.avatar_url }}
                        className="w-14 h-14 rounded-full"
                    />
                ) : (
                    <Text className="text-xl font-bold" style={{ color: theme.textTertiary }}>
                        {getInitials(other_participant.username)}
                    </Text>
                )}
            </View>

            <View className="flex-1">
                <View className="flex-row justify-between items-center">
                    <Text className={`text-base ${isUnread ? 'font-bold' : 'font-semibold'}`} style={{ color: theme.text }} numberOfLines={1}>
                        {other_participant.username}
                    </Text>
                    <Text className="text-xs" style={{ color: theme.textTertiary }}>
                        {formatTimestamp(last_message?.created_at || null)}
                    </Text>
                </View>
                <Text className={`text-sm mt-1 ${isUnread ? 'font-semibold' : ''}`} style={{ color: isUnread ? theme.text : theme.textTertiary }} numberOfLines={1}>
                    {last_message?.content || 'No messages yet'}
                </Text>
            </View>
            {isUnread && <View className="w-2.5 h-2.5 rounded-full ml-2" style={{ backgroundColor: theme.primary }} />}
        </TouchableOpacity>
    );
};


const InboxScreen = () => {
    const { conversations, loading, error, refetch } = useConversations();
    const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'favorites'>('all');
    const { session } = useAuth();
    const { theme } = useTheme();
    const currentUserId = session?.user.id;
    const router = useRouter();

    const filteredConversations = useMemo(() => {
        if (activeFilter === 'unread') {
            return conversations.filter(c =>
                c.last_message && !c.last_message.is_read && c.last_message.sender_id !== currentUserId
            );
        }
        if (activeFilter === 'favorites') {
            return conversations.filter(c => c.is_favorite);
        }
        return conversations;
    }, [conversations, activeFilter, currentUserId]);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center p-8" style={{ backgroundColor: theme.background }}>
                <Feather name="alert-triangle" size={48} color={theme.error} />
                <Text className="text-lg font-semibold mt-4" style={{ color: theme.text }}>Something went wrong</Text>
                <TouchableOpacity onPress={refetch} className="mt-6 px-6 py-2 rounded-lg" style={{ backgroundColor: theme.primary }}>
                    <Text className="font-semibold" style={{ color: theme.surface }}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.surface }}>
            <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
                <Text className="text-3xl font-bold" style={{ color: theme.text }}>Messages</Text>
                <TouchableOpacity className="p-2" onPress={() => router.push('/inbox/new')}>
                    <Ionicons name="add-circle-outline" size={28} color={theme.text} />
                </TouchableOpacity>
            </View>

            <View className="flex-row items-center px-4 py-2 gap-3">
                <View className="flex-1 flex-row items-center rounded-lg px-3" style={{ backgroundColor: theme.surfaceSecondary }}>
                    <Feather name="search" size={20} color={theme.textTertiary} />
                    <TextInput placeholder="Search" className="flex-1 h-10 ml-2 text-base" style={{ color: theme.text }} placeholderTextColor={theme.textTertiary} />
                </View>
            </View>

            <View className="flex-row items-center px-4 py-3 gap-3 border-b" style={{ borderColor: theme.borderLight }}>
                <TouchableOpacity
                    onPress={() => setActiveFilter('all')}
                    className="px-4 py-1.5 rounded-full"
                    style={{ backgroundColor: activeFilter === 'all' ? theme.primary : theme.surfaceSecondary }}
                >
                    <Text className="font-semibold" style={{ color: activeFilter === 'all' ? theme.surface : theme.textSecondary }}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveFilter('unread')}
                    className="px-4 py-1.5 rounded-full"
                    style={{ backgroundColor: activeFilter === 'unread' ? theme.primary : theme.surfaceSecondary }}
                >
                    <Text className="font-semibold" style={{ color: activeFilter === 'unread' ? theme.surface : theme.textSecondary }}>Unread</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveFilter('favorites')}
                    className="px-4 py-1.5 rounded-full"
                    style={{ backgroundColor: activeFilter === 'favorites' ? theme.primary : theme.surfaceSecondary }}
                >
                    <Text className="font-semibold" style={{ color: activeFilter === 'favorites' ? theme.surface : theme.textSecondary }}>Favorites</Text>
                </TouchableOpacity>
            </View>

            {filteredConversations.length === 0 ? (
                <View className="flex-1 justify-center items-center p-8" style={{ backgroundColor: theme.background }}>
                    <Feather name="message-square" size={64} color={theme.border} />
                    <Text className="text-lg font-semibold mt-4" style={{ color: theme.text }}>No Conversations Found</Text>
                    <Text className="mt-2 text-center" style={{ color: theme.textTertiary }}>
                        Your conversations in the "{activeFilter}" filter will appear here.
                    </Text>
                </View>
            ) : (
                <ScrollView style={{ backgroundColor: theme.background }}>
                    {filteredConversations.map((convo) => (
                        <ConversationRow key={convo.id} conversation={convo} currentUserId={currentUserId} />
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default InboxScreen;
