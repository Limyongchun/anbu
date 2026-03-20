import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLang } from "@/context/LanguageContext";
import { formatTimeI18n } from "@/logic/formatTime";
import type { Slide } from "@/logic/useSlideshow";

export const TextSlide = React.memo(function TextSlide({ slide }: { slide: Slide }) {
  const { t } = useLang();

  if (slide.kind === "demo") {
    return (
      <View style={[StyleSheet.absoluteFillObject, st.slideBg]}>
        <View style={st.textCenter}>
          <Text style={{ fontSize: 72, marginBottom: 28, textAlign: "center" }}>{slide.emoji}</Text>
          <Text style={st.bigQuote}>"</Text>
          <Text style={st.bigText}>{slide.text}</Text>
          <Text style={[st.bigQuote, { alignSelf: "flex-end", marginTop: 8 }]}>"</Text>
        </View>
      </View>
    );
  }

  const { msg } = slide;
  return (
    <View style={[StyleSheet.absoluteFillObject, st.slideBg]}>
      <View style={st.textCenter}>
        <Text style={st.bigQuote}>"</Text>
        <Text style={st.bigText}>{msg.text}</Text>
        <Text style={[st.bigQuote, { alignSelf: "flex-end", marginTop: 8 }]}>"</Text>
        <View style={[st.metaRow, { marginTop: 18 }]}>
          <Text style={st.fromName}>{msg.fromName}</Text>
          <Text style={st.captionTime}>{formatTimeI18n(msg.createdAt, t)}</Text>
        </View>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  slideBg: {
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  textCenter: {
    paddingHorizontal: 36,
    paddingVertical: 24,
    maxWidth: 360,
  },
  bigQuote: {
    fontFamily: "Inter_700Bold",
    fontSize: 56,
    color: "rgba(255,255,255,0.15)",
    lineHeight: 56,
  },
  bigText: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#fff",
    lineHeight: 34,
    marginTop: -10,
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
    color: "rgba(255,255,255,0.35)",
  },
});
