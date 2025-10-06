// app/campaigns/create/index.tsx
import {
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import React, { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AntDesign from '@expo/vector-icons/AntDesign';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';

type CampaignStatus = 'draft' | 'active';

const AVAILABLE_NICHES = [
    'Technology', 'Gaming', 'Sports', 'Lifestyle', 'Fashion',
    'Beauty', 'Food', 'Travel', 'Fitness', 'Music', 'Education'
];

const AVAILABLE_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook', 'twitter_x'];

const AVAILABLE_LOCATIONS = [
    'United States', 'Canada', 'United Kingdom', 'Australia',
    'Germany', 'France', 'Italy', 'Spain', 'Brazil', 'Mexico',
    'India', 'Japan', 'South Korea', 'Global'
];

const CreateCampaign = () => {
    const router = useRouter();
    const { profile } = useAuth();
    const [saving, setSaving] = useState(false);

    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [contentRequirements, setContentRequirements] = useState('');
    const [status, setStatus] = useState<CampaignStatus>('draft');
    const [totalBudget, setTotalBudget] = useState('');
    const [targetAudienceAge, setTargetAudienceAge] = useState('');
    const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    // Budget calculator states
    const [costPer1kViews, setCostPer1kViews] = useState(0.5); // Start at minimum $0.50 per 1k views


    // Calculate slider range and values
    const budgetCalculations = useMemo(() => {
        const budget = parseFloat(totalBudget) || 0;

        // Minimum: $0.50 per 1k views (which is $0.0005 per view)
        const minCostPer1k = 0.05;

        // Maximum: the entire budget (user pays for at least 1k views)
        const maxCostPer1k = budget > 0 ? budget : 100;

        // Current rate per view (for database)
        const ratePerView = costPer1kViews / 1000;

        // Total views they can get
        const totalViews = costPer1kViews > 0 ? (budget / costPer1kViews) * 1000 : 0;

        // Number of 1k view blocks they can afford
        const blocks1k = Math.floor(totalViews / 1000);

        return {
            minCostPer1k,
            maxCostPer1k,
            ratePerView,
            totalViews: Math.floor(totalViews),
            blocks1k,
        };
    }, [totalBudget, costPer1kViews]);

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    const handleCreate = async () => {
        if (!profile || profile.user_type !== 'brand') {
            Alert.alert('Error', 'Only brands can create campaigns');
            return;
        }

        // Validation
        if (!title.trim()) {
            Alert.alert('Validation Error', 'Please enter a campaign title');
            return;
        }

        if (!totalBudget || parseFloat(totalBudget) <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid total budget');
            return;
        }

        if (selectedNiches.length === 0) {
            Alert.alert('Validation Error', 'Please select at least one niche');
            return;
        }

        if (selectedPlatforms.length === 0) {
            Alert.alert('Validation Error', 'Please select at least one platform');
            return;
        }

        setSaving(true);

        const wantsActive = status === 'active';

        const campaignData = {
            brand_id: profile.id,
            title: title.trim(),
            description: description.trim() || null,
            content_requirements: contentRequirements.trim() || null,
            status: 'draft', // Always start as draft, will be activated after payment
            total_budget: parseFloat(totalBudget),
            total_paid: 0,
            rate_per_view: budgetCalculations.ratePerView,
            target_niches: selectedNiches,
            target_platforms: selectedPlatforms,
            target_audience_locations: selectedLocations.length > 0 ? selectedLocations : null,
            target_audience_age: targetAudienceAge.trim() || null,
            start_date: startDate?.toISOString() || null,
        };

        const { data, error } = await supabase
            .from('campaigns')
            .insert(campaignData)
            .select()
            .single();

        setSaving(false);

        console.log('=== CREATE DEBUG ===');
        console.log('Created campaign:', data);
        console.log('Error:', error);
        console.log('Campaign ID:', data?.id);


        if (error) {
            console.error('Error creating campaign:', error);
            Alert.alert('Error', 'Failed to create campaign');
            return;
        }

        // If they wanted it active, redirect to payment
        if (wantsActive) {
            router.replace(`/(tabs)/campaigns/${data.id}/payment`);
        } else {
            // Just a draft, no payment needed
            Alert.alert('Success', 'Campaign saved as draft', [
                {
                    text: 'OK',
                    onPress: () => router.replace(`/(tabs)/campaigns/${data.id}`)
                }
            ]);
        }
    };


    const toggleNiche = (niche: string) => {
        setSelectedNiches(prev =>
            prev.includes(niche) ? prev.filter(n => n !== niche) : [...prev, niche]
        );
    };

    const togglePlatform = (platform: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
        );
    };

    const toggleLocation = (location: string) => {
        setSelectedLocations(prev =>
            prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-sm text-gray-500 mt-1">
                        Set up your campaign and start connecting with influencers
                    </Text>
                </View>

                {/* Title */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Campaign Title <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Enter campaign title"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                {/* Description */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Description</Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Describe your campaign"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Content Requirements */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Content Requirements
                    </Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={contentRequirements}
                        onChangeText={setContentRequirements}
                        placeholder="What should influencers include in their content?"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                {/* Status */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Campaign Status <Text className="text-red-500">*</Text>
                    </Text>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => setStatus('draft')}
                            className={`flex-1 px-4 py-3 rounded-lg border ${status === 'draft'
                                ? 'bg-blue-500 border-blue-500'
                                : 'bg-white border-gray-300'
                                }`}
                        >
                            <Text
                                className={`text-center text-sm font-medium ${status === 'draft' ? 'text-white' : 'text-gray-700'
                                    }`}
                            >
                                Draft
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setStatus('active')}
                            className={`flex-1 px-4 py-3 rounded-lg border ${status === 'active'
                                ? 'bg-blue-500 border-blue-500'
                                : 'bg-white border-gray-300'
                                }`}
                        >
                            <Text
                                className={`text-center text-sm font-medium ${status === 'active' ? 'text-white' : 'text-gray-700'
                                    }`}
                            >
                                Active
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Budget Calculator Section */}
                <View className="mb-6 bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-200">
                    <Text className="text-lg font-bold text-gray-800 mb-4">
                        💰 Budget Calculator
                    </Text>

                    {/* Total Budget Input */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                            Total Budget <Text className="text-red-500">*</Text>
                        </Text>
                        <View className="flex-row items-center bg-white border-2 border-blue-300 rounded-lg px-4 py-3">
                            <Text className="text-2xl font-bold text-gray-700 mr-2">$</Text>
                            <TextInput
                                className="flex-1 text-2xl font-bold text-gray-800"
                                value={totalBudget}
                                onChangeText={setTotalBudget}
                                placeholder="0.00"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    {parseFloat(totalBudget) > 0 && (
                        <>
                            {/* Cost per 1k Views Slider */}
                            <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-700 mb-2">
                                    Cost per 1,000 Views
                                </Text>
                                <View className="bg-white rounded-lg p-4 border-2 border-blue-300">
                                    {/* Price Display with +/- Buttons */}
                                    <View className="flex-row items-center justify-center mb-2">
                                        <TouchableOpacity
                                            onPress={() => {
                                                const newValue = costPer1kViews < 3
                                                    ? Math.max(budgetCalculations.minCostPer1k, costPer1kViews - 0.05)
                                                    : Math.max(budgetCalculations.minCostPer1k, costPer1kViews - 0.5);
                                                setCostPer1kViews(Math.round(newValue * 100) / 100);
                                            }}
                                            className="bg-gray-100 p-3 rounded-lg"
                                        >
                                            <AntDesign name="minus" size={20} color="#4B5563" />
                                        </TouchableOpacity>

                                        <View className="flex-1 items-center mx-4">
                                            <Text className="text-3xl font-bold text-blue-600 text-center">
                                                ${costPer1kViews.toFixed(2)}
                                            </Text>
                                        </View>

                                        <TouchableOpacity
                                            onPress={() => {
                                                const newValue = costPer1kViews < 3
                                                    ? Math.min(budgetCalculations.maxCostPer1k, costPer1kViews + 0.05)
                                                    : Math.min(budgetCalculations.maxCostPer1k, costPer1kViews + 0.5);
                                                setCostPer1kViews(Math.round(newValue * 100) / 100);
                                            }}
                                            className="bg-gray-100 p-3 rounded-lg"
                                        >
                                            <AntDesign name="plus" size={20} color="#4B5563" />
                                        </TouchableOpacity>
                                    </View>

                                    <Text className="text-xs text-gray-500 text-center mb-3">
                                        per 1,000 views
                                    </Text>

                                    <Slider
                                        minimumValue={budgetCalculations.minCostPer1k}
                                        maximumValue={budgetCalculations.maxCostPer1k}
                                        value={costPer1kViews}
                                        onValueChange={(value) => {
                                            // Dynamic step: 0.05 below $3, 0.50 at $3 and above
                                            let rounded;
                                            if (value < 3) {
                                                // Round to nearest 0.05 (increments of 5 cents)
                                                rounded = Math.round(value * 20) / 20;
                                            } else {
                                                // Round to nearest 0.50 (increments of 50 cents)
                                                rounded = Math.round(value * 2) / 2;
                                            }
                                            setCostPer1kViews(rounded);
                                        }}
                                        onSlidingComplete={(value) => {
                                            // Ensure final value is properly rounded
                                            let rounded;
                                            if (value < 3) {
                                                rounded = Math.round(value * 20) / 20;
                                            } else {
                                                rounded = Math.round(value * 2) / 2;
                                            }
                                            setCostPer1kViews(rounded);
                                        }}
                                        step={0.01}
                                        minimumTrackTintColor="#3B82F6"
                                        maximumTrackTintColor="#E5E7EB"
                                        thumbTintColor="#3B82F6"
                                    />

                                    <View className="flex-row justify-between mt-2">
                                        <Text className="text-xs text-gray-500">
                                            ${budgetCalculations.minCostPer1k.toFixed(2)}
                                        </Text>
                                        <Text className="text-xs text-gray-500">
                                            ${budgetCalculations.maxCostPer1k.toFixed(2)}
                                        </Text>
                                    </View>
                                    <Text className="text-xs text-gray-400 text-center mt-2">
                                        Increments: $0.05 below $3, then $0.50
                                    </Text>
                                </View>
                            </View>

                            {/* Results Display */}
                            <View className="bg-white rounded-lg p-4 border-2 border-green-300">
                                <Text className="text-sm font-semibold text-gray-700 mb-3 text-center">
                                    📊 Campaign Reach Estimate
                                </Text>

                                <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-gray-200">
                                    <Text className="text-sm text-gray-600">Total Views</Text>
                                    <Text className="text-xl font-bold text-green-600">
                                        {formatNumber(budgetCalculations.totalViews)}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-gray-200">
                                    <Text className="text-sm text-gray-600">1K View Blocks</Text>
                                    <Text className="text-lg font-bold text-gray-800">
                                        {budgetCalculations.blocks1k.toLocaleString()}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center">
                                    <Text className="text-sm text-gray-600">Rate per View</Text>
                                    <Text className="text-sm font-semibold text-gray-800">
                                        ${budgetCalculations.ratePerView.toFixed(6)}
                                    </Text>
                                </View>

                                {/* Info Box */}
                                <View className="mt-4 bg-blue-50 p-3 rounded-lg">
                                    <Text className="text-xs text-blue-800">
                                        💡 Influencers will be paid ${costPer1kViews.toFixed(2)} for every 1,000 views their content generates
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>

                {/* Target Niches */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Target Niches <Text className="text-red-500">*</Text>
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_NICHES.map((niche) => (
                            <TouchableOpacity
                                key={niche}
                                onPress={() => toggleNiche(niche)}
                                className={`px-4 py-2 rounded-full border ${selectedNiches.includes(niche)
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
                    </View>
                </View>

                {/* Target Platforms */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Target Platforms <Text className="text-red-500">*</Text>
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_PLATFORMS.map((platform) => (
                            <TouchableOpacity
                                key={platform}
                                onPress={() => togglePlatform(platform)}
                                className={`px-4 py-2 rounded-full border ${selectedPlatforms.includes(platform)
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'bg-white border-gray-300'
                                    }`}
                            >
                                <Text
                                    className={`text-sm font-medium capitalize ${selectedPlatforms.includes(platform) ? 'text-white' : 'text-gray-700'
                                        }`}
                                >
                                    {platform.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Target Locations */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Target Locations (Optional)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                            {AVAILABLE_LOCATIONS.map((location) => (
                                <TouchableOpacity
                                    key={location}
                                    onPress={() => toggleLocation(location)}
                                    className={`px-4 py-2 rounded-full border ${selectedLocations.includes(location)
                                        ? 'bg-green-500 border-green-500'
                                        : 'bg-white border-gray-300'
                                        }`}
                                >
                                    <Text
                                        className={`text-sm font-medium ${selectedLocations.includes(location) ? 'text-white' : 'text-gray-700'
                                            }`}
                                    >
                                        {location}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Target Audience Age */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Target Audience Age (Optional)
                    </Text>
                    <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={targetAudienceAge}
                        onChangeText={setTargetAudienceAge}
                        placeholder="e.g., 18-35"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                {/* Dates */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Start Date</Text>
                    <TouchableOpacity
                        onPress={() => setShowStartPicker(true)}
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                    >
                        <Text className="text-base text-gray-800">
                            {startDate ? startDate.toLocaleDateString() : 'Select start date'}
                        </Text>
                    </TouchableOpacity>
                    {showStartPicker && (
                        <DateTimePicker
                            value={startDate || new Date()}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowStartPicker(false);
                                if (selectedDate) setStartDate(selectedDate);
                            }}
                        />
                    )}
                </View>

            </ScrollView>

            {/* Fixed Bottom Create Button */}
            <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={saving}
                    className="bg-blue-600 py-4 rounded-xl items-center justify-center"
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-lg font-bold">Create Campaign</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default CreateCampaign;