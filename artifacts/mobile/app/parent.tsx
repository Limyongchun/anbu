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

interface FloatHeart { id: number; x: number; delay: number; anim: Animated.Value; }

function HeartParticle({ h }: { h: FloatHeart }) {
  useEffect(() => {
    Animated.timing(h.anim, { toValue: 1, duration: 1400, delay: h.delay, useNativeDriver: false }).start();
  }, []);
  const ty = h.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -150] });
  const op = h.anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.8, 0] });
  const sc = h.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.3, 1.1] });
  return (
    <Animated.View style={{ position: "absolute", left: `${h.x}%` as any, bottom: "35%", transform: [{ translateY: ty }, { scale: sc }], opacity: op, zIndex: 9999 }}>
      <Ionicons name="heart" size={26} color={COLORS.coral} />
    </Animated.View>
  );
}

function formatTime(s: string): string {
  const d = new Date(s), now = new Date();
  const m = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function CircleBtn({ icon, size = 18, bg, color, onPress, style }: {
  icon: keyof typeof Ionicons.glyphMap; size?: number; bg?: string; color?: string; onPress?: () => void; style?: object;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 21, backgroundColor: bg ?? "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 }, style]}>
      <Ionicons name={icon} size={size} color={color ?? COLORS.white} />
    </Pressable>
  );
}

export default function ParentScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, myName, deviceId, isConnected } = useFamilyContext();

  const [photoIdx, setPhotoIdx] = useState(0);
  const [hearts, setHearts] = useState<Record<number, number>>({});
  const [floatHearts, setFloatHearts] = useState<FloatHeart[]>([]);
  const [msgs, setMsgs] = useState<FamilyMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [isSharing, setIsSharing] = useState(true);
  const [currentLoc, setCurrentLoc] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState("");
  const [locUploading, setLocUploading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    const iv = setInterval(() => setPhotoIdx(i => (i + 1) % DEMO_PHOTOS.length), 4000);
    return () => clearInterval(iv);
  }, []);

  const loadMsgs = useCallback(async () => {
    if (!familyCode) return;
    try { setMsgs(await api.getMessages(familyCode)); } catch {}
  }, [familyCode]);

  useEffect(() => {
    if (!familyCode) return;
    setLoadingMsgs(true);
    loadMsgs().finally(() => setLoadingMsgs(false));
    const iv = setInterval(loadMsgs, 10000);
    return () => clearInterval(iv);
  }, [familyCode, loadMsgs]);

  const uploadLoc = useCallback(async (loc: Location.LocationObject, sharing: boolean) => {
    if (!familyCode || !myName || !deviceId) return;
    setLocUploading(true);
    try {
      let addr = "";
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo.length > 0) { const g = geo[0]; addr = [g.city || g.district, g.street].filter(Boolean).join(" "); }
      } catch {}
      setAddress(addr);
      await api.updateLocation(familyCode, { deviceId, memberName: myName, latitude: loc.coords.latitude, longitude: loc.coords.longitude, address: addr, accuracy: loc.coords.accuracy ?? undefined, isSharing: sharing });
      setLastSynced(new Date());
    } catch {}
    finally { setLocUploading(false); }
  }, [familyCode, myName, deviceId]);

  const startWatch = useCallback(async () => {
    if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    try {
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 20000, distanceInterval: 30 },
        loc => { setCurrentLoc(loc); uploadLoc(loc, true); }
      );
    } catch {}
  }, [uploadLoc]);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) { requestPermission(); return; }
    if (isSharing) {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(l => { setCurrentLoc(l); uploadLoc(l, true); }).catch(() => {});
      startWatch();
    } else if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    return () => { if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; } };
  }, [permission?.granted, isSharing]);

  const toggleShare = async () => {
    const next = !isSharing; setIsSharing(next);
    if (currentLoc) await uploadLoc(currentLoc, next);
  };

  const spawnHearts = useCallback(() => {
    const hs: FloatHeart[] = Array.from({ length: 6 }, (_, i) => ({ id: Date.now() + i, x: Math.random() * 70 + 10, delay: i * 80, anim: new Animated.Value(0) }));
    setFloatHearts(p => [...p, ...hs]);
    setTimeout(() => setFloatHearts(p => p.filter(h => !hs.some(n => n.id === h.id))), 1600);
  }, []);

  const heartMsg = async (msg: FamilyMessage) => {
    spawnHearts();
    if (!familyCode) return;
    try {
      const u = await api.heartMessage(familyCode, msg.id);
      setMsgs(p => p.map(m => m.id === u.id ? u : m));
    } catch {
      setMsgs(p => p.map(m => m.id === msg.id ? { ...m, hearts: m.hearts + 1 } : m));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.mapBg }}>
      {floatHearts.map(h => <HeartParticle key={h.id} h={h} />)}

      {/* Photo viewer */}
      <Modal visible={!!viewerUri} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.96)", alignItems: "center", justifyContent: "center" }}>
          <Pressable style={{ position: "absolute", top: 54, right: 20, zIndex: 10 }} onPress={() => setViewerUri(null)}>
            <Ionicons name="close-circle" size={36} color={COLORS.white} />
          </Pressable>
          {viewerUri && <Image source={{ uri: viewerUri }} style={{ width: "100%", height: height * 0.72, borderRadius: 16 }} resizeMode="contain" />}
        </View>
      </Modal>

      {/* ── 상단 헤더 ── */}
      <View style={[s.header, { paddingTop: topInset + 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.logo}>DUGO</Text>
          {myName && <Text style={s.logoSub}>{myName} · 부모님</Text>}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isConnected && familyCode && (
            <View style={s.codeChip}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.neon }} />
              <Text style={s.codeText}>{familyCode}</Text>
            </View>
          )}
          <CircleBtn icon="chevron-back" bg="rgba(255,255,255,0.08)" onPress={() => router.replace("/")} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 32 }}>

        {/* ── GPS 공유 카드 ── */}
        <View style={s.gpsCard}>
          <View style={s.gpsCardLeft}>
            <View style={[s.gpsIcon, { backgroundColor: isSharing ? "rgba(212,242,0,0.15)" : "rgba(255,255,255,0.07)" }]}>
              <Ionicons name="location" size={20} color={isSharing ? COLORS.neon : "rgba(255,255,255,0.4)"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.gpsTitle}>내 위치 공유</Text>
              <Text style={s.gpsSub} numberOfLines={1}>
                {permission?.granted
                  ? isSharing
                    ? (address || (currentLoc ? `${currentLoc.coords.latitude.toFixed(4)}, ${currentLoc.coords.longitude.toFixed(4)}` : "위치 확인 중..."))
                    : "공유 중지됨"
                  : "위치 권한이 필요합니다"}
              </Text>
            </View>
            {locUploading && <ActivityIndicator size="small" color={COLORS.neon} style={{ marginRight: 6 }} />}
            {lastSynced && isSharing && <Text style={s.syncTime}>{formatTime(lastSynced.toISOString())}</Text>}
          </View>

          {permission?.granted ? (
            <Pressable onPress={toggleShare} style={[s.toggle, { backgroundColor: isSharing ? COLORS.neon : "rgba(255,255,255,0.12)" }]}>
              <View style={[s.toggleKnob, { transform: [{ translateX: isSharing ? 22 : 2 }] }]} />
            </Pressable>
          ) : (
            <Pressable onPress={requestPermission} style={s.permBtn}>
              <Text style={s.permBtnText}>허용</Text>
            </Pressable>
          )}

          {permission?.granted && isSharing && (
            <View style={s.gpsActiveBar}>
              <View style={s.gpsActiveDot} />
              <Text style={s.gpsActiveText}>자녀가 내 위치를 실시간으로 확인하고 있어요</Text>
            </View>
          )}
        </View>

        {/* ── 사진 슬라이드쇼 ── */}
        <View style={s.photoCard}>
          <Animated.Image source={{ uri: DEMO_PHOTOS[photoIdx].url }} style={s.photoImg} resizeMode="cover" />
          <View style={s.photoGrad} />
          <View style={s.photoBottom}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View style={s.photoAvatar}><Ionicons name="image" size={14} color={COLORS.white} /></View>
              <View>
                <Text style={s.photoCaption}>자녀가 보낸 사진</Text>
                <Text style={s.photoTime}>슬라이드쇼</Text>
              </View>
            </View>
            <Pressable onPress={() => { setHearts(p => ({ ...p, [photoIdx]: (p[photoIdx] || 0) + 1 })); spawnHearts(); }} style={s.heartBtn}>
              <Ionicons name="heart" size={18} color={(hearts[photoIdx] || 0) > 0 ? COLORS.coral : "rgba(255,255,255,0.5)"} />
              {(hearts[photoIdx] || 0) > 0 && <Text style={s.heartCount}>{hearts[photoIdx]}</Text>}
            </Pressable>
          </View>
          <View style={s.dots}>
            {DEMO_PHOTOS.map((_, i) => (
              <Pressable key={i} onPress={() => setPhotoIdx(i)}
                style={[s.dot, { width: i === photoIdx ? 20 : 6, backgroundColor: i === photoIdx ? COLORS.neon : "rgba(255,255,255,0.3)" }]}
              />
            ))}
          </View>
        </View>

        {/* ── 안부 섹션 헤더 ── */}
        <View style={s.sectionRow}>
          <View style={s.sectionPill}><Text style={s.sectionPillText}>실시간</Text></View>
          <Text style={s.sectionTitle}>안부 메시지</Text>
          <View style={{ flex: 1 }} />
          <View style={s.liveDot} />
          <Text style={s.liveText}>Live</Text>
        </View>

        {loadingMsgs && <ActivityIndicator color={COLORS.neon} style={{ marginVertical: 20 }} />}

        {!loadingMsgs && msgs.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="chatbubble-outline" size={28} color="rgba(255,255,255,0.25)" />
            <Text style={s.emptyText}>
              {isConnected ? "자녀에게 코드를 공유해보세요" : "가족 연결 후 안부가 표시됩니다"}
            </Text>
            {!isConnected && (
              <Pressable style={s.connectBtn} onPress={() => router.push("/setup")}>
                <Text style={s.connectBtnText}>가족 연결하기</Text>
              </Pressable>
            )}
          </View>
        )}

        {msgs.map((msg, idx) => {
          const isFirst = idx === 0;
          return (
            <View key={msg.id} style={[s.msgCard, isFirst && s.msgCardNeon]}>
              {isFirst && (
                <>
                  <View style={s.deco1} /><View style={s.deco2} /><View style={s.deco3} />
                </>
              )}
              <View style={s.msgTop}>
                <View style={[s.msgAvatar, isFirst && s.msgAvatarDark]}>
                  <Text style={[s.msgAvatarText, isFirst && { color: COLORS.neonText }]}>{msg.fromName[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.msgName, isFirst && { color: COLORS.neonText }]}>{msg.fromName}</Text>
                  <Text style={[s.msgTime, isFirst && { color: "rgba(26,37,53,0.6)" }]}>{formatTime(msg.createdAt)}</Text>
                </View>
                <Pressable onPress={() => heartMsg(msg)} style={s.msgHeartBtn}>
                  <Ionicons name="heart" size={20} color={msg.hearts > 0 ? COLORS.coral : (isFirst ? "rgba(26,37,53,0.3)" : "rgba(255,255,255,0.2)")} />
                  {msg.hearts > 0 && <Text style={[s.msgHeartN, isFirst && { color: COLORS.neonText }]}>{msg.hearts}</Text>}
                </Pressable>
              </View>
              {!!msg.text && (
                <Text style={[s.msgText, isFirst && { color: COLORS.neonText }]}>{msg.text}</Text>
              )}
              {msg.photoData && (
                <Pressable onPress={() => setViewerUri(msg.photoData!)} style={{ marginTop: 10, borderRadius: 16, overflow: "hidden" }}>
                  <Image source={{ uri: msg.photoData }} style={{ width: "100%", height: 200, borderRadius: 16 }} resizeMode="cover" />
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ── 개발 스위처 ── */}
      <View style={dev.bar}>
        <Ionicons name="code-slash" size={11} color="rgba(255,255,255,0.3)" />
        <Text style={dev.label}>개발 모드</Text>
        <Pressable onPress={() => router.replace("/child")} style={dev.btn}>
          <Ionicons name="people" size={12} color="rgba(255,255,255,0.7)" /><Text style={dev.btnText}>자녀 화면</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/")} style={[dev.btn, dev.btnAlt]}>
          <Ionicons name="apps" size={12} color="rgba(255,255,255,0.7)" /><Text style={dev.btnText}>홈</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingBottom: 16 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 22, color: COLORS.white, letterSpacing: 3, marginBottom: 2 },
  logoSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.45)" },
  codeChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(212,242,0,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,242,0,0.2)" },
  codeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.neon, letterSpacing: 1 },

  // GPS card
  gpsCard: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  gpsCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 0 },
  gpsIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  gpsTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.white, marginBottom: 3 },
  gpsSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.45)", flex: 1 },
  syncTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.3)" },
  toggle: { width: 50, height: 28, borderRadius: 14, justifyContent: "center", paddingHorizontal: 2, marginLeft: "auto" as any },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.mapBg },
  permBtn: { backgroundColor: COLORS.neon, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, marginLeft: "auto" as any },
  permBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.neonText },
  gpsActiveBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(212,242,0,0.08)", borderRadius: 12, padding: 10, marginTop: 12 },
  gpsActiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.neon },
  gpsActiveText: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.neon, flex: 1 },

  // Photo
  photoCard: { borderRadius: 24, overflow: "hidden", height: Math.min(width * 0.7, 320), backgroundColor: "#111", marginBottom: 24, position: "relative" },
  photoImg: { width: "100%", height: "100%" },
  photoGrad: { position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", backgroundColor: "rgba(0,0,0,0.55)" },
  photoBottom: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", padding: 18 },
  photoAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(212,242,0,0.25)", alignItems: "center", justifyContent: "center" },
  photoCaption: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.white, marginBottom: 2 },
  photoTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.5)" },
  heartBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 30, paddingHorizontal: 12, paddingVertical: 8 },
  heartCount: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.white },
  dots: { position: "absolute", top: 14, right: 16, flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { height: 6, borderRadius: 3 },

  // Section
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, paddingHorizontal: 2 },
  sectionPill: { backgroundColor: COLORS.navPill, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sectionPillText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.7)" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: COLORS.white },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.neon },
  liveText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.neon },

  // Empty
  emptyCard: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 24, padding: 32, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  connectBtn: { backgroundColor: COLORS.neon, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 50, marginTop: 4 },
  connectBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.neonText },

  // Message cards
  msgCard: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 24, padding: 18, marginBottom: 12, overflow: "hidden" },
  msgCardNeon: { backgroundColor: COLORS.neon, borderColor: "transparent" },
  deco1: { position: "absolute", right: -28, top: -28, width: 120, height: 120, borderRadius: 60, borderWidth: 20, borderColor: "rgba(0,0,0,0.06)" },
  deco2: { position: "absolute", right: -65, top: -65, width: 200, height: 200, borderRadius: 100, borderWidth: 20, borderColor: "rgba(0,0,0,0.04)" },
  deco3: { position: "absolute", right: -100, top: -100, width: 280, height: 280, borderRadius: 140, borderWidth: 20, borderColor: "rgba(0,0,0,0.025)" },
  msgTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  msgAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.coral, alignItems: "center", justifyContent: "center" },
  msgAvatarDark: { backgroundColor: "rgba(0,0,0,0.15)" },
  msgAvatarText: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.white },
  msgName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  msgTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)" },
  msgHeartBtn: { alignItems: "center", gap: 3 },
  msgHeartN: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.coral },
  msgText: { fontFamily: "Inter_400Regular", fontSize: 15, color: COLORS.white, lineHeight: 22 },
});

const dev = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  label: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.35)", marginRight: 4 },
  btn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  btnAlt: { backgroundColor: "rgba(212,242,0,0.15)", borderColor: "rgba(212,242,0,0.25)" },
  btnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.75)" },
});
