import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
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
import { useLang } from "@/context/LanguageContext";
import { api, type AccountFamily } from "@/lib/api";

const logoOrange = require("@/assets/images/logo-anbu-orange.png");

type Mode = null | "create" | "join";
type Step = "mode" | "form" | "complete";

export type ChildSignupProps = {
  initialStep?: Step;
  initialMode?: Mode;
};

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

export default function ChildSignupScreen({ initialStep, initialMode }: ChildSignupProps = {}) {
  const insets = useSafeAreaInsets();
  const topInset    = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const familyCtx   = useFamilyContext();
  const { t } = useLang();

  const [mode, setMode] = useState<Mode>(initialMode ?? null);
  const [step, setStep] = useState<Step>(initialStep ?? "mode");

  const [name,        setName]        = useState("");
  const [phone,       setPhone]       = useState("");
  const [otp,         setOtp]         = useState("");
  const [otpSent,     setOtpSent]     = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [devCode,     setDevCode]     = useState<string | null>(null);

  const [joinCode,    setJoinCode]    = useState("");
  const [accountId,   setAccountId]   = useState<number | null>(null);
  const [existingFamilies, setExistingFamilies] = useState<AccountFamily[]>([]);

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
      const res = await api.sendOtp(phone.trim());
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
      const res = await api.verifyOtp(phone.trim(), otp.trim());
      setOtpVerified(true);
      if (res.accountId) {
        setAccountId(res.accountId);
        familyCtx.setAccountId(res.accountId);
      }
      if (res.existingFamilies && res.existingFamilies.length > 0) {
        setExistingFamilies(res.existingFamilies);
      }
    } catch (e: any) {
      setOtpError(e.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRecoverFamily = async (fam: AccountFamily) => {
    setJoining(true);
    setJoinError("");
    try {
      const member = await api.joinFamily(
        fam.familyCode,
        familyCtx.deviceId,
        fam.memberName,
        fam.role,
        accountId,
      );
      await familyCtx.connect(
        fam.familyCode,
        fam.memberName,
        fam.role as "parent" | "child",
        (member.childRole as "master" | "sub") || (fam.childRole as "master" | "sub") || null,
        accountId,
      );
      setName(fam.memberName);
      setStep("complete");
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.spring(scaleUp, { toValue: 1, useNativeDriver: false, tension: 70, friction: 8 }),
      ]).start();
    } catch (e: any) {
      setJoinError(e.message);
    } finally {
      setJoining(false);
    }
  };

  const handleJoin = async () => {
    if (!canJoin) return;
    setJoining(true);
    setJoinError("");
    try {
      if (mode === "create") {
        const group = await api.createFamily(familyCtx.deviceId, name.trim(), "child", accountId);
        await familyCtx.connect(group.code, name.trim(), "child", "master", accountId);
      } else {
        const code = joinCode.trim().toUpperCase();
        const member = await api.joinFamily(code, familyCtx.deviceId, name.trim(), "child", accountId);
        await familyCtx.connect(code, name.trim(), "child", (member.childRole as "master" | "sub") || "sub", accountId);
      }
      setStep("complete");
      Animated.parallel([
        Animated.timing(fadeIn,  { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.spring(scaleUp, { toValue: 1, useNativeDriver: false, tension: 70, friction: 8 }),
      ]).start();
    } catch (e: any) {
      setJoinError(e.message || (t.signupJoinError as string));
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
          <Text style={s.completeTitle}>{t.signupComplete}</Text>
          <Text style={s.completeSub}>{(t.signupCompleteSub as string).replace("{name}", name)}</Text>
          <Pressable
            style={({ pressed }) => [s.startBtn, { opacity: pressed ? 0.88 : 1 }]}
            onPress={() => router.replace("/child")}
          >
            <Text style={s.startBtnText}>{t.signupStartAnbu}</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.neonText} />
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (step === "mode") {
    return (
      <LinearGradient
        colors={["#D4843A", "#C4692E", "#A85528"]}
        style={[s.gradContainer, { paddingTop: topInset + 20, paddingBottom: bottomInset + 24 }]}
      >
        <View style={s.modeContent}>
          <Image source={logoOrange} style={s.modeLogo} resizeMode="contain" />

          <Text style={s.modeHero}>
            <Text style={{ fontFamily: "Inter_700Bold" }}>혼자</Text>
            <Text>계신{"\n"}</Text>
            <Text style={{ fontFamily: "Inter_700Bold" }}>할머니</Text>
            <Text>를 위해{"\n"}</Text>
            <Text style={{ fontFamily: "Inter_700Bold" }}>손자</Text>
            <Text>가 만든{"\n"}</Text>
            <Text style={{ fontFamily: "Inter_700Bold" }}>서비스</Text>
          </Text>
        </View>

        <View style={s.modeActions}>
          <Pressable style={({ pressed }) => [s.authBtn, { opacity: pressed ? 0.9 : 1 }]}>
            <Ionicons name="logo-apple" size={20} color="#000" />
            <Text style={s.authBtnText}>애플 계정으로 계속</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [s.authBtn, { opacity: pressed ? 0.9 : 1 }]}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: "#4285F4" }}>G</Text>
            <Text style={s.authBtnText}>구글 계정으로 계속</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.authBtnOutline, { opacity: pressed ? 0.9 : 1 }]}
            onPress={() => handleSelectMode("create")}
          >
            <Ionicons name="phone-portrait-outline" size={18} color="#FFFFFF" />
            <Text style={s.authBtnOutlineText}>휴대폰 인증으로 계속</Text>
          </Pressable>

          <View style={s.modeFooter}>
            <Text style={s.modeFooterText}>
              계정이 있으신가요? <Text style={s.modeFooterLink}>로그인</Text>
            </Text>
            <Text style={s.modeFooterText}>
              회원이 아니신가요? <Text style={s.modeFooterLink} onPress={() => handleSelectMode("create")}>지금 가입하세요</Text>
            </Text>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={[s.formContainer, { paddingTop: topInset }]}>
      <View style={s.formHeader}>
        <Pressable style={s.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </Pressable>
        <Text style={s.formHeaderTitle}>
          {mode === "create" ? t.signupFormCreateTitle : t.signupFormJoinTitle}
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
              <Text style={s.fSectionTitle}>{t.signupFamilyCodeInput}</Text>
              <Text style={s.fFieldLabel}>{t.signupMasterCodeLabel}</Text>
              <TextInput
                style={[s.fInput, s.codeInput]}
                value={joinCode}
                onChangeText={(v) => setJoinCode(v.toUpperCase())}
                placeholder="AB1234"
                placeholderTextColor="#aaa"
                maxLength={6}
                autoCapitalize="characters"
              />
              <View style={s.fDivider} />
            </>
          )}

          <Text style={s.fSectionTitle}>{t.signupBasicInfo}</Text>

          <Text style={s.fFieldLabel}>{t.signupNameLabel}</Text>
          <TextInput
            style={s.fInput}
            value={name}
            onChangeText={setName}
            placeholder={t.signupNamePlaceholder as string}
            placeholderTextColor="#aaa"
            maxLength={20}
          />

          <Text style={s.fFieldLabel}>{t.signupPhoneLabel}</Text>
          <TextInput
            style={s.fInput}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setOtpSent(false);
              setOtpVerified(false);
              setDevCode(null);
            }}
            placeholder="010-0000-0000"
            placeholderTextColor="#aaa"
            keyboardType="phone-pad"
            maxLength={13}
          />
          <Pressable
            style={[s.fOtpFullBtn, (!phone.trim() || sendingOtp) && s.fOtpBtnDisabled]}
            disabled={!phone.trim() || sendingOtp}
            onPress={handleSendOtp}
          >
            {sendingOtp
              ? <ActivityIndicator size="small" color="#9ca3af" />
              : <Text style={[s.fOtpFullBtnText, (!phone.trim() || sendingOtp) && s.fOtpBtnTextDisabled]}>{otpSent ? t.signupOtpResend : t.signupOtpRequest}</Text>
            }
          </Pressable>
          {!!sendError && <Text style={s.errorText}>{sendError}</Text>}

          {devCode && (
            <View style={s.devCodeBox}>
              <Ionicons name="information-circle-outline" size={15} color="#f59e0b" />
              <Text style={s.devCodeText}>{t.signupDevCode} <Text style={{ fontFamily: "Inter_700Bold" }}>{devCode}</Text></Text>
            </View>
          )}

          {existingFamilies.length > 0 && otpVerified && (
            <View style={s.recoveryBox}>
              <Text style={s.recoveryTitle}>{t.signupRecoveryTitle || "기존 가족이 발견됐어요!"}</Text>
              <Text style={s.recoveryDesc}>{t.signupRecoveryDesc || "이 번호로 등록된 가족이 있습니다. 바로 복구할 수 있어요."}</Text>
              {existingFamilies.map((fam) => (
                <Pressable key={fam.familyCode} style={s.recoveryCard} onPress={() => handleRecoverFamily(fam)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.recoveryName}>{fam.memberName}</Text>
                    <Text style={s.recoveryCode}>{fam.familyCode} · {fam.role === "child" ? (fam.childRole === "master" ? "마스터" : "서브") : "부모"}</Text>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={28} color={COLORS.child.accent} />
                </Pressable>
              ))}
              <View style={s.divider} />
              <Text style={[s.recoveryDesc, { marginTop: 0 }]}>{t.signupRecoveryOrNew || "또는 아래에서 새로 시작할 수 있어요."}</Text>
            </View>
          )}

          {otpSent && (
            <View>
              <Text style={s.fFieldLabel}>{t.signupOtpLabel}</Text>
              <TextInput
                style={[s.fInput, s.otpInput]}
                value={otp}
                onChangeText={(v) => { setOtp(v); setOtpVerified(false); setOtpError(""); }}
                placeholder={t.signupOtpPlaceholder as string}
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Pressable
                style={[
                  s.fOtpFullBtn,
                  otpVerified && s.fOtpVerifiedBtn,
                  (otp.length !== 6 || verifyingOtp || otpVerified) && !otpVerified && s.fOtpBtnDisabled,
                ]}
                disabled={otp.length !== 6 || verifyingOtp || otpVerified}
                onPress={handleVerifyOtp}
              >
                {verifyingOtp
                  ? <ActivityIndicator size="small" color="#9ca3af" />
                  : otpVerified
                  ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={s.fOtpFullBtnText}>{t.signupOtpVerified}</Text>
                    </View>
                  : <Text style={[s.fOtpFullBtnText, otp.length !== 6 && s.fOtpBtnTextDisabled]}>{t.signupOtpConfirm}</Text>
                }
              </Pressable>
              {!!otpError && <Text style={s.errorText}>{otpError}</Text>}
            </View>
          )}

          <View style={s.fDivider} />

          <Text style={s.fSectionTitle}>{t.signupAgreementTitle}</Text>
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

          {!!joinError && <Text style={s.errorText}>{joinError}</Text>}
          <Pressable
            style={[s.fJoinBtn, !canJoin && s.fJoinBtnDisabled, { opacity: joining ? 0.8 : 1 }]}
            disabled={!canJoin || joining}
            onPress={handleJoin}
          >
            {joining
              ? <ActivityIndicator color={canJoin ? "#fff" : "#9ca3af"} />
              : <Text style={[s.fJoinBtnText, !canJoin && s.fJoinBtnTextDisabled]}>{mode === "create" ? t.signupCreateBtn : t.signupJoinBtn}</Text>
            }
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.child.bg },
  gradContainer: { flex: 1 },

  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.child.bgCardBorder },
  backBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.child.text },

  modeContent:   { flex: 1, paddingHorizontal: 28, justifyContent: "center", paddingBottom: 120 },
  modeLogo:      { width: 130, height: 52, marginBottom: 20 },
  modeHero:      { fontFamily: "Inter_400Regular", fontSize: 38, color: "#FFFFFF", lineHeight: 52 },

  modeActions:      { paddingHorizontal: 28, paddingTop: 20 },
  authBtn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 14, paddingVertical: 16, marginBottom: 12 },
  authBtnText:      { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#1a1a1a" },
  authBtnOutline:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "transparent", borderRadius: 14, paddingVertical: 16, marginBottom: 20, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)" },
  authBtnOutlineText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FFFFFF" },
  modeFooter:       { alignItems: "center", gap: 6, paddingTop: 4 },
  modeFooterText:   { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  modeFooterLink:   { fontFamily: "Inter_700Bold", color: "#FFFFFF", textDecorationLine: "underline" as const },

  // ── 밝은 톤 폼 ──
  formContainer: { flex: 1, backgroundColor: "#FAFAFA" },
  formHeader:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E8E8E8" },
  formHeaderTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#333" },

  scroll:      { paddingHorizontal: 20, paddingTop: 24 },
  fSectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#333", marginBottom: 16, marginTop: 8 },
  fFieldLabel:   { fontFamily: "Inter_500Medium", fontSize: 13, color: "#666", marginBottom: 6 },

  fInput:      { backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: "Inter_500Medium", color: "#333", borderWidth: 1.5, borderColor: "#E0E0E0", marginBottom: 16 },
  codeInput:   { letterSpacing: 8, textAlign: "center", fontSize: 22, fontFamily: "Inter_700Bold" },

  otpInput:    { letterSpacing: 6, textAlign: "center" },

  fOtpFullBtn:      { backgroundColor: "#D4843A", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 16 },
  fOtpBtnDisabled:  { backgroundColor: "#d1d5db" },
  fOtpFullBtnText:  { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FFFFFF" },
  fOtpBtnTextDisabled: { color: "#9ca3af" },
  fOtpVerifiedBtn:  { backgroundColor: "#22c55e" },

  fDivider:    { height: 1, backgroundColor: "#E8E8E8", marginVertical: 24 },

  fJoinBtn:          { backgroundColor: "#D4843A", borderRadius: 18, paddingVertical: 18, alignItems: "center", marginTop: 8 },
  fJoinBtnDisabled:  { backgroundColor: "#d1d5db" },
  fJoinBtnText:      { fontFamily: "Inter_700Bold", fontSize: 17, color: "#FFFFFF" },
  fJoinBtnTextDisabled: { color: "#9ca3af" },

  devCodeBox:  { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  devCodeText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#92400e", flex: 1 },

  errorText:   { fontFamily: "Inter_400Regular", fontSize: 13, color: "#ef4444", marginBottom: 8 },

  divider:     { height: 1, backgroundColor: COLORS.child.bgCardBorder, marginVertical: 24 },

  checkRow:    { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  checkBox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#D0D0D0", alignItems: "center", justifyContent: "center", marginTop: 1, backgroundColor: "#FFFFFF" },
  checkBoxActive: { backgroundColor: "#D4843A", borderColor: "#D4843A" },
  checkLabel:  { fontFamily: "Inter_400Regular", fontSize: 14, color: "#555", flex: 1, lineHeight: 20 },

  joinBtn:         { backgroundColor: COLORS.child.accent, borderRadius: 18, paddingVertical: 18, alignItems: "center", marginTop: 8 },
  joinBtnDisabled: { backgroundColor: "#d1d5db" },
  joinBtnText:     { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.neonText },
  joinBtnTextDisabled: { color: "#9ca3af" },

  recoveryBox:   { backgroundColor: "rgba(212,242,0,0.08)", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: "rgba(212,242,0,0.25)" },
  recoveryTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.child.text, marginBottom: 6 },
  recoveryDesc:  { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub, marginBottom: 12, lineHeight: 20 },
  recoveryCard:  { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.child.bgCard, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.child.bgCardBorder },
  recoveryName:  { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.child.text, marginBottom: 2 },
  recoveryCode:  { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.child.textSub },

  completeWrap:  { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  completeIcon:  { marginBottom: 24 },
  completeTitle: { fontFamily: "Inter_700Bold", fontSize: 32, color: COLORS.child.text, marginBottom: 12 },
  completeSub:   { fontFamily: "Inter_400Regular", fontSize: 16, color: COLORS.child.textSub, textAlign: "center", lineHeight: 24, marginBottom: 48 },
  startBtn:      { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.neon, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 36 },
  startBtnText:  { fontFamily: "Inter_700Bold", fontSize: 18, color: COLORS.neonText },
});
