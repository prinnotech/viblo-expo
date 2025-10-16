import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '@/contexts/ThemeContext';

// Define the properties the button will accept
interface AppleAuthButtonProps {
    onPress: () => void;
    isLoading: boolean;
}

const AppleAuthButton: React.FC<AppleAuthButtonProps> = ({ onPress, isLoading }) => {
    const { theme } = useTheme();

    // The Apple button is only available on iOS.
    if (Platform.OS !== 'ios') {
        return null;
    }

    // If it's loading, show a spinner that looks like the Apple button.
    if (isLoading) {
        return (
            <View style={[styles.button, { backgroundColor: 'black' }]}>
                <ActivityIndicator color="white" />
            </View>
        );
    }

    // Otherwise, show the actual Apple button.
    return (
        <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={styles.button}
            onPress={onPress}
        />
    );
};

const styles = StyleSheet.create({
    button: {
        width: '100%',
        height: 48, // Standard height for touch targets
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
});

export default AppleAuthButton;