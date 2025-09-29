import React from "react";
import { Alert, Button, Text, TouchableOpacity } from "react-native";
import { supabase } from "@/lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Page() {

    return (
        <SafeAreaView className="flex flex-1">
            <Text>Submissions</Text>
        </SafeAreaView>
    );
}
