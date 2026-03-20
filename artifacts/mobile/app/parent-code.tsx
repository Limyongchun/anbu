import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
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
import { useLang } from "@/context/LanguageContext";
import { useFamilyContext } from "@/context/FamilyContext";
import { api } from "@/lib/api";

const logoImage = require("@/assets/images/logo-anbu.png");

export default function ParentCodeScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 50 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { t } = useLang();
  const familyCtx = useFamilyContext();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: false }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
    setCode(cleaned);
    if (error) setError("");
  };

  const handleNameChange = (text: string) => {
    setName(text.slice(0, 20));
    if (error) setError("");
  };

  const handleOpenScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        setError((t as any).parentCodeCameraPermission || "카메라 권한이 필요합니다");
        return;
      }
    }
    scanLockRef.current = false;
    setShowScanner(true);
  };

  const handleBarCodeScanned = (result: { data: string }) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    const scanned = result.data.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
    if (scanned.length === 6) {
      setCode(scanned);
      if (error) setError("");
    }
    setShowScanner(false);
  };

  const handleJoin = async () => {
    const trimmedName = name.trim();
    if (code.length !== 6) {
      setError(t.errorCode || "코드를 확인해주세요");
      return;
    }
    if (!trimmedName) {
      setError("이름을 입력해주세요");
      return;
    }

    setJoining(true);
    setError("");
    try {
      console.log("[ParentCode] joining family:", { code, deviceId: familyCtx.deviceId, name: trimmedName, accountId: familyCtx.accountId });
      const member = await api.joinFamily(
        code,
        familyCtx.deviceId,
        trimmedName,
        "parent",
        familyCtx.accountId,
      );
      console.log("[ParentCode] join success:", member);
      await familyCtx.connect(
        code,
        trimmedName,
        "parent",
        null,
        familyCtx.accountId,
      );
      console.log("[ParentCode] context connected, navigating to /parent");
      router.replace("/parent");
    } catch (e: any) {
      console.error("[ParentCode] join failed:", e);
      const msg = e.message || "연결에 실패했습니다";
      setError(msg);
    } finally {
      setJoining(false);
    }
  };

  const canJoin = code.length === 6 && name.trim().length > 0 && !joining;

  return (
    <LinearGradient
      colors={["#D4843A", "#C4692E", "#A85528"]}
      style={st.container}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={[st.backBtn, { top: topInset + 6 }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[st.scrollContent, { paddingTop: topInset + 20, paddingBottom: bottomInset + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={st.topSection}>
            <Image source={logoImage} style={st.logo} resizeMode="contain" />
            <Text style={st.title}>{t.parentCodeTitle}</Text>
            <Text style={st.subtitle}>{t.parentCodeSub}</Text>
          </View>

          <Animated.View style={[st.cardWrap, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            <View style={st.card}>
              <View style={st.iconWrap}>
                <Ionicons name="key-outline" size={36} color="#D4843A" />
              </View>

              <TextInput
                style={st.nameInput}
                value={name}
                onChangeText={handleNameChange}
                placeholder={(t as any).parentCodeNamePlaceholder}
                placeholderTextColor="#bbb"
                maxLength={20}
                editable={!joining}
              />

              <View style={st.codeRow}>
                <TextInput
                  style={st.codeInput}
                  value={code}
                  onChangeText={handleCodeChange}
                  placeholder={t.parentCodePlaceholder}
                  placeholderTextColor="#bbb"
                  maxLength={6}
                  autoCapitalize="characters"
                  textAlign="center"
                  editable={!joining}
                />
                <Pressable
                  style={({ pressed }) => [st.qrBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={handleOpenScanner}
                  disabled={joining}
                >
                  <Ionicons name="qr-code-outline" size={22} color="#D4843A" />
                </Pressable>
              </View>

              {error ? <Text style={st.errorText}>{error}</Text> : null}

              <Pressable
                style={({ pressed }) => [
                  st.joinBtn,
                  { opacity: canJoin ? (pressed ? 0.85 : 1) : 0.5 },
                ]}
                onPress={handleJoin}
                disabled={!canJoin}
              >
                {joining ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    <Text style={st.joinBtnText}>{(t as any).parentCodeJoining}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="link-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={st.joinBtnText}>{t.parentCodeJoinBtn}</Text>
                  </>
                )}
              </Pressable>

              <Text style={st.hintText}>{t.parentCodeHint}</Text>
            </View>
          </Animated.View>

          <View style={st.creditWrap}>
            <Text style={st.creditText}>© ANBU Co., Ltd.</Text>
            <Text style={st.creditText}>With Love, For Parents</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={st.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarCodeScanned}
          />

          <View style={st.scannerOverlay}>
            <View style={st.scannerTopBar}>
              <Pressable style={st.scannerCloseBtn} onPress={() => setShowScanner(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </Pressable>
              <Text style={st.scannerTitle}>{(t as any).parentCodeScanTitle}</Text>
              <View style={{ width: 44 }} />
            </View>

            <View style={st.scannerFrameWrap}>
              <View style={st.scannerFrame}>
                <View style={[st.corner, st.cornerTL]} />
                <View style={[st.corner, st.cornerTR]} />
                <View style={[st.corner, st.cornerBL]} />
                <View style={[st.corner, st.cornerBR]} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 28,
    flexGrow: 1,
  },
  topSection: { alignItems: "center", marginTop: 20 },
  logo: { width: 120, height: 44, marginBottom: 16 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 20,
  },
  cardWrap: {
    marginTop: 20,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(212,132,58,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  nameInput: {
    width: "100%",
    height: 52,
    backgroundColor: "#F5F0EB",
    borderRadius: 14,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#1a1a1a",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    marginBottom: 16,
  },
  codeInput: {
    flex: 1,
    height: 56,
    backgroundColor: "#F5F0EB",
    borderRadius: 14,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#1a1a1a",
    letterSpacing: 8,
    paddingHorizontal: 16,
  },
  qrBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "rgba(212,132,58,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#E53E3E",
    marginBottom: 8,
  },
  joinBtn: {
    width: "100%",
    height: 52,
    backgroundColor: "#D4843A",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  joinBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 17,
  },
  creditWrap: {
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 20,
    paddingBottom: 10,
  },
  creditText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 16,
  },

  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  scannerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  scannerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scannerFrameWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerFrame: {
    width: 240,
    height: 240,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#D4843A",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
});
