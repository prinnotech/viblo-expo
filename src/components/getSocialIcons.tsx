import React from 'react';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Entypo from '@expo/vector-icons/Entypo';
import Feather from '@expo/vector-icons/Feather';
import { SocialPlatform } from '@/lib/enum_types';
import { useTheme } from '@/contexts/ThemeContext';

interface SocialIconProps extends React.SVGProps<SVGSVGElement> {
    platform: SocialPlatform;
    className?: string;
    color?: string; // Made color optional to allow theme default
}


export const SocialIcon: React.FC<SocialIconProps> = ({ platform, className = 'h-6 w-6', color: propColor }) => {
    const { theme } = useTheme();
    // Use the provided color, or default to a theme-based color.
    const color = propColor || theme.textSecondary;

    const getIcon = () => {
        switch (platform) {
            case 'tiktok':
                return (
                    <FontAwesome5 name="tiktok" size={24} color={color} />

                );
            case 'instagram':
                return (
                    <Entypo name="instagram" size={24} color={color} />

                );
            case 'youtube':
                return (
                    <Feather name="youtube" size={24} color={color} />

                );
            case 'facebook':
                return (
                    <Feather name="facebook" size={24} color={color} />

                );
            case 'twitter_x':
                return (
                    <Feather name="twitter" size={24} color={color} />

                );
            default:
                return null; // Return null if the platform is not recognized
        }
    };

    return getIcon();
};
