// components/NotificationSwitch.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Alert, ActivityIndicator } from 'react-native';
import {
    registerForPushNotifications,
    checkNotificationPermissions,
    openAppSettings
} from '@/hooks/usePushNotifications';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface NotificationSwitchProps {
    /**
     * The current push token from the user's profile
     * Pass null if notifications are disabled
     */
    currentToken: string | null;

    /**
     * Callback when token changes
     * Called with the new token (or null if disabled)
     */
    onTokenChange: (token: string | null) => Promise<void>;

    /**
     * Optional: Show as compact (no description text)
     */
    compact?: boolean;
}

export default function NotificationSwitch({
    currentToken,
    onTokenChange,
    compact = false
}: NotificationSwitchProps) {
    const { theme } = useTheme();
    const { t } = useLanguage();

    const [isEnabled, setIsEnabled] = useState(!!currentToken);
    const [isLoading, setIsLoading] = useState(false);

    // Update local state when prop changes
    useEffect(() => {
        setIsEnabled(!!currentToken);
    }, [currentToken]);

    const handleToggle = async (value: boolean) => {
        if (isLoading) return;

        setIsLoading(true);

        try {
            if (value) {
                // ENABLING NOTIFICATIONS
                console.log('🔔 Enabling notifications...');

                // Check current permission state
                const permissionStatus = await checkNotificationPermissions();
                console.log('Permission status:', permissionStatus);

                // If permanently denied, guide user to settings
                if (!permissionStatus.granted && !permissionStatus.canAskAgain) {
                    Alert.alert(
                        t('profileSettings.permission_denied'),
                        t('profileSettings.notification_permission_settings'),
                        [
                            {
                                text: t('profileSettings.cancel'),
                                style: 'cancel',
                                onPress: () => setIsEnabled(false)
                            },
                            {
                                text: t('profileSettings.open_settings'),
                                onPress: async () => {
                                    await openAppSettings();
                                    setIsEnabled(false);
                                }
                            }
                        ]
                    );
                    setIsLoading(false);
                    return;
                }

                // Try to get push token
                const token = await registerForPushNotifications();
                console.log('Token result:', token);

                if (token === 'PERMISSION_DENIED_GO_TO_SETTINGS') {
                    // Permanently denied
                    Alert.alert(
                        t('profileSettings.permission_denied'),
                        t('profileSettings.notification_permission_settings'),
                        [
                            {
                                text: t('profileSettings.cancel'),
                                style: 'cancel',
                                onPress: () => setIsEnabled(false)
                            },
                            {
                                text: t('profileSettings.open_settings'),
                                onPress: async () => {
                                    await openAppSettings();
                                    setIsEnabled(false);
                                }
                            }
                        ]
                    );
                    setIsEnabled(false);
                    setIsLoading(false);
                    return;
                }

                if (!token) {
                    // Permission denied but can ask again
                    Alert.alert(
                        t('profileSettings.permission_denied'),
                        t('profileSettings.enable_notifications_settings')
                    );
                    setIsEnabled(false);
                    setIsLoading(false);
                    return;
                }

                // Successfully got token - save it via callback
                console.log('💾 Saving token...');
                await onTokenChange(token);

                setIsEnabled(true);
                Alert.alert(
                    t('profileSettings.success'),
                    t('profileSettings.notifications_enabled')
                );

            } else {
                // DISABLING NOTIFICATIONS
                console.log('🔕 Disabling notifications...');

                await onTokenChange(null);

                setIsEnabled(false);
                Alert.alert(
                    t('profileSettings.success'),
                    t('profileSettings.notifications_disabled')
                );
            }
        } catch (error) {
            console.error('Error toggling notifications:', error);
            Alert.alert(
                t('profileSettings.error'),
                'An unexpected error occurred'
            );
            setIsEnabled(!!currentToken); // Revert to original state
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className="rounded-xl" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
            <View className="flex-row justify-between items-center p-4">
                <View className="flex-1 mr-4">
                    <Text className="text-base font-semibold" style={{ color: theme.text }}>
                        {t('profileSettings.push_notifications')}
                    </Text>
                    {!compact && (
                        <Text className="text-sm mt-1" style={{ color: theme.textTertiary }}>
                            {t('profileSettings.push_notifications_description')}
                        </Text>
                    )}
                </View>
                {isLoading ? (
                    <ActivityIndicator color={theme.primary} />
                ) : (
                    <Switch
                        value={isEnabled}
                        onValueChange={handleToggle}
                        disabled={isLoading}
                        trackColor={{ false: theme.border, true: theme.primaryLight }}
                        thumbColor={isEnabled ? theme.primary : theme.surfaceSecondary}
                    />
                )}
            </View>
        </View>
    );
}