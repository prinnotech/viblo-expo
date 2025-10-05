import "../global.css";
import { Slot, Stack, Tabs } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import { AuthProvider } from "../contexts/AuthContext";
import 'react-native-get-random-values';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from "react";

// Prevent auto-hiding
SplashScreen.preventAutoHideAsync();

export default function Layout() {

    useEffect(() => {
        // Hide splash after 1 second
        setTimeout(() => {
            SplashScreen.hideAsync();
        }, 1000);
    }, []);

    return (
        <AuthProvider>
            <Slot />
        </AuthProvider>
    );
}
