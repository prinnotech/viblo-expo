import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Message, Profile } from '@/lib/db_interface';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useMessages = (conversationId: string | null) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [otherParticipant, setOtherParticipant] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const fetchInitialData = useCallback(async () => {
        if (!conversationId) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            // Fetch all messages in the conversation
            const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (messagesError) throw messagesError;
            setMessages(messagesData || []);

            // Find the other participant's ID
            const { data: participantData, error: participantError } = await supabase
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', conversationId)
                .neq('user_id', user.id)
                .single();

            if (participantError) throw participantError;

            // --- MARK AS READ LOGIC ---
            // After fetching messages, update them to be 'read'
            // This is a "fire-and-forget" operation for efficiency.
            const { error: updateError } = await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('conversation_id', conversationId)
                .eq('sender_id', participantData.user_id) // Only mark messages from the other person as read
                .eq('is_read', false); // Only update unread messages

            if (updateError) {
                console.error("Error marking messages as read:", updateError);
            }
            // --- END OF MARK AS READ LOGIC ---

            // Fetch the other participant's profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', participantData.user_id)
                .single();

            if (profileError) throw profileError;
            setOtherParticipant(profileData);

        } catch (err) {
            console.error("Error fetching messages:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    const sendMessage = async (content: string) => {
        if (!conversationId || !content.trim()) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            const newMessage: Omit<Message, 'id' | 'created_at'> = {
                conversation_id: conversationId,
                sender_id: user.id,
                content: content.trim(),
                is_read: false
            };

            const { error } = await supabase.from('messages').insert(newMessage);
            if (error) throw error;

        } catch (err) {
            console.error("Error sending message:", err);
            setError(err);
        }
    };

    useEffect(() => {
        fetchInitialData();

        let channel: RealtimeChannel | undefined;
        if (conversationId) {
            channel = supabase
                .channel(`public:messages:conversation_id=eq.${conversationId}`)
                .on<Message>(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `conversation_id=eq.${conversationId}`,
                    },
                    (payload) => {
                        setMessages((currentMessages) => [...currentMessages, payload.new as Message]);
                    }
                )
                .subscribe();
        }

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };

    }, [conversationId, fetchInitialData]);

    return { messages, otherParticipant, loading, error, sendMessage, refetch: fetchInitialData };
};

