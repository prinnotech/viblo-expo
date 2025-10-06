import "../global.css";
import { Slot, Stack, Tabs } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import { AuthProvider } from "../contexts/AuthContext";
import 'react-native-get-random-values';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from "react";
import { StripeProvider } from '@stripe/stripe-react-native';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
    useEffect(() => {
        setTimeout(() => {
            SplashScreen.hideAsync();
        }, 1000);
    }, []);

    return (
        <AuthProvider>
            <StripeProvider
                publishableKey="pk_test_51SEzaBJ6uKV4HQBES2UANsuTfRy87LuusjmIfjNu1QD4aldmYaqxQwAwp4EUKnQnByt4vBo0MjP4dXSesvK1UtWW0069cfpEO4"
                merchantIdentifier="io.viblo.app"
            >
                <Slot />
            </StripeProvider>
        </AuthProvider>
    );
}
