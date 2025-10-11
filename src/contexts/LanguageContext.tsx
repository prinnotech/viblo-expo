// contexts/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '@/locales/en.json';
import es from '@/locales/es.json';
import it from '@/locales/it.json';

type Language = 'en' | 'es' | 'it';

type Translations = {
    [key: string]: any; // Changed from string to any to support nested objects
};

const translations: Record<Language, Translations> = {
    en,
    es,
    it,
};

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => Promise<void>;
    t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = '@app_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
            if (saved === 'en' || saved === 'es' || saved === 'it') {
                setLanguageState(saved);
            } else {
                // Detect device language
                const deviceLang = Localization.getLocales()[0]?.languageCode;
                if (deviceLang === 'es') {
                    setLanguageState('es');
                } else if (deviceLang === 'it') {
                    setLanguageState('it');
                } else {
                    setLanguageState('en');
                }
            }
        } catch (error) {
            console.error('Error loading language:', error);
        } finally {
            setIsReady(true);
        }
    };

    const setLanguage = async (lang: Language) => {
        try {
            await AsyncStorage.setItem(LANGUAGE_KEY, lang);
            setLanguageState(lang);
        } catch (error) {
            console.error('Error saving language:', error);
        }
    };

    const t = (key: string): string => {
        // Support nested keys like 'onboarding.step_of'
        const keys = key.split('.');
        let value: any = translations[language];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key; // Return the key if path doesn't exist
            }
        }

        return typeof value === 'string' ? value : key;
    };

    if (!isReady) {
        return null; // Or splash screen
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};