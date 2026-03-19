import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import COLORS from "@/constants/colors";

interface EmptyStateProps {
  noPhotosLabel: string;
  noPhotosSubLabel: string;
  connectLabel: string;
  isConnected: boolean;
}

export function EmptyState({ noPhotosLabel, noPhotosSubLabel, connectLabel, isConnected }: EmptyStateProps) {
  return (
    <View style={st.emptyWrap}>
      <Ionicons name="images-outline" size={56} color="rgba(255,255,255,0.15)" />
      <Text style={st.emptyTitle}>{noPhotosLabel}</Text>
      <Text style={st.emptySub}>{noPhotosSubLabel}</Text>
      {!isConnected && (
        <Pressable style={st.connectBtn} onPress={() => router.push("/profile")}>
          <Text style={st.connectBtnText}>{connectLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    backgroundColor: "#000",
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#fff",
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 22,
  },
  connectBtn: {
    marginTop: 16,
    backgroundColor: COLORS.neon,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  connectBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: COLORS.neonText,
  },
});
