import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
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

WebBrowser.maybeCompleteAuthSession();

const splashVideoModule = require("@/assets/splash-video.mp4");
const splashPoster = require("@/assets/splash-poster.jpg");
const logoImage = require("@/assets/images/logo-anbu.png");

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

const googleDiscovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

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

async function handleSocialAuthResult(result: {
  success: boolean;
  accountId: number;
  displayName?: string | null;
  email?: string | null;
  existingFamilies: any[];
}) {
  if (result.existingFamilies && result.existingFamilies.length > 0) {
    const first = result.existingFamilies[0];
    router.replace({
      pathname: "/child",
      params: {
        familyCode: first.familyCode,
        memberName: first.memberName,
        role: first.role,
        accountId: String(result.accountId),
      },
    });
  } else {
    router.push("/lang-select");
  }
}

export default function SplashScreen() {
  const { isConnected, myRole, loading } = useFamilyContext();
  const { isGuestMode, enterGuestMode } = useGuestMode();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const [demoLoading, setDemoLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: false }).start();

    if (Platform.OS === "ios") {
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

  const handleDemoStart = () => {
    if (demoLoading) return;
    console.log("[Login] Demo mode button pressed");
    setDemoLoading(true);
    enterGuestMode();
  };

  const handleAppleLogin = async () => {
    if (appleLoading) return;
    console.log("[Login] Apple login button pressed");
    setAppleLoading(true);

    try {
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36).substring(2),
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      console.log("[Login] Apple auth success, user:", credential.user);

      const result = await api.authApple({
        identityToken: credential.identityToken ?? undefined,
        user: credential.user,
        fullName: credential.fullName
          ? { givenName: credential.fullName.givenName ?? undefined, familyName: credential.fullName.familyName ?? undefined }
          : null,
        email: credential.email,
      });

      console.log("[Login] Apple server auth success, accountId:", result.accountId);
      await handleSocialAuthResult(result);
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") {
        console.log("[Login] Apple login cancelled by user");
      } else {
        console.error("[Login] Apple login failed:", e);
        Alert.alert("로그인 실패", "Apple 로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    console.log("[Login] Google login button pressed");

    if (!GOOGLE_WEB_CLIENT_ID && !GOOGLE_IOS_CLIENT_ID) {
      console.log("[Login] Google client ID not configured");
      Alert.alert("Google 로그인", "Google 로그인 설정이 필요합니다.\nEXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID 환경변수를 설정해주세요.");
      return;
    }

    setGoogleLoading(true);

    try {
      const clientId = Platform.OS === "ios" && GOOGLE_IOS_CLIENT_ID
        ? GOOGLE_IOS_CLIENT_ID
        : GOOGLE_WEB_CLIENT_ID;

      const redirectUri = AuthSession.makeRedirectUri({ scheme: "anbu" });
      console.log("[Login] Google redirect URI:", redirectUri);

      const authRequest = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        scopes: ["openid", "profile", "email"],
        responseType: AuthSession.ResponseType.Token,
        usePKCE: false,
      });

      const result = await authRequest.promptAsync(googleDiscovery);
      console.log("[Login] Google auth result type:", result.type);

      if (result.type === "success") {
        const { access_token } = result.params;
        console.log("[Login] Google auth success, fetching user info");

        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const userInfo = await userInfoResponse.json();
        console.log("[Login] Google user info:", userInfo.email);

        const serverResult = await api.authGoogle({
          accessToken: access_token,
          email: userInfo.email,
          name: userInfo.name,
        });

        console.log("[Login] Google server auth success, accountId:", serverResult.accountId);
        await handleSocialAuthResult(serverResult);
      } else if (result.type === "cancel" || result.type === "dismiss") {
        console.log("[Login] Google login cancelled by user");
      } else {
        console.error("[Login] Google login failed, result:", result);
        Alert.alert("로그인 실패", "Google 로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (e: any) {
      console.error("[Login] Google login error:", e);
      Alert.alert("로그인 실패", "Google 로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
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
                  <Text style={st.demoBtnText}>체험모드로 바로 시작</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

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
                  <Text style={[st.loginBtnText, { color: "#fff" }]}>Apple로 계속하기</Text>
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
                <Text style={[st.loginBtnText, { color: "#333" }]}>Google로 계속하기</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.loginBtn, st.normalBtn, pressed && st.btnPressed]}
            onPress={handleNormalLogin}
            disabled={isAnyLoading}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="person-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={[st.loginBtnText, { color: "#fff" }]}>일반 로그인</Text>
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
