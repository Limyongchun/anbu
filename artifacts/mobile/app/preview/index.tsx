import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MockFamilyProvider } from "@/context/MockFamilyProvider";
import { setPreviewMode } from "@/lib/api";

import SplashScreen from "@/app/index";
import ChildSignupScreen from "@/app/child-signup";
import ChildScreen from "@/app/child";
import ParentScreen from "@/app/parent";
import ProfileScreen from "@/app/profile";
import SetupScreen from "@/app/setup";

type ScreenKey = "splash" | "signup-mode" | "signup-phone" | "child" | "parent" | "profile" | "setup";

const VALID_SCREENS: ScreenKey[] = ["splash", "signup-mode", "signup-phone", "child", "parent", "profile", "setup"];



function PreviewBackBar({ onBack, title }: { onBack: () => void; title: string }) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  return (
    <View style={[bb.bar, { paddingTop: topInset }]}>
      <Pressable style={bb.btn} onPress={onBack}>
        <Ionicons name="chevron-back" size={18} color="#fff" />
        <Text style={bb.text}>미리보기: {title}</Text>
      </Pressable>
    </View>
  );
}

const SCREEN_META: Record<string, { title: string; role: "child" | "parent"; disconnected?: boolean }> = {
  splash: { title: "스플래시", role: "child", disconnected: true },
  "signup-mode": { title: "회원가입", role: "child", disconnected: true },
  "signup-phone": { title: "휴대폰 인증 폼", role: "child", disconnected: true },
  child: { title: "자녀 홈", role: "child" },
  parent: { title: "부모 액자", role: "parent" },
  profile: { title: "프로필", role: "child" },
  setup: { title: "가족 설정", role: "child" },
};

function WrappedScreen({ id, onBack }: { id: ScreenKey; onBack: () => void }) {
  useEffect(() => {
    setPreviewMode(true);
    return () => { setPreviewMode(false); };
  }, []);

  const meta = SCREEN_META[id] ?? { title: id, role: "child" as const };

  const renderScreen = () => {
    switch (id) {
      case "splash": return <SplashScreen />;
      case "signup-mode": return <ChildSignupScreen />;
      case "signup-phone": return <ChildSignupScreen initialStep="form" initialMode="create" />;
      case "child": return <ChildScreen />;
      case "parent": return <ParentScreen />;
      case "profile": return <ProfileScreen />;
      case "setup": return <SetupScreen />;
      default: return null;
    }
  };

  return (
    <MockFamilyProvider role={meta.role} disconnected={meta.disconnected}>
      <View style={{ flex: 1 }}>
        <PreviewBackBar onBack={onBack} title={meta.title} />
        {renderScreen()}
      </View>
    </MockFamilyProvider>
  );
}

function ScreenCard({ id, label, desc, icon, onPress }: { id: string; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [st.card, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={st.cardIcon}>
        <Ionicons name={icon} size={24} color="#D4843A" />
      </View>
      <View style={st.cardText}>
        <Text style={st.cardLabel}>{label}</Text>
        <Text style={st.cardDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </Pressable>
  );
}

export default function PreviewIndex() {
  if (!__DEV__) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAFAFA", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#999" }}>
          개발 모드에서만 사용 가능합니다
        </Text>
      </View>
    );
  }

  const params = useLocalSearchParams<{ screen?: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const initialScreen = params.screen && VALID_SCREENS.includes(params.screen as ScreenKey)
    ? (params.screen as ScreenKey)
    : null;
  const [activePreview, setActivePreview] = useState<ScreenKey | null>(initialScreen);

  if (activePreview) {
    return <WrappedScreen id={activePreview} onBack={() => setActivePreview(null)} />;
  }

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
        <Text style={st.subtitle}>터치하면 해당 화면을 독립적으로 미리봅니다</Text>

        <ScreenCard id="splash" label="1번 — 스플래시" desc="동영상 배경 + 로고" icon="play-circle" onPress={() => setActivePreview("splash")} />
        <ScreenCard id="signup-mode" label="2번 — 회원가입 모드선택" desc="Apple/Google/휴대폰 인증" icon="log-in" onPress={() => setActivePreview("signup-mode")} />
        <ScreenCard id="signup-phone" label="3번 — 휴대폰 인증 폼" desc="이름/전화번호/OTP 입력" icon="phone-portrait" onPress={() => setActivePreview("signup-phone")} />
        <ScreenCard id="child" label="4번 — 자녀 홈" desc="대시보드 + 5탭 내비게이션" icon="home" onPress={() => setActivePreview("child")} />
        <ScreenCard id="parent" label="5번 — 부모 디지털 액자" desc="사진 슬라이드쇼 + GPS" icon="images" onPress={() => setActivePreview("parent")} />
        <ScreenCard id="profile" label="6번 — 프로필/설정" desc="가족 관리 + 언어 설정" icon="person-circle" onPress={() => setActivePreview("profile")} />
        <ScreenCard id="setup" label="7번 — 가족 설정" desc="역할 선택 + 코드 생성/참가" icon="settings" onPress={() => setActivePreview("setup")} />

        <View style={st.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color="#888" />
          <Text style={st.infoText}>
            모든 화면은 Mock 데이터로 독립 렌더링됩니다.{"\n"}
            상단 돌아가기 바를 터치하면 이 목록으로 돌아옵니다.{"\n"}
            API 호출은 비활성 상태이며 UI 레이아웃만 확인 가능합니다.
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

