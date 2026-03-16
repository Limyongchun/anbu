import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";
import { useLang } from "@/context/LanguageContext";
import { Lang } from "@/lib/i18n";

const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
];

const LANG_EMOJI: Record<Lang, string> = { ko: "\uD83C\uDDF0\uD83C\uDDF7", en: "\uD83C\uDDFA\uD83C\uDDF8", ja: "\uD83C\uDDEF\uD83C\uDDF5" };

function LangDropdown({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const current = LANG_OPTIONS.find((o) => o.id === lang)!;
  const others = LANG_OPTIONS.filter((o) => o.id !== lang);

  return (
    <View style={st.langSection}>
      <Pressable
        style={({ pressed }) => [st.langBtn, { opacity: pressed ? 0.8 : 1 }]}
        onPress={() => setOpen(!open)}
      >
        <Text style={{ fontSize: 16 }}>{LANG_EMOJI[lang]}</Text>
        <Text style={st.langBtnText}>{current.label}</Text>
        <Text style={st.langArrow}>{open ? "\u25B2" : "\u25BC"}</Text>
      </Pressable>
      {open && others.map((opt) => (
        <Pressable
          key={opt.id}
          style={({ pressed }) => [st.langBtn, st.langBtnOther, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => { setLang(opt.id); setOpen(false); }}
        >
          <Text style={{ fontSize: 16 }}>{LANG_EMOJI[opt.id]}</Text>
          <Text style={st.langBtnOtherText}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const { isConnected, myRole, loading } = useFamilyContext();
  const { lang, setLang, t } = useLang();
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 750, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 750, useNativeDriver: false }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!loading && isConnected && myRole) {
      router.replace(myRole === "parent" ? "/parent" : "/child");
    }
  }, [loading, isConnected, myRole]);

  const topInset    = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[st.container, { paddingTop: topInset, paddingBottom: bottomInset + 24 }]}>
      <Animated.View style={[st.content, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

        {/* ── 로고 ── */}
        <Text style={st.logo}>A N B U</Text>
        <Text style={st.sub}>{t.appSub}</Text>

        <View style={st.divider} />

        {/* ── 미리보기 ── */}
        <Text style={st.previewLabel}>{t.preview}</Text>
        <View style={st.previewRow}>
          <Pressable style={({ pressed }) => [st.previewBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={() => router.push("/child-signup")}>
            <Text style={st.previewText}>{t.childScreen}</Text>
          </Pressable>
          <View style={st.previewDivider} />
          <Pressable style={({ pressed }) => [st.previewBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={() => router.push("/parent")}>
            <Text style={st.previewText}>{t.parentScreen}</Text>
          </Pressable>
        </View>

        <Text style={st.footer}>{t.footer}</Text>

        {/* ── 언어 선택 (드롭다운) ── */}
        <LangDropdown lang={lang} setLang={setLang} />

      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.mapBg, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  content:      { width: "100%", maxWidth: 380, alignItems: "center", paddingHorizontal: 28, zIndex: 1 },
  logo:         { fontFamily: "Inter_700Bold", fontSize: 44, color: COLORS.white, letterSpacing: 5, marginBottom: 10 },
  sub:          { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.45)", letterSpacing: 1, textAlign: "center", marginBottom: 36 },
  divider:      { width: 36, height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 36 },
  previewLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 10 },
  previewRow:   { width: "100%", flexDirection: "row", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", marginBottom: 28 },
  previewBtn:   { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 42 },
  previewText:  { fontFamily: "Inter_700Bold", fontSize: 25, color: "rgba(255,255,255,0.7)" },
  previewDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.09)" },
  footer:       { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.22)", letterSpacing: 0.5, marginBottom: 36 },

  langSection:       { width: "100%", alignItems: "center", gap: 6 },
  langBtn:           { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  langBtnText:       { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.85)" },
  langArrow:         { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 2 },
  langBtnOther:      { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" },
  langBtnOtherText:  { fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.55)" },
});
