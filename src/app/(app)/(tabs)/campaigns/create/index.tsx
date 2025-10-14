import {
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Modal,
} from 'react-native';
import React, { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AntDesign from '@expo/vector-icons/AntDesign';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import { CampaignType } from '@/lib/enum_types';

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
    const { theme } = useTheme();
    const { t } = useLanguage();
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
    const [campaignType, setCampaignType] = useState<CampaignType>('service');
    const [productUrl, setProductUrl] = useState('');
    const [discountCode, setDiscountCode] = useState('');
    const [productImageUri, setProductImageUri] = useState<string | null>(null);
    const [returnPolicy, setReturnPolicy] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    // Budget calculator states
    const [costPer1kViews, setCostPer1kViews] = useState(0.5); // Start at minimum $0.50 per 1k views
    const [showCampaignTypeModal, setShowCampaignTypeModal] = useState(false);

    const CAMPAIGN_TYPES = [
        { value: 'service', label: t('campaignCreate.service') },
        { value: 'physical_product', label: t('campaignCreate.physical_product') },
        { value: 'app', label: t('campaignCreate.app') },
        { value: 'local_business', label: t('campaignCreate.local_business') },
        { value: 'event', label: t('campaignCreate.event') },
        { value: 'content', label: t('campaignCreate.content') },
        { value: 'brand_awareness', label: t('campaignCreate.brand_awareness') },
    ];


    // Calculate slider range and values
    const budgetCalculations = useMemo(() => {
        const budget = parseFloat(totalBudget) || 0;

        // Minimum: $0.50 per 1k views (which is $0.0005 per view)
        const minCostPer1k = 0.05;

        // Maximum: the entire budget (user pays for at least 1k views)
        const maxCostPer1k = budget > 0 ? budget : 100;

        // Current rate per view (for database)
        const ratePerView = costPer1kViews;

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
            Alert.alert(t('campaignCreate.error'), t('campaignCreate.only_brands_create'));
            return;
        }

        // Validation
        if (!title.trim()) {
            Alert.alert(t('campaignCreate.validation_error'), t('campaignCreate.enter_title'));
            return;
        }

        if (!totalBudget || parseFloat(totalBudget) <= 0) {
            Alert.alert(t('campaignCreate.validation_error'), t('campaignCreate.enter_valid_budget'));
            return;
        }

        if (selectedNiches.length === 0) {
            Alert.alert(t('campaignCreate.validation_error'), t('campaignCreate.select_niche'));
            return;
        }

        if (selectedPlatforms.length === 0) {
            Alert.alert(t('campaignCreate.validation_error'), t('campaignCreate.select_platform'));
            return;
        }

        if (campaignType === 'physical_product') {
            if (!productUrl.trim()) {
                Alert.alert(t('campaignCreate.validation_error'), t('campaignCreate.enter_product_url'));
                return;
            }
            if (!productImageUri) {
                Alert.alert(t('campaignCreate.validation_error'), t('campaignCreate.upload_product_image'));
                return;
            }
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
            campaign_type: campaignType,
            product_url: productUrl.trim() || null,
            discount_code: discountCode.trim() || null,
            product_image_url: productImageUri,
            return_policy_details: returnPolicy.trim() || null,
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
            Alert.alert(t('campaignCreate.error'), t('campaignCreate.failed_create'));
            return;
        }

        // If they wanted it active, redirect to payment
        if (wantsActive) {
            router.replace(`/(tabs)/campaigns/${data.id}/payment`);
        } else {
            // Just a draft, no payment needed
            Alert.alert(t('campaignCreate.success'), t('campaignCreate.campaign_saved_draft'), [
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

    const pickProductImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('campaignCreate.permission_needed'), t('campaignCreate.photo_permission_message'));
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
                    Alert.alert(t('campaignCreate.file_too_large'), t('campaignCreate.file_size_message'));
                    return;
                }
                await uploadProductImage(asset);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert(t('campaignCreate.error'), t('campaignCreate.pick_image_error'));
        }
    };

    const uploadProductImage = async (asset: ImagePicker.ImagePickerAsset) => {
        if (!profile || !asset.uri) {
            Alert.alert(t('campaignCreate.error'), t('campaignCreate.no_image_selected'));
            return;
        }

        setUploadingImage(true);

        try {
            const response = await fetch(asset.uri);
            const arrayBuffer = await response.arrayBuffer();
            const fileExtension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
            const timestamp = Date.now();
            const filePath = `${profile.id}/product_${timestamp}.${fileExtension}`;

            const { error } = await supabase.storage
                .from('products')
                .upload(filePath, arrayBuffer, {
                    contentType: asset.mimeType || `image/${fileExtension}`,
                    upsert: true,
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('products')
                .getPublicUrl(filePath);

            setProductImageUri(publicUrlData.publicUrl);
            Alert.alert(t('campaignCreate.success'), t('campaignCreate.image_uploaded'));
        } catch (err) {
            const error = err as Error;
            console.error('Error uploading product image:', error.message);
            Alert.alert(t('campaignCreate.error'), t('campaignCreate.upload_image_error'));
        } finally {
            setUploadingImage(false);
        }
    };

    const removeProductImage = () => {
        Alert.alert(
            t('campaignCreate.remove_image'),
            t('campaignCreate.remove_image_confirm'),
            [
                { text: t('campaignCreate.cancel'), style: 'cancel' },
                {
                    text: t('campaignCreate.remove'),
                    style: 'destructive',
                    onPress: () => setProductImageUri(null)
                }
            ]
        );
    };


    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-sm mt-1" style={{ color: theme.textTertiary }}>
                        {t('campaignCreate.setup_campaign')}
                    </Text>
                </View>

                {/* Campaign Type Selector */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                        {t('campaignCreate.campaign_type')} <Text style={{ color: theme.error }}>*</Text>
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowCampaignTypeModal(true)}
                        className="border rounded-lg px-4 py-3 flex-row justify-between items-center"
                        style={{ backgroundColor: theme.surface, borderColor: theme.borderLight }}
                    >
                        <Text className="text-base" style={{ color: theme.text }}>
                            {CAMPAIGN_TYPES.find(type => type.value === campaignType)?.label || t('campaignCreate.select_campaign_type')}
                        </Text>
                        <AntDesign name="down" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Campaign Type Modal */}
                <Modal
                    visible={showCampaignTypeModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowCampaignTypeModal(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setShowCampaignTypeModal(false)}
                        className="flex-1 justify-end"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    >
                        <TouchableOpacity activeOpacity={1}>
                            <View className="rounded-t-3xl p-6" style={{ backgroundColor: theme.surface }}>
                                <View className="flex-row justify-between items-center mb-4">
                                    <Text className="text-lg font-bold" style={{ color: theme.text }}>
                                        {t('campaignCreate.select_campaign_type')}
                                    </Text>
                                    <TouchableOpacity onPress={() => setShowCampaignTypeModal(false)}>
                                        <AntDesign name="close" size={24} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={{ maxHeight: 400 }}>
                                    {CAMPAIGN_TYPES.map((type) => (
                                        <TouchableOpacity
                                            key={type.value}
                                            onPress={() => {
                                                setCampaignType(type.value as CampaignType);
                                                setShowCampaignTypeModal(false);
                                            }}
                                            className="py-4 border-b flex-row justify-between items-center"
                                            style={{ borderColor: theme.border }}
                                        >
                                            <Text
                                                className="text-base"
                                                style={{
                                                    color: campaignType === type.value ? theme.primary : theme.text,
                                                    fontWeight: campaignType === type.value ? '600' : '400'
                                                }}
                                            >
                                                {type.label}
                                            </Text>
                                            {campaignType === type.value && (
                                                <AntDesign name="check" size={20} color={theme.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* Title */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                        {t('campaignCreate.campaign_title')} <Text style={{ color: theme.error }}>*</Text>
                    </Text>
                    <TextInput
                        className="border rounded-lg px-4 py-3 text-base"
                        style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, color: theme.text }}
                        value={title}
                        onChangeText={setTitle}
                        placeholder={t('campaignCreate.enter_campaign_title')}
                        placeholderTextColor={theme.textTertiary}
                    />
                </View>

                {/* Description */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>{t('campaignCreate.description')}</Text>
                    <TextInput
                        className="border rounded-lg px-4 py-3 text-base"
                        style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, color: theme.text, height: 100, textAlignVertical: 'top' }}
                        value={description}
                        onChangeText={setDescription}
                        placeholder={t('campaignCreate.describe_campaign')}
                        placeholderTextColor={theme.textTertiary}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* Content Requirements */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                        {t('campaignCreate.content_requirements')}
                    </Text>
                    <TextInput
                        className="border rounded-lg px-4 py-3 text-base"
                        style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, color: theme.text, height: 100, textAlignVertical: 'top' }}
                        value={contentRequirements}
                        onChangeText={setContentRequirements}
                        placeholder={t('campaignCreate.content_requirements_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* Physical Product Fields */}
                {campaignType === 'physical_product' && (
                    <>
                        {/* Product URL */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                                {t('campaignCreate.product_url')} <Text style={{ color: theme.error }}>*</Text>
                            </Text>
                            <TextInput
                                className="border rounded-lg px-4 py-3 text-base"
                                style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, color: theme.text }}
                                value={productUrl}
                                onChangeText={setProductUrl}
                                placeholder={t('campaignCreate.enter_product_url')}
                                placeholderTextColor={theme.textTertiary}
                                keyboardType="url"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Discount Code */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                                {t('campaignCreate.discount_code')}
                            </Text>
                            <TextInput
                                className="border rounded-lg px-4 py-3 text-base"
                                style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, color: theme.text }}
                                value={discountCode}
                                onChangeText={setDiscountCode}
                                placeholder={t('campaignCreate.enter_discount_code')}
                                placeholderTextColor={theme.textTertiary}
                                autoCapitalize="characters"
                            />
                        </View>

                        {/* Product Image */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                                {t('campaignCreate.product_image')} <Text style={{ color: theme.error }}>*</Text>
                            </Text>
                            {productImageUri ? (
                                <View>
                                    <Image
                                        source={{ uri: productImageUri }}
                                        className="w-full h-48 rounded-lg"
                                        resizeMode="cover"
                                    />
                                    <TouchableOpacity
                                        onPress={removeProductImage}
                                        className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                                    >
                                        <AntDesign name="close" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={pickProductImage}
                                    disabled={uploadingImage}
                                    className="border-2 border-dashed rounded-lg p-8 items-center justify-center"
                                    style={{
                                        backgroundColor: theme.surface,
                                        borderColor: theme.borderLight,
                                    }}
                                >
                                    {uploadingImage ? (
                                        <ActivityIndicator color={theme.primary} />
                                    ) : (
                                        <>
                                            <AntDesign name="camera" size={32} color={theme.textTertiary} />
                                            <Text className="mt-2 text-sm text-center" style={{ color: theme.textTertiary }}>
                                                {t('campaignCreate.tap_upload_product')}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Return Policy */}
                        <View className="mb-4">
                            <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                                {t('campaignCreate.return_policy')}
                            </Text>
                            <TextInput
                                className="border rounded-lg px-4 py-3 text-base"
                                style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, color: theme.text, height: 100, textAlignVertical: 'top' }}
                                value={returnPolicy}
                                onChangeText={setReturnPolicy}
                                placeholder={t('campaignCreate.return_policy_placeholder')}
                                placeholderTextColor={theme.textTertiary}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </>
                )}

                {/* Status */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                        {t('campaignCreate.campaign_status')} <Text style={{ color: theme.error }}>*</Text>
                    </Text>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => setStatus('draft')}
                            className="flex-1 px-4 py-3 rounded-lg border"
                            style={{
                                backgroundColor: status === 'draft' ? theme.primary : theme.surface,
                                borderColor: status === 'draft' ? theme.primary : theme.borderLight
                            }}
                        >
                            <Text
                                className="text-center text-sm font-medium"
                                style={{ color: status === 'draft' ? theme.surface : theme.text }}
                            >
                                {t('campaignCreate.draft')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setStatus('active')}
                            className="flex-1 px-4 py-3 rounded-lg border"
                            style={{
                                backgroundColor: status === 'active' ? theme.primary : theme.surface,
                                borderColor: status === 'active' ? theme.primary : theme.borderLight
                            }}
                        >
                            <Text
                                className="text-center text-sm font-medium"
                                style={{ color: status === 'active' ? theme.surface : theme.text }}
                            >
                                {t('campaignCreate.active')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Budget Calculator Section */}
                <View className="mb-6 p-4 rounded-xl border-2" style={{ backgroundColor: theme.surfaceSecondary, borderColor: theme.primaryLight }}>
                    <Text className="text-lg font-bold mb-4" style={{ color: theme.text }}>
                        {t('campaignCreate.budget_calculator')}
                    </Text>

                    {/* Total Budget Input */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                            {t('campaignCreate.total_budget')} <Text style={{ color: theme.error }}>*</Text>
                        </Text>
                        <View className="flex-row items-center border-2 rounded-lg px-4 py-3" style={{ backgroundColor: theme.surface, borderColor: theme.primary }}>
                            <Text className="text-2xl font-bold mr-2" style={{ color: theme.textSecondary }}>$</Text>
                            <TextInput
                                className="flex-1 text-2xl font-bold"
                                style={{ color: theme.text }}
                                value={totalBudget}
                                onChangeText={setTotalBudget}
                                placeholder="0.00"
                                placeholderTextColor={theme.textTertiary}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    {parseFloat(totalBudget) > 0 && (
                        <>
                            {/* Cost per 1k Views Slider */}
                            <View className="mb-4">
                                <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                                    {t('campaignCreate.cost_per_1k_views')}
                                </Text>
                                <View className="rounded-lg p-4 border-2" style={{ backgroundColor: theme.surface, borderColor: theme.primaryLight }}>
                                    {/* Price Display with +/- Buttons */}
                                    <View className="flex-row items-center justify-center mb-2">
                                        <TouchableOpacity
                                            onPress={() => {
                                                const newValue = costPer1kViews < 3
                                                    ? Math.max(budgetCalculations.minCostPer1k, costPer1kViews - 0.05)
                                                    : Math.max(budgetCalculations.minCostPer1k, costPer1kViews - 0.5);
                                                setCostPer1kViews(Math.round(newValue * 100) / 100);
                                            }}
                                            className="p-3 rounded-lg"
                                            style={{ backgroundColor: theme.surfaceSecondary }}
                                        >
                                            <AntDesign name="minus" size={20} color={theme.textSecondary} />
                                        </TouchableOpacity>

                                        <View className="flex-1 items-center mx-4">
                                            <Text className="text-3xl font-bold text-center" style={{ color: theme.primary }}>
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
                                            className="p-3 rounded-lg"
                                            style={{ backgroundColor: theme.surfaceSecondary }}
                                        >
                                            <AntDesign name="plus" size={20} color={theme.textSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    <Text className="text-xs text-center mb-3" style={{ color: theme.textTertiary }}>
                                        {t('campaignCreate.per_1k_views')}
                                    </Text>

                                    <Slider
                                        minimumValue={budgetCalculations.minCostPer1k}
                                        maximumValue={budgetCalculations.maxCostPer1k}
                                        value={costPer1kViews}
                                        onValueChange={(value) => {
                                            let rounded;
                                            if (value < 3) {
                                                rounded = Math.round(value * 20) / 20;
                                            } else {
                                                rounded = Math.round(value * 2) / 2;
                                            }
                                            setCostPer1kViews(rounded);
                                        }}
                                        onSlidingComplete={(value) => {
                                            let rounded;
                                            if (value < 3) {
                                                rounded = Math.round(value * 20) / 20;
                                            } else {
                                                rounded = Math.round(value * 2) / 2;
                                            }
                                            setCostPer1kViews(rounded);
                                        }}
                                        step={0.01}
                                        minimumTrackTintColor={theme.primary}
                                        maximumTrackTintColor={theme.border}
                                        thumbTintColor={theme.primary}
                                    />

                                    <View className="flex-row justify-between mt-2">
                                        <Text className="text-xs" style={{ color: theme.textTertiary }}>
                                            ${budgetCalculations.minCostPer1k.toFixed(2)}
                                        </Text>
                                        <Text className="text-xs" style={{ color: theme.textTertiary }}>
                                            ${budgetCalculations.maxCostPer1k.toFixed(2)}
                                        </Text>
                                    </View>
                                    <Text className="text-xs text-center mt-2" style={{ color: theme.textTertiary }}>
                                        {t('campaignCreate.increments_info')}
                                    </Text>
                                </View>
                            </View>

                            {/* Results Display */}
                            <View className="rounded-lg p-4 border-2" style={{ backgroundColor: theme.surface, borderColor: theme.successLight }}>
                                <Text className="text-sm font-semibold mb-3 text-center" style={{ color: theme.textSecondary }}>
                                    {t('campaignCreate.campaign_reach_estimate')}
                                </Text>

                                <View className="flex-row justify-between items-center mb-3 pb-3 border-b" style={{ borderColor: theme.border }}>
                                    <Text className="text-sm" style={{ color: theme.textSecondary }}>{t('campaignCreate.total_views')}</Text>
                                    <Text className="text-xl font-bold" style={{ color: theme.success }}>
                                        {formatNumber(budgetCalculations.totalViews)}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center mb-3 pb-3 border-b" style={{ borderColor: theme.border }}>
                                    <Text className="text-sm" style={{ color: theme.textSecondary }}>{t('campaignCreate.1k_view_blocks')}</Text>
                                    <Text className="text-lg font-bold" style={{ color: theme.text }}>
                                        {budgetCalculations.blocks1k.toLocaleString()}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center">
                                    <Text className="text-sm" style={{ color: theme.textSecondary }}>{t('campaignCreate.rate_per_view')}</Text>
                                    <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                                        ${budgetCalculations.ratePerView.toFixed(6)}
                                    </Text>
                                </View>

                                {/* Info Box */}
                                <View className="mt-4 p-3 rounded-lg" style={{ backgroundColor: theme.primaryLight }}>
                                    <Text className="text-xs" style={{ color: theme.primary }}>
                                        {t('campaignCreate.influencers_paid_info').replace('{{amount}}', costPer1kViews.toFixed(2))}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>

                {/* Target Niches */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                        {t('campaignCreate.target_niches')} <Text style={{ color: theme.error }}>*</Text>
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_NICHES.map((niche) => (
                            <TouchableOpacity
                                key={niche}
                                onPress={() => toggleNiche(niche)}
                                className="px-4 py-2 rounded-full border"
                                style={{
                                    backgroundColor: selectedNiches.includes(niche) ? theme.primary : theme.surface,
                                    borderColor: selectedNiches.includes(niche) ? theme.primary : theme.borderLight
                                }}
                            >
                                <Text
                                    className="text-sm font-medium"
                                    style={{ color: selectedNiches.includes(niche) ? theme.surface : theme.text }}
                                >
                                    {niche}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Target Platforms */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                        {t('campaignCreate.target_platforms')} <Text style={{ color: theme.error }}>*</Text>
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {AVAILABLE_PLATFORMS.map((platform) => (
                            <TouchableOpacity
                                key={platform}
                                onPress={() => togglePlatform(platform)}
                                className="px-4 py-2 rounded-full border"
                                style={{
                                    backgroundColor: selectedPlatforms.includes(platform) ? theme.primary : theme.surface,
                                    borderColor: selectedPlatforms.includes(platform) ? theme.primary : theme.borderLight
                                }}
                            >
                                <Text
                                    className="text-sm font-medium capitalize"
                                    style={{ color: selectedPlatforms.includes(platform) ? theme.surface : theme.text }}
                                >
                                    {platform.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Target Locations */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                        {t('campaignCreate.target_locations')}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                            {AVAILABLE_LOCATIONS.map((location) => (
                                <TouchableOpacity
                                    key={location}
                                    onPress={() => toggleLocation(location)}
                                    className="px-4 py-2 rounded-full border"
                                    style={{
                                        backgroundColor: selectedLocations.includes(location) ? theme.success : theme.surface,
                                        borderColor: selectedLocations.includes(location) ? theme.success : theme.borderLight
                                    }}
                                >
                                    <Text
                                        className="text-sm font-medium"
                                        style={{ color: selectedLocations.includes(location) ? theme.surface : theme.text }}
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
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>
                        {t('campaignCreate.target_audience_age')}
                    </Text>
                    <TextInput
                        className="border rounded-lg px-4 py-3 text-base"
                        style={{ backgroundColor: theme.surface, borderColor: theme.borderLight, color: theme.text }}
                        value={targetAudienceAge}
                        onChangeText={setTargetAudienceAge}
                        placeholder={t('campaignCreate.age_placeholder')}
                        placeholderTextColor={theme.textTertiary}
                    />
                </View>

                {/* Dates */}
                <View className="mb-4">
                    <Text className="text-sm font-semibold mb-2" style={{ color: theme.textSecondary }}>{t('campaignCreate.start_date')}</Text>
                    <TouchableOpacity
                        onPress={() => setShowStartPicker(true)}
                        className="border rounded-lg px-4 py-3"
                        style={{ backgroundColor: theme.surface, borderColor: theme.borderLight }}
                    >
                        <Text className="text-base" style={{ color: startDate ? theme.text : theme.textTertiary }}>
                            {startDate ? startDate.toLocaleDateString() : t('campaignCreate.select_start_date')}
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
            <View className="absolute bottom-0 left-0 right-0 p-4 border-t" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={saving}
                    className="py-4 rounded-xl items-center justify-center"
                    style={{ backgroundColor: saving ? theme.textTertiary : theme.primaryDark }}
                >
                    {saving ? (
                        <ActivityIndicator color={theme.surface} />
                    ) : (
                        <Text className="text-lg font-bold" style={{ color: theme.surface }}>{t('campaignCreate.create_campaign')}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default CreateCampaign;