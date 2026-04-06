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
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // 로고 페이드인 (정적이고 고급스럽게)
    Animated.timing(fadeIn, { toValue: 1, duration: 1500, useNativeDriver: false }).start();
    
    // 은은한 깜빡임 (과하지 않은 주기)
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.8, duration: 1500, useNativeDriver: false }),
        Animated.timing(blinkAnim, { toValue: 0.4, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const handleStart = () => {
    router.push("/lang-select");
  };

  return (
    <Pressable style={st.container} onPress={handleStart}>
      {/* 백그라운드 영상 대비용 포스터 */}
      <Image
        source={splashPoster}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        resizeMode="cover"
      />

      {/* 비디오 레이어 */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeIn, pointerEvents: "none" }]}>
        {Platform.OS === "web" ? <WebVideo /> : <NativeVideo />}
      </Animated.View>

      {/* 시각적 깊이를 위한 다크 오버레이 */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", pointerEvents: "none" }]} />

      <View style={[st.content, { paddingTop: topInset + 80, paddingBottom: bottomInset + 80 }]}>
        <Animated.View style={[st.logoSection, { opacity: fadeIn }]}>
          <Image source={logoImage} style={st.logo} resizeMode="contain" />
          <View style={st.taglineArea}>
            <Text style={st.tagline}>부모를 섬기는 시간.</Text>
            <View style={st.line} />
            <Text style={st.taglineEn}>Time to care for your parents</Text>
          </View>
        </Animated.View>

        <Animated.View style={[st.bottomSection, { opacity: blinkAnim }]}>
          <Text style={st.touchHint}>화면을 터치하세요</Text>
          <Text style={st.touchHintEn}>Touch to start</Text>
        </Animated.View>
      </View>
    </Pressable>
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
  taglineArea: {
    alignItems: "center",
    marginTop: 10,
  },
  tagline: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 26,
    color: "#FFFFFF",
    letterSpacing: 2,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  line: {
    width: 30,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginVertical: 12,
  },
  taglineEn: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
  },
  bottomSection: {
    alignItems: "center",
  },
  touchHint: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  touchHintEn: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 6,
    letterSpacing: 0.5,
  },
});
