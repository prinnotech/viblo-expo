import { View, Text, ActivityIndicator, FlatList, RefreshControl, TextInput, TouchableOpacity, Modal, Button, ScrollView } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaigns } from '@/hooks/useCampaigns';
import CampaignCard from '@/components/CampaignCard';
import { useMemo, useState } from 'react';
import { Campaign } from '@/components/CampaignCard';
import { useCreators } from '@/hooks/useCreators';
import { Influencer } from '@/lib/enum_types';
import CreatorCard from '@/components/CreatorCard';
import { useTheme } from '@/contexts/ThemeContext';

// Main Page Component
export default function Page() {
    const { profile } = useAuth();
    const isBrand = profile?.user_type === 'brand';
    const { theme } = useTheme();

    // UI is determined by the user type
    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            {isBrand ? <BrandDashboard /> : <InfluencerDiscover />}
        </SafeAreaView>
    );
}

// --- Influencer's Discover Feed ---
function InfluencerDiscover() {
    const { profile } = useAuth();
    const { theme } = useTheme();
    const {
        campaigns,
        loading,
        loadingMore,
        refreshing,
        searchTerm,
        setSearchTerm,
        selectedNiches,
        setSelectedNiches,
        sort,
        setSort,
        refresh,
        loadMore,
    } = useCampaigns(profile);

    // FIX: Memoize and filter the campaigns array to ensure all items are unique.
    const uniqueCampaigns = useMemo(() => {
        const seen = new Set();
        return campaigns.filter((item: Campaign) => {
            const duplicate = seen.has(item.id);
            seen.add(item.id);
            return !duplicate;
        });
    }, [campaigns]);

    const [modalVisible, setModalVisible] = useState(false);
    const allNiches = ["Technology", "Gaming", "Sports", "Lifestyle", "Fashion", "Health", "Food", "Travel", "Beauty", "Finance", "Education"]; // Example list

    const toggleNiche = (niche: string) => {
        setSelectedNiches(prev =>
            prev.includes(niche) ? prev.filter(n => n !== niche) : [...prev, niche]
        );
    };

    const renderListEmptyComponent = () => (
        <View className="flex-1 justify-center items-center mt-12">
            {!loading && <Text className="text-base" style={{ color: theme.textTertiary }}>No campaigns found. Try adjusting your filters.</Text>}
        </View>
    );

    const renderFooter = () => {
        if (!loadingMore) return null;
        return <ActivityIndicator className="my-5" size="large" color={theme.primary} />;
    };

    return (
        <View className="flex-1">
            {/* Header with Search and Filters */}
            <View className="p-4 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <TextInput
                    placeholder="Search campaigns, brands..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    className="px-4 py-3 rounded-full text-base"
                    style={{ backgroundColor: theme.surfaceSecondary, color: theme.text }}
                    placeholderTextColor={theme.textTertiary}
                />
                <View className="flex-row justify-around mt-3">
                    <TouchableOpacity onPress={() => setModalVisible(true)} className="flex-row items-center">
                        <AntDesign name="filter" size={18} color={theme.textSecondary} />
                        <Text className="ml-1.5" style={{ color: theme.textSecondary }}>Filter Niches</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSort(sort === 'created_at' ? 'rate_per_view' : 'created_at')} className="flex-row items-center">
                        <AntDesign name="swap" size={18} color={theme.textSecondary} />
                        <Text className="ml-1.5" style={{ color: theme.textSecondary }}>
                            Sort by: {sort === 'created_at' ? 'Newest' : 'Rate'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content: List of Campaigns */}
            {loading && !campaigns.length ? (
                <ActivityIndicator className="flex-1" size="large" color={theme.primary} />
            ) : (
                <FlatList
                    data={uniqueCampaigns}
                    renderItem={({ item }) => <CampaignCard campaign={item} />}
                    keyExtractor={(item) => item.id}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderListEmptyComponent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[theme.primary]} />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}

            {/* Niche Filter Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-end" style={{ backgroundColor: theme.overlay }}>
                    <View className="rounded-t-2xl p-5" style={{ backgroundColor: theme.surface }}>
                        <Text className="text-lg font-bold mb-5" style={{ color: theme.text }}>Select Niches</Text>
                        <View className="flex-row flex-wrap gap-2.5 mb-4">
                            {allNiches.map(niche => (
                                <TouchableOpacity
                                    key={niche}
                                    onPress={() => toggleNiche(niche)}
                                    className="py-2 px-4 rounded-full"
                                    style={{ backgroundColor: selectedNiches.includes(niche) ? theme.primary : theme.surfaceSecondary }}
                                >
                                    <Text style={{ color: selectedNiches.includes(niche) ? theme.surface : theme.text }}>{niche}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Button title="Done" onPress={() => setModalVisible(false)} color={theme.primary} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// --- Brand's Dashboard ---
function BrandDashboard() {
    const { profile } = useAuth();
    const { theme } = useTheme();
    const {
        influencers,
        loading,
        loadingMore,
        refreshing,
        hasMore,
        loadMore,
        refresh,
        searchTerm,
        setSearchTerm,
        selectedNiches,
        setSelectedNiches,
        sort,
        setSort,
    } = useCreators(profile);

    const availableNiches = ['Technology', 'Gaming', 'Sports', 'Lifestyle', 'Fashion', 'Beauty', 'Food', 'Travel', 'Fitness', 'Music'];

    const uniqueInfluencers = useMemo(() => {
        const seen = new Set();
        return influencers.filter((item: Influencer) => {
            const duplicate = seen.has(item.id);
            seen.add(item.id);
            return !duplicate;
        });
    }, [influencers]);

    const toggleNiche = (niche: string) => {
        if (selectedNiches.includes(niche)) {
            setSelectedNiches(selectedNiches.filter(n => n !== niche));
        } else {
            setSelectedNiches([...selectedNiches, niche]);
        }
    };

    const clearFilters = () => {
        setSelectedNiches([]);
        setSearchTerm('');
    };

    return (
        <View className="flex-1" style={{ backgroundColor: theme.background }}>
            {/* Header */}
            <View className="p-4 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <Text className="text-2xl font-bold mb-1" style={{ color: theme.text }}>Discover Creators</Text>
                <Text className="text-sm" style={{ color: theme.textTertiary }}>Find the perfect influencers for your brand</Text>
            </View>

            {/* Search Bar */}
            <View className="px-4 py-3 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <View className="flex-row items-center rounded-xl px-4 py-3" style={{ backgroundColor: theme.surfaceSecondary }}>
                    <AntDesign name="search" size={18} color={theme.textSecondary} />
                    <TextInput
                        className="flex-1 ml-2 text-base"
                        style={{ color: theme.text }}
                        placeholder="Search by name, username, or bio..."
                        placeholderTextColor={theme.textTertiary}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchTerm('')}>
                            <AntDesign name="close-circle" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filters */}
            <View className="border-b px-4 py-3" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>FILTERS</Text>
                    {(selectedNiches.length > 0 || searchTerm.length > 0) && (
                        <TouchableOpacity onPress={clearFilters} className="flex-row items-center gap-1">
                            <AntDesign name="close" size={14} color={theme.error} />
                            <Text className="text-sm font-medium" style={{ color: theme.error }}>Clear All</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                    <TouchableOpacity
                        onPress={() => setSort('total_followers')}
                        className="mr-2 px-4 py-2 rounded-full border"
                        style={{
                            backgroundColor: sort === 'total_followers' ? theme.primary : theme.surface,
                            borderColor: sort === 'total_followers' ? theme.primary : theme.borderLight
                        }}
                    >
                        <Text className="text-sm font-medium" style={{ color: sort === 'total_followers' ? theme.surface : theme.textSecondary }}>
                            Most Followers
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setSort('created_at')}
                        className="px-4 py-2 rounded-full border"
                        style={{
                            backgroundColor: sort === 'created_at' ? theme.primary : theme.surface,
                            borderColor: sort === 'created_at' ? theme.primary : theme.borderLight
                        }}
                    >
                        <Text className="text-sm font-medium" style={{ color: sort === 'created_at' ? theme.surface : theme.textSecondary }}>
                            Recently Joined
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        onPress={() => setSelectedNiches([])}
                        className="mr-2 px-4 py-2 rounded-full border"
                        style={{
                            backgroundColor: selectedNiches.length === 0 ? theme.primary : theme.surface,
                            borderColor: selectedNiches.length === 0 ? theme.primary : theme.borderLight
                        }}
                    >
                        <Text className="text-sm font-medium" style={{ color: selectedNiches.length === 0 ? theme.surface : theme.textSecondary }}>
                            All
                        </Text>
                    </TouchableOpacity>
                    {availableNiches.map((niche) => (
                        <TouchableOpacity
                            key={niche}
                            onPress={() => toggleNiche(niche)}
                            className="mr-2 px-4 py-2 rounded-full border"
                            style={{
                                backgroundColor: selectedNiches.includes(niche) ? theme.primary : theme.surface,
                                borderColor: selectedNiches.includes(niche) ? theme.primary : theme.borderLight
                            }}
                        >
                            <Text className="text-sm font-medium" style={{ color: selectedNiches.includes(niche) ? theme.surface : theme.textSecondary }}>
                                {niche}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Results Count */}
            {!loading && (
                <View className="px-4 py-2" style={{ backgroundColor: theme.background }}>
                    <Text className="text-sm" style={{ color: theme.textSecondary }}>
                        {uniqueInfluencers.length} {uniqueInfluencers.length === 1 ? 'creator' : 'creators'} found
                    </Text>
                </View>
            )}

            {/* Influencers List */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text className="mt-4" style={{ color: theme.textTertiary }}>Loading creators...</Text>
                </View>
            ) : (
                <FlatList
                    data={uniqueInfluencers}
                    renderItem={({ item }) => <CreatorCard influencer={item} />}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center p-8">
                            <AntDesign name="frown" size={48} color={theme.textTertiary} />
                            <Text className="text-center mt-4 text-lg font-medium" style={{ color: theme.textSecondary }}>
                                No creators found
                            </Text>
                            <Text className="text-center mt-2" style={{ color: theme.textTertiary }}>
                                Try adjusting your filters or search terms
                            </Text>
                            {(selectedNiches.length > 0 || searchTerm.length > 0) && (
                                <TouchableOpacity
                                    onPress={clearFilters}
                                    className="mt-4 px-6 py-3 rounded-full"
                                    style={{ backgroundColor: theme.primary }}
                                >
                                    <Text className="font-semibold" style={{ color: theme.surface }}>Clear Filters</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={refresh}
                            colors={[theme.primary]}
                            tintColor={theme.primary}
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View className="py-4">
                                <ActivityIndicator size="small" color={theme.primary} />
                            </View>
                        ) : !hasMore && uniqueInfluencers.length > 0 ? (
                            <View className="py-4">
                                <Text className="text-center text-sm" style={{ color: theme.textTertiary }}>
                                    You've reached the end
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
}
