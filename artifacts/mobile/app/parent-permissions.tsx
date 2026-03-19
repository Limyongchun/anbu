import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
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

const logoImage = require("@/assets/images/logo-anbu.png");

type PermItem = {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  descKey: string;
};

const PERM_ITEMS: PermItem[] = [
  { icon: "notifications-outline", titleKey: "permNotifTitle", descKey: "permNotifDesc" },
  { icon: "location-outline", titleKey: "permLocationTitle", descKey: "permLocationDesc" },
  { icon: "fitness-outline", titleKey: "permMotionTitle", descKey: "permMotionDesc" },
  { icon: "analytics-outline", titleKey: "permUsageTitle", descKey: "permUsageDesc" },
];

export default function ParentPermissionsScreen() {
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
    <LinearGradient
      colors={["#D4843A", "#C4692E", "#A85528"]}
      style={st.container}
    >
      <View style={[st.inner, { paddingTop: topInset + 20, paddingBottom: bottomInset + 16 }]}>
        <View style={st.topSection}>
          <Image source={logoImage} style={st.logo} resizeMode="contain" />
          <Text style={st.title}>{(t as any).permMainTitle}</Text>
          <Text style={st.subtitle}>{(t as any).permMainSub}</Text>
        </View>

        <Animated.View style={[st.card, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          {PERM_ITEMS.map((item, idx) => (
            <View key={idx} style={[st.permRow, idx < PERM_ITEMS.length - 1 && st.permRowBorder]}>
              <View style={st.permIconWrap}>
                <Ionicons name={item.icon} size={24} color="#D4843A" />
              </View>
              <View style={st.permTextWrap}>
                <Text style={st.permTitle}>{(t as any)[item.titleKey]}</Text>
                <Text style={st.permDesc}>{(t as any)[item.descKey]}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <View style={st.bottomSection}>
          <Pressable
            style={({ pressed }) => [st.nextBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/parent-location-permit")}
          >
            <Text style={st.nextBtnText}>{t.next}</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24 },
  topSection: { alignItems: "center", marginTop: 40 },
  logo: { width: 100, height: 36, marginBottom: 18 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 34,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  permRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 18,
  },
  permRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  permIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(212,132,58,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    marginTop: 2,
  },
  permTextWrap: {
    flex: 1,
  },
  permTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#1a1a1a",
    marginBottom: 4,
  },
  permDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#777",
    lineHeight: 18,
  },
  bottomSection: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 50 : 40,
    left: 24,
    right: 24,
  },
  nextBtn: {
    width: "100%",
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#D4843A",
    letterSpacing: 1,
  },
});
