import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
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

const APP_VERSION = "1.0.0";
const SUPPORT_EMAIL = "support@dugo.app";

const FAQ_LIST = [
  {
    q: "가족 코드는 어떻게 사용하나요?",
    a: "가족 연결 화면에서 6자리 코드를 생성하거나 입력하면 부모님과 자녀가 연결됩니다. 코드는 마이페이지에서 언제든지 확인할 수 있어요.",
  },
  {
    q: "위치가 업데이트 되지 않아요",
    a: "앱이 포그라운드 상태일 때 위치가 공유됩니다. 설정 → 개인정보 보호 → 위치 서비스에서 DUGO의 권한을 '앱 사용 중'으로 설정해 주세요.",
  },
  {
    q: "안부 사진이 전송되지 않아요",
    a: "사진 크기가 너무 크거나 인터넷 연결이 불안정할 수 있어요. 사진을 줄이거나 Wi-Fi 환경에서 다시 시도해 보세요.",
  },
  {
    q: "가족 연결을 해제하면 데이터가 삭제되나요?",
    a: "연결 해제 시 이 기기의 연결 정보만 삭제됩니다. 서버에 저장된 메시지와 위치 기록은 유지됩니다.",
  },
  {
    q: "자녀/부모님 역할을 바꿀 수 있나요?",
    a: "역할 변경은 현재 지원되지 않습니다. 가족 연결을 해제한 뒤 다시 연결하면 역할을 새로 선택할 수 있어요.",
  },
];

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
  danger,
  rightIcon = "chevron-forward",
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rightIcon?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.row, onPress && pressed && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[s.rowIcon, danger && { backgroundColor: "rgba(255,80,80,0.1)" }]}>
        <Ionicons name={icon as any} size={18} color={danger ? "#ff5050" : COLORS.navPill} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, danger && { color: "#ff5050" }]}>{label}</Text>
        {!!value && <Text style={s.rowValue}>{value}</Text>}
      </View>
      {onPress && (
        <Ionicons name={rightIcon as any} size={16} color={danger ? "#ff5050" : "rgba(0,0,0,0.2)"} />
      )}
    </Pressable>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, allFamilyCodes, myName, myRole, deviceId, isConnected, connect, updateName, disconnect, addExtraFamily, removeExtraFamily } = useFamilyContext();

  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState(myName ?? "");
  const [nameSaving, setNameSaving] = useState(false);

  const [showFaq, setShowFaq] = useState<number | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // ── 이미 연결된 자녀가 부모님 추가 ──
  const [showAddParentSheet, setShowAddParentSheet] = useState(false);
  const [addParentCode, setAddParentCode] = useState("");
  const [addingParent, setAddingParent] = useState(false);
  const [addParentError, setAddParentError] = useState("");

  const handleAddParent = async () => {
    const code = addParentCode.trim().toUpperCase();
    if (!code || !myName || !myRole) return;
    if (allFamilyCodes.includes(code)) {
      setAddParentError("이미 연결된 가족 코드입니다.");
      return;
    }
    setAddingParent(true); setAddParentError("");
    try {
      await api.joinFamily(code, deviceId, myName, myRole);
      await addExtraFamily(code);
      setShowAddParentSheet(false);
      setAddParentCode("");
    } catch {
      setAddParentError("코드를 확인해주세요. 가족방이 존재하지 않을 수 있어요.");
    } finally {
      setAddingParent(false);
    }
  };

  const handleRemoveFamily = (code: string) => {
    const isPrimary = code === familyCode;
    Alert.alert(
      isPrimary ? "가족방 나가기" : "부모님 연결 해제",
      isPrimary
        ? "이 가족방에서 나가면 모든 연결이 해제됩니다."
        : "이 부모님과의 연결을 해제할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "연결 해제",
          style: "destructive",
          onPress: async () => {
            if (isPrimary) {
              await disconnect();
              router.replace("/");
            } else {
              await removeExtraFamily(code);
            }
          },
        },
      ]
    );
  };

  // ── 코드 연결 (참가) ──
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinRole, setJoinRole] = useState<FamilyRole | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // ── 가족방 만들기 ──
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState<FamilyRole | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createCodeCopied, setCreateCodeCopied] = useState(false);

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    const name = joinName.trim();
    if (!code || !name || !joinRole) return;
    setJoining(true); setJoinError("");
    try {
      await api.joinFamily(code, deviceId, name, joinRole);
      await connect(code, name, joinRole);
      setShowJoinSheet(false);
      router.replace(joinRole === "parent" ? "/parent" : "/child");
    } catch {
      setJoinError("코드를 확인해주세요. 가족방이 존재하지 않을 수 있어요.");
    } finally {
      setJoining(false);
    }
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name || !createRole) return;
    setCreating(true); setCreateError("");
    try {
      const group = await api.createFamily(deviceId, name, createRole);
      setCreatedCode(group.code);
    } catch {
      setCreateError("가족방 만들기에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteCreate = async () => {
    if (!createdCode || !createName.trim() || !createRole) return;
    await connect(createdCode, createName.trim(), createRole);
    setShowCreateSheet(false);
    router.replace(createRole === "parent" ? "/parent" : "/child");
  };

  const copyCreatedCode = async () => {
    if (!createdCode) return;
    await Clipboard.setStringAsync(createdCode);
    setCreateCodeCopied(true);
    setTimeout(() => setCreateCodeCopied(false), 2000);
  };

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const roleLabel = myRole === "parent" ? "부모님" : myRole === "child" ? "자녀" : "미설정";
  const roleColor = myRole === "parent" ? "#6c63ff" : myRole === "child" ? COLORS.neon : "#aaa";
  const roleTextColor = myRole === "parent" ? "#fff" : myRole === "child" ? COLORS.neonText : "#fff";

  const shortId = deviceId ? deviceId.slice(-8).toUpperCase() : "--------";

  const copyCode = async () => {
    if (!familyCode) return;
    await Clipboard.setStringAsync(familyCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setNameSaving(true);
    try {
      await updateName(trimmed);
      setShowNameModal(false);
    } finally {
      setNameSaving(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      "가족 연결 해제",
      "연결을 해제하면 이 기기에서 로그아웃됩니다. 계속하시겠어요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "연결 해제",
          style: "destructive",
          onPress: async () => {
            await disconnect();
            router.replace("/");
          },
        },
      ]
    );
  };

  const openEmail = () => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=DUGO 문의&body=기기 ID: ${shortId}%0A앱 버전: ${APP_VERSION}%0A%0A문의 내용:`
    );
  };

  return (
    <View style={[s.container, { paddingTop: topInset }]}>
      {/* ── 헤더 ── */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </Pressable>
        <Text style={s.headerTitle}>마이페이지</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: bottomInset + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 프로필 카드 ── */}
        <View style={s.profileCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{(myName ?? "?")[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{myName ?? "이름 미설정"}</Text>
            <View style={[s.roleBadge, { backgroundColor: roleColor }]}>
              <Text style={[s.roleText, { color: roleTextColor }]}>{roleLabel}</Text>
            </View>
          </View>
          <Pressable style={s.editBtn} onPress={() => { setNameInput(myName ?? ""); setShowNameModal(true); }}>
            <Ionicons name="pencil" size={15} color={COLORS.navPill} />
            <Text style={s.editBtnText}>수정</Text>
          </Pressable>
        </View>

        {/* ── 접속 코드 ── */}
        <SectionHeader title="가족 연결 코드" />
        <View style={s.card}>
          {isConnected && familyCode ? (
            myRole === "child" ? (
              /* ── 자녀: 연결된 부모님 코드 목록 ── */
              <View>
                {allFamilyCodes.map((code, idx) => (
                  <View key={code} style={[s.parentRow, idx > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                    <View style={s.parentCodeBadge}>
                      <Text style={s.parentCodeText}>{code}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.parentRowLabel}>부모님 {idx + 1}</Text>
                      <Text style={s.parentRowSub}>{idx === 0 ? "기본 연결" : "추가 연결"}</Text>
                    </View>
                    <Pressable style={s.parentRemoveBtn} onPress={() => handleRemoveFamily(code)}>
                      <Ionicons name="close-circle-outline" size={20} color="rgba(0,0,0,0.25)" />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  style={s.addParentBtn}
                  onPress={() => { setAddParentCode(""); setAddParentError(""); setShowAddParentSheet(true); }}
                >
                  <Ionicons name="add-circle" size={18} color={COLORS.navPill} />
                  <Text style={s.addParentBtnText}>부모님 추가하기</Text>
                </Pressable>
              </View>
            ) : (
              /* ── 부모님: 단일 코드 표시 + 복사 ── */
              <>
                <View style={s.codeDisplay}>
                  {familyCode.split("").map((ch, i) => (
                    <View key={i} style={s.codeCell}>
                      <Text style={s.codeCellText}>{ch.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
                <Text style={s.codeHint}>이 코드를 가족과 공유하면 연결됩니다</Text>
                <Pressable style={[s.copyBtn, codeCopied && s.copyBtnDone]} onPress={copyCode}>
                  <Ionicons name={codeCopied ? "checkmark" : "copy-outline"} size={16} color={codeCopied ? COLORS.neonText : COLORS.navPill} />
                  <Text style={[s.copyBtnText, codeCopied && { color: COLORS.neonText }]}>
                    {codeCopied ? "복사됨!" : "코드 복사"}
                  </Text>
                </Pressable>
              </>
            )
          ) : (
            <View style={s.connectSection}>
              <Text style={s.connectSectionTitle}>가족과 연결해보세요</Text>

              {/* 코드로 참가 */}
              <Pressable
                style={s.connectBigBtn}
                onPress={() => { setJoinCode(""); setJoinName(""); setJoinRole(null); setJoinError(""); setShowJoinSheet(true); }}
              >
                <View style={[s.connectBigIcon, { backgroundColor: "rgba(58,90,138,0.1)" }]}>
                  <Ionicons name="enter-outline" size={24} color="#3a5a8a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.connectBigLabel}>코드로 참가하기</Text>
                  <Text style={s.connectBigDesc}>가족이 공유한 6자리 코드 입력</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(0,0,0,0.2)" />
              </Pressable>

              <View style={s.connectOrRow}>
                <View style={s.connectOrLine} />
                <Text style={s.connectOrText}>또는</Text>
                <View style={s.connectOrLine} />
              </View>

              {/* 새 가족방 만들기 */}
              <Pressable
                style={s.connectBigBtn}
                onPress={() => { setCreateName(""); setCreateRole(null); setCreateError(""); setCreatedCode(null); setShowCreateSheet(true); }}
              >
                <View style={[s.connectBigIcon, { backgroundColor: "rgba(212,242,0,0.12)" }]}>
                  <Ionicons name="add-circle-outline" size={24} color={COLORS.navPill} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.connectBigLabel}>새 가족방 만들기</Text>
                  <Text style={s.connectBigDesc}>코드를 생성해서 가족과 공유</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(0,0,0,0.2)" />
              </Pressable>
            </View>
          )}
        </View>

        {/* ── 계정 정보 ── */}
        <SectionHeader title="계정 정보" />
        <View style={s.card}>
          <InfoRow icon="person-outline" label="사용자 이름" value={myName ?? "-"} onPress={() => { setNameInput(myName ?? ""); setShowNameModal(true); }} />
          <Divider />
          <InfoRow icon="finger-print-outline" label="기기 ID" value={shortId} />
          <Divider />
          <InfoRow
            icon="shield-checkmark-outline"
            label="비밀번호"
            value="가족 코드로 인증 (앱 잠금 불필요)"
          />
        </View>

        {/* ── 고객센터 ── */}
        <SectionHeader title="고객센터" />
        <View style={s.card}>
          <InfoRow
            icon="mail-outline"
            label="이메일 문의"
            value={SUPPORT_EMAIL}
            onPress={openEmail}
          />
          <Divider />
          <InfoRow
            icon="chatbubble-ellipses-outline"
            label="앱 사용 가이드"
            value="시작하기, 위치 공유, 안부 보내기"
            onPress={() => Alert.alert(
              "앱 사용 가이드",
              "1. 가족 연결 — 부모님이 코드를 만들고 자녀에게 공유\n2. 위치 공유 — 부모님 화면에서 자동으로 GPS 공유\n3. 안부 보내기 — 자녀가 사진·메시지를 부모님께 전송\n4. 하트 — 부모님이 안부에 하트를 눌러 확인 표시"
            )}
          />
        </View>

        {/* ── 자주 묻는 질문 ── */}
        <SectionHeader title="자주 묻는 질문" />
        <View style={s.card}>
          {FAQ_LIST.map((faq, i) => (
            <View key={i}>
              {i > 0 && <Divider />}
              <Pressable style={s.faqQ} onPress={() => setShowFaq(showFaq === i ? null : i)}>
                <Ionicons name="help-circle-outline" size={17} color={COLORS.navPill} style={{ marginRight: 10 }} />
                <Text style={s.faqQText}>{faq.q}</Text>
                <Ionicons
                  name={showFaq === i ? "chevron-up" : "chevron-down"}
                  size={15}
                  color="rgba(0,0,0,0.25)"
                />
              </Pressable>
              {showFaq === i && (
                <View style={s.faqA}>
                  <Text style={s.faqAText}>{faq.a}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── 앱 정보 ── */}
        <SectionHeader title="앱 정보" />
        <View style={s.card}>
          <InfoRow icon="information-circle-outline" label="버전" value={APP_VERSION} />
          <Divider />
          <InfoRow
            icon="document-text-outline"
            label="개인정보처리방침"
            onPress={() => Alert.alert(
              "개인정보처리방침",
              "DUGO는 다음 정보를 수집합니다:\n\n• 위치 정보 — 가족 위치 공유 목적\n• 사진 — 안부 메시지 전송 목적\n• 기기 식별자 — 가족 코드 연결 목적\n\n수집된 정보는 서비스 제공 외 다른 목적으로 사용되지 않으며, 제3자에게 제공되지 않습니다.\n\n문의: " + SUPPORT_EMAIL
            )}
          />
          <Divider />
          <InfoRow
            icon="star-outline"
            label="앱 평가하기"
            onPress={() => Alert.alert("감사합니다!", "앱 스토어 출시 후 평가가 가능해요 ⭐")}
          />
        </View>

        {/* ── 연결 해제 ── */}
        {isConnected && (
          <View style={[s.card, { marginTop: 8 }]}>
            <InfoRow
              icon="log-out-outline"
              label="가족 연결 해제"
              onPress={handleDisconnect}
              danger
              rightIcon="chevron-forward"
            />
          </View>
        )}

        <Text style={s.bottomNote}>DUGO — 부모님과 자녀를 잇는 안전 연결</Text>
      </ScrollView>

      {/* ── 이름 수정 모달 ── */}
      <Modal visible={showNameModal} transparent animationType="slide" onRequestClose={() => setShowNameModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowNameModal(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
          </Pressable>
          <Pressable onPress={() => {}} style={s.nameSheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>이름 수정</Text>
            <TextInput
              style={s.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="이름을 입력하세요"
              placeholderTextColor={COLORS.textMuted}
              maxLength={20}
              autoFocus={false}
            />
            <Pressable
              style={[s.saveBtn, !nameInput.trim() && { opacity: 0.4 }]}
              onPress={saveName}
              disabled={!nameInput.trim() || nameSaving}
            >
              <Text style={s.saveBtnText}>{nameSaving ? "저장 중..." : "저장"}</Text>
            </Pressable>
          </Pressable>
        </View>
      </Modal>

      {/* ── 부모님 추가 모달 (자녀가 이미 연결된 상태에서 추가) ── */}
      <Modal visible={showAddParentSheet} transparent animationType="slide" onRequestClose={() => setShowAddParentSheet(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowAddParentSheet(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
          </Pressable>
          <Pressable onPress={() => {}} style={s.bigSheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>부모님 추가하기</Text>
            <Text style={s.sheetSub}>부모님이 공유한 6자리 코드를 입력하세요</Text>
            <Text style={s.fieldLabel}>가족 코드</Text>
            <TextInput
              style={[s.sheetInput, s.codeInputStyle]}
              value={addParentCode}
              onChangeText={(t) => setAddParentCode(t.toUpperCase())}
              placeholder="AB1234"
              placeholderTextColor={COLORS.textMuted}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus={false}
            />
            {!!addParentError && <Text style={s.errorText}>{addParentError}</Text>}
            <Pressable
              style={[s.saveBtn, (!addParentCode.trim() || addingParent) && { opacity: 0.4 }]}
              disabled={!addParentCode.trim() || addingParent}
              onPress={handleAddParent}
            >
              {addingParent
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <Text style={s.saveBtnText}>부모님 추가하기</Text>}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 코드로 참가 모달 ── */}
      <Modal visible={showJoinSheet} transparent animationType="slide" onRequestClose={() => setShowJoinSheet(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowJoinSheet(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
          </Pressable>
          <Pressable onPress={() => {}} style={s.bigSheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>코드로 가족 연결</Text>
            <Text style={s.sheetSub}>가족이 공유한 6자리 코드를 입력하세요</Text>

            {/* 역할 선택 */}
            <Text style={s.fieldLabel}>나는</Text>
            <View style={s.roleRow}>
              {([["parent", "부모님"], ["child", "자녀"]] as [FamilyRole, string][]).map(([r, label]) => (
                <Pressable
                  key={r}
                  style={[s.roleChip, joinRole === r && s.roleChipActive]}
                  onPress={() => setJoinRole(r)}
                >
                  <Text style={[s.roleChipText, joinRole === r && s.roleChipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {/* 이름 */}
            <Text style={s.fieldLabel}>이름</Text>
            <TextInput
              style={s.sheetInput}
              value={joinName}
              onChangeText={setJoinName}
              placeholder="가족에게 표시될 이름"
              placeholderTextColor={COLORS.textMuted}
              maxLength={20}
              autoFocus={false}
            />

            {/* 코드 */}
            <Text style={s.fieldLabel}>가족 코드</Text>
            <TextInput
              style={[s.sheetInput, s.codeInputStyle]}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="AB1234"
              placeholderTextColor={COLORS.textMuted}
              maxLength={6}
              autoCapitalize="characters"
            />

            {!!joinError && <Text style={s.errorText}>{joinError}</Text>}

            <Pressable
              style={[s.saveBtn, (!joinCode.trim() || !joinName.trim() || !joinRole || joining) && { opacity: 0.4 }]}
              disabled={!joinCode.trim() || !joinName.trim() || !joinRole || joining}
              onPress={handleJoin}
            >
              {joining ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={s.saveBtnText}>연결하기</Text>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 새 가족방 만들기 모달 ── */}
      <Modal visible={showCreateSheet} transparent animationType="slide" onRequestClose={() => setShowCreateSheet(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowCreateSheet(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
          </Pressable>
          <Pressable onPress={() => {}} style={s.bigSheet}>
            <View style={s.sheetHandle} />
            {createdCode ? (
              /* ── 코드 발급 완료 ── */
              <>
                <View style={{ alignItems: "center", marginBottom: 8 }}>
                  <Ionicons name="checkmark-circle" size={52} color="#4ade80" />
                </View>
                <Text style={[s.sheetTitle, { textAlign: "center" }]}>가족방이 만들어졌어요!</Text>
                <Text style={[s.sheetSub, { textAlign: "center" }]}>아래 코드를 가족에게 공유해주세요</Text>
                <View style={s.createdCodeBox}>
                  <Text style={s.createdCodeText}>{createdCode}</Text>
                </View>
                <Pressable style={[s.copyBtn, createCodeCopied && s.copyBtnDone, { marginBottom: 16 }]} onPress={copyCreatedCode}>
                  <Ionicons name={createCodeCopied ? "checkmark" : "copy-outline"} size={16} color={createCodeCopied ? COLORS.neonText : COLORS.navPill} />
                  <Text style={[s.copyBtnText, createCodeCopied && { color: COLORS.neonText }]}>
                    {createCodeCopied ? "복사됨!" : "코드 복사"}
                  </Text>
                </Pressable>
                <Pressable style={s.saveBtn} onPress={handleCompleteCreate}>
                  <Text style={s.saveBtnText}>시작하기</Text>
                </Pressable>
              </>
            ) : (
              /* ── 입력 폼 ── */
              <>
                <Text style={s.sheetTitle}>새 가족방 만들기</Text>
                <Text style={s.sheetSub}>새 방을 만들고 코드를 가족과 공유해요</Text>

                <Text style={s.fieldLabel}>나는</Text>
                <View style={s.roleRow}>
                  {([["parent", "부모님"], ["child", "자녀"]] as [FamilyRole, string][]).map(([r, label]) => (
                    <Pressable
                      key={r}
                      style={[s.roleChip, createRole === r && s.roleChipActive]}
                      onPress={() => setCreateRole(r)}
                    >
                      <Text style={[s.roleChipText, createRole === r && s.roleChipTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={s.fieldLabel}>이름</Text>
                <TextInput
                  style={s.sheetInput}
                  value={createName}
                  onChangeText={setCreateName}
                  placeholder="가족에게 표시될 이름"
                  placeholderTextColor={COLORS.textMuted}
                  maxLength={20}
                  autoFocus={false}
                />

                {!!createError && <Text style={s.errorText}>{createError}</Text>}

                <Pressable
                  style={[s.saveBtn, (!createName.trim() || !createRole || creating) && { opacity: 0.4 }]}
                  disabled={!createName.trim() || !createRole || creating}
                  onPress={handleCreate}
                >
                  {creating ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text style={s.saveBtnText}>가족방 만들기</Text>
                  )}
                </Pressable>
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },

  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.navPill, paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle:  { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.white, letterSpacing: 0.5 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },

  profileCard:  { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: COLORS.white, borderRadius: 20, padding: 18, marginTop: 20, marginBottom: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.navPill, alignItems: "center", justifyContent: "center" },
  avatarText:   { fontFamily: "Inter_700Bold", fontSize: 22, color: COLORS.white },
  profileName:  { fontFamily: "Inter_700Bold", fontSize: 18, color: COLORS.textDark, marginBottom: 6 },
  roleBadge:    { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  roleText:     { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  editBtn:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(26,34,48,0.07)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  editBtnText:  { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.navPill },

  sectionHeader:{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.textMid, letterSpacing: 0.8, marginTop: 22, marginBottom: 8, marginLeft: 4 },

  card:         { backgroundColor: COLORS.white, borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },

  row:          { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  rowIcon:      { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(26,34,48,0.07)", alignItems: "center", justifyContent: "center" },
  rowLabel:     { fontFamily: "Inter_500Medium", fontSize: 15, color: COLORS.textDark, marginBottom: 1 },
  rowValue:     { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.textMuted },

  divider:      { height: 1, backgroundColor: COLORS.border, marginLeft: 64 },

  codeDisplay:  { flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 20 },
  codeCell:     { width: 44, height: 52, borderRadius: 12, backgroundColor: COLORS.navPill, alignItems: "center", justifyContent: "center" },
  codeCellText: { fontFamily: "Inter_700Bold", fontSize: 22, color: COLORS.neon, letterSpacing: 2 },
  codeHint:     { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.textMuted, textAlign: "center", marginBottom: 14 },
  copyBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginHorizontal: 16, marginBottom: 16, paddingVertical: 12, borderRadius: 50, backgroundColor: "rgba(26,34,48,0.07)" },
  copyBtnDone:  { backgroundColor: COLORS.neon },
  copyBtnText:  { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.navPill },

  connectNowBtn:{ marginTop: 12, backgroundColor: COLORS.neon, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 50 },
  connectNowText:{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.neonText },

  // ── 자녀 다중 부모님 섹션 ──
  parentRow:        { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  parentCodeBadge:  { backgroundColor: COLORS.navPill, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 72, alignItems: "center" },
  parentCodeText:   { fontFamily: "Inter_700Bold", fontSize: 13, color: COLORS.neon, letterSpacing: 2 },
  parentRowLabel:   { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.textDark },
  parentRowSub:     { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  parentRemoveBtn:  { padding: 4 },
  addParentBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginVertical: 12, paddingVertical: 12, borderRadius: 50, borderWidth: 1.5, borderColor: COLORS.navPill },
  addParentBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.navPill },

  // ── 미연결 연결 섹션 ──
  connectSection:   { paddingTop: 4, paddingBottom: 8 },
  connectSectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.textMid, textAlign: "center", marginBottom: 14 },
  connectBigBtn:    { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  connectBigIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  connectBigLabel:  { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.textDark, marginBottom: 2 },
  connectBigDesc:   { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.textMuted },
  connectOrRow:     { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 10, paddingHorizontal: 16 },
  connectOrLine:    { flex: 1, height: 1, backgroundColor: COLORS.border },
  connectOrText:    { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.textMuted },

  // ── 참가 / 만들기 시트 ──
  bigSheet:         { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
  sheetSub:         { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.textMuted, textAlign: "center", marginTop: -10, marginBottom: 20 },
  fieldLabel:       { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.textMid, letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  roleRow:          { flexDirection: "row", gap: 10, marginBottom: 16 },
  roleChip:         { flex: 1, paddingVertical: 10, borderRadius: 50, borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center" },
  roleChipActive:   { backgroundColor: COLORS.navPill, borderColor: COLORS.navPill },
  roleChipText:     { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.textMid },
  roleChipTextActive:{ color: COLORS.white },
  sheetInput:       { backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, fontFamily: "Inter_400Regular", color: COLORS.textDark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  codeInputStyle:   { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 8, textAlign: "center" },
  errorText:        { fontFamily: "Inter_400Regular", fontSize: 13, color: "#ef4444", textAlign: "center", marginBottom: 12 },

  // ── 코드 발급 완료 ──
  createdCodeBox:   { backgroundColor: COLORS.navPill, borderRadius: 18, paddingVertical: 22, marginBottom: 14, alignItems: "center" },
  createdCodeText:  { fontFamily: "Inter_700Bold", fontSize: 34, color: COLORS.neon, letterSpacing: 10 },

  faqQ:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  faqQText:     { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.textDark, flex: 1, lineHeight: 20 },
  faqA:         { backgroundColor: "rgba(26,34,48,0.04)", paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 8, marginBottom: 10, borderRadius: 12 },
  faqAText:     { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.textMid, lineHeight: 20 },

  bottomNote:   { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(0,0,0,0.2)", textAlign: "center", marginTop: 28 },

  nameSheet:    { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  sheetHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.12)", alignSelf: "center", marginBottom: 18 },
  sheetTitle:   { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.textDark, marginBottom: 16, textAlign: "center" },
  nameInput:    { backgroundColor: COLORS.white, borderRadius: 16, padding: 14, fontSize: 16, fontFamily: "Inter_400Regular", color: COLORS.textDark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  saveBtn:      { backgroundColor: COLORS.navPill, paddingVertical: 14, borderRadius: 50, alignItems: "center" },
  saveBtnText:  { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.white },
});
