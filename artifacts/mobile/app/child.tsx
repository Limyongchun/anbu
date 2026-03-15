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
  { id: 1, name: "제철 과일 선물세트", price: "39,000원", icon: "nutrition"   as const, category: "식품", popular: true  },
  { id: 2, name: "한우 정육 세트",     price: "89,000원", icon: "restaurant"  as const, category: "식품", popular: false },
  { id: 3, name: "홍삼 건강세트",      price: "59,000원", icon: "leaf"        as const, category: "건강", popular: true  },
  { id: 4, name: "꽃바구니 선물",      price: "45,000원", icon: "flower"      as const, category: "꽃",  popular: false },
  { id: 5, name: "전통 한과 세트",     price: "32,000원", icon: "cafe"        as const, category: "식품", popular: false },
  { id: 6, name: "건강기능식품",       price: "75,000원", icon: "fitness"     as const, category: "건강", popular: true  },
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

// ─── 원형 아이콘 버튼 ─────────────────────────────────────────────────────────
function CircleBtn({ icon, size = 18, bg, color, onPress, style }: {
  icon: keyof typeof Ionicons.glyphMap; size?: number;
  bg?: string; color?: string; onPress?: () => void; style?: object;
}) {
  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg ?? "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1 }, style]}>
      <Ionicons name={icon} size={size} color={color ?? COLORS.white} />
    </Pressable>
  );
}

// ─── 상단 바 (로고 + 카테고리 탭) ───────────────────────────────────────────
function TopBar({ tab, onTab, topInset, isMap, familyCode, isConnected }: {
  tab: Tab; onTab: (t: Tab) => void; topInset: number;
  isMap: boolean; familyCode: string | null; isConnected: boolean;
}) {
  const tabs: Tab[] = ["지도", "안부", "선물샵"];
  return (
    <View style={[tb.wrap, {
      paddingTop: topInset + 10,
      backgroundColor: isMap ? "rgba(26,34,48,0.72)" : COLORS.bg,
      borderBottomWidth: isMap ? 0 : 1,
      borderBottomColor: isMap ? "transparent" : COLORS.border,
    }]}>
      {/* 로고 */}
      <Text style={[tb.logo, !isMap && { color: COLORS.textDark }]}>DUGO</Text>

      {/* 마이페이지 버튼 */}
      <Pressable style={[tb.profileBtn, isMap && tb.profileBtnDark]} onPress={() => router.push("/profile")}>
        <Ionicons name="person-circle-outline" size={20} color={isMap ? "rgba(255,255,255,0.8)" : COLORS.navPill} />
      </Pressable>

      <View style={{ flex: 1 }} />

      {/* 가족코드 칩 (연결됐을 때) */}
      {isConnected && familyCode && (
        <View style={[tb.codeChip, { marginRight: 8 }]}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.neon }} />
          <Text style={tb.codeText}>{familyCode}</Text>
        </View>
      )}

      {/* 카테고리 탭 */}
      <View style={[tb.tabRow, !isMap && tb.tabRowLight]}>
        {tabs.map(t => {
          const active = tab === t;
          return (
            <Pressable key={t} onPress={() => onTab(t)}
              style={[tb.tabChip, active && (isMap ? tb.tabChipOnDark : tb.tabChipOnLight)]}>
              <Text style={[tb.tabText, !isMap && { color: active ? COLORS.white : COLORS.textMid },
                active && isMap && { color: COLORS.neonText, fontFamily: "Inter_700Bold" }]}>
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── 지도 화면 ────────────────────────────────────────────────────────────────
function MapScreen({ familyCode, bottomInset }: { familyCode: string | null; bottomInset: number }) {
  const [locs, setLocs]         = useState<LocationData[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // 배너 슬라이드 애니메이션
  const bannerY     = useRef(new Animated.Value(120)).current;
  const bannerAlpha = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const { latitude: lat = 37.5665, longitude: lon = 126.978 } = parentLoc ?? {};

  // 배너 열기/닫기
  const openBanner = useCallback(() => {
    setShowBanner(true);
    Animated.parallel([
      Animated.spring(bannerY,     { toValue: 0,   useNativeDriver: false, tension: 80, friction: 10 }),
      Animated.timing(bannerAlpha, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
    // 6초 후 자동 닫기
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(closeBanner, 6000);
  }, []);

  const closeBanner = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(bannerY,     { toValue: 120, duration: 260, useNativeDriver: false }),
      Animated.timing(bannerAlpha, { toValue: 0,   duration: 200, useNativeDriver: false }),
    ]).start(() => setShowBanner(false));
  }, []);

  // web: Leaflet 마커 클릭 → postMessage → 배너 표시
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: MessageEvent) => {
      if (e.data === "markerClick") parentLoc ? openBanner() : null;
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [parentLoc, openBanner]);

  const openMaps = () => {
    const url = Platform.OS === "ios"
      ? `maps://maps.apple.com/maps?q=${lat},${lon}`
      : Platform.OS === "android"
      ? `geo:${lat},${lon}?q=${lat},${lon}`
      : `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`));
  };

  const minsAgo = parentLoc
    ? Math.floor((Date.now() - new Date(parentLoc.updatedAt).getTime()) / 60000)
    : 0;
  const isRecent = minsAgo < 5;

  // 개발바 높이 확보
  const BOTTOM_SAFE = bottomInset + 44;

  // Leaflet + CartoDB Voyager — 마커 클릭 시 postMessage 전송
  const mapHtml = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
#map{width:100vw;height:100vh}
.leaflet-control-attribution{display:none}
.pin-wrap{cursor:pointer;position:relative;width:22px;height:22px}
.pin-ring{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:46px;height:46px;background:rgba(66,133,244,0.2);border-radius:50%;animation:pulse 1.5s ease-out infinite}
.pin-dot{width:22px;height:22px;background:#4285F4;border-radius:50%;border:3.5px solid #fff;box-shadow:0 2px 12px rgba(66,133,244,0.6)}
.pin-label{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);background:#1a2230;color:#fff;font-size:11px;font-family:sans-serif;white-space:nowrap;padding:4px 10px;border-radius:12px;pointer-events:none;opacity:0;transition:opacity 0.2s}
.pin-wrap:hover .pin-label{opacity:1}
@keyframes pulse{0%{transform:translate(-50%,-50%) scale(0.5);opacity:1}100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}
</style>
</head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lon}],16);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:20,subdomains:'abcd'}).addTo(map);
${parentLoc ? `
var pinHtml='<div class="pin-wrap"><div class="pin-ring"></div><div class="pin-dot"></div><div class="pin-label">탭하여 정보 보기</div></div>';
var marker=L.marker([${lat},${lon}],{icon:L.divIcon({className:'',html:pinHtml,iconSize:[22,22],iconAnchor:[11,11]})}).addTo(map);
marker.on('click',function(){window.parent.postMessage('markerClick','*');});
` : ""}
</script></body></html>`;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* ── Leaflet 지도 ── */}
      {Platform.OS === "web" ? (
        <View style={[StyleSheet.absoluteFillObject, { overflow: "hidden" }]}>
          {/* @ts-ignore */}
          <iframe srcDoc={mapHtml} style={{ width: "100%", height: "100%", border: "none" }} title="부모님 위치" />
        </View>
      ) : (
        // Native 폴백 지도
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#e8e6e1" }]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`r${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${12 + i * 11}%` as any, height: i % 3 === 0 ? 3 : 1.5, backgroundColor: "#fff" }} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={`c${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${10 + i * 16}%` as any, width: i % 2 === 0 ? 3 : 1.5, backgroundColor: "#fff" }} />
          ))}
          {parentLoc && (
            <Pressable style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}
              onPress={openBanner}>
              <PulsingPin />
              <View style={mp.pinHint}>
                <Text style={mp.pinHintText}>탭하여 정보 보기</Text>
              </View>
            </Pressable>
          )}
        </View>
      )}

      {/* ── 연결 안내 카드 (미연결 상태) ── */}
      {!loading && !parentLoc && (
        <View style={[mp.connectCard, { bottom: BOTTOM_SAFE + 16 }]}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(212,242,0,0.15)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="location-outline" size={18} color={COLORS.neon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={mp.infoName}>{!familyCode ? "가족을 연결해주세요" : "위치 기다리는 중"}</Text>
            <Text style={mp.infoAddr}>{!familyCode ? "가족 코드로 부모님과 연결하세요" : "부모님이 앱을 실행하면 표시됩니다"}</Text>
          </View>
          {!familyCode && (
            <Pressable style={mp.connectBtn} onPress={() => router.push("/setup")}>
              <Text style={mp.connectBtnText}>연결</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── 로딩 ── */}
      {loading && (
        <View style={{ position: "absolute", bottom: BOTTOM_SAFE + 60, left: 0, right: 0, alignItems: "center" }}>
          <ActivityIndicator color={COLORS.neon} />
        </View>
      )}

      {/* ── 위치 핀 클릭 힌트 (연결됐을 때) ── */}
      {!loading && parentLoc && !showBanner && (
        <View style={[mp.hintPill, { bottom: BOTTOM_SAFE + 16 }]}>
          <Ionicons name="location" size={13} color={COLORS.neon} />
          <Text style={mp.hintText}>{parentLoc.memberName}의 위치 아이콘을 탭하세요</Text>
        </View>
      )}

      {/* ── 슬라이드업 배너 ── */}
      {showBanner && parentLoc && (
        <Animated.View style={[mp.banner, { bottom: BOTTOM_SAFE + 12, transform: [{ translateY: bannerY }], opacity: bannerAlpha }]}>
          {/* 닫기 버튼 */}
          <Pressable style={mp.bannerClose} onPress={closeBanner}>
            <Ionicons name="close" size={14} color="rgba(255,255,255,0.5)" />
          </Pressable>

          {/* 왼쪽: 상태 + 이름 + 주소 */}
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={[mp.dot, { backgroundColor: isRecent ? COLORS.neon : "#f59e0b" }]} />
              <Text style={mp.bannerStatus}>{isRecent ? "안전 · 실시간" : `${minsAgo}분 전`}</Text>
            </View>
            <Text style={mp.bannerName}>{parentLoc.memberName}</Text>
            <Text style={mp.bannerAddr} numberOfLines={1}>
              {parentLoc.address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`}
            </Text>
          </View>

          {/* 오른쪽: 액션 아이콘 가로 배열 */}
          <View style={mp.bannerActions}>
            <CircleBtn icon="call"     size={15} bg="rgba(212,242,0,0.2)"   color={COLORS.neon}             style={mp.bannerBtn} onPress={() => Linking.openURL("tel:")} />
            <CircleBtn icon="navigate" size={15} bg="rgba(255,255,255,0.1)" color="rgba(255,255,255,0.8)"  style={mp.bannerBtn} onPress={openMaps} />
            <CircleBtn icon="refresh"  size={15} bg="rgba(255,255,255,0.07)" color="rgba(255,255,255,0.4)" style={mp.bannerBtn} onPress={() => { load(); closeBanner(); }} />
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
        Animated.timing(s, { toValue: 2.6, duration: 950, useNativeDriver: false }),
        Animated.timing(o, { toValue: 0,   duration: 950, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(s, { toValue: 1,   duration: 0,   useNativeDriver: false }),
        Animated.timing(o, { toValue: 0.5, duration: 0,   useNativeDriver: false }),
      ]),
    ]));
    a.start(); return () => a.stop();
  }, []);
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: 34, height: 34, borderRadius: 17, backgroundColor: "#4285F4", transform: [{ scale: s }], opacity: o }} />
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#4285F4", borderWidth: 3, borderColor: "#fff" }} />
    </View>
  );
}

// ─── 안부 화면 ────────────────────────────────────────────────────────────────
function AnbuScreen({ familyCode, myName, myRole, deviceId, topBarH }: {
  familyCode: string | null; myName: string | null; myRole: string | null; deviceId: string; topBarH: number;
}) {
  const [subView, setSubView] = useState<"messages" | "gallery">("messages");
  const [text, setText]       = useState("");
  const [photo, setPhoto]     = useState<string | null>(null);
  const [msgs, setMsgs]       = useState<FamilyMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerMid, setViewerMid] = useState<number | null>(null);
  const [delId, setDelId]     = useState<number | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const photos = msgs.filter(m => !!m.photoData);
  const THUMB  = (width - 52) / 3;

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
    } catch (e: any) {
      Alert.alert("전송 실패", e?.message === "request entity too large" ? "사진 크기가 너무 큽니다. 더 작은 사진을 선택해 주세요." : "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
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

  return (
    <>
      <Modal visible={!!viewerUri} transparent animationType="fade" onRequestClose={() => { setViewerUri(null); setViewerMid(null); }}>
        <View style={ab.viewer}>
          <Pressable style={{ position: "absolute", top: 54, right: 20, zIndex: 10 }} onPress={() => { setViewerUri(null); setViewerMid(null); }}>
            <Ionicons name="close-circle" size={36} color={COLORS.white} />
          </Pressable>
          {viewerUri && <Image source={{ uri: viewerUri }} style={{ width: "100%", height: height * 0.7, borderRadius: 14 }} resizeMode="contain" />}
          {viewerMid !== null && msgs.find(m => m.id === viewerMid)?.deviceId === deviceId && (
            <Pressable style={ab.viewerDel} onPress={() => { del(viewerMid!); setViewerUri(null); setViewerMid(null); }}>
              <Ionicons name="trash-outline" size={17} color="#fff" />
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" }}>삭제</Text>
            </Pressable>
          )}
        </View>
      </Modal>

      <Modal visible={showCompose} transparent animationType="slide" onRequestClose={() => setShowCompose(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          {/* 배경 탭 → 닫기 (sheet 내부 터치와 분리) */}
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowCompose(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
          </Pressable>
          {/* 시트 — 내부 터치가 배경 Pressable로 전파되지 않도록 Pressable로 감쌈 */}
          <Pressable onPress={() => {}} style={ab.sheet}>
            <View style={ab.handle} />
            <Text style={ab.sheetTitle}>안부 보내기</Text>
            {photo && (
              <View style={{ borderRadius: 14, overflow: "hidden", marginBottom: 12, height: 140 }}>
                <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <Pressable
                  style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 16 }}
                  onPress={() => setPhoto(null)}>
                  <Ionicons name="close-circle" size={22} color="#fff" />
                </Pressable>
              </View>
            )}
            <TextInput
              style={ab.input}
              value={text}
              onChangeText={setText}
              placeholder="부모님께 안부를 전해요..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={200}
            />
            <View style={ab.sheetBar}>
              <Pressable style={ab.attachBtn} onPress={pickCamera}>
                <Ionicons name="camera" size={18} color={COLORS.neonText} />
              </Pressable>
              <Pressable style={ab.attachBtn} onPress={pickLibrary}>
                <Ionicons name="images" size={18} color={COLORS.neonText} />
              </Pressable>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}>{text.length}/200</Text>
              <View style={{ flex: 1 }} />
              <Pressable onPress={send} disabled={(!text.trim() && !photo) || sending || !familyCode}
                style={[ab.sendBtn, ((!text.trim() && !photo) || sending || !familyCode) && { opacity: 0.35 }]}>
                {sending
                  ? <ActivityIndicator size="small" color={COLORS.neonText} />
                  : <Ionicons name="send" size={17} color={COLORS.neonText} />}
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Modal>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: topBarH + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={ab.hdr}>
          <View style={ab.pill}><Text style={ab.pillText}>실시간</Text></View>
          <Text style={ab.bigTitle}>안부{"\n"}메시지</Text>
        </View>

        <View style={ab.seg}>
          {(["messages", "gallery"] as const).map(v => (
            <Pressable key={v} onPress={() => setSubView(v)} style={[ab.segBtn, subView === v && ab.segBtnOn]}>
              <Text style={[ab.segText, subView === v && ab.segTextOn]}>{v === "messages" ? "메시지" : `갤러리${photos.length > 0 ? ` ${photos.length}` : ""}`}</Text>
            </Pressable>
          ))}
        </View>

        {sent && (
          <View style={ab.toast}><Ionicons name="checkmark-circle" size={14} color={COLORS.neonText} /><Text style={ab.toastText}>부모님께 전송됐어요</Text></View>
        )}

        {!familyCode && (
          <View style={ab.connectCard}>
            <Text style={ab.connectTitle}>가족 코드를 연결하면{"\n"}안부를 주고받을 수 있어요</Text>
            <Pressable style={ab.connectBtn} onPress={() => router.push("/setup")}><Text style={ab.connectBtnText}>연결하기</Text></Pressable>
          </View>
        )}

        {subView === "messages" && (
          <>
            {loading && <ActivityIndicator color={COLORS.neon} style={{ marginVertical: 20 }} />}
            {!loading && msgs.length === 0 && familyCode && (
              <View style={ab.empty}><Ionicons name="chatbubble-outline" size={32} color={COLORS.textMuted} /><Text style={ab.emptyText}>아직 보낸 메시지가 없어요</Text></View>
            )}
            {msgs.map((msg, idx) => {
              const first = idx === 0;
              return (
                <View key={msg.id} style={[ab.card, first && ab.cardNeon]}>
                  {first && <><View style={ab.deco1} /><View style={ab.deco2} /><View style={ab.deco3} /></>}
                  <View style={ab.cardTop}>
                    <View style={[ab.cardAvatar, first && ab.cardAvatarDark]}>
                      <Ionicons name="person" size={13} color={first ? COLORS.neon : COLORS.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[ab.cardName, first && { color: COLORS.neonText }]}>{msg.fromName}</Text>
                      <Text style={[ab.cardTime, first && { color: "rgba(26,37,53,0.55)" }]}>{formatTime(msg.createdAt)}</Text>
                    </View>
                    {msg.hearts > 0 && (
                      <View style={ab.heartBadge}>
                        <Ionicons name="heart" size={10} color={first ? COLORS.neonText : COLORS.coral} />
                        <Text style={[ab.heartN, first && { color: COLORS.neonText }]}>{msg.hearts}</Text>
                      </View>
                    )}
                    {msg.deviceId === deviceId && (
                      <Pressable onPress={() => del(msg.id)} disabled={delId === msg.id} style={{ marginLeft: 6 }}>
                        {delId === msg.id ? <ActivityIndicator size="small" color={first ? COLORS.neonText : "#ef4444"} /> : <Ionicons name="trash-outline" size={15} color={first ? COLORS.neonText : "#ef4444"} />}
                      </Pressable>
                    )}
                  </View>
                  {!!msg.text && <Text style={[ab.cardText, first && { color: COLORS.neonText }]}>{msg.text}</Text>}
                  {msg.photoData && (
                    <Pressable onPress={() => { setViewerUri(msg.photoData!); setViewerMid(msg.id); }}>
                      <Image source={{ uri: msg.photoData }} style={ab.cardPhoto} resizeMode="cover" />
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
              <View style={ab.empty}><Ionicons name="images-outline" size={32} color={COLORS.textMuted} /><Text style={ab.emptyText}>보낸 사진이 없어요</Text></View>
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
                  {m.deviceId === deviceId && (
                    <Pressable style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", zIndex: 10 }} onPress={() => del(m.id)}>
                      <Ionicons name="trash" size={11} color="#fff" />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {subView === "messages" && familyCode && (
        <Pressable style={ab.fab} onPress={() => setShowCompose(true)}>
          <Ionicons name="add" size={26} color={COLORS.neonText} />
        </Pressable>
      )}
    </>
  );
}

// ─── 선물샵 화면 ──────────────────────────────────────────────────────────────
function GiftScreen({ topBarH }: { topBarH: number }) {
  const [sel, setSel]     = useState<typeof GIFTS[0] | null>(null);
  const [bought, setBought] = useState<typeof GIFTS[0] | null>(null);
  const [filter, setFilter] = useState("전체");
  const cats = ["전체", "식품", "건강", "꽃"];
  const filtered = filter === "전체" ? GIFTS : GIFTS.filter(g => g.category === filter);

  return (
    <>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: topBarH + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={gf.hdr}>
          <View style={ab.pill}><Text style={ab.pillText}>선물샵</Text></View>
          <Text style={ab.bigTitle}>부모님께{"\n"}선물 보내기</Text>
        </View>

        {bought && (
          <View style={gf.success}><Ionicons name="checkmark-circle" size={16} color={COLORS.neonText} /><Text style={gf.successText}>{bought.name} 주문 완료!</Text></View>
        )}

        <View style={gf.filterRow}>
          {cats.map(c => (
            <Pressable key={c} onPress={() => setFilter(c)} style={[gf.chip, filter === c && gf.chipOn]}>
              <Text style={[gf.chipText, filter === c && gf.chipTextOn]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <View style={gf.grid}>
          {filtered.map((g, idx) => {
            const first = idx === 0 && filter === "전체";
            return (
              <Pressable key={g.id} style={({ pressed }) => [gf.card, first && gf.cardNeon, { opacity: pressed ? 0.9 : 1 }]} onPress={() => setSel(g)}>
                {g.popular && <View style={gf.pop}><Text style={gf.popText}>인기</Text></View>}
                {first && <><View style={ab.deco1} /><View style={ab.deco2} /></>}
                <View style={[gf.iconBg, first && { backgroundColor: "rgba(0,0,0,0.1)" }]}>
                  <Ionicons name={g.icon} size={26} color={first ? COLORS.neonText : COLORS.neon} />
                </View>
                <Text style={[gf.name, first && { color: COLORS.neonText }]}>{g.name}</Text>
                <Text style={[gf.price, first && { color: COLORS.neonText }]}>{g.price}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={!!sel} transparent animationType="slide" onRequestClose={() => setSel(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={() => setSel(null)}>
          <View style={ab.sheet}>
            <View style={ab.handle} />
            <View style={[gf.iconBg, { width: 70, height: 70, borderRadius: 22, marginBottom: 14, backgroundColor: COLORS.child.accentSoft }]}>
              <Ionicons name={sel?.icon ?? "gift"} size={32} color={COLORS.neonText} />
            </View>
            <Text style={gf.sheetTitle}>{sel?.name}</Text>
            <Text style={gf.sheetPrice}>{sel?.price}</Text>
            <Text style={gf.sheetDesc}>부모님께 따뜻한 마음을 전해보세요.</Text>
            <Pressable style={ab.sendBtn} onPress={() => { setBought(sel); setSel(null); }}>
              <Ionicons name="gift" size={16} color={COLORS.neonText} />
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
  const bottomInset = Platform.OS === "web" ? 0  : insets.bottom;

  const isMap   = tab === "지도";
  const TOP_H   = topInset + 60; // 상단 바 전체 높이

  return (
    <View style={{ flex: 1, backgroundColor: isMap ? COLORS.mapBg : COLORS.bg }}>

      {/* ══ 지도 탭: 진짜 전체화면 ══ */}
      {isMap && (
        <View style={StyleSheet.absoluteFillObject}>
          <MapScreen familyCode={familyCode} bottomInset={bottomInset} />
        </View>
      )}

      {/* ══ 비지도 탭 ══ */}
      {!isMap && (
        <View style={{ flex: 1 }}>
          {tab === "안부"   && <AnbuScreen familyCode={familyCode} myName={myName} myRole={myRole} deviceId={deviceId} topBarH={TOP_H} />}
          {tab === "선물샵" && <GiftScreen topBarH={TOP_H} />}
        </View>
      )}

      {/* ══ 상단 바 — 항상 위에 떠 있음 ══ */}
      <TopBar tab={tab} onTab={setTab} topInset={topInset} isMap={isMap} familyCode={familyCode} isConnected={isConnected} />

      {/* ══ 나가기 버튼 (지도 탭: 상단 바 오른쪽 끝에 이미 있음; 비지도 탭: 별도) ══ */}
      {!isMap && (
        <View style={{ position: "absolute", top: topInset + 12, right: 16, zIndex: 300 }}>
          <CircleBtn icon="chevron-back" size={15} bg="rgba(0,0,0,0.07)" color={COLORS.textMid}
            style={{ width: 34, height: 34, borderRadius: 17 }} onPress={() => router.replace("/")} />
        </View>
      )}

      {/* ══ 개발 스위처 ══ */}
      <View style={dv.bar}>
        <Ionicons name="code-slash" size={11} color="rgba(255,255,255,0.3)" />
        <Text style={dv.label}>개발 모드</Text>
        <Pressable onPress={() => router.replace("/parent")} style={dv.btn}>
          <Ionicons name="home"      size={12} color="rgba(255,255,255,0.7)" /><Text style={dv.btnText}>부모님</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/")} style={[dv.btn, dv.btnAlt]}>
          <Ionicons name="apps"      size={12} color="rgba(255,255,255,0.7)" /><Text style={dv.btnText}>홈</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

// 상단 바
const tb = StyleSheet.create({
  wrap:         { position: "absolute", top: 0, left: 0, right: 0, zIndex: 200, flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 10 },
  logo:         { fontFamily: "Inter_700Bold", fontSize: 19, color: COLORS.white, letterSpacing: 3 },
  profileBtn:   { marginLeft: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" },
  profileBtnDark:{ backgroundColor: "rgba(255,255,255,0.12)" },
  codeChip:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(212,242,0,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: "rgba(212,242,0,0.2)" },
  codeText:     { fontFamily: "Inter_600SemiBold", fontSize: 10, color: COLORS.neon, letterSpacing: 1 },
  tabRow:       { flexDirection: "row", gap: 4, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 50, padding: 3 },
  tabRowLight:  { backgroundColor: "rgba(0,0,0,0.06)" },
  tabChip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50 },
  tabChipOnDark:  { backgroundColor: COLORS.neon },
  tabChipOnLight: { backgroundColor: COLORS.navPill },
  tabText:      { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.55)" },
});

// 지도
const mp = StyleSheet.create({
  // 상태 점
  dot:            { width: 8, height: 8, borderRadius: 4 },

  // 미연결 카드
  connectCard:    { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(22,30,44,0.93)", borderRadius: 22, padding: 16, borderWidth: 1, borderColor: "rgba(212,242,0,0.15)" },
  connectBtn:     { backgroundColor: COLORS.neon, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 50 },
  connectBtnText: { fontFamily: "Inter_700Bold",   fontSize: 13, color: COLORS.neonText },
  infoName:       { fontFamily: "Inter_700Bold",   fontSize: 15, color: COLORS.white, marginBottom: 2 },
  infoAddr:       { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 16 },

  // 힌트 필 (핀 클릭 유도)
  hintPill:       { position: "absolute", left: 0, right: 0, alignItems: "center" },
  hintText:       { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.white, backgroundColor: "rgba(22,30,44,0.82)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, overflow: "hidden" },

  // 슬라이드업 배너
  banner:         { position: "absolute", left: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(20,28,42,0.96)", borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: "rgba(212,242,0,0.18)" },
  bannerClose:    { position: "absolute", top: 10, right: 12, padding: 4 },
  bannerStatus:   { fontFamily: "Inter_500Medium", fontSize: 11, color: "rgba(255,255,255,0.55)" },
  bannerName:     { fontFamily: "Inter_700Bold",   fontSize: 16, color: COLORS.white },
  bannerAddr:     { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.45)" },
  bannerActions:  { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 4 },
  bannerBtn:      { width: 36, height: 36, borderRadius: 18 },

  // Native 핀 힌트
  pinHint:        { position: "absolute", bottom: 80, alignSelf: "center", backgroundColor: "rgba(22,30,44,0.82)", borderRadius: 50, paddingHorizontal: 14, paddingVertical: 7 },
  pinHintText:    { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.white },
});

// 안부
const ab = StyleSheet.create({
  viewer:       { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", alignItems: "center", justifyContent: "center" },
  viewerDel:    { position: "absolute", bottom: 56, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(239,68,68,0.85)", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18 },
  sheet:        { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, alignItems: "center", paddingBottom: 40 },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.12)", marginBottom: 18 },
  sheetTitle:   { fontFamily: "Inter_700Bold",   fontSize: 17, color: COLORS.textDark, marginBottom: 16 },
  input:        { width: "100%", backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.textDark, minHeight: 80, textAlignVertical: "top", marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  sheetBar:     { width: "100%", flexDirection: "row", alignItems: "center", gap: 8 },
  attachBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center" },
  sendBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.neon, alignItems: "center", justifyContent: "center" },
  hdr:          { marginBottom: 20 },
  pill:         { alignSelf: "flex-start", backgroundColor: COLORS.navPill, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 10 },
  pillText:     { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "rgba(255,255,255,0.8)", letterSpacing: 0.5 },
  bigTitle:     { fontFamily: "Inter_700Bold",   fontSize: 36, color: COLORS.textDark, lineHeight: 42 },
  seg:          { flexDirection: "row", backgroundColor: COLORS.cardBg, borderRadius: 50, padding: 4, marginBottom: 16, alignSelf: "flex-start", borderWidth: 1, borderColor: COLORS.border },
  segBtn:       { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50 },
  segBtnOn:     { backgroundColor: COLORS.navPill },
  segText:      { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.textMid },
  segTextOn:    { color: COLORS.white, fontFamily: "Inter_600SemiBold" },
  toast:        { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: COLORS.neon, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 12, alignSelf: "flex-start" },
  toastText:    { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.neonText },
  connectCard:  { backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", gap: 14 },
  connectTitle: { fontFamily: "Inter_500Medium", fontSize: 15, color: COLORS.textMid, textAlign: "center", lineHeight: 22 },
  connectBtn:   { backgroundColor: COLORS.neon, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 50 },
  connectBtnText:{ fontFamily: "Inter_700Bold",  fontSize: 14, color: COLORS.neonText },
  empty:        { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText:    { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.textMuted },
  card:         { backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  cardNeon:     { backgroundColor: COLORS.neon, borderColor: "transparent" },
  deco1:        { position: "absolute", right: -30, top: -30, width: 130, height: 130, borderRadius: 65, borderWidth: 22, borderColor: "rgba(0,0,0,0.06)" },
  deco2:        { position: "absolute", right: -70, top: -70, width: 210, height: 210, borderRadius: 105, borderWidth: 22, borderColor: "rgba(0,0,0,0.04)" },
  deco3:        { position: "absolute", right: -110, top: -110, width: 290, height: 290, borderRadius: 145, borderWidth: 22, borderColor: "rgba(0,0,0,0.025)" },
  cardTop:      { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  cardAvatar:   { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  cardAvatarDark: { backgroundColor: "rgba(0,0,0,0.15)" },
  cardName:     { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.textMid, marginBottom: 1 },
  cardTime:     { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.textMuted },
  heartBadge:   { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.07)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  heartN:       { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.coral },
  cardText:     { fontFamily: "Inter_400Regular", fontSize: 15, color: COLORS.textDark, lineHeight: 22 },
  cardPhoto:    { width: "100%", height: 180, borderRadius: 14, marginTop: 8 },
  fab:          { position: "absolute", bottom: 60, right: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.neon, alignItems: "center", justifyContent: "center", shadowColor: COLORS.neon, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 10 },
});

// 선물샵
const gf = StyleSheet.create({
  hdr:          { marginBottom: 20 },
  success:      { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: COLORS.neon, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 14, alignSelf: "flex-start" },
  successText:  { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.neonText },
  filterRow:    { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border },
  chipOn:       { backgroundColor: COLORS.navPill, borderColor: "transparent" },
  chipText:     { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.textMid },
  chipTextOn:   { color: COLORS.white, fontFamily: "Inter_600SemiBold" },
  grid:         { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card:         { width: (width - 52) / 2, backgroundColor: COLORS.cardBg, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", position: "relative", overflow: "hidden" },
  cardNeon:     { backgroundColor: COLORS.neon, borderColor: "transparent" },
  pop:          { position: "absolute", top: 11, right: 11, backgroundColor: COLORS.navPill, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  popText:      { fontFamily: "Inter_600SemiBold", fontSize: 10, color: COLORS.white },
  iconBg:       { width: 52, height: 52, borderRadius: 18, backgroundColor: "rgba(212,242,0,0.13)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  name:         { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.textDark, textAlign: "center", marginBottom: 4, lineHeight: 18 },
  price:        { fontFamily: "Inter_700Bold",   fontSize: 14, color: COLORS.neon },
  sheetTitle:   { fontFamily: "Inter_700Bold",   fontSize: 20, color: COLORS.textDark, textAlign: "center", marginBottom: 6 },
  sheetPrice:   { fontFamily: "Inter_600SemiBold", fontSize: 22, color: COLORS.neonText, marginBottom: 12 },
  sheetDesc:    { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.textMid, textAlign: "center", marginBottom: 24 },
});

// 개발바
const dv = StyleSheet.create({
  bar:    { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(26,34,48,0.92)", paddingHorizontal: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", zIndex: 500 },
  label:  { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.3)", marginRight: 4 },
  btn:    { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  btnAlt: { backgroundColor: "rgba(212,242,0,0.15)", borderColor: "rgba(212,242,0,0.25)" },
  btnText:{ fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.75)" },
});
