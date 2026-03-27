import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
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

const splashVideoModule = require("@/assets/splash-video.mp4");
const splashPoster = require("@/assets/splash-poster.jpg");
const logoImage = require("@/assets/images/logo-anbu.png");

function NativeVideo() {
  const player = useVideoPlayer(splashVideoModule, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
}

function WebVideo() {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    const asset = Asset.fromModule(splashVideoModule);
    asset.downloadAsync().then(() => {
      setUri(asset.localUri || asset.uri);
    });
  }, []);

  if (!uri) return null;

  return (
    <video
      src={uri}
      autoPlay
      loop
      muted
      playsInline
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      } as any}
    />
  );
}

export default function SplashScreen() {
  const { isConnected, myRole, loading } = useFamilyContext();
  const { isGuestMode, enterGuestMode } = useGuestMode();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const [demoLoading, setDemoLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: false }).start();
  }, []);

  useEffect(() => {
    if (isGuestMode && !loading) {
      router.replace("/child");
      return;
    }
    if (!loading && isConnected && myRole) {
      router.replace(myRole === "parent" ? "/parent" : "/child");
    }
  }, [loading, isConnected, myRole, isGuestMode]);

  const handleDemoStart = () => {
    setDemoLoading(true);
    enterGuestMode();
  };

  const handleAppleLogin = () => {
    setAppleLoading(true);
    setTimeout(() => {
      setAppleLoading(false);
      Alert.alert("Apple 로그인", "현재 Apple 로그인은 준비 중입니다.\n체험 모드를 이용해주세요.");
    }, 800);
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setTimeout(() => {
      setGoogleLoading(false);
      Alert.alert("Google 로그인", "현재 Google 로그인은 준비 중입니다.\n체험 모드를 이용해주세요.");
    }, 800);
  };

  const handleNormalLogin = () => {
    router.push("/lang-select");
  };

  return (
    <View style={st.container}>
      <Image
        source={splashPoster}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        resizeMode="cover"
      />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeIn }]}>
        {Platform.OS === "web" ? <WebVideo /> : <NativeVideo />}
      </Animated.View>

      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]} />

      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={[
          st.scrollContent,
          { paddingTop: topInset + 40, paddingBottom: bottomInset + 24 },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[st.logoSection, { opacity: fadeIn }]}>
          <Image source={logoImage} style={st.logo} resizeMode="contain" />
          <Text style={st.tagline}>부모를 섬기는 시간.</Text>
          <Text style={st.taglineEn}>Time to care for your parents</Text>
        </Animated.View>

        <Animated.View style={[st.buttonsSection, { opacity: fadeIn }]}>
          <Pressable
            style={({ pressed }) => [st.demoBtn, pressed && st.demoBtnPressed]}
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
                  <Text style={st.demoBtnText}>체험모드로 바로 시작</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <View style={st.dividerRow}>
            <View style={st.dividerLine} />
            <Text style={st.dividerText}>또는 로그인</Text>
            <View style={st.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [st.loginBtn, st.appleBtn, pressed && st.loginBtnPressed]}
            onPress={handleAppleLogin}
            disabled={appleLoading}
          >
            {appleLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={22} color="#fff" style={{ marginRight: 10 }} />
                <Text style={[st.loginBtnText, { color: "#fff" }]}>Apple로 계속하기</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.loginBtn, st.googleBtn, pressed && st.loginBtnPressed]}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#333" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
                <Text style={[st.loginBtnText, { color: "#333" }]}>Google로 계속하기</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.loginBtn, st.normalBtn, pressed && st.loginBtnPressed]}
            onPress={handleNormalLogin}
          >
            <Ionicons name="person-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={[st.loginBtnText, { color: "#fff" }]}>일반 로그인</Text>
          </Pressable>
        </Animated.View>

        <View style={st.creditWrap}>
          <Text style={st.creditText}>© ANBU Co., Ltd.</Text>
          <Text style={st.creditText}>With Love, For Parents</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 162,
    height: 57,
    marginBottom: 10,
  },
  tagline: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
    color: "#FFFFFF",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  taglineEn: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  buttonsSection: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    gap: 12,
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
  demoBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
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
  loginBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  appleBtn: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  googleBtn: {
    backgroundColor: "#fff",
  },
  normalBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  loginBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  creditWrap: {
    alignItems: "center",
    marginTop: 20,
  },
  creditText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 16,
  },
});
