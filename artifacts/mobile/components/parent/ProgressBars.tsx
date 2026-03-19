import React from "react";
import { Animated, StyleSheet, View } from "react-native";
import type { Slide } from "@/logic/useSlideshow";

interface ProgressBarsProps {
  slides: Slide[];
  curIdx: number;
  progressWidth: Animated.AnimatedInterpolation<string | number>;
  topInset: number;
}

export function ProgressBars({ slides, curIdx, progressWidth, topInset }: ProgressBarsProps) {
  if (slides.length <= 1) return null;
  return (
    <View style={[st.storyBars, { top: topInset + 10 }]} pointerEvents="none">
      {slides.map((_, i) => (
        <View key={i} style={st.storyBar}>
          <Animated.View
            style={[
              st.storyBarFill,
              { width: i < curIdx ? "100%" : i === curIdx ? progressWidth : "0%" },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  storyBars: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 4,
    zIndex: 30,
  },
  storyBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  storyBarFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
});
