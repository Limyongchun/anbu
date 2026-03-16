import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FamilyProvider } from "@/context/FamilyContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5000 },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="parent" options={{ animation: "fade" }} />
      <Stack.Screen name="child" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

function WhiteSplash({ onDone }: { onDone: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const letterSpread = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(letterSpread, { toValue: 1, duration: 700, useNativeDriver: false }),
      Animated.delay(2000),
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: false }),
    ]).start(() => onDone());
  }, []);

  const spacing = letterSpread.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });

  return (
    <Animated.View style={[sp.overlay, { opacity }]} pointerEvents="none">
      <Animated.Text style={[sp.logo, { letterSpacing: spacing }]}>ANBU</Animated.Text>
      <Text style={sp.sub}>부모님과 자녀를 잇는 안전 연결</Text>
    </Animated.View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <FamilyProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
              {showSplash && <WhiteSplash onDone={() => setShowSplash(false)} />}
            </GestureHandlerRootView>
          </FamilyProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const sp = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: "#1a2230",
    marginBottom: 10,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(26,34,48,0.35)",
    letterSpacing: 0.5,
  },
});
