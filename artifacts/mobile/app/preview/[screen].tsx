import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

function ScreenRenderer({ id }: { id: string }) {
  switch (id) {
    case "splash":
      return <SplashScreen />;
    case "signup-mode":
      return <ChildSignupScreen />;
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
    setPreviewMode(true);
    return () => { setPreviewMode(false); };
  }, []);

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
