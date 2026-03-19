import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/context/LanguageContext";

const bgImage = require("@/assets/images/role-select-bg.png");
const logoImage = require("@/assets/images/logo-anbu.png");

export default function RoleSelectScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { t } = useLang();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <ImageBackground source={bgImage} style={st.container} resizeMode="cover">
      <View style={[st.inner, { paddingTop: topInset + 40, paddingBottom: bottomInset + 24 }]}>
        <View style={st.topSection}>
          <Image source={logoImage} style={st.logo} resizeMode="contain" />
          <Text style={st.title}>{t.roleSelectTitle}</Text>
          <Text style={st.subtitle}>{t.roleSelectSub}</Text>
        </View>

        <Animated.View style={[st.cardsRow, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Pressable
            style={({ pressed }) => [st.card, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/child-signup")}
          >
            <View style={st.iconWrap}>
              <Ionicons name="person-outline" size={40} color="#D4843A" />
            </View>
            <Text style={st.cardTitle}>{t.roleSelectChild}</Text>
            <Text style={st.cardDesc}>{t.roleSelectChildDesc}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.card, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/child-signup")}
          >
            <View style={st.iconWrap}>
              <Ionicons name="people-outline" size={40} color="#D4843A" />
            </View>
            <Text style={st.cardTitle}>{t.roleSelectParent}</Text>
            <Text style={st.cardDesc}>{t.roleSelectParentDesc}</Text>
          </Pressable>
        </Animated.View>

        <View style={st.creditWrap}>
          <Text style={st.creditText}>© ANBU Co., Ltd.</Text>
          <Text style={st.creditText}>With Love, For Parents</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28 },
  topSection: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 40 },
  logo: { width: 140, height: 50, marginBottom: 20 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 22,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 40,
  },
  card: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(212,132,58,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#1a1a1a",
    marginBottom: 6,
  },
  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 17,
  },
  creditWrap: {
    alignItems: "center",
    marginBottom: 4,
  },
  creditText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 16,
  },
});
