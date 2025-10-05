import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '@/lib/db_interface';

const AuthContext = createContext<{ user: User | null; session: Session | null; isLoading: boolean, profile: Profile | null, getProfile: () => Promise<void> }>({
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

    useEffect(() => {

        // Get the initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

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
                    setIsLoading(false);
                } else {
                    setProfile(data);
                    setIsLoading(false);
                }
            }

            setIsLoading(false);
        });



        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

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
                    setIsLoading(false);
                } else {
                    setProfile(data);
                    setIsLoading(false);
                }
            }

            setIsLoading(false);

        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const getProfile = async () => {
        if (!user?.id || !session?.user?.id) {
            setProfile(null);
            console.log("No user ID provided to getProfile");
            return;
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session?.user.id || user?.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error("Error fetching initial profile:", error.message);
            setProfile(null);
        } else {
            setProfile(data);
            console.log("profile set: ", data)
        }
    }

    return (
        <AuthContext.Provider value={{ user, session, isLoading, profile, getProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);