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
  View,
} from "react-native";
import { useFamilyContext } from "@/context/FamilyContext";

const splashVideoModule = require("@/assets/splash-video.mp4");
const splashPoster = require("@/assets/splash-poster.jpg");

export default function SplashScreen() {
  const { isConnected, myRole, loading } = useFamilyContext();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [webVideoUri, setWebVideoUri] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

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
              onCanPlay={() => setVideoReady(true)}
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
    </Pressable>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
});
