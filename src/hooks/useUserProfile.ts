import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, SocialLink } from '@/lib/db_interface';
import { useAuth } from '@/contexts/AuthContext';

// Define a new type that combines Profile with their social links
export type FullUserProfile = Profile & {
    social_links: SocialLink[];
};

export const useUserProfile = () => {
    const [profile, setProfile] = useState<FullUserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const { session } = useAuth();
    const userId = session?.user.id;

    const fetchProfile = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        };

        setLoading(true);
        setError(null);

        try {
            // Fetch profile and related social_links in one go
            const { data, error: profileError } = await supabase
                .from('profiles')
                .select(`
                    *,
                    social_links ( * )
                `)
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            setProfile(data as FullUserProfile);

        } catch (err) {
            console.error("Error fetching user profile:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return { profile, loading, error, refetch: fetchProfile };
};
