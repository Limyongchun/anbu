import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { useLang } from "@/context/LanguageContext";
import { Lang } from "@/lib/i18n";

const LANGUAGES: { id: Lang; label: string; sub: string }[] = [
  { id: "ko", label: "한국어", sub: "Korean" },
  { id: "en", label: "English", sub: "English" },
  { id: "ja", label: "日本語", sub: "Japanese" },
];

export default function LanguageSelectScreen() {
  const { lang, setLang } = useLang();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 1000, useNativeDriver: false }).start();
  }, []);

  const handleSelect = (selectedLang: Lang) => {
    setLang(selectedLang);
    router.push("/login");
  };

  return (
    <View style={st.container}>
      <View style={[st.content, { paddingTop: topInset + 100, paddingBottom: bottomInset + 60 }]}>
        <Animated.View style={[st.header, { opacity: fadeIn }]}>
          <Text style={st.title}>언어를 선택해주세요</Text>
          <Text style={st.subtitle}>Select your language</Text>
        </Animated.View>

        <Animated.View style={[st.list, { opacity: fadeIn }]}>
          {LANGUAGES.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                st.langItem,
                lang === item.id && st.langItemActive,
                pressed && st.langItemPressed,
              ]}
              onPress={() => handleSelect(item.id)}
            >
              <Text style={[st.langLabel, lang === item.id && st.langLabelActive]}>
                {item.label}
              </Text>
              {lang === item.id && (
                <Ionicons name="checkmark" size={20} color="#D7FF00" />
              )}
            </Pressable>
          ))}
        </Animated.View>

        <View style={st.footer}>
          <Text style={st.footerText}>ANBU — Time to care</Text>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.4)",
    marginTop: 8,
  },
  list: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 28,
  },
  langItemActive: {
    backgroundColor: "rgba(215, 255, 0, 0.08)",
  },
  langItemPressed: {
    opacity: 0.7,
  },
  langLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 19,
    color: "rgba(255,255,255,0.7)",
  },
  langLabelActive: {
    color: "#D7FF00",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.2)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
