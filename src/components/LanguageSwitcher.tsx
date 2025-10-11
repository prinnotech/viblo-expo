// components/LanguageSwitcher.tsx
import { View, Text, Pressable } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

type Language = 'en' | 'es' | 'it';

const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

type LanguageSwitcherProps = {
    onLanguageChange?: (lang: Language) => void;
    variant?: 'default' | 'compact';
};

export default function LanguageSwitcher({
    onLanguageChange,
    variant = 'default'
}: LanguageSwitcherProps) {
    const { language, setLanguage } = useLanguage();

    const handleLanguageSelect = async (lang: Language) => {
        await setLanguage(lang);
        onLanguageChange?.(lang);
    };

    return (
        <View className={variant === 'compact' ? 'flex-row gap-3 justify-center' : 'gap-3'}>
            {languages.map((lang) => (
                <Pressable
                    key={lang.code}
                    className={`
            ${variant === 'compact' ? 'flex-col min-w-20 p-3' : 'flex-row p-4'}
            items-center rounded-xl bg-gray-100 border-2
            ${language === lang.code
                            ? 'bg-blue-50 border-blue-500'
                            : 'border-transparent'
                        }
          `}
                    onPress={() => handleLanguageSelect(lang.code)}
                >
                    <Text className={`text-3xl ${variant === 'compact' ? '' : 'mr-3'}`}>
                        {lang.flag}
                    </Text>
                    <Text
                        className={`text-base font-semibold ${language === lang.code ? 'text-blue-500' : 'text-gray-800'
                            }`}
                    >
                        {lang.label}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}