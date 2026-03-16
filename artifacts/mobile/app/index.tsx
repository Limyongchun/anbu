import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const { isConnected, myRole, loading } = useFamilyContext();
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 750, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 750, useNativeDriver: false }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!loading && isConnected && myRole) {
      router.replace(myRole === "parent" ? "/parent" : "/child");
    }
  }, [loading, isConnected, myRole]);

  const topInset    = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[st.container, { paddingTop: topInset, paddingBottom: bottomInset + 24 }]}>
      <Animated.View style={[st.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

        {/* ── 로고 ── */}
        <Text style={st.logo}>A N B U</Text>
        <Text style={st.sub}>부모님과 자녀를 잇는 안전 연결</Text>

        <View style={st.divider} />

        {/* ── 미리보기 ── */}
        <Text style={st.previewLabel}>미리보기</Text>
        <View style={st.previewRow}>
          <Pressable style={({ pressed }) => [st.previewBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={() => router.push("/child")}>
            <Ionicons name="people" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={st.previewText}>자녀 화면</Text>
          </Pressable>
          <View style={st.previewDivider} />
          <Pressable style={({ pressed }) => [st.previewBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={() => router.push("/parent")}>
            <Ionicons name="home" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={st.previewText}>부모님 화면</Text>
          </Pressable>
        </View>

        <Text style={st.footer}>가족과의 소중한 순간을 연결합니다</Text>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.mapBg, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  content:      { width: "100%", maxWidth: 380, alignItems: "center", paddingHorizontal: 28, zIndex: 1 },
  logo:         { fontFamily: "Inter_700Bold", fontSize: 44, color: COLORS.white, letterSpacing: 5, marginBottom: 10 },
  sub:          { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.45)", letterSpacing: 1, textAlign: "center", marginBottom: 36 },
  divider:      { width: 36, height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 36 },
  previewLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 10 },
  previewRow:   { width: "100%", flexDirection: "row", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", marginBottom: 40 },
  previewBtn:   { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14 },
  previewText:  { fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  previewDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.09)" },
  footer:       { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.22)", letterSpacing: 0.5 },
});
