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
  const { lang, setLang, t } = useLang();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 800, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleSelect = (selectedLang: Lang) => {
    setLang(selectedLang);
    router.push("/login");
  };

  return (
    <View style={st.container}>
      <LinearGradient
        colors={["#1a1a1a", "#000000"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[st.content, { paddingTop: topInset + 60, paddingBottom: bottomInset + 40 }]}>
        <Animated.View style={[st.header, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={st.title}>언어를 선택해주세요</Text>
          <Text style={st.subtitle}>Select your language</Text>
        </Animated.View>

        <View style={st.list}>
          {LANGUAGES.map((item, index) => (
            <Animated.View
              key={item.id}
              style={{
                opacity: fadeIn,
                transform: [{ translateY: slideUp }],
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  st.langItem,
                  lang === item.id && st.langItemActive,
                  pressed && st.langItemPressed,
                ]}
                onPress={() => handleSelect(item.id)}
              >
                <View>
                  <Text style={[st.langLabel, lang === item.id && st.langLabelActive]}>
                    {item.label}
                  </Text>
                  <Text style={st.langSub}>{item.sub}</Text>
                </View>
                {lang === item.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#D7FF00" />
                )}
              </Pressable>
            </Animated.View>
          ))}
        </View>

        <Animated.View style={[st.footer, { opacity: fadeIn }]}>
          <Text style={st.footerText}>© ANBU — Premium Family Safety</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    marginTop: 8,
  },
  list: {
    flex: 1,
    gap: 16,
    justifyContent: "center",
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  langItemActive: {
    backgroundColor: "rgba(215, 255, 0, 0.08)",
    borderColor: "rgba(215, 255, 0, 0.3)",
  },
  langItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  langLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: "#FFFFFF",
  },
  langLabelActive: {
    color: "#D7FF00",
  },
  langSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
  },
});
