import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const InboxScreen = () => {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Inbox</Text>
                <Text style={{ marginTop: 8, color: 'gray' }}>Conversations with brands will appear here.</Text>
            </View>
        </SafeAreaView>
    );
};

export default InboxScreen;
