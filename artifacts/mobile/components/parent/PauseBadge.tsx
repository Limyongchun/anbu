import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface PauseBadgeProps {
  label: string;
}

export function PauseBadge({ label }: PauseBadgeProps) {
  return (
    <View style={st.pauseOverlay} pointerEvents="none">
      <View style={st.pauseBadge}>
        <Ionicons name="pause" size={12} color="rgba(255,255,255,0.9)" />
        <Text style={st.pauseText}>{label}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  pauseOverlay: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  pauseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pauseText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
});
