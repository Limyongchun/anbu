import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";

const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "오류가 발생했습니다");
  return data as T;
}

type Step = "form" | "complete";

function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable style={s.checkRow} onPress={onPress}>
      <View style={[s.checkBox, checked && s.checkBoxActive]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={s.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export default function ChildSignupScreen() {
  const insets = useSafeAreaInsets();
  const topInset    = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const familyCtx   = useFamilyContext();

  const [step, setStep] = useState<Step>("form");

  // ── 폼 상태 ──
  const [name,        setName]        = useState("");
  const [phone,       setPhone]       = useState("");
  const [otp,         setOtp]         = useState("");
  const [otpSent,     setOtpSent]     = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [devCode,     setDevCode]     = useState<string | null>(null);

  const [allowNotif,  setAllowNotif]  = useState(false);
  const [agreeTerms,  setAgreeTerms]  = useState(false);

  const [sendingOtp,  setSendingOtp]  = useState(false);
  const [verifyingOtp,setVerifyingOtp]= useState(false);
  const [joining,     setJoining]     = useState(false);
  const [joinError,   setJoinError]   = useState("");
  const [otpError,    setOtpError]    = useState("");
  const [sendError,   setSendError]   = useState("");

  // ── 완료 화면 페이드인 ──
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleUp = useRef(new Animated.Value(0.8)).current;

  const canJoin = otpVerified && allowNotif && agreeTerms && name.trim().length > 0;

  const handleSendOtp = async () => {
    if (!phone.trim()) return;
    setSendingOtp(true);
    setSendError("");
    setOtpSent(false);
    setOtpVerified(false);
    setDevCode(null);
    try {
      const res = await post<{ success: boolean; devCode?: string }>("/auth/send-otp", { phone: phone.trim() });
      setOtpSent(true);
      if (res.devCode) setDevCode(res.devCode); // 개발용: 실제 배포시 제거
    } catch (e: any) {
      setSendError(e.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length !== 6) return;
    setVerifyingOtp(true);
    setOtpError("");
    try {
      await post("/auth/verify-otp", { phone: phone.trim(), otp: otp.trim() });
      setOtpVerified(true);
    } catch (e: any) {
      setOtpError(e.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleJoin = async () => {
    if (!canJoin) return;
    setJoining(true);
    setJoinError("");
    try {
      // 가족 그룹 생성 → 고유 코드 발급
      const group = await post<{ code: string }>("/family/create", {
        deviceId:   familyCtx.deviceId,
        memberName: name.trim(),
        role:       "child",
      });
      // FamilyContext에 저장 (AsyncStorage 포함)
      await familyCtx.connect(group.code, name.trim(), "child");
      setStep("complete");
      Animated.parallel([
        Animated.timing(fadeIn,  { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.spring(scaleUp, { toValue: 1, useNativeDriver: false, tension: 70, friction: 8 }),
      ]).start();
    } catch (e: any) {
      setJoinError(e.message || "가입 처리 중 오류가 발생했습니다");
    } finally {
      setJoining(false);
    }
  };

  // ── 가입 완료 화면 ──
  if (step === "complete") {
    return (
      <View style={[s.container, { paddingTop: topInset, paddingBottom: bottomInset + 24 }]}>
        <Animated.View style={[s.completeWrap, { opacity: fadeIn, transform: [{ scale: scaleUp }] }]}>
          <View style={s.completeIcon}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.neon} />
          </View>
          <Text style={s.completeTitle}>가입 완료!</Text>
          <Text style={s.completeSub}>{name}님, 환영합니다{"\n"}이제 가족과 안부를 나눠보세요</Text>
          <Pressable
            style={({ pressed }) => [s.startBtn, { opacity: pressed ? 0.88 : 1 }]}
            onPress={() => router.replace("/child")}
          >
            <Text style={s.startBtnText}>안부 시작하기</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.neonText} />
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // ── 회원가입 폼 ──
  return (
    <View style={[s.container, { paddingTop: topInset }]}>
      {/* 헤더 */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.child.text} />
        </Pressable>
        <Text style={s.headerTitle}>자녀 회원가입</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.sectionTitle}>기본 정보</Text>

          {/* 성함 */}
          <Text style={s.fieldLabel}>성함</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="이름을 입력해주세요"
            placeholderTextColor={COLORS.child.textMuted}
            maxLength={20}
          />

          {/* 휴대폰 번호 */}
          <Text style={s.fieldLabel}>휴대폰 번호</Text>
          <View style={s.phoneRow}>
            <TextInput
              style={[s.input, s.phoneInput]}
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                setOtpSent(false);
                setOtpVerified(false);
                setDevCode(null);
              }}
              placeholder="010-0000-0000"
              placeholderTextColor={COLORS.child.textMuted}
              keyboardType="phone-pad"
              maxLength={13}
            />
            <Pressable
              style={[s.otpRequestBtn, (!phone.trim() || sendingOtp) && s.otpRequestBtnDisabled]}
              disabled={!phone.trim() || sendingOtp}
              onPress={handleSendOtp}
            >
              {sendingOtp
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.otpRequestBtnText}>{otpSent ? "재전송" : "인증번호 받기"}</Text>
              }
            </Pressable>
          </View>
          {!!sendError && <Text style={s.errorText}>{sendError}</Text>}

          {/* 개발용: OTP 코드 표시 */}
          {devCode && (
            <View style={s.devCodeBox}>
              <Ionicons name="information-circle-outline" size={15} color="#f59e0b" />
              <Text style={s.devCodeText}>개발 모드 — 인증번호: <Text style={{ fontFamily: "Inter_700Bold" }}>{devCode}</Text></Text>
            </View>
          )}

          {/* OTP 입력 */}
          {otpSent && (
            <View>
              <Text style={s.fieldLabel}>인증번호</Text>
              <View style={s.phoneRow}>
                <TextInput
                  style={[s.input, s.phoneInput, s.otpInput]}
                  value={otp}
                  onChangeText={(v) => { setOtp(v); setOtpVerified(false); setOtpError(""); }}
                  placeholder="6자리 입력"
                  placeholderTextColor={COLORS.child.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Pressable
                  style={[
                    s.otpRequestBtn,
                    otpVerified && s.otpVerifiedBtn,
                    (otp.length !== 6 || verifyingOtp || otpVerified) && s.otpRequestBtnDisabled,
                  ]}
                  disabled={otp.length !== 6 || verifyingOtp || otpVerified}
                  onPress={handleVerifyOtp}
                >
                  {verifyingOtp
                    ? <ActivityIndicator size="small" color="#fff" />
                    : otpVerified
                    ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={s.otpRequestBtnText}>인증 완료</Text>
                      </View>
                    : <Text style={s.otpRequestBtnText}>확인</Text>
                  }
                </Pressable>
              </View>
              {!!otpError && <Text style={s.errorText}>{otpError}</Text>}
            </View>
          )}

          {/* 구분선 */}
          <View style={s.divider} />

          {/* 약관 / 알림 */}
          <Text style={s.sectionTitle}>동의 항목</Text>
          <Checkbox
            checked={allowNotif}
            onPress={() => setAllowNotif(v => !v)}
            label="알림 허용 — 부모님의 하트·메시지 알림을 받아요"
          />
          <Checkbox
            checked={agreeTerms}
            onPress={() => setAgreeTerms(v => !v)}
            label="서비스 이용약관 및 개인정보처리방침에 동의합니다 (필수)"
          />

          {/* 가입하기 버튼 */}
          {!!joinError && <Text style={s.errorText}>{joinError}</Text>}
          <Pressable
            style={[s.joinBtn, !canJoin && s.joinBtnDisabled, { opacity: joining ? 0.8 : 1 }]}
            disabled={!canJoin || joining}
            onPress={handleJoin}
          >
            {joining
              ? <ActivityIndicator color={COLORS.neonText} />
              : <Text style={s.joinBtnText}>가입하기</Text>
            }
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.child.bg },

  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.child.bgCardBorder },
  backBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.child.text },

  scroll:      { padding: 24 },
  sectionTitle:{ fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.child.text, marginBottom: 16, marginTop: 8 },
  fieldLabel:  { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.textSub, marginBottom: 6 },

  input:       { backgroundColor: COLORS.child.bgCard, borderRadius: 14, padding: 16, fontSize: 16, fontFamily: "Inter_500Medium", color: COLORS.child.text, borderWidth: 1.5, borderColor: COLORS.child.bgCardBorder, marginBottom: 16 },

  phoneRow:    { flexDirection: "row", gap: 10, marginBottom: 0 },
  phoneInput:  { flex: 1, marginBottom: 0 },
  otpInput:    { letterSpacing: 6, textAlign: "center" },

  otpRequestBtn:         { backgroundColor: COLORS.child.accent, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", minWidth: 110, marginBottom: 16 },
  otpRequestBtnDisabled: { opacity: 0.45 },
  otpRequestBtnText:     { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.neonText },
  otpVerifiedBtn:        { backgroundColor: "#22c55e" },

  devCodeBox:  { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  devCodeText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#92400e", flex: 1 },

  errorText:   { fontFamily: "Inter_400Regular", fontSize: 13, color: "#ef4444", marginBottom: 8 },

  divider:     { height: 1, backgroundColor: COLORS.child.bgCardBorder, marginVertical: 24 },

  checkRow:    { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  checkBox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.child.bgCardBorder, alignItems: "center", justifyContent: "center", marginTop: 1, backgroundColor: COLORS.child.bgCard },
  checkBoxActive: { backgroundColor: COLORS.child.accent, borderColor: COLORS.child.accent },
  checkLabel:  { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.textSub, flex: 1, lineHeight: 20 },

  joinBtn:         { backgroundColor: COLORS.child.accent, borderRadius: 18, paddingVertical: 18, alignItems: "center", marginTop: 8 },
  joinBtnDisabled: { opacity: 0.35 },
  joinBtnText:     { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.neonText },

  // ── 완료 화면 ──
  completeWrap:  { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  completeIcon:  { marginBottom: 24 },
  completeTitle: { fontFamily: "Inter_700Bold", fontSize: 32, color: COLORS.child.text, marginBottom: 12 },
  completeSub:   { fontFamily: "Inter_400Regular", fontSize: 16, color: COLORS.child.textSub, textAlign: "center", lineHeight: 24, marginBottom: 48 },
  startBtn:      { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.neon, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 36 },
  startBtnText:  { fontFamily: "Inter_700Bold", fontSize: 18, color: COLORS.neonText },
});
