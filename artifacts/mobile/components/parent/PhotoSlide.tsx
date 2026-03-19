import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useLang } from "@/context/LanguageContext";
import { formatTimeI18n } from "@/logic/formatTime";
import type { FamilyMessage } from "@/lib/api";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export const PhotoSlide = React.memo(function PhotoSlide({ msg }: { msg: FamilyMessage }) {
  const { t } = useLang();
  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]}>
      <ExpoImage
        source={{ uri: msg.photoData! }}
        style={{ width: SCREEN_W, height: SCREEN_H }}
        contentFit="cover"
        contentPosition="top center"
        transition={0}
        cachePolicy="memory-disk"
      />
      <View style={st.photoMeta}>
        {!!msg.text && (
          <Text style={st.captionText} numberOfLines={3}>
            {msg.text}
          </Text>
        )}
        <View style={st.metaRow}>
          <Text style={st.fromName}>{msg.fromName}</Text>
          <Text style={st.captionTime}>{formatTimeI18n(msg.createdAt, t)}</Text>
        </View>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  photoMeta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  captionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    color: "#fff",
    lineHeight: 26,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fromName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  captionTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
  },
});
