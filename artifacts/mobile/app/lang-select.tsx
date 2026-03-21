import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/context/LanguageContext";
import type { Lang } from "@/lib/i18n";

const logoImage = require("@/assets/images/logo-anbu.png");

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];

export default function LangSelectScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { lang, setLang } = useLang();
  const [selected, setSelected] = useState<Lang>(lang);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleNext = () => {
    setLang(selected);
    router.push("/role-select");
  };

  return (
    <LinearGradient
      colors={["#D4843A", "#C4692E", "#A85528"]}
      style={st.container}
    >
      <Pressable style={[st.backBtn, { top: topInset + 6 }]} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>

      <View style={[st.inner, { paddingTop: topInset + 40, paddingBottom: bottomInset + 24 }]}>
        <Animated.View style={[st.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Image source={logoImage} style={st.logo} resizeMode="contain" />

          <Text style={st.title}>Select Language</Text>
          <Text style={st.sub}>언어를 선택하세요</Text>

          <View style={st.langList}>
            {LANGUAGES.map((item) => {
              const isActive = selected === item.code;
              return (
                <Pressable
                  key={item.code}
                  style={[st.langBtn, isActive && st.langBtnActive]}
                  onPress={() => setSelected(item.code)}
                >
                  <Text style={st.langFlag}>{item.flag}</Text>
                  <Text style={[st.langLabel, isActive && st.langLabelActive]}>{item.label}</Text>
                  {isActive && (
                    <View style={st.checkCircle}>
                      <Text style={st.checkMark}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeIn }}>
          <Pressable style={st.nextBtn} onPress={handleNext}>
            <Text style={st.nextBtnText}>다음</Text>
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: { flex: 1, paddingHorizontal: 28 },
  content: { flex: 1, justifyContent: "center" },
  logo: { width: 130, height: 46, marginBottom: 32 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 36,
  },
  langList: { gap: 12 },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  langBtnActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderColor: "#FFD700",
  },
  langFlag: { fontSize: 28, marginRight: 16 },
  langLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "rgba(255,255,255,0.8)",
    flex: 1,
  },
  langLabelActive: {
    color: "#FFFFFF",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#000000",
  },
  nextBtn: {
    backgroundColor: "#FFD700",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#000000",
  },
});
