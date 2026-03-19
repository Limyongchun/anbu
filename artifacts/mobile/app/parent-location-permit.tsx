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
  ScrollView,
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

  const [fgStatus, setFgStatus] = useState<PermStatus>("pending");
  const [bgStatus, setBgStatus] = useState<PermStatus>("pending");

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start();
    checkCurrentStatus();
  }, []);

  const logStatus = (label: string, fg: PermStatus, bg: PermStatus) => {
    console.log(`[LocationPerm] ${label} — FG: ${fg}, BG: ${bg}`);
  };

  const checkCurrentStatus = async () => {
    if (Platform.OS === "web") return;
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      const fgVal: PermStatus = fg.granted ? "granted" : "pending";
      setFgStatus(fgVal);

      let bgVal: PermStatus = "pending";
      if (fg.granted) {
        try {
          const bg = await Location.getBackgroundPermissionsAsync();
          bgVal = bg.granted ? "granted" : "pending";
        } catch {}
      }
      setBgStatus(bgVal);
      logStatus("checkCurrentStatus", fgVal, bgVal);
    } catch {}
  };

  const handleRequestForeground = async () => {
    logStatus("handleRequestForeground:before", fgStatus, bgStatus);
    if (Platform.OS === "web") {
      setFgStatus("granted");
      logStatus("handleRequestForeground:web", "granted", bgStatus);
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setFgStatus("granted");
        logStatus("handleRequestForeground:granted", "granted", bgStatus);
      } else {
        setFgStatus("denied");
        logStatus("handleRequestForeground:denied", "denied", bgStatus);
        Alert.alert(
          (t as any).locPermDeniedTitle,
          (t as any).locPermDeniedMsg,
          [
            { text: t.cancel, style: "cancel" },
            { text: (t as any).locPermOpenSettings, onPress: () => openSettings() },
          ]
        );
      }
    } catch {
      setFgStatus("denied");
    }
  };

  const handleRequestBackground = async () => {
    logStatus("handleRequestBackground:before", fgStatus, bgStatus);
    if (Platform.OS === "web") {
      setBgStatus("granted");
      logStatus("handleRequestBackground:web", fgStatus, "granted");
      return;
    }
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      const val: PermStatus = status === "granted" ? "granted" : "denied";
      setBgStatus(val);
      logStatus("handleRequestBackground:after", fgStatus, val);
    } catch {
      setBgStatus("denied");
      logStatus("handleRequestBackground:error", fgStatus, "denied");
    }
  };

  const openSettings = () => {
    logStatus("openSettings", fgStatus, bgStatus);
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  const handleNext = () => {
    logStatus("handleNext", fgStatus, bgStatus);
    router.push("/parent-code");
  };

  const allGranted = fgStatus === "granted" && bgStatus === "granted";
  const fgOnly = fgStatus === "granted" && bgStatus !== "granted";
  const noneGranted = fgStatus !== "granted";

  const statusIcon = (s: PermStatus) =>
    s === "granted" ? "checkmark-circle" : s === "denied" ? "close-circle" : "ellipse-outline";
  const statusColor = (s: PermStatus) =>
    s === "granted" ? "#4ADE80" : s === "denied" ? "#F87171" : "rgba(255,255,255,0.5)";

  return (
    <LinearGradient
      colors={["#D4843A", "#C4692E", "#A85528"]}
      style={st.container}
    >
      <Pressable style={[st.backBtn, { top: topInset + 6 }]} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[st.scrollContent, { paddingTop: topInset + 20, paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
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
            <Ionicons name={statusIcon(fgStatus)} size={24} color={statusColor(fgStatus)} />
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
            <Ionicons name={statusIcon(bgStatus)} size={24} color={statusColor(bgStatus)} />
          </View>
        </Animated.View>

        <View style={st.hintWrap}>
          <Ionicons name="shield-checkmark-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={st.hintText}>{(t as any).locPermHint}</Text>
        </View>
      </ScrollView>

      <View style={[st.bottomSection, { paddingBottom: bottomInset + 16 }]}>
        {noneGranted && (
          <Pressable
            style={({ pressed }) => [st.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleRequestForeground}
          >
            <Ionicons name="location" size={20} color="#D4843A" style={{ marginRight: 8 }} />
            <Text style={st.primaryBtnText}>{(t as any).locPermAllowBtn}</Text>
          </Pressable>
        )}

        {fgOnly && (
          <>
            <Pressable
              style={({ pressed }) => [st.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleRequestBackground}
            >
              <Ionicons name="location" size={20} color="#D4843A" style={{ marginRight: 8 }} />
              <Text style={st.primaryBtnText}>{(t as any).locPermAlwaysAllow}</Text>
            </Pressable>
            <Pressable style={st.settingsLink} onPress={openSettings}>
              <Text style={st.settingsLinkText}>{(t as any).locPermOpenSettings}</Text>
            </Pressable>
          </>
        )}

        {allGranted && (
          <Pressable
            style={({ pressed }) => [st.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleNext}
          >
            <Text style={st.primaryBtnText}>{t.next}</Text>
            <Ionicons name="arrow-forward" size={20} color="#D4843A" style={{ marginLeft: 8 }} />
          </Pressable>
        )}
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
  scrollContent: {
    paddingHorizontal: 24,
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  primaryBtn: {
    width: "100%",
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#D4843A",
  },
  settingsLink: {
    marginTop: 14,
    alignItems: "center",
  },
  settingsLinkText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
    textDecorationLine: "underline",
  },
});
