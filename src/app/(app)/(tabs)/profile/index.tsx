import React from "react";
import { Alert, Button, SafeAreaView, Text, TouchableOpacity } from "react-native";
import { supabase } from "@/lib/supabase";

export default function Page() {

    async function signOut() {

        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            {
                text: "Cancel",
                style: "cancel"
            },
            {
                text: "Sign Out",
                style: "destructive",
                onPress: async () => {
                    const { error } = await supabase.auth.signOut()
                }
            }
        ])

    }


    return (
        <SafeAreaView className="flex flex-1">
            <Text>Profile</Text>
            <TouchableOpacity
                onPress={signOut}
                className="w-full bg-red-600 py-3 rounded-lg flex-row justify-center items-center"
            >
                <Text className="text-white text-lg font-semibold">Sign Out</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}
