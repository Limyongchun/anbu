import { Asset } from "expo-asset";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
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
  const { isGuestMode } = useGuestMode();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: false }).start();
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

  const handleStart = () => {
    router.push("/login");
  };

  return (
    <View style={st.container}>
      <Image
        source={splashPoster}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        resizeMode="cover"
      />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeIn, pointerEvents: "none" }]}>
        {Platform.OS === "web" ? <WebVideo /> : <NativeVideo />}
      </Animated.View>

      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)", pointerEvents: "none" }]} />

      <View style={[st.content, { paddingTop: topInset + 60, paddingBottom: bottomInset + 30 }]}>
        <Animated.View style={[st.logoSection, { opacity: fadeIn }]}>
          <Image source={logoImage} style={st.logo} resizeMode="contain" />
          <Text style={st.tagline}>부모를 섬기는 시간.</Text>
          <Text style={st.taglineEn}>Time to care for your parents</Text>
        </Animated.View>

        <Animated.View style={[st.bottomSection, { opacity: fadeIn }]}>
          <Pressable
            style={({ pressed }) => [st.startBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
            onPress={handleStart}
          >
            <Text style={st.startBtnText}>시작하기</Text>
          </Pressable>

          <View style={st.creditWrap}>
            <Text style={st.creditText}>© ANBU Co., Ltd.</Text>
            <Text style={st.creditText}>With Love, For Parents</Text>
          </View>
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
  logoSection: {
    alignItems: "center",
    marginTop: 40,
  },
  logo: {
    width: 180,
    height: 64,
    marginBottom: 14,
  },
  tagline: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
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
    marginTop: 6,
  },
  bottomSection: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  startBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  startBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: 1,
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
