import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import COLORS from "@/constants/colors";
import type { Slide } from "@/logic/useSlideshow";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface BottomOverlayProps {
  bottomInset: number;
  bottomBarAnim: Animated.Value;
  uiVisible: boolean;
  activeSlide: Slide | null;
  curIdx: number;
  total: number;
  onHeart: (slide: Slide, x: number, y: number) => void;
}

export function BottomOverlay({
  bottomInset,
  bottomBarAnim,
  uiVisible,
  activeSlide,
  curIdx,
  total,
  onHeart,
}: BottomOverlayProps) {
  const currentHearts = activeSlide?.kind === "msg" ? activeSlide.msg.hearts : 0;

  return (
    <Animated.View
      style={[
        st.bottomOverlay,
        { paddingBottom: Math.max(bottomInset, 22), transform: [{ translateY: bottomBarAnim }] },
      ]}
      pointerEvents={uiVisible ? "box-none" : "none"}
    >
      <View style={st.bottomGradient} pointerEvents="none" />
      <View style={st.bottomRow}>
        <Pressable
          style={st.heartPill}
          onPress={() => activeSlide && onHeart(activeSlide, SCREEN_W / 2, SCREEN_H / 2)}
        >
          <Ionicons name="heart" size={19} color={COLORS.coral} />
          {currentHearts > 0 && <Text style={st.heartCount}>{currentHearts}</Text>}
        </Pressable>
        {total > 0 && (
          <Text style={st.slideCounter}>
            {curIdx + 1} / {total}
          </Text>
        )}
        <View style={st.iconGroup}>
          <Pressable style={st.iconBtn} onPress={() => router.push("/profile")}>
            <Ionicons name="person-circle-outline" size={23} color="rgba(255,255,255,0.88)" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heartPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heartCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: COLORS.coral,
  },
  slideCounter: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  iconGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    padding: 8,
  },
});
