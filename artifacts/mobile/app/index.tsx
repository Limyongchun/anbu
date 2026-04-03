import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
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

const splashVideoModule = require("@/assets/splash-video.mp4");
const splashPoster = require("@/assets/splash-poster.jpg");
const logoImage = require("@/assets/images/logo-anbu.png");


function NativeVideo() {
  const player = useVideoPlayer(splashVideoModule, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
}

function WebVideo() {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    const asset = Asset.fromModule(splashVideoModule);
    asset.downloadAsync().then(() => {
      setUri(asset.localUri || asset.uri);
    });
  }, []);

  if (!uri) return null;

  return (
    <video
      src={uri}
      autoPlay
      loop
      muted
      playsInline
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      } as any}
    />
  );
}


export default function SplashScreen() {
  const { isConnected, myRole, loading, connect, addExtraFamily, setAccountId } = useFamilyContext();
  const { isGuestMode, enterGuestMode } = useGuestMode();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeIn = useRef(new Animated.Value(0)).current;
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
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: false }).start();

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
        console.log("[SocialAuth] 신규 사용자 → 언어 선택 화면으로 이동");
        router.push("/lang-select");
      }
    } catch (navError: any) {
      console.error("[SocialAuth] 세션 복원/이동 실패:", navError);
      router.push("/lang-select");
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
        router.push("/lang-select");
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
    router.push("/lang-select");
  };

  const isAnyLoading = demoLoading || appleLoading || googleLoading;

  return (
    <View style={st.container}>
      <Image
        source={splashPoster}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        resizeMode="cover"
      />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeIn, pointerEvents: "none" }]}>
        {Platform.OS === "web" ? <WebVideo /> : <NativeVideo />}
      </Animated.View>

      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", pointerEvents: "none" }]} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          st.scrollContent,
          { paddingTop: topInset + 40, paddingBottom: bottomInset + 24 },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[st.logoSection, { opacity: fadeIn }]}>
          <Image source={logoImage} style={st.logo} resizeMode="contain" />
          <Text style={st.tagline}>부모를 섬기는 시간.</Text>
          <Text style={st.taglineEn}>Time to care for your parents</Text>
        </Animated.View>

        <Animated.View style={[st.buttonsSection, { opacity: fadeIn }]}>
          <Pressable
            style={({ pressed }) => [st.demoBtn, pressed && st.btnPressed]}
            onPress={handleDemoStart}
            disabled={isAnyLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LinearGradient
              colors={["#FFD700", "#FFC107"]}
              style={st.demoBtnGradient}
            >
              {demoLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={24} color="#000" style={{ marginRight: 8 }} />
                  <Text style={st.demoBtnText}>체험모드로 시작하기</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
          <Text style={st.demoGuideText}>로그인 없이 주요 기능을 체험할 수 있습니다</Text>

          <View style={st.dividerRow}>
            <View style={st.dividerLine} />
            <Text style={st.dividerText}>또는 로그인</Text>
            <View style={st.dividerLine} />
          </View>

          {(Platform.OS === "ios" || Platform.OS === "web") && (
            <Pressable
              style={({ pressed }) => [st.loginBtn, st.appleBtn, pressed && st.btnPressed]}
              onPress={handleAppleLogin}
              disabled={isAnyLoading}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {appleLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={[st.loginBtnText, { color: "#fff" }]}>Apple 계정으로 계속</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [st.loginBtn, st.googleBtn, pressed && st.btnPressed]}
            onPress={handleGoogleLogin}
            disabled={isAnyLoading}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            {googleLoading ? (
              <ActivityIndicator color="#333" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
                <Text style={[st.loginBtnText, { color: "#333" }]}>Google 계정으로 계속</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.loginBtn, st.normalBtn, pressed && st.btnPressed]}
            onPress={handleNormalLogin}
            disabled={isAnyLoading}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="call-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={[st.loginBtnText, { color: "#fff" }]}>휴대폰 인증으로 계속</Text>
          </Pressable>
        </Animated.View>

        <View style={st.creditWrap}>
          <Text style={st.creditText}>© ANBU Co., Ltd.</Text>
          <Text style={st.creditText}>With Love, For Parents</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 162,
    height: 57,
    marginBottom: 10,
  },
  tagline: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
    color: "#FFFFFF",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  taglineEn: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  buttonsSection: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    gap: 12,
  },
  demoBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  demoBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  demoBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#000",
    letterSpacing: 0.5,
  },
  demoGuideText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: -4,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginHorizontal: 12,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  appleBtn: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  googleBtn: {
    backgroundColor: "#fff",
  },
  normalBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  loginBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  creditWrap: {
    alignItems: "center",
    marginTop: 20,
  },
  creditText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 16,
  },
});
