import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons'; // Using Feather icons for the 'eye'

const PasswordInput = ({ iconSize = 22, ...props }) => {
    // State to manage password visibility
    const [isSecure, setIsSecure] = useState(true);

    return (
        // The container holds the input and the icon, and carries the border styles.
        <View className="w-full flex-row items-center bg-gray-50 border border-gray-300 rounded-lg mb-6">
            <TextInput
                // The TextInput takes up most of the space and has no border of its own.
                className="flex-1 px-4 py-3 text-base text-gray-700"
                // The secureTextEntry prop is controlled by our state
                secureTextEntry={isSecure}
                autoCapitalize={'none'}
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
                    color="gray"
                />
            </TouchableOpacity>
        </View>
    );
};

export default PasswordInput;