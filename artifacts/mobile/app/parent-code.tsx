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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/context/LanguageContext";

const logoImage = require("@/assets/images/logo-anbu.png");

export default function ParentCodeScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { t } = useLang();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
    setCode(cleaned);
    if (error) setError("");
  };

  const handleJoin = () => {
    if (code.length !== 6) {
      setError(t.errorCode || "코드를 확인해주세요");
      return;
    }
    router.push({ pathname: "/child-signup", params: { role: "parent", familyCode: code } });
  };

  const canJoin = code.length === 6;

  return (
    <LinearGradient
      colors={["#D4843A", "#C4692E", "#A85528"]}
      style={st.container}
    >
      <View style={[st.inner, { paddingTop: topInset + 20, paddingBottom: bottomInset + 24 }]}>
        <Pressable style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <View style={st.topSection}>
          <Image source={logoImage} style={st.logo} resizeMode="contain" />
          <Text style={st.title}>{t.parentCodeTitle}</Text>
          <Text style={st.subtitle}>{t.parentCodeSub}</Text>
        </View>

        <Animated.View style={[st.cardWrap, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={st.card}>
            <View style={st.iconWrap}>
              <Ionicons name="key-outline" size={36} color="#D4843A" />
            </View>

            <TextInput
              style={st.codeInput}
              value={code}
              onChangeText={handleCodeChange}
              placeholder={t.parentCodePlaceholder}
              placeholderTextColor="#bbb"
              maxLength={6}
              autoCapitalize="characters"
              textAlign="center"
            />

            {error ? <Text style={st.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                st.joinBtn,
                { opacity: canJoin ? (pressed ? 0.85 : 1) : 0.5 },
              ]}
              onPress={handleJoin}
              disabled={!canJoin}
            >
              <Ionicons name="link-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={st.joinBtnText}>{t.parentCodeJoinBtn}</Text>
            </Pressable>

            <Text style={st.hintText}>{t.parentCodeHint}</Text>
          </View>
        </Animated.View>

        <View style={st.creditWrap}>
          <Text style={st.creditText}>© ANBU Co., Ltd.</Text>
          <Text style={st.creditText}>With Love, For Parents</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28 },
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
  topSection: { alignItems: "center", marginTop: 80 },
  logo: { width: 120, height: 44, marginBottom: 20 },
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
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 20,
  },
  cardWrap: {
    marginTop: 30,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(212,132,58,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  codeInput: {
    width: "100%",
    height: 56,
    backgroundColor: "#F5F0EB",
    borderRadius: 14,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#1a1a1a",
    letterSpacing: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#E53E3E",
    marginBottom: 8,
  },
  joinBtn: {
    width: "100%",
    height: 52,
    backgroundColor: "#D4843A",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  joinBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 17,
  },
  creditWrap: {
    alignItems: "center",
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
  },
  creditText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 16,
  },
});
