// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface Theme {
    // Backgrounds
    background: string;
    surface: string;
    surfaceSecondary: string;

    // Text
    text: string;
    textSecondary: string;
    textTertiary: string;

    // Primary colors
    primary: string;
    primaryLight: string;
    primaryDark: string;

    // Status colors
    success: string;
    successLight: string;
    error: string;
    errorLight: string;
    warning: string;
    warningLight: string;

    // Borders
    border: string;
    borderLight: string;

    // Other
    shadow: string;
    overlay: string;
}

/*

bg-white → backgroundColor: theme.surface
bg-gray-50 → backgroundColor: theme.background
bg-gray-100 → backgroundColor: theme.surfaceSecondary

text-gray-900 → color: theme.text
text-gray-600 → color: theme.textSecondary
text-gray-500 → color: theme.textTertiary

border-gray-200 → borderColor: theme.border
border-gray-300 → borderColor: theme.borderLight

text-blue-600 → color: theme.primary
bg-blue-500 → backgroundColor: theme.primary

text-green-600 → color: theme.success
text-red-600 → color: theme.error

*/

const lightTheme: Theme = {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceSecondary: '#F3F4F6',

    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',

    primary: '#3B82F6',
    primaryLight: '#93C5FD',
    primaryDark: '#2563EB',

    success: '#10B981',
    successLight: '#D1FAE5',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',

    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
};

const darkTheme: Theme = {
    background: '#111827',
    surface: '#1F2937',
    surfaceSecondary: '#374151',

    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',

    primary: '#60A5FA',
    primaryLight: '#93C5FD',
    primaryDark: '#3B82F6',

    success: '#34D399',
    successLight: '#064E3B',
    error: '#F87171',
    errorLight: '#7F1D1D',
    warning: '#FBBF24',
    warningLight: '#78350F',

    border: '#374151',
    borderLight: '#4B5563',

    shadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.7)',
};

interface ThemeContextType {
    theme: Theme;
    themeMode: ThemeMode;
    isDark: boolean;
    setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@viblo_theme_mode';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

    // Determine if dark mode is active
    const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
    const theme = isDark ? darkTheme : lightTheme;

    // Load saved theme preference on mount
    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (saved) {
                setThemeModeState(saved as ThemeMode);
            }
        } catch (error) {
            console.error('Error loading theme preference:', error);
        }
    };

    const setThemeMode = async (mode: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
            setThemeModeState(mode);
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, themeMode, isDark, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};