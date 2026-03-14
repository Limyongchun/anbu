import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";
import { api, FamilyMessage, LocationData } from "@/lib/api";

const { width, height } = Dimensions.get("window");
type Tab = "지도" | "안부" | "선물샵";

const GIFTS = [
  { id: 1, name: "제철 과일 선물세트", price: "39,000원", icon: "nutrition" as const, category: "식품", popular: true },
  { id: 2, name: "한우 정육 세트",     price: "89,000원", icon: "restaurant" as const, category: "식품", popular: false },
  { id: 3, name: "홍삼 건강세트",      price: "59,000원", icon: "leaf" as const,       category: "건강", popular: true },
  { id: 4, name: "꽃바구니 선물",      price: "45,000원", icon: "flower" as const,     category: "꽃",  popular: false },
  { id: 5, name: "전통 한과 세트",     price: "32,000원", icon: "cafe" as const,       category: "식품", popular: false },
  { id: 6, name: "건강기능식품",       price: "75,000원", icon: "fitness" as const,    category: "건강", popular: true },
];

function formatTime(dateStr: string): string {
  const d = new Date(dateStr), now = new Date();
  const m = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// ─── 원형 아이콘 버튼 ────────────────────────────────────────────────────────
function CircleBtn({
  icon, size = 20, bg = "rgba(255,255,255,0.15)", color = COLORS.white,
  onPress, style,
}: {
  icon: keyof typeof Ionicons.glyphMap; size?: number;
  bg?: string; color?: string; onPress?: () => void; style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.75 : 1 }, style]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

// ─── 하단 플로팅 필 네비 ──────────────────────────────────────────────────────
function FloatNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { tab: Tab; icon: keyof typeof Ionicons.glyphMap }[] = [
    { tab: "지도",  icon: "map" },
    { tab: "안부",  icon: "chatbubble-ellipses" },
    { tab: "선물샵", icon: "gift" },
  ];
  return (
    <View style={nav.pill}>
      {tabs.map(({ tab, icon }) => {
        const isActive = active === tab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={({ pressed }) => [nav.item, isActive && nav.itemActive, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name={icon} size={21} color={isActive ? COLORS.neonText : "rgba(255,255,255,0.45)"} />
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── 지도 화면 ────────────────────────────────────────────────────────────────
function MapScreen({ familyCode, topInset, navH }: { familyCode: string | null; topInset: number; navH: number }) {
  const [locs, setLocs] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const cardAnim = useRef(new Animated.Value(60)).current;
  const cardAlpha = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    if (!familyCode) return;
    try { setLocs(await api.getAllLocations(familyCode)); } catch {}
  }, [familyCode]);

  useEffect(() => {
    if (!familyCode) return;
    setLoading(true);
    load().finally(() => setLoading(false));
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [familyCode, load]);

  const parentLoc = locs.find(l => l.role === "parent" && l.isSharing) ?? null;

  useEffect(() => {
    if (!parentLoc) return;
    Animated.parallel([
      Animated.spring(cardAnim, { toValue: 0, useNativeDriver: false }),
      Animated.timing(cardAlpha, { toValue: 1, duration: 350, useNativeDriver: false }),
    ]).start();
  }, [!!parentLoc]);

  const { latitude: lat = 37.5665, longitude: lon = 126.978 } = parentLoc ?? {};
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.009}%2C${lat - 0.006}%2C${lon + 0.009}%2C${lat + 0.006}&layer=mapnik&marker=${lat}%2C${lon}`;

  const openMaps = () => {
    if (!parentLoc) return;
    const url = Platform.OS === "ios"
      ? `maps://maps.apple.com/maps?q=${lat},${lon}`
      : Platform.OS === "android" ? `geo:${lat},${lon}?q=${lat},${lon}`
      : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`));
  };

  const minsAgo = parentLoc ? Math.floor((Date.now() - new Date(parentLoc.updatedAt).getTime()) / 60000) : 0;
  const isRecent = minsAgo < 5;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* ── 지도 타일 ── */}
      {Platform.OS === "web" ? (
        <View style={[StyleSheet.absoluteFillObject, { overflow: "hidden" }]}>
          {/* @ts-ignore */}
          <iframe
            src={mapSrc}
            style={{ width: "100%", height: "100%", border: "none",
              filter: "invert(92%) hue-rotate(200deg) saturate(0.65) brightness(0.85)" }}
            title="부모님 위치"
          />
        </View>
      ) : (
        // Native: dark grid map
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: COLORS.mapBg }]}>
          {Array.from({ length: 14 }).map((_, i) => (
            <View key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${(i + 1) * 7}%` as any, height: 1, backgroundColor: "rgba(255,255,255,0.05)" }} />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${(i + 1) * 9}%` as any, width: 1, backgroundColor: "rgba(255,255,255,0.05)" }} />
          ))}
          {parentLoc && (
            <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}>
              <PulsingPin />
            </View>
          )}
        </View>
      )}

      {/* ── 상단 어두운 그라디언트 ── */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: topInset + 90, backgroundColor: "rgba(26,34,48,0.6)" }} pointerEvents="none" />
      {/* ── 하단 어두운 그라디언트 ── */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 260, backgroundColor: "rgba(26,34,48,0.55)" }} pointerEvents="none" />

      {/* ── 상단 바 ── */}
      <View style={[map.topBar, { paddingTop: topInset + 14 }]}>
        {/* 부모님 아바타 */}
        <View style={map.avatar}>
          <Ionicons name="person" size={18} color={COLORS.white} />
        </View>

        {/* 이름 + 위치 */}
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={map.locTitle} numberOfLines={1}>
            {parentLoc ? parentLoc.memberName : "부모님"}
          </Text>
          <Text style={map.locSub} numberOfLines={1}>
            {parentLoc
              ? (parentLoc.address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`)
              : (familyCode ? "위치 공유 기다리는 중..." : "가족 코드를 연결해주세요")}
          </Text>
        </View>

        {/* 새로고침 버튼 */}
        <CircleBtn icon="refresh" size={18} onPress={load} />
      </View>

      {/* ── DUGO 플로팅 브랜드 칩 ── */}
      <View style={map.brandChip} pointerEvents="none">
        {loading
          ? <ActivityIndicator size="small" color={COLORS.neonText} />
          : <View style={map.brandDot} />}
        <Text style={map.brandText}>DUGO</Text>
      </View>

      {/* ── 지도 앱으로 이동 버튼 ── */}
      <View style={{ position: "absolute", right: 16, top: "42%" }}>
        <CircleBtn icon="locate" size={20} bg="rgba(26,34,48,0.75)" onPress={openMaps} />
      </View>

      {/* ── 부모님 위치 없음 안내 ── */}
      {!loading && !parentLoc && (
        <View style={map.emptyWrap}>
          <View style={map.emptyCard}>
            <Ionicons name="location-outline" size={28} color={COLORS.neon} style={{ marginBottom: 10 }} />
            <Text style={map.emptyTitle}>
              {!familyCode ? "가족을 연결해주세요" : "위치 기다리는 중"}
            </Text>
            <Text style={map.emptySub}>
              {!familyCode ? "가족 코드로 부모님과 연결하세요" : "부모님이 앱을 실행하면 표시됩니다"}
            </Text>
            {!familyCode && (
              <Pressable style={map.emptyBtn} onPress={() => router.push("/setup")}>
                <Text style={map.emptyBtnText}>연결하기</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* ── 부모님 정보 카드 ── */}
      {parentLoc && (
        <Animated.View style={[map.infoCard, { transform: [{ translateY: cardAnim }], opacity: cardAlpha, bottom: navH + 24 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {/* 왼쪽: 이름 + 주소 */}
            <View style={{ flex: 1 }}>
              <View style={map.infoRow}>
                <View style={[map.statusDot, { backgroundColor: isRecent ? COLORS.neon : "#f59e0b" }]} />
                <Text style={map.infoStatus}>{isRecent ? "안전 · 실시간" : `${minsAgo}분 전`}</Text>
              </View>
              <Text style={map.infoName}>{parentLoc.memberName}</Text>
              <Text style={map.infoAddress} numberOfLines={2}>
                {parentLoc.address || `${lat.toFixed(5)}, ${lon.toFixed(5)}`}
                {parentLoc.accuracy != null ? `  ±${Math.round(parentLoc.accuracy)}m` : ""}
              </Text>
            </View>
            {/* 오른쪽: 아이콘 버튼 세로 정렬 */}
            <View style={{ alignItems: "center", gap: 8 }}>
              <CircleBtn icon="call"     size={17} bg="rgba(212,242,0,0.18)" color={COLORS.neon}            style={{ width: 40, height: 40, borderRadius: 20 }} onPress={() => Linking.openURL("tel:")} />
              <CircleBtn icon="navigate" size={17} bg="rgba(255,255,255,0.1)" color="rgba(255,255,255,0.8)" style={{ width: 40, height: 40, borderRadius: 20 }} onPress={openMaps} />
              <CircleBtn icon="refresh"  size={17} bg="rgba(255,255,255,0.08)" color="rgba(255,255,255,0.45)" style={{ width: 40, height: 40, borderRadius: 20 }} onPress={load} />
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function PulsingPin() {
  const s = useRef(new Animated.Value(1)).current;
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(s, { toValue: 2.4, duration: 900, useNativeDriver: false }),
        Animated.timing(o, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(s, { toValue: 1, duration: 0, useNativeDriver: false }),
        Animated.timing(o, { toValue: 0.5, duration: 0, useNativeDriver: false }),
      ]),
    ]));
    a.start(); return () => a.stop();
  }, []);
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.neon, transform: [{ scale: s }], opacity: o }} />
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.neon, borderWidth: 3, borderColor: COLORS.mapBg }} />
    </View>
  );
}

// ─── 안부 화면 ────────────────────────────────────────────────────────────────
function AnbuScreen({ familyCode, myName, myRole, deviceId, topInset }: {
  familyCode: string | null; myName: string | null; myRole: string | null; deviceId: string; topInset: number;
}) {
  const [subView, setSubView] = useState<"messages" | "gallery">("messages");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<FamilyMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerMid, setViewerMid] = useState<number | null>(null);
  const [delId, setDelId] = useState<number | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const photos = msgs.filter(m => !!m.photoData);
  const THUMB = (width - 52) / 3;

  const load = useCallback(async () => {
    if (!familyCode) return;
    try { setMsgs(await api.getMessages(familyCode)); } catch {}
  }, [familyCode]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [load]);

  const pickLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.6, base64: true });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; setPhoto(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri); }
  };

  const pickCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6, base64: true });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; setPhoto(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri); }
  };

  const pickPhoto = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options: ["취소", "카메라", "갤러리"], cancelButtonIndex: 0 }, i => { if (i === 1) pickCamera(); if (i === 2) pickLibrary(); });
    } else {
      Alert.alert("사진", "", [{ text: "취소", style: "cancel" }, { text: "카메라", onPress: pickCamera }, { text: "갤러리", onPress: pickLibrary }]);
    }
  };

  const send = async () => {
    if ((!text.trim() && !photo) || !familyCode || !myName || !myRole) return;
    setSending(true);
    try {
      const m = await api.sendMessage(familyCode, deviceId, myName, myRole, text.trim(), photo || null);
      setMsgs(p => [m, ...p]);
      setText(""); setPhoto(null); setSent(true); setShowCompose(false);
      setTimeout(() => setSent(false), 2500);
    } catch {}
    finally { setSending(false); }
  };

  const del = async (id: number) => {
    if (!familyCode) return;
    Alert.alert("삭제", "이 메시지를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: async () => {
        setDelId(id);
        try { await api.deleteMessage(familyCode, id, deviceId); setMsgs(p => p.filter(m => m.id !== id)); }
        catch { Alert.alert("오류", "삭제 실패"); }
        finally { setDelId(null); }
      }},
    ]);
  };

  const canDel = (m: FamilyMessage) => m.deviceId === deviceId;

  return (
    <>
      {/* Photo viewer */}
      {viewerUri && (
        <Modal visible transparent animationType="fade" onRequestClose={() => { setViewerUri(null); setViewerMid(null); }}>
          <View style={anbu.viewer}>
            <Pressable style={{ position: "absolute", top: 54, right: 20, zIndex: 10 }} onPress={() => { setViewerUri(null); setViewerMid(null); }}>
              <Ionicons name="close-circle" size={36} color={COLORS.white} />
            </Pressable>
            <Image source={{ uri: viewerUri }} style={{ width: "100%", height: height * 0.7, borderRadius: 14 }} resizeMode="contain" />
            {viewerMid !== null && msgs.find(m => m.id === viewerMid)?.deviceId === deviceId && (
              <Pressable style={anbu.viewerDel} onPress={() => { del(viewerMid!); setViewerUri(null); setViewerMid(null); }}>
                <Ionicons name="trash-outline" size={17} color="#fff" />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" }}>삭제</Text>
              </Pressable>
            )}
          </View>
        </Modal>
      )}

      {/* Compose sheet */}
      <Modal visible={showCompose} transparent animationType="slide" onRequestClose={() => setShowCompose(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={() => setShowCompose(false)}>
          <View style={anbu.sheet}>
            <View style={anbu.sheetHandle} />
            <Text style={anbu.sheetTitle}>안부 보내기</Text>
            {photo && (
              <View style={{ borderRadius: 14, overflow: "hidden", marginBottom: 12, height: 140, position: "relative" }}>
                <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <Pressable style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16 }} onPress={() => setPhoto(null)}>
                  <Ionicons name="close-circle" size={22} color="#fff" />
                </Pressable>
              </View>
            )}
            <TextInput style={anbu.sheetInput} value={text} onChangeText={setText}
              placeholder="부모님께 안부를 전해요..." placeholderTextColor={COLORS.textMuted}
              multiline maxLength={200} autoFocus />
            <View style={anbu.sheetBar}>
              <CircleBtn icon="camera" size={18} bg={COLORS.child.accentSoft} color={COLORS.neonText} style={{ width: 40, height: 40, borderRadius: 20 }} onPress={pickCamera} />
              <CircleBtn icon="images" size={18} bg={COLORS.child.accentSoft} color={COLORS.neonText} style={{ width: 40, height: 40, borderRadius: 20 }} onPress={pickLibrary} />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}>{text.length}/200</Text>
              <View style={{ flex: 1 }} />
              <Pressable onPress={send} style={[anbu.sendBtn, ((!text.trim() && !photo) || sending || !familyCode) && { opacity: 0.35 }]}
                disabled={(!text.trim() && !photo) || sending || !familyCode}>
                {sending ? <ActivityIndicator size="small" color={COLORS.neonText} /> : <Ionicons name="send" size={18} color={COLORS.neonText} />}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: topInset + 80, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* ── 헤더 타이포 ── */}
        <View style={anbu.header}>
          <View style={anbu.realtimePill}><Text style={anbu.realtimeText}>실시간</Text></View>
          <Text style={anbu.bigTitle}>안부{"\n"}메시지</Text>
        </View>

        {/* ── 탭 세그먼트 ── */}
        <View style={anbu.segment}>
          <Pressable onPress={() => setSubView("messages")} style={[anbu.segBtn, subView === "messages" && anbu.segBtnOn]}>
            <Text style={[anbu.segText, subView === "messages" && anbu.segTextOn]}>메시지</Text>
          </Pressable>
          <Pressable onPress={() => setSubView("gallery")} style={[anbu.segBtn, subView === "gallery" && anbu.segBtnOn]}>
            <Text style={[anbu.segText, subView === "gallery" && anbu.segTextOn]}>
              갤러리{photos.length > 0 ? ` ${photos.length}` : ""}
            </Text>
          </Pressable>
        </View>

        {sent && (
          <View style={anbu.toast}>
            <Ionicons name="checkmark-circle" size={15} color={COLORS.neonText} />
            <Text style={anbu.toastText}>부모님께 전송됐어요</Text>
          </View>
        )}

        {!familyCode && (
          <View style={anbu.connectCard}>
            <Text style={anbu.connectTitle}>가족 코드를 연결하면{"\n"}안부를 주고받을 수 있어요</Text>
            <Pressable style={anbu.connectBtn} onPress={() => router.push("/setup")}>
              <Text style={anbu.connectBtnText}>연결하기</Text>
            </Pressable>
          </View>
        )}

        {subView === "messages" && (
          <>
            {loading && <ActivityIndicator color={COLORS.neon} style={{ marginVertical: 20 }} />}
            {!loading && msgs.length === 0 && familyCode && (
              <View style={anbu.empty}>
                <Ionicons name="chatbubble-outline" size={32} color={COLORS.textMuted} />
                <Text style={anbu.emptyText}>아직 보낸 메시지가 없어요</Text>
              </View>
            )}
            {msgs.map((msg, idx) => {
              const isFirst = idx === 0;
              return (
                <View key={msg.id} style={[anbu.card, isFirst && anbu.cardNeon]}>
                  {/* 장식 원 (첫 번째 카드) */}
                  {isFirst && (
                    <>
                      <View style={anbu.deco1} />
                      <View style={anbu.deco2} />
                      <View style={anbu.deco3} />
                    </>
                  )}
                  <View style={anbu.cardTop}>
                    <View style={[anbu.cardAvatar, isFirst && anbu.cardAvatarDark]}>
                      <Ionicons name="person" size={13} color={isFirst ? COLORS.neon : COLORS.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[anbu.cardName, isFirst && anbu.cardNameDark]}>{msg.fromName}</Text>
                      <Text style={[anbu.cardTime, isFirst && anbu.cardTimeDark]}>{formatTime(msg.createdAt)}</Text>
                    </View>
                    {msg.hearts > 0 && (
                      <View style={anbu.cardHeart}>
                        <Ionicons name="heart" size={11} color={isFirst ? COLORS.neonText : COLORS.coral} />
                        <Text style={[anbu.cardHeartText, isFirst && { color: COLORS.neonText }]}>{msg.hearts}</Text>
                      </View>
                    )}
                    {canDel(msg) && (
                      <Pressable onPress={() => del(msg.id)} disabled={delId === msg.id} style={{ marginLeft: 6 }}>
                        {delId === msg.id
                          ? <ActivityIndicator size="small" color={isFirst ? COLORS.neonText : "#ef4444"} />
                          : <Ionicons name="trash-outline" size={16} color={isFirst ? COLORS.neonText : "#ef4444"} />}
                      </Pressable>
                    )}
                  </View>
                  {!!msg.text && (
                    <Text style={[anbu.cardText, isFirst && anbu.cardTextDark]}>{msg.text}</Text>
                  )}
                  {msg.photoData && (
                    <Pressable onPress={() => { setViewerUri(msg.photoData!); setViewerMid(msg.id); }}>
                      <Image source={{ uri: msg.photoData }} style={anbu.cardPhoto} resizeMode="cover" />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </>
        )}

        {subView === "gallery" && (
          <>
            {loading && <ActivityIndicator color={COLORS.neon} style={{ marginVertical: 24 }} />}
            {!loading && photos.length === 0 && (
              <View style={anbu.empty}>
                <Ionicons name="images-outline" size={32} color={COLORS.textMuted} />
                <Text style={anbu.emptyText}>보낸 사진이 없어요</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {photos.map(m => (
                <View key={m.id} style={{ width: THUMB, height: THUMB, borderRadius: 16, overflow: "visible", position: "relative" }}>
                  <Pressable onPress={() => { setViewerUri(m.photoData!); setViewerMid(m.id); }} style={{ flex: 1, borderRadius: 16, overflow: "hidden" }}>
                    <Image source={{ uri: m.photoData! }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.38)", padding: 4, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: "#fff", textAlign: "center" }}>{formatTime(m.createdAt)}</Text>
                    </View>
                  </Pressable>
                  {canDel(m) && (
                    <Pressable style={{ position: "absolute", top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", zIndex: 10 }} onPress={() => del(m.id)}>
                      <Ionicons name="trash" size={12} color="#fff" />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── FAB 작성 버튼 ── */}
      {subView === "messages" && familyCode && (
        <Pressable style={anbu.fab} onPress={() => setShowCompose(true)}>
          <Ionicons name="add" size={26} color={COLORS.neonText} />
        </Pressable>
      )}
    </>
  );
}

// ─── 선물샵 화면 ──────────────────────────────────────────────────────────────
function GiftScreen({ topInset }: { topInset: number }) {
  const [sel, setSel] = useState<typeof GIFTS[0] | null>(null);
  const [bought, setBought] = useState<typeof GIFTS[0] | null>(null);
  const [filter, setFilter] = useState("전체");
  const cats = ["전체", "식품", "건강", "꽃"];
  const filtered = filter === "전체" ? GIFTS : GIFTS.filter(g => g.category === filter);

  return (
    <>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: topInset + 80, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={gift.header}>
          <View style={anbu.realtimePill}><Text style={anbu.realtimeText}>선물샵</Text></View>
          <Text style={anbu.bigTitle}>부모님께{"\n"}선물 보내기</Text>
        </View>

        {bought && (
          <View style={gift.success}>
            <Ionicons name="checkmark-circle" size={17} color={COLORS.neonText} />
            <Text style={gift.successText}>{bought.name} 주문 완료!</Text>
          </View>
        )}

        <View style={gift.filterRow}>
          {cats.map(c => (
            <Pressable key={c} onPress={() => setFilter(c)} style={[gift.chip, filter === c && gift.chipOn]}>
              <Text style={[gift.chipText, filter === c && gift.chipTextOn]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <View style={gift.grid}>
          {filtered.map((g, idx) => {
            const isFirst = idx === 0 && filter === "전체";
            return (
              <Pressable key={g.id} style={({ pressed }) => [gift.card, isFirst && gift.cardNeon, { opacity: pressed ? 0.9 : 1 }]} onPress={() => setSel(g)}>
                {g.popular && <View style={gift.pop}><Text style={gift.popText}>인기</Text></View>}
                {isFirst && <><View style={anbu.deco1} /><View style={anbu.deco2} /></>}
                <View style={[gift.iconBg, isFirst && { backgroundColor: "rgba(0,0,0,0.1)" }]}>
                  <Ionicons name={g.icon} size={26} color={isFirst ? COLORS.neonText : COLORS.neon} />
                </View>
                <Text style={[gift.name, isFirst && { color: COLORS.neonText }]}>{g.name}</Text>
                <Text style={[gift.price, isFirst && { color: COLORS.neonText }]}>{g.price}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={!!sel} transparent animationType="slide" onRequestClose={() => setSel(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={() => setSel(null)}>
          <View style={anbu.sheet}>
            <View style={anbu.sheetHandle} />
            <View style={[gift.iconBg, { width: 72, height: 72, borderRadius: 22, marginBottom: 16, backgroundColor: COLORS.child.accentSoft }]}>
              <Ionicons name={sel?.icon ?? "gift"} size={34} color={COLORS.neonText} />
            </View>
            <Text style={gift.sheetTitle}>{sel?.name}</Text>
            <Text style={gift.sheetPrice}>{sel?.price}</Text>
            <Text style={gift.sheetDesc}>부모님께 따뜻한 마음을 전해보세요.</Text>
            <Pressable style={anbu.sendBtn} onPress={() => { setBought(sel); setSel(null); }}>
              <Ionicons name="gift" size={17} color={COLORS.neonText} />
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.neonText, marginLeft: 8 }}>선물하기 · {sel?.price}</Text>
            </Pressable>
            <Pressable style={{ marginTop: 12 }} onPress={() => setSel(null)}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.textMuted }}>취소</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}


// ─── 메인 ─────────────────────────────────────────────────────────────────────
export default function ChildScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, myName, myRole, deviceId, isConnected } = useFamilyContext();
  const [tab, setTab] = useState<Tab>("지도");

  const topInset    = Platform.OS === "web" ? 0  : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  // 플로팅 네비 높이: 피쳐(70) + 개발바(34) + safe area
  const NAV_H = 70 + 34 + bottomInset;

  const isMap = tab === "지도";

  return (
    <View style={{ flex: 1, backgroundColor: isMap ? COLORS.mapBg : COLORS.bg }}>

      {/* ══ 지도 탭: 진짜 전체화면 ══ */}
      {isMap && (
        <View style={StyleSheet.absoluteFillObject}>
          <MapScreen familyCode={familyCode} topInset={topInset} navH={NAV_H} />
        </View>
      )}

      {/* ══ 비지도 탭: 일반 스크롤 화면 ══ */}
      {!isMap && (
        <View style={{ flex: 1 }}>
          {tab === "안부"   && <AnbuScreen familyCode={familyCode} myName={myName} myRole={myRole} deviceId={deviceId} topInset={topInset} />}
          {tab === "선물샵" && <GiftScreen topInset={topInset} />}

          {/* 상단 로고 바 */}
          <View style={[top.bar, { paddingTop: topInset + 14, backgroundColor: COLORS.bg }]}>
            <Text style={top.logo}>DUGO</Text>
            <View style={{ flex: 1 }} />
            {isConnected && familyCode && (
              <View style={top.chip}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.neon, marginRight: 5 }} />
                <Text style={top.chipText}>{familyCode}</Text>
              </View>
            )}
            <CircleBtn icon="chevron-back" size={16} bg="rgba(0,0,0,0.07)" color={COLORS.textMid}
              style={{ width: 38, height: 38, borderRadius: 19, marginLeft: 8 }} onPress={() => router.replace("/")} />
          </View>
        </View>
      )}

      {/* ══ 플로팅 필 네비 — 지도 탭에서는 absolutePositioned ══ */}
      <View style={[
        nav.wrap,
        { paddingBottom: bottomInset + 8 },
        isMap && { position: "absolute", bottom: 34, left: 0, right: 0, backgroundColor: "transparent", borderTopWidth: 0 },
      ]}>
        <FloatNav active={tab} onChange={setTab} />
      </View>

      {/* ══ 개발 스위처 — 항상 맨 아래 절대 위치 ══ */}
      <View style={[dev.bar, { position: "absolute", bottom: 0, left: 0, right: 0 }]}>
        <Ionicons name="code-slash" size={11} color="rgba(255,255,255,0.3)" />
        <Text style={dev.label}>개발 모드</Text>
        <Pressable onPress={() => router.replace("/parent")} style={dev.btn}>
          <Ionicons name="home" size={12} color="rgba(255,255,255,0.7)" /><Text style={dev.btnText}>부모님</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/")} style={[dev.btn, dev.btnAlt]}>
          <Ionicons name="apps" size={12} color="rgba(255,255,255,0.7)" /><Text style={dev.btnText}>홈</Text>
        </Pressable>
      </View>

      {/* 지도 탭 나가기 버튼 (우측 상단) */}
      {isMap && (
        <View style={{ position: "absolute", top: topInset + 14, right: 16, zIndex: 300 }}>
          <CircleBtn icon="chevron-back" size={16} bg="rgba(26,34,48,0.75)" color={COLORS.white}
            style={{ width: 40, height: 40, borderRadius: 20 }} onPress={() => router.replace("/")} />
        </View>
      )}
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const top = StyleSheet.create({
  bar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 20, paddingBottom: 12, zIndex: 200 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.textDark, letterSpacing: 3 },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(212,242,0,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,242,0,0.25)" },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.neonText, letterSpacing: 1 },
});

const nav = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 10, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)" },
  wrapMap: { backgroundColor: COLORS.mapBg, borderTopColor: "rgba(255,255,255,0.06)" },
  pill: { flexDirection: "row", backgroundColor: COLORS.navPill, borderRadius: 50, padding: 6, gap: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10 },
  item: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  itemActive: { backgroundColor: COLORS.neon },
});

const map = StyleSheet.create({
  topBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, zIndex: 50 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)" },
  locTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.white, marginBottom: 2 },
  locSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.6)" },
  brandChip: { position: "absolute", top: "38%", alignSelf: "center", left: "50%", marginLeft: -44, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: COLORS.neon, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 30, shadowColor: COLORS.neon, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.neonText },
  brandText: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.neonText, letterSpacing: 2 },
  emptyWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  emptyCard: { alignItems: "center", backgroundColor: "rgba(26,34,48,0.8)", borderRadius: 24, padding: 28, margin: 24, maxWidth: 300, borderWidth: 1, borderColor: "rgba(212,242,0,0.15)" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.white, textAlign: "center", marginBottom: 8 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 20, marginBottom: 16 },
  emptyBtn: { backgroundColor: COLORS.neon, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22 },
  emptyBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.neonText },
  infoCard: { position: "absolute", left: 16, right: 16, backgroundColor: "rgba(26,34,48,0.88)", borderRadius: 22, padding: 16, borderWidth: 1, borderColor: "rgba(212,242,0,0.15)" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  infoStatus: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.65)" },
  infoName: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.white, marginBottom: 4 },
  infoAddress: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 18 },
});

const anbu = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", alignItems: "center", justifyContent: "center" },
  viewerDel: { position: "absolute", bottom: 56, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(239,68,68,0.85)", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18 },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, alignItems: "center", paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.12)", marginBottom: 18 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.textDark, marginBottom: 16 },
  sheetInput: { width: "100%", backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.textDark, minHeight: 80, textAlignVertical: "top", marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  sheetBar: { width: "100%", flexDirection: "row", alignItems: "center", gap: 8 },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.neon, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 50, width: "100%", gap: 8 },
  header: { marginBottom: 20 },
  realtimePill: { alignSelf: "flex-start", backgroundColor: COLORS.navPill, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 10 },
  realtimeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "rgba(255,255,255,0.8)", letterSpacing: 0.5 },
  bigTitle: { fontFamily: "Inter_700Bold", fontSize: 38, color: COLORS.textDark, lineHeight: 44 },
  segment: { flexDirection: "row", backgroundColor: COLORS.cardBg, borderRadius: 50, padding: 4, marginBottom: 16, alignSelf: "flex-start", borderWidth: 1, borderColor: COLORS.border },
  segBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 50 },
  segBtnOn: { backgroundColor: COLORS.navPill },
  segText: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.textMid },
  segTextOn: { color: COLORS.white, fontFamily: "Inter_600SemiBold" },
  toast: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.neon, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 14, alignSelf: "flex-start" },
  toastText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.neonText },
  connectCard: { backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", gap: 14 },
  connectTitle: { fontFamily: "Inter_500Medium", fontSize: 15, color: COLORS.textMid, textAlign: "center", lineHeight: 22 },
  connectBtn: { backgroundColor: COLORS.neon, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 50 },
  connectBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.neonText },
  empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  cardNeon: { backgroundColor: COLORS.neon, borderColor: "transparent" },
  // decorative circles (topographic effect)
  deco1: { position: "absolute", right: -30, top: -30, width: 130, height: 130, borderRadius: 65, borderWidth: 22, borderColor: "rgba(0,0,0,0.06)" },
  deco2: { position: "absolute", right: -70, top: -70, width: 210, height: 210, borderRadius: 105, borderWidth: 22, borderColor: "rgba(0,0,0,0.04)" },
  deco3: { position: "absolute", right: -110, top: -110, width: 290, height: 290, borderRadius: 145, borderWidth: 22, borderColor: "rgba(0,0,0,0.025)" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  cardAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.18)", alignItems: "center", justifyContent: "center" },
  cardAvatarDark: { backgroundColor: "rgba(0,0,0,0.15)" },
  cardName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.textMid },
  cardNameDark: { color: COLORS.neonText },
  cardTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.textMuted },
  cardTimeDark: { color: "rgba(26,37,53,0.6)" },
  cardHeart: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.07)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  cardHeartText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.coral },
  cardText: { fontFamily: "Inter_400Regular", fontSize: 15, color: COLORS.textDark, lineHeight: 22 },
  cardTextDark: { color: COLORS.neonText },
  cardPhoto: { width: "100%", height: 180, borderRadius: 14, marginTop: 8 },
  fab: { position: "absolute", bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.neon, alignItems: "center", justifyContent: "center", shadowColor: COLORS.neon, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 10 },
});

const gift = StyleSheet.create({
  header: { marginBottom: 20 },
  success: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.neon, borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 14, alignSelf: "flex-start" },
  successText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.neonText },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border },
  chipOn: { backgroundColor: COLORS.navPill, borderColor: "transparent" },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.textMid },
  chipTextOn: { color: COLORS.white, fontFamily: "Inter_600SemiBold" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: (width - 52) / 2, backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", position: "relative", overflow: "hidden" },
  cardNeon: { backgroundColor: COLORS.neon, borderColor: "transparent" },
  pop: { position: "absolute", top: 12, right: 12, backgroundColor: COLORS.navPill, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  popText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: COLORS.white },
  iconBg: { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(212,242,0,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  name: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.textDark, textAlign: "center", marginBottom: 4, lineHeight: 18 },
  price: { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.neon },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.textDark, textAlign: "center", marginBottom: 6 },
  sheetPrice: { fontFamily: "Inter_600SemiBold", fontSize: 22, color: COLORS.neonText, marginBottom: 12 },
  sheetDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.textMid, textAlign: "center", marginBottom: 24 },
});

const dev = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(26,34,48,0.92)", paddingHorizontal: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  label: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.35)", marginRight: 4 },
  btn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  btnAlt: { backgroundColor: "rgba(212,242,0,0.15)", borderColor: "rgba(212,242,0,0.25)" },
  btnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.75)" },
});
