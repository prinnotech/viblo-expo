import { Link } from "expo-router";
import React from "react";
import {  Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Page() {
  return (
    <SafeAreaView className="flex flex-1">
      <Header />
      <Content />
    </SafeAreaView>
  );
}

function Content() {
  return (
    <View className="flex-1">
      <View className="py-12 md:py-24 lg:py-32 xl:py-48">
        <View className="px-4 md:px-6">
          <View className="flex flex-col items-center gap-4 text-center">
            <Text
              role="heading"
              className="text-3xl text-center native:text-5xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Expo + Tailwind (NativeWind) Template
            </Text>

            </View>
          </View>
        </View>
      </View>
  );
}

function Header() {
  return (
    <View>
      <View className="px-4 lg:px-6 h-14 flex items-center flex-row justify-between ">
        
      </View>
    </View>
  );
}
