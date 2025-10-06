// CreatorCard.tsx (Compact Version)
import { View, Text, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { Link } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Influencer } from '@/lib/enum_types';
import { SocialIcon } from '@/components/getSocialIcons';

const CreatorCard = ({ influencer }: { influencer: Influencer }) => {
    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const avatarUrl = influencer.avatar_url || 'https://placehold.co/64x64/EBF4FF/1E293B?text=I';
    const fullName = [influencer.first_name, influencer.last_name].filter(Boolean).join(' ') || influencer.username;

    return (
        <Link href={`/creators/${influencer.id}`} asChild>
            <TouchableOpacity className="m-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header with Avatar and Info */}
                <View className="p-4">
                    <View className="flex-row items-start gap-4 mb-4">
                        <Image source={{ uri: avatarUrl }} className="w-16 h-16 rounded-full border-2 border-blue-500" />
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2 mb-1">
                                <Text className="text-lg font-bold text-gray-800" numberOfLines={1}>
                                    {fullName}
                                </Text>
                                {influencer.is_verified && (
                                    <AntDesign name="check-circle" size={14} color="#3B82F6" />
                                )}
                            </View>
                            <Text className="text-sm text-gray-500 mb-1">@{influencer.username}</Text>
                            {influencer.location && (
                                <Text className="text-xs text-gray-400">📍 {influencer.location}</Text>
                            )}
                        </View>
                    </View>

                    {/* Bio */}
                    {influencer.bio && (
                        <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
                            {influencer.bio}
                        </Text>
                    )}

                    {/* Niches */}
                    {influencer.niches && influencer.niches.length > 0 && (
                        <View className="flex-row flex-wrap gap-2 mb-3">
                            {influencer.niches.slice(0, 3).map((niche) => (
                                <View key={niche} className="bg-purple-100 px-2 py-1 rounded-full">
                                    <Text className="text-purple-800 text-xs font-medium">{niche}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Social Platforms Row */}
                    {influencer.social_links && influencer.social_links.length > 0 && (
                        <View className="flex-row gap-4 mb-3 flex-wrap">
                            {influencer.social_links.slice(0, 4).map((link) => (
                                <View key={link.id} className="flex-row items-center gap-1">
                                    <SocialIcon platform={link.platform} color="#6B7280" />
                                    <Text className="text-xs font-semibold text-gray-700">
                                        {formatNumber(link.follower_count || 0)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Stats Bar */}
                    <View className="flex-row justify-between items-center pt-3 border-t border-gray-200">
                        <View className="flex-1">
                            <Text className="text-xs text-gray-500">Followers</Text>
                            <Text className="text-sm font-bold text-gray-800">
                                {formatNumber(influencer.total_followers)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs text-gray-500">Views</Text>
                            <Text className="text-sm font-bold text-gray-800">
                                {formatNumber(influencer.total_views)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs text-gray-500">Likes</Text>
                            <Text className="text-sm font-bold text-gray-800">
                                {formatNumber(influencer.total_likes)}
                            </Text>
                        </View>
                        <AntDesign name="arrow-right" size={20} color="#9CA3AF" />
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
};

export default CreatorCard;