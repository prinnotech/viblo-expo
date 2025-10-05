import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/db_interface';
import { debounce } from 'lodash';

// A component for each search result item
const BrandListItem = ({ item, onPress }: { item: Profile, onPress: (profile: Profile) => void }) => (
    <TouchableOpacity
        onPress={() => onPress(item)}
        className="flex-row items-center p-3 border-b border-gray-100"
    >
        <Image
            source={{ uri: item.avatar_url || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=?' }}
            className="w-12 h-12 rounded-full mr-4 bg-gray-200"
        />
        <View>
            <Text className="text-base font-semibold text-gray-900">{item.username}</Text>
            <Text className="text-sm text-gray-500">{item.company_name || 'Brand'}</Text>
        </View>
    </TouchableOpacity>
);

const NewConversationScreen = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const router = useRouter();

    const searchBrands = async (query: string) => {
        if (query.length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_type', 'brand')
                .ilike('username', `%${query}%`); // Case-insensitive search on username

            if (error) throw error;
            setResults(data || []);
        } catch (error) {
            console.error('Error searching brands:', error);
        } finally {
            setLoading(false);
        }
    };

    // Use debounce to prevent API calls on every keystroke
    const debouncedSearch = useCallback(debounce(searchBrands, 300), []);

    const handleSearchChange = (text: string) => {
        setSearchTerm(text);
        debouncedSearch(text);
    };

    const handleCreateConversation = async (brand: Profile) => {
        setIsCreating(true);
        try {
            const { data: conversationId, error } = await supabase.rpc('create_or_get_conversation', {
                target_user_id: brand.id
            });
            if (error) throw error;

            // Navigate to the conversation screen
            router.push(`/inbox/${conversationId}`);
        } catch (error) {
            console.error('Error creating conversation:', error);
            // You could show an alert to the user here
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-white">

            <View className="p-4">
                <View className="flex-row items-center bg-gray-100 rounded-lg px-3">
                    <Feather name="search" size={20} color="#6B7280" />
                    <TextInput
                        value={searchTerm}
                        onChangeText={handleSearchChange}
                        placeholder="Search for a brand..."
                        placeholderTextColor="#6B7280"
                        className="flex-1 h-12 ml-2 text-base text-gray-900"
                    />
                </View>
            </View>

            {loading && <ActivityIndicator size="small" color="#3b82f6" className="mt-4" />}
            {isCreating && <ActivityIndicator size="large" color="#3b82f6" className="absolute self-center top-1/2" />}

            <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <BrandListItem item={item} onPress={handleCreateConversation} />}
                ListEmptyComponent={() => (
                    !loading && searchTerm.length > 1 ? (
                        <View className="items-center justify-center mt-20">
                            <Text className="text-gray-500">No brands found.</Text>
                        </View>
                    ) : null
                )}
            />
        </SafeAreaView>
    );
};

export default NewConversationScreen;
