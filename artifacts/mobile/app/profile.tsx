import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import {
  Alert,
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
import { useFamilyContext } from "@/context/FamilyContext";

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
  const { familyCode, myName, myRole, deviceId, isConnected, updateName, disconnect } = useFamilyContext();

  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState(myName ?? "");
  const [nameSaving, setNameSaving] = useState(false);

  const [showFaq, setShowFaq] = useState<number | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

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
            <>
              <View style={s.codeDisplay}>
                {familyCode.split("").map((ch, i) => (
                  <View key={i} style={s.codeCell}>
                    <Text style={s.codeCellText}>{ch.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.codeHint}>이 코드를 가족과 공유하면 연결됩니다</Text>
              <Pressable
                style={[s.copyBtn, codeCopied && s.copyBtnDone]}
                onPress={copyCode}
              >
                <Ionicons
                  name={codeCopied ? "checkmark" : "copy-outline"}
                  size={16}
                  color={codeCopied ? COLORS.neonText : COLORS.navPill}
                />
                <Text style={[s.copyBtnText, codeCopied && { color: COLORS.neonText }]}>
                  {codeCopied ? "복사됨!" : "코드 복사"}
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <Text style={s.rowValue}>연결된 가족이 없어요</Text>
              <Pressable style={s.connectNowBtn} onPress={() => router.push("/setup")}>
                <Text style={s.connectNowText}>가족 연결하기</Text>
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
