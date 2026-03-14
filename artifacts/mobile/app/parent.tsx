import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";
import { api, FamilyMessage } from "@/lib/api";

const { width, height } = Dimensions.get("window");

const DEMO_PHOTOS = [
  { id: 1, url: "https://images.unsplash.com/photo-1511895426328-dc8714191011?w=600&q=80" },
  { id: 2, url: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=600&q=80" },
  { id: 3, url: "https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=600&q=80" },
];

interface FloatingHeart {
  id: number; x: number; delay: number; anim: Animated.Value;
}

function HeartParticle({ heart }: { heart: FloatingHeart }) {
  useEffect(() => {
    Animated.timing(heart.anim, { toValue: 1, duration: 1400, delay: heart.delay, useNativeDriver: false }).start();
  }, []);
  const translateY = heart.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -160] });
  const opacity = heart.anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.8, 0] });
  const scale = heart.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1.3, 1.1] });
  return (
    <Animated.View style={{ position: "absolute", left: `${heart.x}%` as any, bottom: "30%", transform: [{ translateY }, { scale }], opacity, zIndex: 9999 }}>
      <Ionicons name="heart" size={28} color={COLORS.coral} />
    </Animated.View>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return `${Math.floor(diffHr / 24)}일 전`;
}

function DevSwitcher() {
  return (
    <View style={devStyles.bar}>
      <View style={devStyles.label}><Ionicons name="code-slash" size={11} color="rgba(255,255,255,0.4)" /><Text style={devStyles.labelText}>개발 모드</Text></View>
      <Pressable onPress={() => router.replace("/child")} style={({ pressed }) => [devStyles.btn, { opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons name="people" size={13} color="rgba(255,255,255,0.8)" />
        <Text style={devStyles.btnText}>자녀 화면</Text>
      </Pressable>
      <Pressable onPress={() => router.replace("/")} style={({ pressed }) => [devStyles.btn, devStyles.btnHome, { opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons name="apps" size={13} color="rgba(255,255,255,0.8)" />
        <Text style={devStyles.btnText}>홈</Text>
      </Pressable>
    </View>
  );
}

export default function ParentScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, myName, deviceId, isConnected } = useFamilyContext();

  // UI state
  const [photoIndex, setPhotoIndex] = useState(0);
  const [heartedPhotos, setHeartedPhotos] = useState<Record<number, number>>({});
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  // GPS sharing state
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [isSharing, setIsSharing] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>("");
  const [locationUploading, setLocationUploading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  // ── Photo slideshow ──
  useEffect(() => {
    const iv = setInterval(() => setPhotoIndex(i => (i + 1) % DEMO_PHOTOS.length), 3500);
    return () => clearInterval(iv);
  }, []);

  // ── Messages polling ──
  const loadData = useCallback(async () => {
    if (!familyCode) return;
    try { setMessages(await api.getMessages(familyCode)); } catch {}
  }, [familyCode]);

  useEffect(() => {
    if (!familyCode) return;
    setLoadingMsgs(true);
    loadData().finally(() => setLoadingMsgs(false));
    const iv = setInterval(loadData, 10000);
    return () => clearInterval(iv);
  }, [familyCode, loadData]);

  // ── GPS location sharing ──
  const uploadLocation = useCallback(async (loc: Location.LocationObject, sharing: boolean) => {
    if (!familyCode || !myName || !deviceId) return;
    setLocationUploading(true);
    try {
      let addr = "";
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo.length > 0) {
          const g = geo[0];
          addr = [g.city || g.district, g.street].filter(Boolean).join(" ");
        }
      } catch {}
      setAddress(addr);
      await api.updateLocation(familyCode, {
        deviceId, memberName: myName,
        latitude: loc.coords.latitude, longitude: loc.coords.longitude,
        address: addr, accuracy: loc.coords.accuracy ?? undefined, isSharing: sharing,
      });
      setLastSynced(new Date());
    } catch {}
    finally { setLocationUploading(false); }
  }, [familyCode, myName, deviceId]);

  const startWatching = useCallback(async () => {
    if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    try {
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 20000, distanceInterval: 30 },
        loc => { setCurrentLocation(loc); uploadLocation(loc, true); }
      );
      watchRef.current = sub;
    } catch {}
  }, [uploadLocation]);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission();
      return;
    }
    if (isSharing) {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then(loc => { setCurrentLocation(loc); uploadLocation(loc, true); })
        .catch(() => {});
      startWatching();
    } else if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    return () => { if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; } };
  }, [permission?.granted, isSharing]);

  const toggleSharing = async () => {
    const next = !isSharing;
    setIsSharing(next);
    if (currentLocation) await uploadLocation(currentLocation, next);
  };

  // ── Heart animations ──
  const spawnHearts = useCallback(() => {
    const hearts: FloatingHeart[] = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i, x: Math.random() * 70 + 10, delay: i * 80, anim: new Animated.Value(0),
    }));
    setFloatingHearts(p => [...p, ...hearts]);
    setTimeout(() => setFloatingHearts(p => p.filter(h => !hearts.some(n => n.id === h.id))), 1600);
  }, []);

  const heartMessage = async (msg: FamilyMessage) => {
    spawnHearts();
    if (!familyCode) return;
    try {
      const updated = await api.heartMessage(familyCode, msg.id);
      setMessages(p => p.map(m => m.id === updated.id ? updated : m));
    } catch {
      setMessages(p => p.map(m => m.id === msg.id ? { ...m, hearts: m.hearts + 1 } : m));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Floating hearts overlay */}
      {floatingHearts.map(h => <HeartParticle key={h.id} heart={h} />)}

      {/* Photo viewer modal */}
      <Modal visible={!!viewerUri} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
        <View style={styles.viewerOverlay}>
          <Pressable style={styles.viewerClose} onPress={() => setViewerUri(null)}>
            <Ionicons name="close-circle" size={36} color={COLORS.white} />
          </Pressable>
          {viewerUri && <Image source={{ uri: viewerUri }} style={[styles.viewerImg, { height: height * 0.72 }]} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>DUGO</Text>
          {myName && <Text style={styles.headerSub}>{myName} · 부모님 화면</Text>}
        </View>
        <View style={styles.headerRight}>
          {isConnected && familyCode && (
            <View style={styles.codeChip}>
              <Ionicons name="link" size={11} color={COLORS.coral} />
              <Text style={styles.codeChipText}>{familyCode}</Text>
            </View>
          )}
          <Pressable onPress={() => router.replace("/")} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={COLORS.parent.textSub} />
            <Text style={styles.backBtnText}>나가기</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 24 }]} showsVerticalScrollIndicator={false}>

        {/* ── GPS 공유 카드 ── */}
        <View style={styles.gpsCard}>
          <View style={styles.gpsCardHeader}>
            <View style={styles.gpsIconWrap}>
              <Ionicons name="location" size={22} color={isSharing ? "#4ade80" : COLORS.parent.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gpsCardTitle}>내 위치 공유</Text>
              <Text style={styles.gpsCardSub}>
                {permission?.granted
                  ? isSharing
                    ? (currentLocation ? (address || `위도 ${currentLocation.coords.latitude.toFixed(4)}`) : "위치 확인 중...")
                    : "위치 공유가 중지되었습니다"
                  : "위치 권한이 필요합니다"}
              </Text>
            </View>
            {locationUploading && <ActivityIndicator size="small" color="#4ade80" style={{ marginRight: 8 }} />}
            {lastSynced && isSharing && (
              <Text style={styles.syncTime}>{formatTime(lastSynced.toISOString())}</Text>
            )}
            {/* Toggle */}
            {permission?.granted ? (
              <Pressable onPress={toggleSharing} style={[styles.toggleBtn, { backgroundColor: isSharing ? "#4ade80" : "#555" }]}>
                <View style={[styles.toggleKnob, { transform: [{ translateX: isSharing ? 22 : 2 }] }]} />
              </Pressable>
            ) : (
              <Pressable onPress={requestPermission} style={styles.permBtn}>
                <Text style={styles.permBtnText}>허용</Text>
              </Pressable>
            )}
          </View>

          {permission?.granted && isSharing && (
            <View style={[styles.gpsStatus, { backgroundColor: "rgba(74,222,128,0.1)" }]}>
              <View style={styles.gpsStatusDot} />
              <Text style={styles.gpsStatusText}>자녀가 내 위치를 확인할 수 있어요</Text>
            </View>
          )}
          {!permission?.granted && !permission?.canAskAgain && Platform.OS !== "web" && (
            <Pressable onPress={() => { try { Linking.openSettings(); } catch {} }} style={styles.settingsBtn}>
              <Text style={styles.settingsBtnText}>설정에서 위치 권한 허용하기</Text>
            </Pressable>
          )}
        </View>

        {/* ── 사진 슬라이드쇼 ── */}
        <View style={styles.photoCard}>
          <Animated.Image source={{ uri: DEMO_PHOTOS[photoIndex].url }} style={styles.photoImage} resizeMode="cover" />
          <View style={styles.photoOverlay} />
          <View style={styles.photoBottom}>
            <View style={styles.photoCaptionRow}>
              <View style={styles.senderBadge}><Ionicons name="image" size={14} color={COLORS.white} /></View>
              <View>
                <Text style={styles.photoCaption}>자녀가 보낸 사진</Text>
                <Text style={styles.photoTime}>슬라이드쇼</Text>
              </View>
            </View>
            <Pressable onPress={() => { setHeartedPhotos(p => ({ ...p, [photoIndex]: (p[photoIndex] || 0) + 1 })); spawnHearts(); }} style={styles.heartBtn}>
              <Ionicons name="heart" size={20} color={(heartedPhotos[photoIndex] || 0) > 0 ? COLORS.coral : "rgba(255,255,255,0.6)"} />
              {(heartedPhotos[photoIndex] || 0) > 0 && <Text style={styles.heartCount}>{heartedPhotos[photoIndex]}</Text>}
            </Pressable>
          </View>
          <View style={styles.indicators}>
            {DEMO_PHOTOS.map((_, i) => (
              <Pressable key={i} onPress={() => setPhotoIndex(i)}
                style={[styles.indicator, { width: i === photoIndex ? 22 : 7, backgroundColor: i === photoIndex ? COLORS.white : "rgba(255,255,255,0.35)" }]}
              />
            ))}
          </View>
        </View>

        {/* ── 자녀들의 안부 ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>자녀들의 안부</Text>
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>실시간</Text>
            </View>
          </View>

          {loadingMsgs && <View style={styles.loadingRow}><ActivityIndicator size="small" color={COLORS.parent.textSub} /></View>}

          {!loadingMsgs && messages.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="mail-outline" size={32} color={COLORS.parent.textMuted} />
              <Text style={styles.emptyText}>
                {isConnected ? "자녀에게 연결 코드를 공유해보세요" : "가족 연결 후 안부 메시지가 표시됩니다"}
              </Text>
              {!isConnected && (
                <Pressable style={styles.setupBtn} onPress={() => router.push("/setup")}>
                  <Text style={styles.setupBtnText}>가족 연결하기</Text>
                </Pressable>
              )}
            </View>
          )}

          {messages.map(msg => (
            <View key={msg.id} style={styles.msgCard}>
              <View style={styles.msgCardTop}>
                <View style={styles.msgAvatar}>
                  <Text style={styles.msgAvatarText}>{msg.fromName[0]}</Text>
                </View>
                <View style={styles.msgBody}>
                  <Text style={styles.msgSender}>{msg.fromName} · {formatTime(msg.createdAt)}</Text>
                  {!!msg.text && <Text style={styles.msgText}>{msg.text}</Text>}
                </View>
                <Pressable onPress={() => heartMessage(msg)} style={styles.msgHeartBtn}>
                  <Ionicons name="heart" size={22} color={msg.hearts > 0 ? COLORS.coral : "rgba(255,255,255,0.3)"} />
                  <Text style={styles.msgHeartCount}>{msg.hearts}</Text>
                </Pressable>
              </View>
              {msg.photoData && (
                <Pressable onPress={() => setViewerUri(msg.photoData!)} style={styles.msgPhotoWrap}>
                  <Image source={{ uri: msg.photoData }} style={styles.msgPhoto} resizeMode="cover" />
                  <View style={styles.msgPhotoOverlay}>
                    <Ionicons name="expand" size={16} color={COLORS.white} />
                    <Text style={styles.msgPhotoHint}>탭하면 크게 볼 수 있어요</Text>
                  </View>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <DevSwitcher />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parent.bg },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: COLORS.parent.text, letterSpacing: 2 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.parent.textSub, marginTop: 2 },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 6 },
  codeChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(232,133,106,0.12)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(232,133,106,0.2)" },
  codeChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.coral, letterSpacing: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  backBtnText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.parent.textSub },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // GPS card
  gpsCard: { backgroundColor: COLORS.parent.bgCard, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.parent.bgCardBorder },
  gpsCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  gpsIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(74,222,128,0.1)", alignItems: "center", justifyContent: "center" },
  gpsCardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.parent.text, marginBottom: 3 },
  gpsCardSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.parent.textSub, flexShrink: 1 },
  syncTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.parent.textMuted },
  toggleBtn: { width: 50, height: 28, borderRadius: 14, justifyContent: "center", paddingHorizontal: 2 },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.white },
  permBtn: { backgroundColor: COLORS.coral, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  permBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.white },
  gpsStatus: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 10, marginTop: 12 },
  gpsStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80" },
  gpsStatusText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "#4ade80" },
  settingsBtn: { marginTop: 10, alignItems: "center" },
  settingsBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.coral },

  // Photo slideshow
  photoCard: { borderRadius: 24, overflow: "hidden", height: Math.min(width * 0.7, 340), backgroundColor: "#111", marginBottom: 20, position: "relative" },
  photoImage: { width: "100%", height: "100%" },
  photoOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", backgroundColor: "rgba(0,0,0,0.5)" },
  photoBottom: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 18 },
  photoCaptionRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  senderBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" },
  photoCaption: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.white, marginBottom: 2 },
  photoTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)" },
  heartBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 30, paddingHorizontal: 14, paddingVertical: 8 },
  heartCount: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.white },
  indicators: { position: "absolute", top: 14, right: 16, flexDirection: "row", alignItems: "center", gap: 5 },
  indicator: { height: 6, borderRadius: 3 },

  // Messages section
  section: { marginBottom: 20 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.parent.textSub, letterSpacing: 2, textTransform: "uppercase" },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(74,222,128,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: "rgba(74,222,128,0.2)" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  liveText: { fontFamily: "Inter_500Medium", fontSize: 11, color: "#4ade80" },
  loadingRow: { alignItems: "center", padding: 20 },
  emptyCard: { alignItems: "center", backgroundColor: COLORS.parent.bgCard, borderRadius: 20, padding: 32, borderWidth: 1, borderColor: COLORS.parent.bgCardBorder, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.parent.textMuted, textAlign: "center" },
  setupBtn: { backgroundColor: COLORS.coral, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  setupBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.white },

  // Message cards
  msgCard: { backgroundColor: COLORS.parent.bgCard, borderWidth: 1, borderColor: COLORS.parent.bgCardBorder, borderRadius: 20, padding: 16, marginBottom: 12, overflow: "hidden" },
  msgCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  msgAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" },
  msgAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.white },
  msgBody: { flex: 1 },
  msgSender: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.coral, marginBottom: 5 },
  msgText: { fontFamily: "Inter_400Regular", fontSize: 15, color: COLORS.parent.text, lineHeight: 22 },
  msgHeartBtn: { alignItems: "center", paddingTop: 2, gap: 3 },
  msgHeartCount: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.coral },
  msgPhotoWrap: { marginTop: 12, borderRadius: 14, overflow: "hidden", position: "relative" },
  msgPhoto: { width: "100%", height: 200, borderRadius: 14 },
  msgPhotoOverlay: { position: "absolute", bottom: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  msgPhotoHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.white },

  // Photo viewer
  viewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  viewerClose: { position: "absolute", top: 54, right: 20, zIndex: 10 },
  viewerImg: { width: "100%", borderRadius: 16 },
});

const devStyles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  label: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: 4 },
  labelText: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.35)" },
  btn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  btnHome: { backgroundColor: "rgba(232,133,106,0.18)", borderColor: "rgba(232,133,106,0.25)" },
  btnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.75)" },
});
