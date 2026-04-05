import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFamilyContext } from "@/context/FamilyContext";
import { useGuestMode } from "@/context/GuestModeContext";

export default function LoginScreen() {
  const { isConnected, myRole, loading } = useFamilyContext();
  const { isGuestMode, enterGuestMode } = useGuestMode();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const [demoLoading, setDemoLoading] = useState(false);
  const [loginNotice, setLoginNotice] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: false }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isGuestMode && !loading) {
      router.replace("/child");
    }
  }, [isGuestMode, loading]);

  const handleDemoStart = () => {
    if (demoLoading) return;
    setDemoLoading(true);
    enterGuestMode();
  };

  const handleDisabledLogin = () => {
    setLoginNotice(true);
    setTimeout(() => setLoginNotice(false), 3500);
  };

  return (
    <LinearGradient
      colors={["#D4843A", "#C4692E", "#A85528"]}
      style={st.container}
    >
      <Pressable style={[st.backBtn, { top: topInset + 6 }]} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.7)" />
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          st.scrollContent,
          { paddingTop: topInset + 50, paddingBottom: bottomInset + 24 },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[st.heroSection, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={st.logoText}>ANBU</Text>
          <Text style={st.heroLine}>혼자계신</Text>
          <Text style={st.heroLine}>할머니를 위해</Text>
          <Text style={st.heroLine}>손자가 만든</Text>
          <Text style={st.heroLine}>서비스</Text>
        </Animated.View>

        <Animated.View style={[st.buttonsSection, { opacity: fadeIn }]}>
          <Pressable
            style={({ pressed }) => [st.demoBtn, pressed && st.btnPressed]}
            onPress={handleDemoStart}
            disabled={demoLoading}
          >
            <LinearGradient
              colors={["#FFD700", "#FFC107"]}
              style={st.demoBtnGradient}
            >
              {demoLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={24} color="#000" style={{ marginRight: 8 }} />
                  <Text style={st.demoBtnText}>체험모드로 시작하기</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
          <Text style={st.demoGuide}>로그인 없이 앱의 모든 기능을 체험할 수 있습니다</Text>

          <View style={st.dividerRow}>
            <View style={st.dividerLine} />
            <Text style={st.dividerText}>또는</Text>
            <View style={st.dividerLine} />
          </View>

          {(Platform.OS === "ios" || Platform.OS === "web") && (
            <Pressable
              style={({ pressed }) => [st.loginBtn, st.disabledBtn, pressed && st.btnPressed]}
              onPress={handleDisabledLogin}
            >
              <Ionicons name="logo-apple" size={20} color="#999" style={{ marginRight: 10 }} />
              <Text style={st.disabledBtnText}>애플 계정으로 계속</Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [st.loginBtn, st.disabledBtn, pressed && st.btnPressed]}
            onPress={handleDisabledLogin}
          >
            <Text style={{ fontSize: 18, marginRight: 10, fontWeight: "700", color: "#999" }}>G</Text>
            <Text style={st.disabledBtnText}>구글 계정으로 계속</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.loginBtn, st.disabledBtn, pressed && st.btnPressed]}
            onPress={handleDisabledLogin}
          >
            <Ionicons name="call-outline" size={18} color="#999" style={{ marginRight: 10 }} />
            <Text style={st.disabledBtnText}>휴대폰 인증으로 계속</Text>
          </Pressable>

          {loginNotice && (
            <Animated.View style={st.noticeBox}>
              <Ionicons name="information-circle" size={18} color="#D4843A" style={{ marginRight: 8 }} />
              <Text style={st.noticeText}>
                현재 로그인 기능은 준비 중입니다.{"\n"}
                체험모드를 이용해주세요.
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    justifyContent: "space-between",
  },
  heroSection: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 20,
  },
  logoText: {
    fontFamily: "Inter_700Bold",
    fontSize: 42,
    color: "#FFD700",
    letterSpacing: 4,
    marginBottom: 28,
  },
  heroLine: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: "#FFFFFF",
    lineHeight: 50,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttonsSection: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    gap: 10,
    paddingBottom: 10,
  },
  demoBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  demoBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  demoBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#000",
    letterSpacing: 0.5,
  },
  demoGuide: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: -2,
    marginBottom: 4,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginHorizontal: 12,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  disabledBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  disabledBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
  },
  noticeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    flex: 1,
  },
});
