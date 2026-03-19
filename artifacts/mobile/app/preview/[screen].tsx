import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLang } from "@/context/LanguageContext";
import { MockFamilyProvider } from "@/context/MockFamilyProvider";
import { setPreviewMode } from "@/lib/api";

import SplashScreen from "@/app/index";
import ChildSignupScreen from "@/app/child-signup";
import ChildScreen from "@/app/child";
import ParentScreen from "@/app/parent";
import ProfileScreen from "@/app/profile";
import SetupScreen from "@/app/setup";

const SCREEN_META: Record<string, { title: string; role: "child" | "parent"; disconnected?: boolean }> = {
  splash: { title: "스플래시", role: "child", disconnected: true },
  "signup-mode": { title: "회원가입", role: "child", disconnected: true },
  "signup-phone": { title: "휴대폰 인증 폼", role: "child", disconnected: true },
  child: { title: "자녀 홈", role: "child" },
  parent: { title: "부모 액자", role: "parent" },
  profile: { title: "프로필", role: "child" },
  setup: { title: "가족 설정", role: "child" },
};

function PreviewBackBar({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  return (
    <View style={[bb.bar, { paddingTop: topInset }]}>
      <Pressable style={bb.btn} onPress={() => router.push("/preview")}>
        <Ionicons name="chevron-back" size={18} color="#fff" />
        <Text style={bb.text}>미리보기: {title}</Text>
      </Pressable>
    </View>
  );
}

function PhoneFormInline() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { t } = useLang();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [allowNotif, setAllowNotif] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#FAFAFA" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: bottomInset + 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: "#333", marginBottom: 16, marginTop: 8 }}>{t.signupBasicInfo}</Text>
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#666", marginBottom: 6 }}>{t.signupNameLabel}</Text>
        <TextInput style={pf.input} value={name} onChangeText={setName} placeholder={t.signupNamePlaceholder as string} placeholderTextColor="#aaa" maxLength={20} />
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#666", marginBottom: 6 }}>{t.signupPhoneLabel}</Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <TextInput style={[pf.input, { flex: 1, marginBottom: 0 }]} value={phone} onChangeText={setPhone} placeholder="010-0000-0000" placeholderTextColor="#aaa" keyboardType="phone-pad" maxLength={13} />
          <Pressable style={[pf.otpBtn, !phone.trim() && pf.otpBtnOff]}><Text style={[pf.otpTxt, !phone.trim() && pf.otpTxtOff]}>{t.signupOtpRequest}</Text></Pressable>
        </View>
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#666", marginBottom: 6 }}>{t.signupOtpLabel}</Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <TextInput style={[pf.input, { flex: 1, marginBottom: 0, letterSpacing: 6, textAlign: "center" }]} value={otp} onChangeText={setOtp} placeholder={t.signupOtpPlaceholder as string} placeholderTextColor="#aaa" keyboardType="number-pad" maxLength={6} />
          <Pressable style={[pf.otpBtn, pf.otpBtnOff]}><Text style={[pf.otpTxt, pf.otpTxtOff]}>{t.signupOtpConfirm}</Text></Pressable>
        </View>
        <View style={{ height: 1, backgroundColor: "#E8E8E8", marginVertical: 24 }} />
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: "#333", marginBottom: 16 }}>{t.signupAgreementTitle}</Text>
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }} onPress={() => setAllowNotif(v => !v)}>
          <View style={[pf.chk, allowNotif && pf.chkOn]}>{allowNotif && <Ionicons name="checkmark" size={14} color="#fff" />}</View>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: "#555", flex: 1 }}>{t.signupAgreeNotif}</Text>
        </Pressable>
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }} onPress={() => setAgreeTerms(v => !v)}>
          <View style={[pf.chk, agreeTerms && pf.chkOn]}>{agreeTerms && <Ionicons name="checkmark" size={14} color="#fff" />}</View>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: "#555", flex: 1 }}>{t.signupAgreeTerms}</Text>
        </Pressable>
        <View style={{ backgroundColor: "#d1d5db", borderRadius: 18, paddingVertical: 18, alignItems: "center", marginTop: 8 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 17, color: "#9ca3af" }}>{t.signupCreateBtn}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ScreenRenderer({ id }: { id: string }) {
  switch (id) {
    case "splash":
      return <SplashScreen />;
    case "signup-mode":
      return <ChildSignupScreen />;
    case "signup-phone":
      return <PhoneFormInline />;
    case "child":
      return <ChildScreen />;
    case "parent":
      return <ParentScreen />;
    case "profile":
      return <ProfileScreen />;
    case "setup":
      return <SetupScreen />;
    default:
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FAFAFA" }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#999" }}>
            알 수 없는 화면: {id}
          </Text>
        </View>
      );
  }
}

export default function PreviewScreenRoute() {
  const { screen } = useLocalSearchParams<{ screen: string }>();
  const meta = SCREEN_META[screen] ?? { title: screen, role: "child" as const };

  useEffect(() => {
    if (Platform.OS === "web" && screen && typeof window !== "undefined") {
      window.location.replace(`/preview?screen=${screen}`);
      return;
    }
    setPreviewMode(true);
    return () => { setPreviewMode(false); };
  }, [screen]);

  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAFAFA", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: "#999" }}>리다이렉트 중...</Text>
      </View>
    );
  }

  if (!__DEV__) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAFAFA", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#999" }}>
          개발 모드에서만 사용 가능합니다
        </Text>
      </View>
    );
  }

  return (
    <MockFamilyProvider role={meta.role} disconnected={meta.disconnected}>
      <View style={{ flex: 1 }}>
        <PreviewBackBar title={meta.title} />
        <ScreenRenderer id={screen} />
      </View>
    </MockFamilyProvider>
  );
}

const bb = StyleSheet.create({
  bar: {
    backgroundColor: "rgba(0,0,0,0.75)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 6,
    zIndex: 9999,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  text: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
});

const pf = StyleSheet.create({
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#333",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    marginBottom: 16,
  },
  otpBtn: {
    backgroundColor: "#D4843A",
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 110,
  },
  otpBtnOff: { backgroundColor: "#d1d5db" },
  otpTxt: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFFFFF" },
  otpTxtOff: { color: "#9ca3af" },
  chk: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D0D0D0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  chkOn: { backgroundColor: "#D4843A", borderColor: "#D4843A" },
});
