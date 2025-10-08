import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '@/lib/db_interface';

const AuthContext = createContext<{
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    profile: Profile | null;
    getProfile: () => Promise<void>
}>({
    user: null,
    session: null,
    isLoading: true,
    profile: null,
    getProfile: async () => { console.log("No user ID provided to getProfile") },
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);

    // Separate function to fetch profile
    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching profile:", error.message);
                setProfile(null);
            } else {
                setProfile(data);
            }
        } catch (err) {
            console.error("Unexpected error fetching profile:", err);
            setProfile(null);
        }
    };

    useEffect(() => {
        let mounted = true;

        // Get the initial session
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (!mounted) return;

                if (error) {
                    console.error("Error getting session:", error.message);
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setIsLoading(false);
                    return;
                }

                setSession(session);
                setUser(session?.user ?? null);

                // If a user is logged in, fetch their profile data
                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                }

                if (mounted) {
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Unexpected error initializing auth:", err);
                if (mounted) {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setIsLoading(false);
                }
            }
        };

        initializeAuth();

        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;

            console.log("Auth state changed:", _event);

            setSession(session);
            setUser(session?.user ?? null);

            // If a user is logged in, fetch their profile data
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }

            // Don't set isLoading here since we want it to only be true on initial load
        });

        return () => {
            mounted = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    const getProfile = async () => {
        if (!user?.id && !session?.user?.id) {
            setProfile(null);
            console.log("No user ID provided to getProfile");
            return;
        }

        const userId = session?.user?.id || user?.id;
        if (userId) {
            await fetchProfile(userId);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, profile, getProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);