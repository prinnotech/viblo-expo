import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useConversations, ConversationWithDetails } from '@/hooks/useConversations';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext'; // We'll get the current user from here

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
    const { other_participant, last_message, id } = conversation;

    const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : '?');

    // A message is unread if it exists, is_read is false, AND it was sent by the other person.
    const isUnread = last_message && !last_message.is_read && last_message.sender_id !== currentUserId;

    return (
        <TouchableOpacity
            className="flex-row items-center p-4 bg-white border-b border-gray-100"
            onPress={() => router.push(`/inbox/${id}`)}
            activeOpacity={0.7}
        >
            <View className="w-14 h-14 rounded-full mr-4 bg-gray-200 justify-center items-center">
                {other_participant.avatar_url ? (
                    <Image
                        source={{ uri: other_participant.avatar_url }}
                        className="w-14 h-14 rounded-full"
                    />
                ) : (
                    <Text className="text-xl font-bold text-gray-500">
                        {getInitials(other_participant.username)}
                    </Text>
                )}
            </View>

            <View className="flex-1">
                <View className="flex-row justify-between items-center">
                    <Text className={`text-base ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`} numberOfLines={1}>
                        {other_participant.username}
                    </Text>
                    <Text className="text-xs text-gray-500">
                        {formatTimestamp(last_message?.created_at || null)}
                    </Text>
                </View>
                <Text className={`text-sm mt-1 ${isUnread ? 'text-gray-800 font-semibold' : 'text-gray-500'}`} numberOfLines={1}>
                    {last_message?.content || 'No messages yet'}
                </Text>
            </View>
            {isUnread && <View className="w-2.5 h-2.5 bg-blue-500 rounded-full ml-2" />}
        </TouchableOpacity>
    );
};


const InboxScreen = () => {
    const { conversations, loading, error, refetch } = useConversations();
    const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'favorites'>('all');
    const { session } = useAuth();
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
            <SafeAreaView className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-white justify-center items-center p-8">
                <Feather name="alert-triangle" size={48} color="#ef4444" />
                <Text className="text-lg font-semibold text-gray-800 mt-4">Something went wrong</Text>
                <TouchableOpacity onPress={refetch} className="mt-6 bg-blue-500 px-6 py-2 rounded-lg">
                    <Text className="text-white font-semibold">Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
                <Text className="text-3xl font-bold text-gray-900">Messages</Text>
                <TouchableOpacity className="p-2" onPress={() => router.push('/inbox/new')}>
                    <Ionicons name="add-circle-outline" size={28} color="#333" />
                </TouchableOpacity>
            </View>

            <View className="flex-row items-center px-4 py-2 gap-3">
                <View className="flex-1 flex-row items-center bg-gray-100 rounded-lg px-3">
                    <Feather name="search" size={20} color="#9ca3af" />
                    <TextInput placeholder="Search" className="flex-1 h-10 ml-2 text-base" />
                </View>
            </View>

            <View className="flex-row items-center px-4 py-3 gap-3 border-b border-gray-100">
                <TouchableOpacity
                    onPress={() => setActiveFilter('all')}
                    className={`px-4 py-1.5 rounded-full ${activeFilter === 'all' ? 'bg-blue-600' : 'bg-gray-100'}`}
                >
                    <Text className={`font-semibold ${activeFilter === 'all' ? 'text-white' : 'text-gray-700'}`}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveFilter('unread')}
                    className={`px-4 py-1.5 rounded-full ${activeFilter === 'unread' ? 'bg-blue-600' : 'bg-gray-100'}`}
                >
                    <Text className={`font-semibold ${activeFilter === 'unread' ? 'text-white' : 'text-gray-700'}`}>Unread</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveFilter('favorites')}
                    className={`px-4 py-1.5 rounded-full ${activeFilter === 'favorites' ? 'bg-blue-600' : 'bg-gray-100'}`}
                >
                    <Text className={`font-semibold ${activeFilter === 'favorites' ? 'text-white' : 'text-gray-700'}`}>Favorites</Text>
                </TouchableOpacity>
            </View>

            {filteredConversations.length === 0 ? (
                <View className="flex-1 justify-center items-center p-8">
                    <Feather name="message-square" size={64} color="#d1d5db" />
                    <Text className="text-lg font-semibold text-gray-800 mt-4">No Conversations Found</Text>
                    <Text className="text-gray-500 mt-2 text-center">
                        Your conversations in the "{activeFilter}" filter will appear here.
                    </Text>
                </View>
            ) : (
                <ScrollView>
                    {filteredConversations.map((convo) => (
                        <ConversationRow key={convo.id} conversation={convo} currentUserId={currentUserId} />
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default InboxScreen;

