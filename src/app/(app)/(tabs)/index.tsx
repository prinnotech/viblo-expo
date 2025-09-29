import { View, Text, ActivityIndicator, FlatList, RefreshControl, TextInput, TouchableOpacity, Modal, Button } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaigns } from '@/hooks/useCampaigns';
import CampaignCard from '@/components/CampaignCard';
import { useMemo, useState } from 'react';
import { Campaign } from '@/components/CampaignCard';

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
                        <Button title="Done" onPress={() => setModalVisible(false)}/>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// --- Brand's Dashboard ---
function BrandDashboard() {
    const { profile } = useAuth();
    const { campaigns, loading, refresh, refreshing } = useCampaigns(profile);

    // FIX: Memoize and filter the campaigns array to ensure all items are unique.
    const uniqueCampaigns = useMemo(() => {
        const seen = new Set();
        return campaigns.filter((item: Campaign) => {
            const duplicate = seen.has(item.id);
            seen.add(item.id);
            return !duplicate;
        });
    }, [campaigns]);

    return (
        <View className="flex-1">
            <View className="p-4">
                <Text className="text-2xl font-bold">Your Campaigns</Text>
            </View>
            {loading ? (
                 <ActivityIndicator className="flex-1" size="large" color="#3B82F6" />
            ) : (
                <FlatList
                    data={uniqueCampaigns}
                    renderItem={({ item }) => <CampaignCard campaign={item} />}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={<Text className="text-center mt-5 text-gray-500">You haven't created any campaigns yet.</Text>}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
                />
            )}
        </View>
    );
}

