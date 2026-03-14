import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";

const { width } = Dimensions.get("window");

function PulsingHeart() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.08, duration: 1200, useNativeDriver: false }),
          Animated.timing(opacity, { toValue: 1, duration: 1200, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(opacity, { toValue: 0.8, duration: 1200, useNativeDriver: false }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Ionicons name="heart" size={72} color={COLORS.coral} />
    </Animated.View>
  );
}

function FloatingOrb({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, { toValue: -20, duration: 3000, useNativeDriver: false }),
          Animated.timing(opacity, { toValue: 0.25, duration: 3000, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 3000, useNativeDriver: false }),
          Animated.timing(opacity, { toValue: 0.15, duration: 3000, useNativeDriver: false }),
        ]),
      ])
    );
    float.start();
    return () => float.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
}

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const { isConnected, myRole, loading } = useFamilyContext();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 800, useNativeDriver: false }),
    ]).start();
  }, []);

  // Auto-redirect if already connected
  useEffect(() => {
    if (!loading && isConnected && myRole) {
      router.replace(myRole === "parent" ? "/parent" : "/child");
    }
  }, [loading, isConnected, myRole]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset + 24 }]}>
      <FloatingOrb x={-40} y={80} size={200} color={COLORS.coral} delay={0} />
      <FloatingOrb x={width - 100} y={200} size={160} color={COLORS.navyLight} delay={500} />
      <FloatingOrb x={width * 0.3} y={-60} size={140} color={COLORS.gold} delay={1000} />
      <FloatingOrb x={-20} y={width * 1.2} size={180} color={COLORS.navyLight} delay={300} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}
      >
        <View style={styles.iconContainer}>
          <PulsingHeart />
          <View style={styles.secondHeart}>
            <Ionicons name="heart" size={38} color={COLORS.gold} />
          </View>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>DUGO</Text>
          <Text style={styles.subtitle}>부모님과 자녀를 잇는 따뜻한 연결</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.buttons}>
          {/* Primary: Set up family connection */}
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnPrimary, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            onPress={() => router.push("/setup")}
          >
            <View style={styles.btnContent}>
              <View style={styles.btnIconWrap}>
                <Ionicons name="link" size={22} color={COLORS.white} />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.btnLabel}>가족 연결하기</Text>
                <Text style={styles.btnDesc}>가족방 만들기 또는 코드로 참가</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
            </View>
          </Pressable>

          {/* Secondary options */}
          <View style={styles.demoRow}>
            <Text style={styles.demoLabel}>미리보기</Text>
            <View style={styles.demoBtns}>
              <Pressable
                style={({ pressed }) => [styles.demoBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => router.push("/child")}
              >
                <Ionicons name="people" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.demoBtnText}>자녀 화면</Text>
              </Pressable>
              <View style={styles.demoDivider} />
              <Pressable
                style={({ pressed }) => [styles.demoBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => router.push("/parent")}
              >
                <Ionicons name="home" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.demoBtnText}>부모님 화면</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>가족과의 소중한 순간을 연결합니다</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.splash.bg1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  content: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    paddingHorizontal: 28,
    zIndex: 1,
  },
  iconContainer: {
    position: "relative",
    marginBottom: 28,
    alignItems: "center",
    justifyContent: "center",
    width: 100,
    height: 100,
  },
  secondHeart: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 38,
    color: COLORS.parent.text,
    letterSpacing: 4,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.parent.textSub,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 36,
  },
  buttons: {
    width: "100%",
    gap: 14,
    marginBottom: 36,
  },
  btn: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
  },
  btnPrimary: {
    backgroundColor: COLORS.coral,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  btnIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnTextWrap: {
    flex: 1,
  },
  btnLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: COLORS.white,
    marginBottom: 2,
  },
  btnDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  demoRow: {
    width: "100%",
    alignItems: "center",
    gap: 10,
  },
  demoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1,
  },
  demoBtns: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    width: "100%",
  },
  demoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  demoBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  demoDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  footer: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.parent.textMuted,
    letterSpacing: 0.5,
  },
});
