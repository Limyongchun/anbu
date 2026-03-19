import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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

type PreviewTarget = null | "signup-phone";

const SCREENS = [
  { id: "splash", label: "1번 — 스플래시", desc: "동영상 배경 + 로고", icon: "play-circle" as const, route: "/" },
  { id: "signup-mode", label: "2번 — 회원가입 모드선택", desc: "Apple/Google/휴대폰 인증", icon: "log-in" as const, route: "/child-signup" },
  { id: "signup-phone", label: "3번 — 휴대폰 인증 폼", desc: "이름/전화번호/OTP 입력", icon: "phone-portrait" as const, inline: true as const },
  { id: "child", label: "4번 — 자녀 홈", desc: "대시보드 + 5탭 내비게이션", icon: "home" as const, route: "/child" },
  { id: "parent", label: "5번 — 부모 디지털 액자", desc: "사진 슬라이드쇼 + GPS", icon: "images" as const, route: "/parent" },
  { id: "profile", label: "6번 — 프로필/설정", desc: "가족 관리 + 언어 설정", icon: "person-circle" as const, route: "/profile" },
  { id: "setup", label: "7번 — 가족 설정", desc: "역할 선택 + 코드 생성/참가", icon: "settings" as const, route: "/setup" },
];

function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable style={ps.checkRow} onPress={onPress}>
      <View style={[ps.checkBox, checked && ps.checkBoxActive]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={ps.checkLabel}>{label}</Text>
    </Pressable>
  );
}

function PhoneFormPreview({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { t } = useLang();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [allowNotif, setAllowNotif] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  return (
    <View style={[ps.formContainer, { paddingTop: topInset }]}>
      <View style={ps.formHeader}>
        <Pressable style={ps.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </Pressable>
        <Text style={ps.formHeaderTitle}>{t.signupFormCreateTitle}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[ps.scroll, { paddingBottom: bottomInset + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={ps.fSectionTitle}>{t.signupBasicInfo}</Text>

          <Text style={ps.fFieldLabel}>{t.signupNameLabel}</Text>
          <TextInput
            style={ps.fInput}
            value={name}
            onChangeText={setName}
            placeholder={t.signupNamePlaceholder as string}
            placeholderTextColor="#aaa"
            maxLength={20}
          />

          <Text style={ps.fFieldLabel}>{t.signupPhoneLabel}</Text>
          <View style={ps.phoneRow}>
            <TextInput
              style={[ps.fInput, ps.phoneInput]}
              value={phone}
              onChangeText={setPhone}
              placeholder="010-0000-0000"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
              maxLength={13}
            />
            <Pressable style={[ps.fOtpBtn, !phone.trim() && ps.fOtpBtnDisabled]} disabled={!phone.trim()}>
              <Text style={[ps.fOtpBtnText, !phone.trim() && ps.fOtpBtnTextDisabled]}>{t.signupOtpRequest}</Text>
            </Pressable>
          </View>

          <Text style={ps.fFieldLabel}>{t.signupOtpLabel}</Text>
          <View style={ps.phoneRow}>
            <TextInput
              style={[ps.fInput, ps.phoneInput, ps.otpInput]}
              value={otp}
              onChangeText={setOtp}
              placeholder={t.signupOtpPlaceholder as string}
              placeholderTextColor="#aaa"
              keyboardType="number-pad"
              maxLength={6}
            />
            <Pressable style={[ps.fOtpBtn, ps.fOtpBtnDisabled]}>
              <Text style={[ps.fOtpBtnText, ps.fOtpBtnTextDisabled]}>{t.signupOtpConfirm}</Text>
            </Pressable>
          </View>

          <View style={ps.fDivider} />

          <Text style={ps.fSectionTitle}>{t.signupAgreementTitle}</Text>
          <Checkbox
            checked={allowNotif}
            onPress={() => setAllowNotif(v => !v)}
            label={t.signupAgreeNotif as string}
          />
          <Checkbox
            checked={agreeTerms}
            onPress={() => setAgreeTerms(v => !v)}
            label={t.signupAgreeTerms as string}
          />

          <Pressable style={[ps.fJoinBtn, ps.fJoinBtnDisabled]}>
            <Text style={[ps.fJoinBtnText, ps.fJoinBtnTextDisabled]}>{t.signupCreateBtn}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function PreviewIndex() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const [activePreview, setActivePreview] = useState<PreviewTarget>(null);

  if (activePreview === "signup-phone") {
    return <PhoneFormPreview onBack={() => setActivePreview(null)} />;
  }

  const handlePress = (screen: typeof SCREENS[number]) => {
    if ("inline" in screen && screen.inline) {
      setActivePreview(screen.id as PreviewTarget);
    } else if ("route" in screen && screen.route) {
      router.push(screen.route as any);
    }
  };

  return (
    <View style={[st.container, { paddingTop: topInset }]}>
      <View style={st.header}>
        <Pressable style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </Pressable>
        <Text style={st.headerTitle}>화면 미리보기</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[st.list, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={st.subtitle}>터치하면 해당 화면으로 이동합니다</Text>

        {SCREENS.map((screen) => (
          <Pressable
            key={screen.id}
            style={({ pressed }) => [st.card, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => handlePress(screen)}
          >
            <View style={st.cardIcon}>
              <Ionicons name={screen.icon} size={24} color="#D4843A" />
            </View>
            <View style={st.cardText}>
              <Text style={st.cardLabel}>{screen.label}</Text>
              <Text style={st.cardDesc}>{screen.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </Pressable>
        ))}

        <View style={st.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color="#888" />
          <Text style={st.infoText}>
            일부 화면은 가족 연결 상태에 따라 빈 데이터로 표시될 수 있습니다.{"\n"}
            뒤로가기 버튼이나 브라우저 뒤로가기로 이 목록으로 돌아올 수 있습니다.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    backgroundColor: "#fff",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#333" },
  list: { padding: 20, gap: 12 },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(212,132,58,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1, gap: 2 },
  cardLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#333" },
  cardDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#999" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#888", flex: 1, lineHeight: 18 },
});

const ps = StyleSheet.create({
  formContainer: { flex: 1, backgroundColor: "#FAFAFA" },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    backgroundColor: "#fff",
  },
  formHeaderTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#333" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 24 },
  fSectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#333", marginBottom: 16, marginTop: 8 },
  fFieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#666", marginBottom: 6 },
  fInput: {
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
  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  phoneInput: { flex: 1, marginBottom: 0 },
  otpInput: { letterSpacing: 6, textAlign: "center" },
  fOtpBtn: {
    backgroundColor: "#D4843A",
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 110,
  },
  fOtpBtnDisabled: { backgroundColor: "#d1d5db" },
  fOtpBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFFFFF" },
  fOtpBtnTextDisabled: { color: "#9ca3af" },
  fDivider: { height: 1, backgroundColor: "#E8E8E8", marginVertical: 24 },
  fJoinBtn: {
    backgroundColor: "#D4843A",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  fJoinBtnDisabled: { backgroundColor: "#d1d5db" },
  fJoinBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#FFFFFF" },
  fJoinBtnTextDisabled: { color: "#9ca3af" },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D0D0D0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    backgroundColor: "#FFFFFF",
  },
  checkBoxActive: { backgroundColor: "#D4843A", borderColor: "#D4843A" },
  checkLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#555", flex: 1, lineHeight: 20 },
});
