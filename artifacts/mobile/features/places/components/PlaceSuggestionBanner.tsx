import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PlacePreset, PLACE_PRESET_LABELS } from "../types";
import { addPlace } from "../store";
import { dismissSuggestion, type PlaceSuggestion } from "../frequentDetector";

const QUICK_PRESETS: { preset: PlacePreset; icon: string }[] = [
  { preset: "home", icon: "🏠" },
  { preset: "hospital", icon: "🏥" },
  { preset: "seniorCenter", icon: "🏛️" },
  { preset: "other", icon: "📍" },
];

interface Props {
  suggestion: PlaceSuggestion;
  lang: "ko" | "en" | "ja";
  suggestText: string;
  dismissText: string;
  onSaved: () => void;
  onDismissed: () => void;
}

export default function PlaceSuggestionBanner({
  suggestion,
  lang,
  suggestText,
  dismissText,
  onSaved,
  onDismissed,
}: Props) {
  const [saving, setSaving] = useState(false);

  const handleSave = async (preset: PlacePreset) => {
    if (saving) return;
    setSaving(true);
    const name = PLACE_PRESET_LABELS[preset][lang];
    await addPlace({
      parentId: suggestion.parentId,
      name,
      preset,
      latitude: suggestion.lat,
      longitude: suggestion.lng,
      radius: 80,
    });
    onSaved();
  };

  const handleDismiss = async () => {
    await dismissSuggestion(suggestion.parentId, suggestion.lat, suggestion.lng);
    onDismissed();
  };

  return (
    <View style={s.banner}>
      <View style={s.header}>
        <Ionicons name="bulb-outline" size={18} color="#D4843A" />
        <Text style={s.title}>{suggestText}</Text>
      </View>

      <View style={s.btnsRow}>
        {QUICK_PRESETS.map(({ preset, icon }) => (
          <Pressable
            key={preset}
            style={({ pressed }) => [s.presetBtn, pressed && { opacity: 0.7 }]}
            onPress={() => handleSave(preset)}
            disabled={saving}
          >
            <Text style={s.presetIcon}>{icon}</Text>
            <Text style={s.presetLabel}>{PLACE_PRESET_LABELS[preset][lang]}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={s.dismissBtn} onPress={handleDismiss}>
        <Text style={s.dismissText}>{dismissText}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    backgroundColor: "#FFFBF5",
    borderRadius: 16,
    marginHorizontal: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(212,132,58,0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#5A3E2B",
    flex: 1,
  },
  btnsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  presetBtn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    backgroundColor: "#FFF5EC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212,132,58,0.15)",
  },
  presetIcon: {
    fontSize: 18,
  },
  presetLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#7A5454",
  },
  dismissBtn: {
    alignSelf: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dismissText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#999",
  },
});
