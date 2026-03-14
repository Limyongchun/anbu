import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Clipboard,
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
import { FamilyRole, useFamilyContext } from "@/context/FamilyContext";
import { api } from "@/lib/api";

type SetupStep = "role" | "name" | "action" | "create_code" | "join_code";

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { deviceId, connect } = useFamilyContext();

  const [step, setStep] = useState<SetupStep>("role");
  const [role, setRole] = useState<FamilyRole | null>(null);
  const [name, setName] = useState("");
  const [action, setAction] = useState<"create" | "join" | null>(null);
  const [familyCode, setFamilyCode] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleCreateFamily = async () => {
    if (!name.trim() || !role) return;
    setLoading(true);
    setError("");
    try {
      const group = await api.createFamily(deviceId, name.trim(), role);
      setFamilyCode(group.code);
      setStep("create_code");
    } catch (e: any) {
      setError(e.message || "연결에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!joinCodeInput.trim() || !name.trim() || !role) return;
    setLoading(true);
    setError("");
    try {
      const code = joinCodeInput.trim().toUpperCase();
      await api.joinFamily(code, deviceId, name.trim(), role);
      await connect(code, name.trim(), role);
      router.replace(role === "parent" ? "/parent" : "/child");
    } catch (e: any) {
      setError(e.message || "코드를 확인해주세요");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteCreate = async () => {
    if (!role || !name.trim() || !familyCode) return;
    await connect(familyCode, name.trim(), role);
    router.replace(role === "parent" ? "/parent" : "/child");
  };

  const handleCopy = () => {
    Clipboard.setString(familyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderStep = () => {
    switch (step) {
      case "role":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>나는 누구인가요?</Text>
            <Text style={styles.stepSub}>역할을 선택해주세요</Text>
            <View style={styles.roleCards}>
              <Pressable
                style={({ pressed }) => [
                  styles.roleCard,
                  role === "parent" && styles.roleCardActive,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => setRole("parent")}
              >
                <View style={[styles.roleIcon, role === "parent" && styles.roleIconActive]}>
                  <Ionicons name="home" size={28} color={role === "parent" ? COLORS.white : COLORS.child.accent} />
                </View>
                <Text style={[styles.roleLabel, role === "parent" && styles.roleLabelActive]}>부모님</Text>
                <Text style={[styles.roleDesc, role === "parent" && styles.roleDescActive]}>자녀의 안부를 받아요</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.roleCard,
                  role === "child" && styles.roleCardActive,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => setRole("child")}
              >
                <View style={[styles.roleIcon, role === "child" && styles.roleIconActive]}>
                  <Ionicons name="people" size={28} color={role === "child" ? COLORS.white : COLORS.child.accent} />
                </View>
                <Text style={[styles.roleLabel, role === "child" && styles.roleLabelActive]}>자녀</Text>
                <Text style={[styles.roleDesc, role === "child" && styles.roleDescActive]}>부모님께 안부를 보내요</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.nextBtn, !role && styles.nextBtnDisabled]}
              disabled={!role}
              onPress={() => setStep("name")}
            >
              <Text style={styles.nextBtnText}>다음</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </Pressable>
          </View>
        );

      case "name":
        return (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>이름을 알려주세요</Text>
              <Text style={styles.stepSub}>가족에게 표시될 이름이에요</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="예: 엄마, 민준, 아버지..."
                placeholderTextColor={COLORS.child.textMuted}
                maxLength={20}
                autoFocus
              />
              <Pressable
                style={[styles.nextBtn, !name.trim() && styles.nextBtnDisabled]}
                disabled={!name.trim()}
                onPress={() => setStep("action")}
              >
                <Text style={styles.nextBtnText}>다음</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        );

      case "action":
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>가족 연결</Text>
            <Text style={styles.stepSub}>새 가족방을 만들거나 코드로 참가하세요</Text>
            <View style={styles.actionCards}>
              <Pressable
                style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.9 : 1 }]}
                onPress={() => {
                  setAction("create");
                  handleCreateFamily();
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: "rgba(200,112,74,0.1)" }]}>
                  <Ionicons name="add-circle" size={32} color={COLORS.child.accent} />
                </View>
                <Text style={styles.actionLabel}>가족방 만들기</Text>
                <Text style={styles.actionDesc}>새 방을 만들고 코드를 가족과 공유해요</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.9 : 1 }]}
                onPress={() => { setAction("join"); setStep("join_code"); }}
              >
                <View style={[styles.actionIcon, { backgroundColor: "rgba(58,90,138,0.1)" }]}>
                  <Ionicons name="enter" size={32} color="#3a5a8a" />
                </View>
                <Text style={styles.actionLabel}>코드로 참가</Text>
                <Text style={styles.actionDesc}>가족이 공유한 6자리 코드를 입력해요</Text>
              </Pressable>
            </View>
            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={COLORS.child.accent} />
                <Text style={styles.loadingText}>연결 중...</Text>
              </View>
            )}
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case "create_code":
        return (
          <View style={styles.stepContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={56} color="#4ade80" />
            </View>
            <Text style={styles.stepTitle}>가족방이 만들어졌어요!</Text>
            <Text style={styles.stepSub}>아래 코드를 가족에게 공유해주세요</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{familyCode}</Text>
            </View>
            <Pressable onPress={handleCopy} style={styles.copyBtn}>
              <Ionicons name={copied ? "checkmark" : "copy"} size={18} color={COLORS.child.accent} />
              <Text style={styles.copyBtnText}>{copied ? "복사됨!" : "코드 복사"}</Text>
            </Pressable>
            <View style={styles.codeHint}>
              <Ionicons name="information-circle" size={16} color={COLORS.child.textSub} />
              <Text style={styles.codeHintText}>가족이 코드로 참가하면 서로 연결돼요</Text>
            </View>
            <Pressable
              style={styles.nextBtn}
              onPress={handleCompleteCreate}
            >
              <Text style={styles.nextBtnText}>시작하기</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </Pressable>
          </View>
        );

      case "join_code":
        return (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>가족 코드 입력</Text>
              <Text style={styles.stepSub}>가족이 공유한 6자리 코드를 입력하세요</Text>
              <TextInput
                style={[styles.nameInput, styles.codeInput]}
                value={joinCodeInput}
                onChangeText={(t) => setJoinCodeInput(t.toUpperCase())}
                placeholder="예: AB3XY7"
                placeholderTextColor={COLORS.child.textMuted}
                maxLength={6}
                autoCapitalize="characters"
                autoFocus
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              {loading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={COLORS.child.accent} />
                  <Text style={styles.loadingText}>참가 중...</Text>
                </View>
              )}
              <Pressable
                style={[styles.nextBtn, (!joinCodeInput.trim() || loading) && styles.nextBtnDisabled]}
                disabled={!joinCodeInput.trim() || loading}
                onPress={handleJoinFamily}
              >
                <Text style={styles.nextBtnText}>참가하기</Text>
                <Ionicons name="enter" size={18} color={COLORS.white} />
              </Pressable>
              <Pressable onPress={() => { setStep("action"); setError(""); }} style={styles.backLink}>
                <Ionicons name="chevron-back" size={16} color={COLORS.child.textSub} />
                <Text style={styles.backLinkText}>뒤로가기</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        );
    }
  };

  const stepProgress = { role: 1, name: 2, action: 3, create_code: 4, join_code: 3 }[step];

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color={COLORS.child.text} />
        </Pressable>
        <Text style={styles.headerTitle}>가족 연결 설정</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.progressBar}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[styles.progressDot, i <= stepProgress && styles.progressDotActive]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.child.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBack: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: COLORS.child.text,
  },
  progressBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(61,43,31,0.1)",
  },
  progressDotActive: {
    backgroundColor: COLORS.child.accent,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  stepContainer: {
    width: "100%",
    alignItems: "center",
  },
  stepTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: COLORS.child.text,
    textAlign: "center",
    marginBottom: 8,
  },
  stepSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: COLORS.child.textSub,
    textAlign: "center",
    marginBottom: 32,
  },
  roleCards: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 32,
    width: "100%",
  },
  roleCard: {
    flex: 1,
    backgroundColor: COLORS.child.bgCard,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(61,43,31,0.08)",
    gap: 8,
  },
  roleCardActive: {
    borderColor: COLORS.child.accent,
    backgroundColor: "rgba(200,112,74,0.06)",
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.child.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  roleIconActive: {
    backgroundColor: COLORS.child.accent,
  },
  roleLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: COLORS.child.text,
  },
  roleLabelActive: {
    color: COLORS.child.accent,
  },
  roleDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.child.textSub,
    textAlign: "center",
  },
  roleDescActive: {
    color: COLORS.child.accent,
  },
  nameInput: {
    width: "100%",
    backgroundColor: COLORS.child.bgCard,
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    color: COLORS.child.text,
    borderWidth: 1.5,
    borderColor: "rgba(61,43,31,0.1)",
    textAlign: "center",
    marginBottom: 24,
  },
  codeInput: {
    letterSpacing: 8,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.child.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: "100%",
    justifyContent: "center",
    marginBottom: 16,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: COLORS.white,
  },
  actionCards: {
    width: "100%",
    gap: 14,
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: COLORS.child.bgCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.child.bgCardBorder,
    gap: 6,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: COLORS.child.text,
  },
  actionDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.child.textSub,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.child.textSub,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 8,
  },
  successIcon: {
    marginBottom: 16,
  },
  codeBox: {
    backgroundColor: COLORS.child.bgCard,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 32,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.child.accentSoft,
    width: "100%",
    alignItems: "center",
  },
  codeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: COLORS.child.accent,
    letterSpacing: 10,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: COLORS.child.accentSoft,
    borderRadius: 12,
    marginBottom: 16,
  },
  copyBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: COLORS.child.accent,
  },
  codeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 28,
  },
  codeHintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.child.textSub,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
  },
  backLinkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.child.textSub,
  },
});
