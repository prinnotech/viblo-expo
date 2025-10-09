import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useMessages } from '@/hooks/useMessages';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const ChatScreen = () => {
    const { id } = useLocalSearchParams();
    const conversationId = Array.isArray(id) ? id[0] : id;
    const { session } = useAuth(); // Get current user's session
    const { messages, otherParticipant, loading, error, sendMessage, refetch } = useMessages(conversationId);
    const [newMessage, setNewMessage] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const navigation = useNavigation();
    const { theme } = useTheme();

    useEffect(() => {
        // Scroll to bottom when new messages arrive
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }

        // Dynamically set the header title
        navigation.setOptions({ title: otherParticipant?.username || 'Chat' });
    }, [messages, otherParticipant, navigation]);

    const handleSend = () => {
        if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage('');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    if (loading) {
        return <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1, backgroundColor: theme.background }} />;
    }

    if (error) {
        return <View className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}><Text style={{ color: theme.error }}>Failed to load messages.</Text></View>;
    }

    return (
        <SafeAreaView edges={['bottom']} className="flex-1" style={{ backgroundColor: theme.surface }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
                keyboardVerticalOffset={90}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        const isMyMessage = item.sender_id === session?.user.id;
                        return (
                            <View className={`flex-row my-2 px-4 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                <View
                                    className={`rounded-2xl p-3 max-w-[80%] ${isMyMessage
                                        ? 'rounded-br-none'
                                        : 'rounded-bl-none'
                                        }`}
                                    style={{
                                        backgroundColor: isMyMessage
                                            ? theme.primary
                                            : theme.surfaceSecondary,
                                    }}
                                >
                                    <Text style={{ color: isMyMessage ? theme.surface : theme.text }}>{item.content}</Text>
                                </View>
                            </View>
                        );
                    }}
                    contentContainerStyle={{ paddingVertical: 10, backgroundColor: theme.background }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
                />

                {/* Message Input */}
                <View className="flex-row items-center p-2 border-t" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                    <TextInput
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder="Type a message..."
                        placeholderTextColor={theme.textTertiary}
                        className="flex-1 rounded-full h-10 px-4"
                        style={{ backgroundColor: theme.surfaceSecondary, color: theme.text }}
                        multiline
                    />
                    <TouchableOpacity onPress={handleSend} className="p-2 ml-2">
                        <Feather name="send" size={24} color={theme.primary} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ChatScreen;

