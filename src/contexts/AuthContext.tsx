import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '@/lib/db_interface';

const AuthContext = createContext<{ user: User | null; session: Session | null; isLoading: boolean, profile: Profile | null }>({
    user: null,
    session: null,
    isLoading: true,
    profile: null,
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);

    useEffect(() => {
        // Get the initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);

            // If a user is logged in, fetch their profile data
            if (session?.user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session?.user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error("Error fetching initial profile:", error.message);
                    setProfile(null);
                } else {
                    setProfile(data);
                }
            }

        });


        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);

            // If a user is logged in, fetch their profile data
            if (session?.user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session?.user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error("Error fetching initial profile:", error.message);
                    setProfile(null);
                } else {
                    setProfile(data);
                }
            }

        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, isLoading, profile }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);