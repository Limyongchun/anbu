import React from "react";
import { StyleSheet, Text, View } from "react-native";
import COLORS from "@/constants/colors";
import { useLang } from "@/context/LanguageContext";
import { formatTimeI18n } from "@/logic/formatTime";
import type { Slide } from "@/logic/useSlideshow";

export const TextSlide = React.memo(function TextSlide({ slide }: { slide: Slide }) {
  const { t } = useLang();

  if (slide.kind === "demo") {
    return (
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: slide.bg }]}>
        <View style={st.decoCircle1} />
        <View style={st.decoCircle2} />
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
    <View style={[StyleSheet.absoluteFillObject, st.textSlideBg]}>
      <View style={st.decoCircle1} />
      <View style={st.decoCircle2} />
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
  textSlideBg: {
    backgroundColor: COLORS.navPill,
    alignItems: "center",
    justifyContent: "center",
  },
  decoCircle1: {
    position: "absolute",
    right: -60,
    top: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 30,
    borderColor: "rgba(212,242,0,0.07)",
  },
  decoCircle2: {
    position: "absolute",
    left: -80,
    bottom: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 30,
    borderColor: "rgba(212,242,0,0.05)",
  },
  textCenter: {
    paddingHorizontal: 36,
    paddingVertical: 24,
    maxWidth: 360,
  },
  bigQuote: {
    fontFamily: "Inter_700Bold",
    fontSize: 56,
    color: COLORS.neon,
    lineHeight: 56,
  },
  bigText: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: COLORS.white,
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
