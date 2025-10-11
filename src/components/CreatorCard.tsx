// CreatorCard.tsx (Compact Version)
import { View, Text, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { Link } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Influencer } from '@/lib/enum_types';
import { SocialIcon } from '@/components/getSocialIcons';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const CreatorCard = ({ influencer }: { influencer: Influencer }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const avatarUrl = influencer.avatar_url || 'https://placehold.co/64x64/EBF4FF/1E293B?text=I';
    const fullName = [influencer.first_name, influencer.last_name].filter(Boolean).join(' ') || influencer.username;

    return (
        <Link href={`/creators/${influencer.id}`} asChild>
            <TouchableOpacity className="m-4 rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                {/* Header with Avatar and Info */}
                <View className="p-4">
                    <View className="flex-row items-start gap-4 mb-4">
                        <Image source={{ uri: avatarUrl }} className="w-16 h-16 rounded-full" style={{ borderWidth: 2, borderColor: theme.primary }} />
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2 mb-1">
                                <Text className="text-lg font-bold" style={{ color: theme.text }} numberOfLines={1}>
                                    {fullName}
                                </Text>
                                {influencer.is_verified && (
                                    <AntDesign name="check-circle" size={14} color={theme.primary} />
                                )}
                            </View>
                            <Text className="text-sm mb-1" style={{ color: theme.textTertiary }}>@{influencer.username}</Text>
                            {influencer.location && (
                                <Text className="text-xs" style={{ color: theme.textTertiary }}>📍 {influencer.location}</Text>
                            )}
                        </View>
                    </View>

                    {/* Bio */}
                    {influencer.bio && (
                        <Text className="text-sm mb-3" style={{ color: theme.textSecondary }} numberOfLines={2}>
                            {influencer.bio}
                        </Text>
                    )}

                    {/* Niches */}
                    {influencer.niches && influencer.niches.length > 0 && (
                        <View className="flex-row flex-wrap gap-2 mb-3">
                            {influencer.niches.slice(0, 3).map((niche) => (
                                // Using primaryLight as a substitute for purple-100
                                <View key={niche} className="px-2 py-1 rounded-full" style={{ backgroundColor: theme.primaryLight }}>
                                    <Text className="text-xs font-medium" style={{ color: theme.primary }}>{niche}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Social Platforms Row */}
                    {influencer.social_links && influencer.social_links.length > 0 && (
                        <View className="flex-row gap-4 mb-3 flex-wrap">
                            {influencer.social_links.slice(0, 4).map((link) => (
                                <View key={link.id} className="flex-row items-center gap-1">
                                    <SocialIcon platform={link.platform} color={theme.textSecondary} />
                                    <Text className="text-xs font-semibold" style={{ color: theme.textSecondary }}>
                                        {formatNumber(link.follower_count || 0)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Stats Bar */}
                    <View className="flex-row justify-between items-center pt-3" style={{ borderTopColor: theme.border, borderTopWidth: 1 }}>
                        <View className="flex-1">
                            <Text className="text-xs" style={{ color: theme.textTertiary }}>{t('creatorCard.followers')}</Text>
                            <Text className="text-sm font-bold" style={{ color: theme.text }}>
                                {formatNumber(influencer.total_followers)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs" style={{ color: theme.textTertiary }}>{t('creatorCard.views')}</Text>
                            <Text className="text-sm font-bold" style={{ color: theme.text }}>
                                {formatNumber(influencer.total_views)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs" style={{ color: theme.textTertiary }}>{t('creatorCard.likes')}</Text>
                            <Text className="text-sm font-bold" style={{ color: theme.text }}>
                                {formatNumber(influencer.total_likes)}
                            </Text>
                        </View>
                        <AntDesign name="arrow-right" size={20} color={theme.textTertiary} />
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
};

export default CreatorCard;