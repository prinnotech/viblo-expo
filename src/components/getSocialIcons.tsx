import React from 'react';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Entypo from '@expo/vector-icons/Entypo';
import Feather from '@expo/vector-icons/Feather';
import { SocialPlatform } from '@/lib/enum_types';

interface SocialIconProps extends React.SVGProps<SVGSVGElement> {
    platform: SocialPlatform;
    className?: string;
}

/**
 * A dynamic component that returns an SVG icon based on the platform prop.
 * It accepts all standard SVG props and a className for easy styling with Tailwind CSS.
 * The `fill` is set to 'currentColor' by default, so it inherits its color from the parent text color.
 *
 * @param platform The social media platform icon to render.
 * @param className Optional classes for styling the SVG element.
 * @returns A React component rendering the requested SVG icon.
 */
export const SocialIcon: React.FC<SocialIconProps> = ({ platform, className = 'h-6 w-6', color = 'black' }) => {
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
