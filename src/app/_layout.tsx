import "../global.css";
import { Slot, Stack, Tabs } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import { AuthProvider } from "../contexts/AuthContext";
import 'react-native-get-random-values';

export default function Layout() {
  return (
    <AuthProvider>
        <Slot />
    </AuthProvider>
  );
}
