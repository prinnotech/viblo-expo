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

// Main Page Component
export default function Page() {
    const { profile } = useAuth();
    const isBrand = profile?.user_type === 'brand';

    // UI is determined by the user type
    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {isBrand ? <BrandDashboard /> : <InfluencerDiscover />}
        </SafeAreaView>
    );
}

// --- Influencer's Discover Feed ---
function InfluencerDiscover() {
    const { profile } = useAuth();
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
        hasMore,
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
            {!loading && <Text className="text-base text-gray-500">No campaigns found. Try adjusting your filters.</Text>}
        </View>
    );

    const renderFooter = () => {
        if (!loadingMore) return null;
        return <ActivityIndicator className="my-5" size="large" color="#3B82F6" />;
    };

    return (
        <View className="flex-1">
            {/* Header with Search and Filters */}
            <View className="p-4 border-b border-gray-200 bg-white">
                <TextInput
                    placeholder="Search campaigns, brands..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    className="bg-gray-100 px-4 py-3 rounded-full text-base"
                />
                <View className="flex-row justify-around mt-3">
                    <TouchableOpacity onPress={() => setModalVisible(true)} className="flex-row items-center">
                        <AntDesign name="filter" size={18} color="#4B5563" />
                        <Text className="ml-1.5 text-gray-600">Filter Niches</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSort(sort === 'created_at' ? 'rate_per_view' : 'created_at')} className="flex-row items-center">
                        <AntDesign name="swap" size={18} color="#4B5563" />
                        <Text className="ml-1.5 text-gray-600">
                            Sort by: {sort === 'created_at' ? 'Newest' : 'Rate'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content: List of Campaigns */}
            {loading && !campaigns.length ? (
                <ActivityIndicator className="flex-1" size="large" color="#3B82F6" />
            ) : (
                <FlatList
                    data={uniqueCampaigns}
                    renderItem={({ item }) => <CampaignCard campaign={item} />}
                    keyExtractor={(item) => item.id}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderListEmptyComponent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#3B82F6']} />}
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
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-2xl p-5">
                        <Text className="text-lg font-bold mb-5">Select Niches</Text>
                        <View className="flex-row flex-wrap gap-2.5 mb-4">
                            {allNiches.map(niche => (
                                <TouchableOpacity
                                    key={niche}
                                    onPress={() => toggleNiche(niche)}
                                    className={`py-2 px-4 rounded-full ${selectedNiches.includes(niche) ? 'bg-blue-500' : 'bg-gray-200'}`}
                                >
                                    <Text className={selectedNiches.includes(niche) ? 'text-white' : 'text-gray-800'}>{niche}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Button title="Done" onPress={() => setModalVisible(false)} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// --- Brand's Dashboard ---
function BrandDashboard() {
    const { profile } = useAuth();
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

    // Available niches for filtering
    const availableNiches = [
        'Technology',
        'Gaming',
        'Sports',
        'Lifestyle',
        'Fashion',
        'Beauty',
        'Food',
        'Travel',
        'Fitness',
        'Music',
    ];

    // Memoize and filter the influencers array to ensure all items are unique
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
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="p-4 bg-white border-b border-gray-200">
                <Text className="text-2xl font-bold text-gray-800 mb-1">Discover Creators</Text>
                <Text className="text-sm text-gray-500">Find the perfect influencers for your brand</Text>
            </View>

            {/* Search Bar */}
            <View className="px-4 py-3 bg-white border-b border-gray-200">
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                    <AntDesign name="search" size={18} color="#6B7280" />
                    <TextInput
                        className="flex-1 ml-2 text-base text-gray-800"
                        placeholder="Search by name, username, or bio..."
                        placeholderTextColor="#9CA3AF"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchTerm('')}>
                            <AntDesign name="close-circle" size={18} color="#6B7280" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filters */}
            <View className="bg-white border-b border-gray-200 px-4 py-3">
                {/* Sort and Clear Row */}
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-sm font-semibold text-gray-700">FILTERS</Text>
                    {(selectedNiches.length > 0 || searchTerm.length > 0) && (
                        <TouchableOpacity onPress={clearFilters} className="flex-row items-center gap-1">
                            <AntDesign name="close" size={14} color="#EF4444" />
                            <Text className="text-sm text-red-500 font-medium">Clear All</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Sort Options */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                    <TouchableOpacity
                        onPress={() => setSort('total_followers')}
                        className={`mr-2 px-4 py-2 rounded-full border ${sort === 'total_followers'
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white border-gray-300'
                            }`}
                    >
                        <Text
                            className={`text-sm font-medium ${sort === 'total_followers' ? 'text-white' : 'text-gray-700'
                                }`}
                        >
                            Most Followers
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setSort('created_at')}
                        className={`px-4 py-2 rounded-full border ${sort === 'created_at'
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white border-gray-300'
                            }`}
                    >
                        <Text
                            className={`text-sm font-medium ${sort === 'created_at' ? 'text-white' : 'text-gray-700'
                                }`}
                        >
                            Recently Joined
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Niche Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        onPress={() => setSelectedNiches([])}
                        className={`mr-2 px-4 py-2 rounded-full border ${selectedNiches.length === 0
                            ? 'bg-purple-500 border-purple-500'
                            : 'bg-white border-gray-300'
                            }`}
                    >
                        <Text
                            className={`text-sm font-medium ${selectedNiches.length === 0 ? 'text-white' : 'text-gray-700'
                                }`}
                        >
                            All
                        </Text>
                    </TouchableOpacity>
                    {availableNiches.map((niche) => (
                        <TouchableOpacity
                            key={niche}
                            onPress={() => toggleNiche(niche)}
                            className={`mr-2 px-4 py-2 rounded-full border ${selectedNiches.includes(niche)
                                ? 'bg-purple-500 border-purple-500'
                                : 'bg-white border-gray-300'
                                }`}
                        >
                            <Text
                                className={`text-sm font-medium ${selectedNiches.includes(niche) ? 'text-white' : 'text-gray-700'
                                    }`}
                            >
                                {niche}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Results Count */}
            {!loading && (
                <View className="px-4 py-2 bg-gray-50">
                    <Text className="text-sm text-gray-600">
                        {uniqueInfluencers.length} {uniqueInfluencers.length === 1 ? 'creator' : 'creators'} found
                    </Text>
                </View>
            )}

            {/* Influencers List */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text className="mt-4 text-gray-500">Loading creators...</Text>
                </View>
            ) : (
                <FlatList
                    data={uniqueInfluencers}
                    renderItem={({ item }) => <CreatorCard influencer={item} />}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center p-8">
                            <AntDesign name="frown" size={48} color="#9CA3AF" />
                            <Text className="text-center mt-4 text-gray-600 text-lg font-medium">
                                No creators found
                            </Text>
                            <Text className="text-center mt-2 text-gray-500">
                                Try adjusting your filters or search terms
                            </Text>
                            {(selectedNiches.length > 0 || searchTerm.length > 0) && (
                                <TouchableOpacity
                                    onPress={clearFilters}
                                    className="mt-4 bg-blue-500 px-6 py-3 rounded-full"
                                >
                                    <Text className="text-white font-semibold">Clear Filters</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={refresh}
                            colors={['#3B82F6']}
                            tintColor="#3B82F6"
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View className="py-4">
                                <ActivityIndicator size="small" color="#3B82F6" />
                            </View>
                        ) : !hasMore && uniqueInfluencers.length > 0 ? (
                            <View className="py-4">
                                <Text className="text-center text-gray-500 text-sm">
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
