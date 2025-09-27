import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Project {
    id: number;
    created_at: string;
    name: string;
    user_id: string; // Assuming user_id is a UUID string
}


/**
 * A custom hook that fetches projects for a specific user and subscribes
 * to real-time updates (inserts, updates, deletes).
 * @param {string | undefined} userId - The ID of the user whose projects to fetch.
 * @returns {{ projects: Project[], isLoading: boolean }}
 */
export function useUserProjects(userId: string | undefined) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUserProjects = async (currentUserId: string) => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', currentUserId);

        if (error) {
            console.error('Error fetching user projects:', error.message);
            setProjects([]);
        } else {
            setProjects(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        // Only run the effect if we have a valid userId
        if (!userId) {
            setIsLoading(false);
            setProjects([]); // Clear projects if user logs out
            return;
        }

        // 1. Fetch the initial data
        fetchUserProjects(userId);

        // 2. Set up the real-time subscription
        const channel = supabase
            .channel(`projects-user-${userId}`)
            .on<Project>(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'projects',
                    filter: `user_id=eq.${userId}`, // *** The key part: only listen to changes for this user ***
                },
                (payload) => {
                    console.log('Realtime change received!', payload);
                    // A change occurred, so we re-fetch the entire list to stay in sync.
                    // This is a simple and reliable way to handle updates.
                    fetchUserProjects(userId);
                }
            )
            .subscribe();

        // 3. Cleanup function to unsubscribe when the component unmounts or userId changes
        return () => {
            supabase.removeChannel(channel);
        };

    }, [userId]); // Re-run the effect if the userId changes (e.g., user logs in/out)

    return { projects, isLoading };
}