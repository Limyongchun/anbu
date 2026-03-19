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

export default function SplashScreen() {
  const { isConnected, myRole, loading } = useFamilyContext();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const breathScale = useRef(new Animated.Value(1)).current;
  const breathOpacity = useRef(new Animated.Value(1)).current;
  const [webVideoUri, setWebVideoUri] = useState<string | null>(null);

  const player = Platform.OS !== "web"
    ? useVideoPlayer(splashVideoModule, (p) => {
        p.loop = true;
        p.muted = true;
        p.play();
      })
    : null;

  useEffect(() => {
    if (Platform.OS === "web") {
      const asset = Asset.fromModule(splashVideoModule);
      asset.downloadAsync().then(() => {
        setWebVideoUri(asset.localUri || asset.uri);
      });
    }
  }, []);

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
    router.push("/child-signup");
  };

  return (
    <Pressable style={st.container} onPress={handleTap}>
      <Image
        source={splashPoster}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        resizeMode="cover"
      />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeIn }]}>
        {Platform.OS === "web" ? (
          webVideoUri ? (
            <video
              src={webVideoUri}
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
          ) : null
        ) : player ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
        ) : null}
      </Animated.View>

      <Animated.View style={[st.overlay, { opacity: breathOpacity, transform: [{ scale: breathScale }] }]}>
        <Image
          source={logoImage}
          style={st.logo}
          resizeMode="contain"
        />
        <Text style={st.tagline}>부모를 섬기는 시간.</Text>
      </Animated.View>
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
});
