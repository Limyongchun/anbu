import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { PlacePreset, PLACE_PRESET_LABELS } from "../types";

const QUICK_PRESETS: PlacePreset[] = [
  "home",
  "school",
  "hospital",
  "seniorCenter",
  "friendHouse",
  "other",
];

const ICONS: Record<string, string> = {
  home: "🏠",
  school: "🏫",
  hospital: "🏥",
  seniorCenter: "🏛️",
  friendHouse: "🏡",
  other: "📍",
};

interface Props {
  lang: "ko" | "en" | "ja";
  selected: PlacePreset | null;
  onSelect: (preset: PlacePreset) => void;
}

export default function PlaceQuickButtons({ lang, selected, onSelect }: Props) {
  return (
    <View style={s.wrap}>
      {QUICK_PRESETS.map((p) => {
        const active = selected === p;
        return (
          <Pressable
            key={p}
            style={[s.btn, active && s.btnActive]}
            onPress={() => onSelect(p)}
          >
            <Text style={s.icon}>{ICONS[p]}</Text>
            <Text style={[s.label, active && s.labelActive]}>
              {PLACE_PRESET_LABELS[p][lang]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5EDED",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  btnActive: {
    backgroundColor: "rgba(122,84,84,0.12)",
    borderColor: "#7A5454",
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#6B5050",
  },
  labelActive: {
    color: "#7A5454",
    fontFamily: "Inter_600SemiBold",
  },
});
