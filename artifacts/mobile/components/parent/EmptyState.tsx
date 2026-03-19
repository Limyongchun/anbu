import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface EmptyStateProps {
  noPhotosLabel: string;
  noPhotosSubLabel: string;
  connectLabel: string;
  settingsLabel?: string;
}

export function EmptyState({ noPhotosLabel, noPhotosSubLabel, connectLabel, settingsLabel }: EmptyStateProps) {
  return (
    <View style={st.emptyWrap}>
      <Ionicons name="images-outline" size={56} color="rgba(255,255,255,0.15)" />
      <Text style={st.emptyTitle}>{noPhotosLabel}</Text>
      <Text style={st.emptySub}>{noPhotosSubLabel}</Text>
      <Pressable style={st.settingsBtn} onPress={() => router.push("/profile")}>
        <Ionicons name="settings-outline" size={18} color="rgba(255,255,255,0.88)" />
        <Text style={st.settingsBtnText}>{settingsLabel || connectLabel}</Text>
      </Pressable>
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
  settingsBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  settingsBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "rgba(255,255,255,0.88)",
  },
});
