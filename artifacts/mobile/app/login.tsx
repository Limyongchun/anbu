import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFamilyContext } from "@/context/FamilyContext";
import { useGuestMode } from "@/context/GuestModeContext";
import { api } from "@/lib/api";

let AppleAuthentication: any = null;
let Google: any = null;
try { AppleAuthentication = require("expo-apple-authentication"); } catch {}
try { Google = require("expo-auth-session/providers/google"); } catch {}

try { WebBrowser.maybeCompleteAuthSession(); } catch {}

export default function LoginScreen() {
  const { isConnected, myRole, loading, connect, addExtraFamily, setAccountId } = useFamilyContext();
  const { isGuestMode, enterGuestMode } = useGuestMode();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const [demoLoading, setDemoLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

  const useGoogleAuth = Google?.useAuthRequest;
  const [googleRequest, googleResponse, googlePromptAsync] = useGoogleAuth
    ? useGoogleAuth({
        iosClientId: iosClientId || undefined,
        webClientId: webClientId || undefined,
      })
    : [null, null, async () => null];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: false }),
    ]).start();

    if (Platform.OS === "ios" && AppleAuthentication?.isAvailableAsync) {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
  }, []);

  useEffect(() => {
    if (isGuestMode && !loading) {
      router.replace("/child");
      return;
    }
    if (!loading && isConnected && myRole) {
      router.replace(myRole === "parent" ? "/parent" : "/child");
    }
  }, [loading, isConnected, myRole, isGuestMode]);

  const handleSocialAuthResult = async (result: {
    success: boolean;
    accountId: number;
    displayName?: string | null;
    email?: string | null;
    existingFamilies: any[];
  }) => {
    try {
      console.log("[SocialAuth] 세션 저장 시작, accountId:", result.accountId);
      await setAccountId(result.accountId);

      if (result.existingFamilies && result.existingFamilies.length > 0) {
        const first = result.existingFamilies[0];
        console.log("[SocialAuth] 기존 가족 복원:", first.familyCode, first.role);
        await connect(
          first.familyCode,
          first.memberName || "사용자",
          first.role as "parent" | "child",
          first.childRole || undefined,
          result.accountId,
        );
        for (let i = 1; i < result.existingFamilies.length; i++) {
          await addExtraFamily(result.existingFamilies[i].familyCode);
        }
        console.log("[SocialAuth] 홈 화면으로 이동");
        router.replace(first.role === "parent" ? "/parent" : "/child");
      } else {
        console.log("[SocialAuth] 신규 사용자 → 역할 선택 화면으로 이동");
        router.push("/role-select");
      }
    } catch (navError: any) {
      console.error("[SocialAuth] 세션 복원/이동 실패:", navError);
      router.push("/role-select");
    }
  };

  const handleDemoStart = () => {
    if (demoLoading) return;
    console.log("[Login] Demo mode button pressed");
    setDemoLoading(true);
    enterGuestMode();
  };

  const handleAppleLogin = async () => {
    if (appleLoading || !AppleAuthentication) return;
    console.log("1. Apple 버튼 클릭");
    setAppleLoading(true);

    try {
      console.log("2. Apple 로그인 요청 시작");
      const rawNonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const nonce = rawNonce;

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      console.log("3. credential 수신:", JSON.stringify(credential, null, 2));
      console.log("4. identityToken:", credential.identityToken ?? "(없음)");
      console.log("5. user:", credential.user);

      if (!credential.user) {
        console.log("❌ Apple user ID 없음 - 로그인 불가");
        Alert.alert("로그인 실패", "Apple 인증 정보를 받지 못했습니다. 다시 시도해주세요.");
        return;
      }

      if (!credential.identityToken) {
        console.log("⚠️ identityToken 없음 - user ID로 계속 진행");
      }

      const displayName = credential.fullName
        ? [credential.fullName.familyName, credential.fullName.givenName].filter(Boolean).join("") || "사용자"
        : "사용자";

      console.log("6. 서버 로그인 처리 시작 (displayName:", displayName, ")");
      const result = await api.authApple({
        identityToken: credential.identityToken ?? undefined,
        user: credential.user,
        fullName: credential.fullName
          ? { givenName: credential.fullName.givenName ?? undefined, familyName: credential.fullName.familyName ?? undefined }
          : { givenName: "사용자", familyName: undefined },
        email: credential.email ?? undefined,
      });

      console.log("7. 서버 응답 수신:", JSON.stringify(result, null, 2));

      if (!result || !result.accountId) {
        console.log("❌ 서버 응답에 accountId 없음 - 강제 이동");
        router.push("/role-select");
        return;
      }

      console.log("8. 세션 복원 시작");
      await handleSocialAuthResult(result);
      console.log("9. 로그인 완료 성공");
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") {
        console.log("❌ Apple 로그인 사용자가 취소함");
      } else {
        console.error("❌ Apple 로그인 에러:", e);
        console.error("❌ 에러 상세:", JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
        Alert.alert("로그인 실패", `Apple 로그인 실패: ${e?.message || e}`);
      }
    } finally {
      setAppleLoading(false);
    }
  };

  useEffect(() => {
    if (!googleResponse) return;
    console.log("[Google] Response type:", googleResponse.type);

    if (googleResponse.type === "success") {
      const { authentication } = googleResponse;
      const accessToken = authentication?.accessToken;
      console.log("[Google] Got access token:", accessToken ? "yes" : "no");

      if (!accessToken) {
        Alert.alert("로그인 실패", "인증 토큰을 받지 못했습니다.");
        setGoogleLoading(false);
        return;
      }

      (async () => {
        try {
          const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const userInfo = await userInfoResponse.json();
          console.log("[Google] User info:", userInfo.email, userInfo.name);

          const serverResult = await api.authGoogle({
            accessToken,
            email: userInfo.email,
            name: userInfo.name,
          });

          console.log("[Google] Server auth success, accountId:", serverResult.accountId);
          await handleSocialAuthResult(serverResult);
        } catch (e: any) {
          console.error("[Google] Server auth error:", e);
          Alert.alert("로그인 실패", "Google 로그인에 실패했습니다. 다시 시도해주세요.");
        } finally {
          setGoogleLoading(false);
        }
      })();
    } else if (googleResponse.type === "cancel" || googleResponse.type === "dismiss") {
      console.log("[Google] Login cancelled by user");
      setGoogleLoading(false);
    } else {
      console.error("[Google] Login failed:", googleResponse);
      Alert.alert("로그인 실패", "Google 로그인에 실패했습니다. 다시 시도해주세요.");
      setGoogleLoading(false);
    }
  }, [googleResponse]);

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    console.log("[Google] Login button pressed");
    console.log("[Google] iOS Client ID:", iosClientId ? iosClientId.substring(0, 20) + "..." : "(없음)");
    console.log("[Google] Web Client ID:", webClientId ? webClientId.substring(0, 20) + "..." : "(없음)");
    console.log("[Google] Platform:", Platform.OS);
    console.log("[Google] Request ready:", !!googleRequest);

    if (!Google) {
      Alert.alert("Google 로그인", "Google 로그인은 앱 빌드(TestFlight)에서 사용 가능합니다.\nExpo Go에서는 지원되지 않습니다.");
      return;
    }

    if (!iosClientId && !webClientId) {
      Alert.alert("Google 로그인", "Google Client ID가 설정되지 않았습니다.");
      return;
    }

    if (!googleRequest) {
      Alert.alert("Google 로그인", "Google 로그인 준비 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setGoogleLoading(true);
    try {
      await googlePromptAsync();
    } catch (e: any) {
      console.error("[Google] promptAsync error:", e);
      Alert.alert("로그인 실패", "Google 로그인에 실패했습니다.");
      setGoogleLoading(false);
    }
  };

  const handleNormalLogin = () => {
    console.log("[Login] Normal login button pressed");
    router.push("/role-select");
  };

  const isAnyLoading = demoLoading || appleLoading || googleLoading;

  return (
    <LinearGradient
      colors={["#D4843A", "#C4692E", "#A85528"]}
      style={st.container}
    >
      <Pressable style={[st.backBtn, { top: topInset + 6 }]} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.7)" />
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          st.scrollContent,
          { paddingTop: topInset + 50, paddingBottom: bottomInset + 24 },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[st.heroSection, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={st.logoText}>ANBU</Text>

          <Text style={st.heroLine}>혼자계신</Text>
          <Text style={st.heroLine}>할머니를 위해</Text>
          <Text style={st.heroLine}>손자가 만든</Text>
          <Text style={st.heroLine}>서비스</Text>
        </Animated.View>

        <Animated.View style={[st.buttonsSection, { opacity: fadeIn }]}>
          {(Platform.OS === "ios" || Platform.OS === "web") && (
            <Pressable
              style={({ pressed }) => [st.loginBtn, pressed && st.btnPressed]}
              onPress={handleAppleLogin}
              disabled={isAnyLoading}
            >
              {appleLoading ? (
                <ActivityIndicator color="#333" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#000" style={{ marginRight: 10 }} />
                  <Text style={st.loginBtnText}>애플 계정으로 계속</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [st.loginBtn, pressed && st.btnPressed]}
            onPress={handleGoogleLogin}
            disabled={isAnyLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#333" size="small" />
            ) : (
              <>
                <Text style={{ fontSize: 18, marginRight: 10, fontWeight: "700" }}>G</Text>
                <Text style={st.loginBtnText}>구글 계정으로 계속</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.loginBtn, st.phoneBtn, pressed && st.btnPressed]}
            onPress={handleNormalLogin}
            disabled={isAnyLoading}
          >
            <Ionicons name="call-outline" size={18} color="#333" style={{ marginRight: 10 }} />
            <Text style={st.loginBtnText}>휴대폰 인증으로 계속</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.demoLink, pressed && { opacity: 0.6 }]}
            onPress={handleDemoStart}
            disabled={isAnyLoading}
          >
            {demoLoading ? (
              <ActivityIndicator color="#FFD700" size="small" />
            ) : (
              <Text style={st.demoLinkText}>
                회원이 아니신가요? <Text style={st.demoLinkBold}>체험모드로 시작</Text>
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    justifyContent: "space-between",
  },
  heroSection: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 20,
  },
  logoText: {
    fontFamily: "Inter_700Bold",
    fontSize: 42,
    color: "#FFD700",
    letterSpacing: 4,
    marginBottom: 28,
  },
  heroLine: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: "#FFFFFF",
    lineHeight: 50,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttonsSection: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    gap: 12,
    paddingBottom: 10,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    minHeight: 54,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  phoneBtn: {
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  loginBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#333",
  },
  demoLink: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  demoLinkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  demoLinkBold: {
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    textDecorationLine: "underline",
  },
});
