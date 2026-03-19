import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Animated } from "react-native";
import COLORS from "@/constants/colors";
import type { FloatHeart } from "@/logic/useHeartAnimation";

export const HeartParticle = React.memo(function HeartParticle({ h }: { h: FloatHeart }) {
  useEffect(() => {
    Animated.timing(h.anim, {
      toValue: 1,
      duration: 1600,
      delay: h.delay,
      useNativeDriver: true,
    }).start();
  }, []);

  const ty = h.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -260] });
  const op = h.anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0.9, 0] });
  const sc = h.anim.interpolate({ inputRange: [0, 0.15, 0.4, 1], outputRange: [0, 1.6, 1.2, 0.8] });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: h.x,
        top: h.y,
        transform: [{ translateY: ty }, { scale: sc }],
        opacity: op,
        zIndex: 999,
      }}
    >
      <Ionicons name="heart" size={36} color={COLORS.coral} />
    </Animated.View>
  );
});
