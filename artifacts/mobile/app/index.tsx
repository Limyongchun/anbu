import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";

const { width } = Dimensions.get("window");

function PulsingDot() {
  const s = useRef(new Animated.Value(1)).current;
  const o = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(s, { toValue: 2.2, duration: 1000, useNativeDriver: false }),
        Animated.timing(o, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(s, { toValue: 1, duration: 0, useNativeDriver: false }),
        Animated.timing(o, { toValue: 0.4, duration: 0, useNativeDriver: false }),
      ]),
    ])).start();
  }, []);
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 80, height: 80, marginBottom: 32 }}>
      <Animated.View style={{ position: "absolute", width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.neon, transform: [{ scale: s }], opacity: o }} />
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.neon }} />
    </View>
  );
}

function FloatingOrb({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) {
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0.08)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(ty, { toValue: -22, duration: 3200, useNativeDriver: false }),
        Animated.timing(op, { toValue: 0.16, duration: 3200, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(ty, { toValue: 0, duration: 3200, useNativeDriver: false }),
        Animated.timing(op, { toValue: 0.08, duration: 3200, useNativeDriver: false }),
      ]),
    ])).start();
  }, []);
  return (
    <Animated.View style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateY: ty }], opacity: op }} />
  );
}

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
      <FloatingOrb x={-50} y={60}   size={220} color={COLORS.neon}       delay={0}    />
      <FloatingOrb x={width - 90} y={250} size={180} color="rgba(212,242,0,0.7)" delay={600} />
      <FloatingOrb x={width * 0.25} y={-50} size={160} color="rgba(255,255,255,0.5)" delay={1200} />

      <Animated.View style={[st.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

        {/* ── 로고 ── */}
        <PulsingDot />
        <Text style={st.logo}>DUGO</Text>
        <Text style={st.sub}>부모님과 자녀를 잇는 안전 연결</Text>

        <View style={st.divider} />

        {/* ── 주요 버튼 ── */}
        <Pressable
          style={({ pressed }) => [st.btnMain, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => router.push("/setup")}
        >
          <View style={st.btnMainIcon}>
            <Ionicons name="link" size={20} color={COLORS.neonText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.btnMainLabel}>가족 연결하기</Text>
            <Text style={st.btnMainDesc}>가족방 만들기 또는 코드로 참가</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(26,37,53,0.45)" />
        </Pressable>

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
  container: { flex: 1, backgroundColor: COLORS.mapBg, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  content:   { width: "100%", maxWidth: 380, alignItems: "center", paddingHorizontal: 28, zIndex: 1 },
  logo:      { fontFamily: "Inter_700Bold", fontSize: 44, color: COLORS.white, letterSpacing: 5, marginBottom: 10 },
  sub:       { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.45)", letterSpacing: 1, textAlign: "center", marginBottom: 36 },
  divider:   { width: 36, height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 36 },
  btnMain:   { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: COLORS.neon, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 20, gap: 14, marginBottom: 28 },
  btnMainIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(26,37,53,0.15)", alignItems: "center", justifyContent: "center" },
  btnMainLabel: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: COLORS.neonText, marginBottom: 2 },
  btnMainDesc:  { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(26,37,53,0.6)" },
  previewLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 10 },
  previewRow:   { width: "100%", flexDirection: "row", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", marginBottom: 40 },
  previewBtn:   { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14 },
  previewText:  { fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  previewDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.09)" },
  footer:      { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.22)", letterSpacing: 0.5 },
});
