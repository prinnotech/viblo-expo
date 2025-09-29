import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WalletScreen = () => {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold' }}>My Wallet</Text>
                <Text style={{ marginTop: 8, color: 'gray' }}>Earnings and payout methods will be shown here.</Text>
            </View>
        </SafeAreaView>
    );
};

export default WalletScreen;
