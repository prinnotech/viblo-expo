import { AppState, Platform } from 'react-native'
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ahpqxviuwzzxanxjyxgq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocHF4dml1d3p6eGFueGp5eGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjkyMDEsImV4cCI6MjA3MjE0NTIwMX0.Qthsircnx1y9nai8u1-zNkWXK3ipy3m84V2Oa4MnRns'

// Try to import and configure Google Sign-In, but don't crash if it's not available
try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
        webClientId: '86938027732-sn679b2rmn87291offtgsij7ktueldgr.apps.googleusercontent.com'
    });
    console.log('✅ Google Sign-In configured');
} catch (error) {
    console.log('⚠️ Google Sign-In not available (this is OK for testing)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
})

if (Platform.OS !== "web") {
    AppState.addEventListener('change', (state) => {
        if (state === 'active') {
            supabase.auth.startAutoRefresh()
        } else {
            supabase.auth.stopAutoRefresh()
        }
    })
}