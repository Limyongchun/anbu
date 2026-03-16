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

type Mode = null | "create" | "join";
type Step = "mode" | "form" | "complete";

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

  const [mode, setMode] = useState<Mode>(null);
  const [step, setStep] = useState<Step>("mode");

  const [name,        setName]        = useState("");
  const [phone,       setPhone]       = useState("");
  const [otp,         setOtp]         = useState("");
  const [otpSent,     setOtpSent]     = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [devCode,     setDevCode]     = useState<string | null>(null);

  const [joinCode,    setJoinCode]    = useState("");

  const [allowNotif,  setAllowNotif]  = useState(false);
  const [agreeTerms,  setAgreeTerms]  = useState(false);

  const [sendingOtp,   setSendingOtp]   = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [joining,      setJoining]      = useState(false);
  const [joinError,    setJoinError]    = useState("");
  const [otpError,     setOtpError]     = useState("");
  const [sendError,    setSendError]    = useState("");

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const scaleUp = useRef(new Animated.Value(0.8)).current;

  const canJoin = otpVerified && allowNotif && agreeTerms && name.trim().length > 0
    && (mode === "create" || (mode === "join" && joinCode.trim().length === 6));

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
      if (res.devCode) setDevCode(res.devCode);
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
      if (mode === "create") {
        const group = await post<{ code: string; childRole: string }>("/family/create", {
          deviceId:   familyCtx.deviceId,
          memberName: name.trim(),
          role:       "child",
        });
        await familyCtx.connect(group.code, name.trim(), "child", "master");
      } else {
        const code = joinCode.trim().toUpperCase();
        const member = await post<{ childRole: string }>("/family/join", {
          code,
          deviceId:   familyCtx.deviceId,
          memberName: name.trim(),
          role:       "child",
        });
        await familyCtx.connect(code, name.trim(), "child", (member.childRole as "master" | "sub") || "sub");
      }
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

  const handleSelectMode = (m: Mode) => {
    setMode(m);
    setStep("form");
  };

  const handleBack = () => {
    if (step === "form") {
      setStep("mode");
      setMode(null);
      setName(""); setPhone(""); setOtp(""); setJoinCode("");
      setOtpSent(false); setOtpVerified(false); setDevCode(null);
      setAllowNotif(false); setAgreeTerms(false);
      setJoinError(""); setOtpError(""); setSendError("");
    } else {
      router.back();
    }
  };

  // ── 완료 화면 ──
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

  // ── 모드 선택 화면 ──
  if (step === "mode") {
    return (
      <View style={[s.container, { paddingTop: topInset, paddingBottom: bottomInset + 24 }]}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.child.text} />
          </Pressable>
          <Text style={s.headerTitle}>자녀 가입</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.modeWrap}>
          <Text style={s.modeHeading}>어떻게 시작하시겠어요?</Text>
          <Text style={s.modeSub}>처음 가족방을 만드는 경우 "새 가족 만들기"를{"\n"}선택하세요. 이미 있는 경우 코드로 참여하세요.</Text>

          <Pressable style={s.modeCard} onPress={() => handleSelectMode("create")}>
            <View style={[s.modeIconBg, { backgroundColor: "rgba(212,242,0,0.15)" }]}>
              <Ionicons name="home-outline" size={28} color={COLORS.navPill} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.modeCardTitle}>새 가족 만들기</Text>
              <Text style={s.modeCardDesc}>처음 가입하는 자녀{" "}
                <Text style={s.modeMasterBadge}>마스터</Text>
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(0,0,0,0.2)" />
          </Pressable>

          <Pressable style={s.modeCard} onPress={() => handleSelectMode("join")}>
            <View style={[s.modeIconBg, { backgroundColor: "rgba(99,102,241,0.12)" }]}>
              <Ionicons name="enter-outline" size={28} color="#6366f1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.modeCardTitle}>코드로 참여하기</Text>
              <Text style={s.modeCardDesc}>이미 있는 가족방에 추가 자녀로 참여</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(0,0,0,0.2)" />
          </Pressable>

        </View>
      </View>
    );
  }

  // ── 회원가입 폼 ──
  return (
    <View style={[s.container, { paddingTop: topInset }]}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={22} color={COLORS.child.text} />
        </Pressable>
        <Text style={s.headerTitle}>
          {mode === "create" ? "새 가족 만들기" : "가족방 참여하기"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === "join" && (
            <>
              <Text style={s.sectionTitle}>가족 코드 입력</Text>
              <Text style={s.fieldLabel}>마스터 자녀의 가족 코드</Text>
              <TextInput
                style={[s.input, s.codeInput]}
                value={joinCode}
                onChangeText={(v) => setJoinCode(v.toUpperCase())}
                placeholder="AB1234"
                placeholderTextColor={COLORS.child.textMuted}
                maxLength={6}
                autoCapitalize="characters"
              />
              <View style={s.divider} />
            </>
          )}

          <Text style={s.sectionTitle}>기본 정보</Text>

          <Text style={s.fieldLabel}>성함</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="이름을 입력해주세요"
            placeholderTextColor={COLORS.child.textMuted}
            maxLength={20}
          />

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
                ? <ActivityIndicator size="small" color="#9ca3af" />
                : <Text style={[s.otpRequestBtnText, (!phone.trim() || sendingOtp) && s.otpRequestBtnTextDisabled]}>{otpSent ? "재전송" : "인증번호 받기"}</Text>
              }
            </Pressable>
          </View>
          {!!sendError && <Text style={s.errorText}>{sendError}</Text>}

          {devCode && (
            <View style={s.devCodeBox}>
              <Ionicons name="information-circle-outline" size={15} color="#f59e0b" />
              <Text style={s.devCodeText}>개발 모드 — 인증번호: <Text style={{ fontFamily: "Inter_700Bold" }}>{devCode}</Text></Text>
            </View>
          )}

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
                    (otp.length !== 6 || verifyingOtp || otpVerified) && !otpVerified && s.otpRequestBtnDisabled,
                  ]}
                  disabled={otp.length !== 6 || verifyingOtp || otpVerified}
                  onPress={handleVerifyOtp}
                >
                  {verifyingOtp
                    ? <ActivityIndicator size="small" color="#9ca3af" />
                    : otpVerified
                    ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={s.otpRequestBtnText}>인증 완료</Text>
                      </View>
                    : <Text style={[s.otpRequestBtnText, otp.length !== 6 && s.otpRequestBtnTextDisabled]}>확인</Text>
                  }
                </Pressable>
              </View>
              {!!otpError && <Text style={s.errorText}>{otpError}</Text>}
            </View>
          )}

          <View style={s.divider} />

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

          {!!joinError && <Text style={s.errorText}>{joinError}</Text>}
          <Pressable
            style={[s.joinBtn, !canJoin && s.joinBtnDisabled, { opacity: joining ? 0.8 : 1 }]}
            disabled={!canJoin || joining}
            onPress={handleJoin}
          >
            {joining
              ? <ActivityIndicator color={canJoin ? COLORS.neonText : "#9ca3af"} />
              : <Text style={[s.joinBtnText, !canJoin && s.joinBtnTextDisabled]}>{mode === "create" ? "가족 만들기" : "가족방 참여"}</Text>
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

  // ── 모드 선택 ──
  modeWrap:      { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  modeHeading:   { fontFamily: "Inter_700Bold", fontSize: 24, color: COLORS.child.text, marginBottom: 10 },
  modeSub:       { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.textSub, lineHeight: 22, marginBottom: 36 },
  modeCard:      { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: COLORS.child.bgCard, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1.5, borderColor: COLORS.child.bgCardBorder },
  modeIconBg:    { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modeCardTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.child.text, marginBottom: 4 },
  modeCardDesc:  { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub },
  modeMasterBadge: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.navPill, backgroundColor: "rgba(212,242,0,0.5)", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },

  // ── 폼 ──
  scroll:      { padding: 24 },
  sectionTitle:{ fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.child.text, marginBottom: 16, marginTop: 8 },
  fieldLabel:  { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.textSub, marginBottom: 6 },

  input:       { backgroundColor: COLORS.child.bgCard, borderRadius: 14, padding: 16, fontSize: 16, fontFamily: "Inter_500Medium", color: COLORS.child.text, borderWidth: 1.5, borderColor: COLORS.child.bgCardBorder, marginBottom: 16 },
  codeInput:   { letterSpacing: 8, textAlign: "center", fontSize: 22, fontFamily: "Inter_700Bold" },

  phoneRow:    { flexDirection: "row", gap: 10, marginBottom: 0 },
  phoneInput:  { flex: 1, marginBottom: 0 },
  otpInput:    { letterSpacing: 6, textAlign: "center" },

  otpRequestBtn:         { backgroundColor: COLORS.child.accent, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", minWidth: 110, marginBottom: 16 },
  otpRequestBtnDisabled: { backgroundColor: "#d1d5db" },
  otpRequestBtnText:     { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.neonText },
  otpRequestBtnTextDisabled: { color: "#9ca3af" },
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
  joinBtnDisabled: { backgroundColor: "#d1d5db" },
  joinBtnText:     { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.neonText },
  joinBtnTextDisabled: { color: "#9ca3af" },

  completeWrap:  { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  completeIcon:  { marginBottom: 24 },
  completeTitle: { fontFamily: "Inter_700Bold", fontSize: 32, color: COLORS.child.text, marginBottom: 12 },
  completeSub:   { fontFamily: "Inter_400Regular", fontSize: 16, color: COLORS.child.textSub, textAlign: "center", lineHeight: 24, marginBottom: 48 },
  startBtn:      { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.neon, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 36 },
  startBtnText:  { fontFamily: "Inter_700Bold", fontSize: 18, color: COLORS.neonText },
});
