import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/context/LanguageContext";

const logoImage = require("@/assets/images/logo-anbu.png");

type PermStatus = "pending" | "granted" | "denied";

export default function ParentLocationPermitScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { t } = useLang();

  const [foregroundStatus, setForegroundStatus] = useState<PermStatus>("pending");
  const [backgroundStatus, setBackgroundStatus] = useState<PermStatus>("pending");

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start();
    checkCurrentStatus();
  }, []);

  const checkCurrentStatus = async () => {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      setForegroundStatus(fg.granted ? "granted" : "pending");
      if (fg.granted) {
        const bg = await Location.getBackgroundPermissionsAsync();
        setBackgroundStatus(bg.granted ? "granted" : "pending");
      }
    } catch {}
  };

  const requestForeground = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setForegroundStatus("granted");
        requestBackground();
      } else {
        setForegroundStatus("denied");
        Alert.alert(
          (t as any).locPermDeniedTitle,
          (t as any).locPermDeniedMsg,
          [
            { text: t.cancel, style: "cancel" },
            { text: (t as any).locPermOpenSettings, onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch {
      setForegroundStatus("denied");
    }
  };

  const requestBackground = async () => {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === "granted") {
        setBackgroundStatus("granted");
      } else {
        setBackgroundStatus("denied");
      }
    } catch {
      setBackgroundStatus("denied");
    }
  };

  const handleAllow = async () => {
    if (Platform.OS === "web") {
      setForegroundStatus("granted");
      setBackgroundStatus("granted");
      return;
    }
    if (foregroundStatus !== "granted") {
      await requestForeground();
    } else if (backgroundStatus !== "granted") {
      await requestBackground();
    }
  };

  const handleNext = () => {
    router.push("/parent-code");
  };

  const allGranted = foregroundStatus === "granted" && backgroundStatus === "granted";
  const statusIcon = (s: PermStatus) =>
    s === "granted" ? "checkmark-circle" : s === "denied" ? "close-circle" : "ellipse-outline";
  const statusColor = (s: PermStatus) =>
    s === "granted" ? "#4ADE80" : s === "denied" ? "#F87171" : "rgba(255,255,255,0.5)";

  return (
    <LinearGradient
      colors={["#D4843A", "#C4692E", "#A85528"]}
      style={st.container}
    >
      <View style={[st.inner, { paddingTop: topInset + 20, paddingBottom: bottomInset + 16 }]}>
        <Pressable style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <View style={st.topSection}>
          <Image source={logoImage} style={st.logo} resizeMode="contain" />
          <Text style={st.title}>{(t as any).locPermTitle}</Text>
          <Text style={st.subtitle}>{(t as any).locPermSub}</Text>
        </View>

        <Animated.View style={[st.card, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={st.permRow}>
            <View style={st.permIconWrap}>
              <Ionicons name="navigate-outline" size={24} color="#D4843A" />
            </View>
            <View style={st.permTextWrap}>
              <Text style={st.permTitle}>{(t as any).locPermForeground}</Text>
              <Text style={st.permDesc}>{(t as any).locPermForegroundDesc}</Text>
            </View>
            <Ionicons name={statusIcon(foregroundStatus)} size={24} color={statusColor(foregroundStatus)} />
          </View>

          <View style={st.divider} />

          <View style={st.permRow}>
            <View style={st.permIconWrap}>
              <Ionicons name="location-outline" size={24} color="#D4843A" />
            </View>
            <View style={st.permTextWrap}>
              <Text style={st.permTitle}>{(t as any).locPermBackground}</Text>
              <Text style={st.permDesc}>{(t as any).locPermBackgroundDesc}</Text>
            </View>
            <Ionicons name={statusIcon(backgroundStatus)} size={24} color={statusColor(backgroundStatus)} />
          </View>
        </Animated.View>

        <View style={st.hintWrap}>
          <Ionicons name="shield-checkmark-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={st.hintText}>{(t as any).locPermHint}</Text>
        </View>

        <View style={st.bottomSection}>
          {!allGranted ? (
            <Pressable
              style={({ pressed }) => [st.allowBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleAllow}
            >
              <Ionicons name="location" size={20} color="#D4843A" style={{ marginRight: 8 }} />
              <Text style={st.allowBtnText}>{(t as any).locPermAllowBtn}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [st.nextBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleNext}
            >
              <Text style={st.nextBtnText}>{t.next}</Text>
              <Ionicons name="arrow-forward" size={20} color="#D4843A" style={{ marginLeft: 8 }} />
            </Pressable>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24 },
  backBtn: {
    position: "absolute",
    top: Platform.OS === "web" ? 56 : 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topSection: { alignItems: "center", marginTop: 40 },
  logo: { width: 100, height: 36, marginBottom: 18 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
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
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginTop: 28,
  },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  permIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(212,132,58,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  permTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  permTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#1a1a1a",
    marginBottom: 3,
  },
  permDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#888",
    lineHeight: 16,
  },
  hintWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 6,
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  bottomSection: {
    marginTop: "auto",
    paddingBottom: 10,
  },
  allowBtn: {
    width: "100%",
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  allowBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#D4843A",
  },
  nextBtn: {
    width: "100%",
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
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
