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
import { useLang } from "@/context/LanguageContext";
import { Lang } from "@/lib/i18n";

const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
];

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const { isConnected, myRole, loading } = useFamilyContext();
  const { lang, setLang, t } = useLang();
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
        <Text style={st.sub}>{t.appSub}</Text>

        <View style={st.divider} />

        {/* ── 미리보기 ── */}
        <Text style={st.previewLabel}>{t.preview}</Text>
        <View style={st.previewRow}>
          <Pressable style={({ pressed }) => [st.previewBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={() => router.push("/child")}>
            <Ionicons name="people" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={st.previewText}>{t.childScreen}</Text>
          </Pressable>
          <View style={st.previewDivider} />
          <Pressable style={({ pressed }) => [st.previewBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={() => router.push("/parent")}>
            <Ionicons name="home" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={st.previewText}>{t.parentScreen}</Text>
          </Pressable>
        </View>

        <Text style={st.footer}>{t.footer}</Text>

        {/* ── 언어 선택 ── */}
        <View style={st.langSection}>
          <Text style={st.langLabel}>{t.langLabel}</Text>
          <View style={st.langRow}>
            {LANG_OPTIONS.map((opt) => {
              const active = lang === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={({ pressed }) => [
                    st.langPill,
                    active && st.langPillActive,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => setLang(opt.id)}
                >
                  <Text style={[st.langPillText, active && st.langPillTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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
  previewRow:   { width: "100%", flexDirection: "row", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", marginBottom: 28 },
  previewBtn:   { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14 },
  previewText:  { fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  previewDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.09)" },
  footer:       { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.22)", letterSpacing: 0.5, marginBottom: 36 },

  langSection:       { width: "100%", alignItems: "center", gap: 12 },
  langLabel:         { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1 },
  langRow:           { flexDirection: "row", gap: 8 },
  langPill:          { paddingVertical: 9, paddingHorizontal: 20, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  langPillActive:    { backgroundColor: COLORS.neon, borderColor: COLORS.neon },
  langPillText:      { fontFamily: "Inter_500Medium", fontSize: 13, color: "rgba(255,255,255,0.55)" },
  langPillTextActive:{ color: COLORS.neonText, fontFamily: "Inter_700Bold" },
});
