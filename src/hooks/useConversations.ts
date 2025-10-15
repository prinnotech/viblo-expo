import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/db_interface';
import { useAuth } from '@/contexts/AuthContext';

// Updated type to include the new fields from our v2 database function
export type ConversationWithDetails = {
    id: string; // conversation id
    is_favorite: boolean; // For the favorites filter
    other_participant: Pick<Profile, 'id' | 'avatar_url' | 'username'>;
    last_message: {
        content: string;
        created_at: string;
        is_read: boolean;   // For the unread filter
        sender_id: string;  // For the unread filter logic
    } | null;
};

export const useConversations = () => {
    const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const { profile } = useAuth()

    const fetchConversations = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Call the PostgreSQL function we created
            const { data, error: rpcError } = await supabase.rpc('get_user_conversations');

            if (rpcError) throw rpcError;

            // The data from an RPC call is typed as `any`, so we cast it here
            setConversations(data as ConversationWithDetails[] || []);

        } catch (err) {
            console.error("Error fetching conversations:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []); // Empty dependency array means this function is created once

    useEffect(() => {
        // Initial fetch when the hook is first used
        fetchConversations();

        // Set up a real-time subscription to refetch conversations when a new message arrives
        const channel = supabase
            .channel('public:messages')
            .on(
                'postgres_changes',
                // --- ✨ THE FIX: Listen for INSERT and UPDATE events ---
                // By using '*', we now get notified when a message is inserted OR updated (e.g., is_read changes)
                { event: '*', schema: 'public', table: 'messages' },
                (payload) => {
                    // Refetch all conversations to get the latest message ordering and read status
                    //console.log('Message change detected, refetching conversations...');
                    fetchConversations();
                }
            )
            .subscribe();

        // Cleanup function to remove the channel subscription when the component unmounts
        return () => {
            supabase.removeChannel(channel);
        };

    }, [fetchConversations]); // Rerun effect if fetchConversations changes (it won't, but it's good practice)

    const unreadCount = useMemo(() => {
        return conversations.filter(c =>
            c.last_message && !c.last_message.is_read && c.last_message.sender_id !== profile?.id
        ).length;
    }, [conversations, profile]);


    // Return everything the component will need
    return { conversations, loading, error, refetch: fetchConversations, unreadCount };
};

