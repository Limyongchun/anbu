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
import { useFamilyContext } from "@/context/FamilyContext";

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
  const fadeIn = useRef(new Animated.Value(0)).current;
  const breathScale = useRef(new Animated.Value(1)).current;
  const breathOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: false }).start();

    const breathLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(breathScale, { toValue: 1.02, duration: 1800, useNativeDriver: false }),
          Animated.timing(breathScale, { toValue: 1, duration: 1800, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.timing(breathOpacity, { toValue: 0.92, duration: 1800, useNativeDriver: false }),
          Animated.timing(breathOpacity, { toValue: 1, duration: 1800, useNativeDriver: false }),
        ]),
      ])
    );
    breathLoop.start();
    return () => breathLoop.stop();
  }, []);

  useEffect(() => {
    if (!loading && isConnected && myRole) {
      router.replace(myRole === "parent" ? "/parent" : "/child");
    }
  }, [loading, isConnected, myRole]);

  const handleTap = () => {
    router.push("/lang-select");
  };

  return (
    <Pressable style={st.container} onPress={handleTap}>
      <Image
        source={splashPoster}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        resizeMode="cover"
      />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeIn }]}>
        {Platform.OS === "web" ? <WebVideo /> : <NativeVideo />}
      </Animated.View>

      <Animated.View style={[st.overlay, { opacity: breathOpacity, transform: [{ scale: breathScale }] }]}>
        <View style={st.textWrap}>
          <Image
            source={logoImage}
            style={st.logo}
            resizeMode="contain"
          />
          <Text style={st.tagline}>부모를 섬기는 시간.</Text>
          <Text style={st.taglineEn}>Time to care for your parents</Text>
        </View>
      </Animated.View>

      <View style={st.creditWrap}>
        <Text style={st.creditText}>© ANBU Co., Ltd.</Text>
        <Text style={st.creditText}>With Love, For Parents</Text>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 200,
  },
  textWrap: {
    alignItems: "center",
  },
  logo: {
    width: 162,
    height: 57,
    marginBottom: 6,
  },
  tagline: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
    color: "#FFFFFF",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  taglineEn: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: "#FFFFFF",
    letterSpacing: 1,
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: "hidden",
  },
  creditWrap: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  creditText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 16,
  },
});
