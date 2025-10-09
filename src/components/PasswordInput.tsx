import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface PasswordInputProps extends TextInputProps {
    iconSize?: number;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ iconSize = 22, ...props }) => {
    const { theme } = useTheme();
    // State to manage password visibility
    const [isSecure, setIsSecure] = useState(true);

    return (
        // The container holds the input and the icon, and carries the border styles.
        <View className="w-full flex-row items-center rounded-lg mb-6" style={{ backgroundColor: theme.background, borderColor: theme.borderLight, borderWidth: 1 }}>
            <TextInput
                // The TextInput takes up most of the space and has no border of its own.
                className="flex-1 px-4 py-3 text-base"
                style={{ color: theme.textSecondary }}
                // The secureTextEntry prop is controlled by our state
                secureTextEntry={isSecure}
                autoCapitalize={'none'}
                placeholderTextColor={theme.textTertiary}
                // We pass down all other props (like value, onChangeText, placeholder)
                {...props}
            />
            {/* The TouchableOpacity makes our icon pressable */}
            <TouchableOpacity
                onPress={() => setIsSecure(!isSecure)}
                className="p-3" // Add padding to make the icon easier to press
            >
                {/* We conditionally render the icon based on the isSecure state */}
                <Feather
                    name={isSecure ? 'eye-off' : 'eye'}
                    size={iconSize}
                    color={theme.textTertiary}
                />
            </TouchableOpacity>
        </View>
    );
};

export default PasswordInput;
