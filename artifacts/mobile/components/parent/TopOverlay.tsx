import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import COLORS from "@/constants/colors";

interface TopOverlayProps {
  topInset: number;
  topBarAnim: Animated.Value;
  uiVisible: boolean;
  isSharing: boolean;
  address: string;
  locUploading: boolean;
  locSharingLabel: string;
  locStoppedLabel: string;
  permissionGranted: boolean;
  onToggleShare: () => void;
  onRequestPermission: () => void;
}

export function TopOverlay({
  topInset,
  topBarAnim,
  uiVisible,
  isSharing,
  address,
  locUploading,
  locSharingLabel,
  locStoppedLabel,
  permissionGranted,
  onToggleShare,
  onRequestPermission,
}: TopOverlayProps) {
  return (
    <Animated.View
      style={[st.topOverlay, { paddingTop: topInset + 14, transform: [{ translateY: topBarAnim }] }]}
      pointerEvents={uiVisible ? "box-none" : "none"}
    >
      <View style={st.topGradient} pointerEvents="none" />
      <View style={st.topRow}>
        <Text style={st.logo}>A N B U</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={permissionGranted ? onToggleShare : onRequestPermission}
          style={[st.gpsChip, !isSharing && st.gpsChipOff]}
        >
          {locUploading ? (
            <ActivityIndicator size="small" color={COLORS.neon} style={{ width: 10, height: 10 }} />
          ) : (
            <View style={[st.gpsDot, !isSharing && { backgroundColor: "rgba(255,255,255,0.3)" }]} />
          )}
          <Text
            style={[st.gpsText, !isSharing && { color: "rgba(255,255,255,0.35)" }]}
            numberOfLines={1}
          >
            {isSharing ? address || locSharingLabel : locStoppedLabel}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
  },
  topGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#fff",
    letterSpacing: 4,
    marginRight: 14,
  },
  gpsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(212,242,0,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 200,
  },
  gpsChipOff: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  gpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.neon,
  },
  gpsText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: COLORS.neon,
  },
});
