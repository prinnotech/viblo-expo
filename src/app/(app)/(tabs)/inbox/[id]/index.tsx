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
    RefreshControl,
    Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useMessages } from '@/hooks/useMessages';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const ChatScreen = () => {
    const { id } = useLocalSearchParams();
    const conversationId = Array.isArray(id) ? id[0] : id;
    const { session } = useAuth();
    const { messages, otherParticipant, loading, error, sendMessage, refetch } = useMessages(conversationId);
    const [newMessage, setNewMessage] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const navigation = useNavigation();
    const { theme } = useTheme();
    const { t } = useLanguage();

    useEffect(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
        navigation.setOptions({ title: otherParticipant?.username || t('inboxId.chat') });
    }, [messages, otherParticipant, navigation, t]);

    const handleSend = () => {
        if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage('');
            Keyboard.dismiss(); // Dismiss keyboard after sending
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
        return <View className="flex-1 justify-center items-center" style={{ backgroundColor: theme.background }}><Text style={{ color: theme.error }}>{t('inboxId.failed_load_messages')}</Text></View>;
    }

    return (
        <View className="flex-1" style={{ backgroundColor: theme.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
                    contentContainerStyle={{ paddingVertical: 10 }}
                    style={{ backgroundColor: theme.background }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
                />

                {/* Message Input */}
                <View className="flex-row items-center p-2 border-t" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                    <TextInput
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder={t('inboxId.type_message_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                        className="flex-1 rounded-full h-10 px-4"
                        style={{ backgroundColor: theme.surfaceSecondary, color: theme.text }}
                        onSubmitEditing={handleSend}
                        blurOnSubmit={false}
                        returnKeyType="send"
                    />
                    <TouchableOpacity onPress={handleSend} className="p-2 ml-2">
                        <Feather name="send" size={24} color={theme.primary} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default ChatScreen;