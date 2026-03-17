import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useLang } from "@/context/LanguageContext";
import { api, FamilyMessage, LocationData, ParentActivityLog } from "@/lib/api";

const { width, height } = Dimensions.get("window");
type Tab = "home" | "photo" | "map" | "alarm";

const GIFT_ICONS = ["nutrition", "restaurant", "leaf", "flower", "cafe", "fitness"] as const;
const GIFT_POPULAR = [true, false, true, false, false, true];

function formatTimeI18n(dateStr: string, t: any): string {
  const d = new Date(dateStr), now = new Date();
  const m = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (m < 1) return t.timeJustNow;
  if (m < 60) return (t.timeMinAgo as string).replace("{m}", String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return (t.timeHourAgo as string).replace("{h}", String(h));
  return (t.timeDayAgo as string).replace("{d}", String(Math.floor(h / 24)));
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
function TopBar({ tab, topInset }: { tab: Tab; topInset: number }) {
  const { isMasterChild } = useFamilyContext();
  const { t } = useLang();
  const isMap = tab === "map";
  return (
    <View style={[tb.wrap, {
      paddingTop: topInset + 10,
      backgroundColor: isMap ? "rgba(26,34,48,0.82)" : COLORS.bg,
      borderBottomWidth: isMap ? 0 : 1,
      borderBottomColor: COLORS.border,
    }]}>
      <Text style={[tb.logo, { color: isMap ? COLORS.white : COLORS.textDark }]}>A N B U</Text>
      <View style={{ flex: 1 }} />
      {isMasterChild && (
        <View style={[tb.masterBadge, isMap && { backgroundColor: "rgba(212,242,0,0.18)", borderColor: "rgba(212,242,0,0.35)" }]}>
          <Ionicons name="shield-checkmark" size={11} color={isMap ? COLORS.neon : COLORS.neonText} />
          <Text style={[tb.masterText, isMap && { color: COLORS.neon }]}>{t.masterLabel}</Text>
        </View>
      )}
    </View>
  );
}

// ─── 하단 탭 바 ───────────────────────────────────────────────────────────────
const NAV_ITEM_DEFS = [
  { id: "home",     iconOn: "home"          as const, iconOff: "home-outline"          as const, labelKey: "tabHome"     },
  { id: "photo",    iconOn: "images"        as const, iconOff: "images-outline"        as const, labelKey: "tabPhoto"    },
  { id: "map",      iconOn: "location"      as const, iconOff: "location-outline"      as const, labelKey: "tabMap"      },
  { id: "alarm",    iconOn: "notifications" as const, iconOff: "notifications-outline" as const, labelKey: "tabAlarm"    },
  { id: "settings", iconOn: "settings"      as const, iconOff: "settings-outline"      as const, labelKey: "tabSettings" },
] as const;

function BottomNav({ tab, onTab, onSettings, bottomInset }: {
  tab: Tab; onTab: (t: Tab) => void; onSettings: () => void; bottomInset: number;
}) {
  const { t } = useLang();
  return (
    <View style={[bn.wrap, { paddingBottom: Math.max(bottomInset, 12) }]}>
      {NAV_ITEM_DEFS.map(item => {
        const active = item.id !== "settings" && tab === (item.id as Tab);
        const onPress = item.id === "settings" ? onSettings : () => onTab(item.id as Tab);
        return (
          <Pressable key={item.id} style={({ pressed }) => [bn.item, { opacity: pressed ? 0.65 : 1 }]} onPress={onPress}>
            <View style={[bn.iconWrap, active && bn.iconWrapActive]}>
              <Ionicons
                name={active ? item.iconOn : item.iconOff}
                size={22}
                color={active ? COLORS.navPill : "#94a3b8"}
              />
            </View>
            <Text style={[bn.label, active && bn.labelActive]}>{t[item.labelKey]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── 지도 화면 ────────────────────────────────────────────────────────────────
function MapScreen({ familyCode, bottomInset }: { familyCode: string | null; bottomInset: number }) {
  const { t } = useLang();
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

  const TAB_BAR_H = 58 + Math.max(bottomInset, 12);
  const BOTTOM_SAFE = TAB_BAR_H;

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
var pinHtml='<div class="pin-wrap"><div class="pin-ring"></div><div class="pin-dot"></div><div class="pin-label">${t.mapTapLabel}</div></div>';
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
          <iframe srcDoc={mapHtml} style={{ width: "100%", height: "100%", border: "none" }} title={t.mapIframeTitle as string} />
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
                <Text style={mp.pinHintText}>{t.mapTapLabel}</Text>
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
            <Text style={mp.infoName}>{!familyCode ? t.mapNoFamily : t.mapWaiting}</Text>
            <Text style={mp.infoAddr}>{!familyCode ? t.mapNoFamilyDesc : t.mapWaitingDesc}</Text>
          </View>
          {!familyCode && (
            <Pressable style={mp.connectBtn} onPress={() => router.push("/setup")}>
              <Text style={mp.connectBtnText}>{t.mapConnect}</Text>
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
          <Text style={mp.hintText}>{parentLoc.memberName}{t.mapTapHint}</Text>
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
              <Text style={mp.bannerStatus}>{isRecent ? t.mapSafe : (t.timeMinAgo as string).replace("{m}", String(minsAgo))}</Text>
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

// ─── 오늘 안부 상태창 ─────────────────────────────────────────────────────────
function AnbuStatusWidget({ allFamilyCodes, deviceId, topBarH }: {
  allFamilyCodes: string[]; deviceId: string; topBarH: number;
}) {
  const { t } = useLang();
  const [todayMsgs, setTodayMsgs] = useState<FamilyMessage[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const loadToday = useCallback(async () => {
    if (allFamilyCodes.length === 0) return;
    try {
      const results = await Promise.allSettled(allFamilyCodes.map(c => api.getMessages(c)));
      const all: FamilyMessage[] = [];
      results.forEach(r => { if (r.status === "fulfilled") all.push(...r.value); });
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const mine = all.filter(m => m.deviceId === deviceId && new Date(m.createdAt).getTime() >= todayStart);
      mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTodayMsgs(mine);
    } catch {}
  }, [allFamilyCodes, deviceId]);

  useEffect(() => {
    loadToday();
    const iv = setInterval(loadToday, 30000);
    return () => clearInterval(iv);
  }, [loadToday]);

  if (allFamilyCodes.length === 0) return null;

  const latest = todayMsgs[0];
  const count  = todayMsgs.length;

  const previewText = latest
    ? (latest.text ? latest.text.slice(0, 36) + (latest.text.length > 36 ? "…" : "") : t.anbuPhotoLabel)
    : t.todayAnbuNone;

  return (
    <Pressable
      style={[sw.card, { top: topBarH + 8 }]}
      onPress={() => setCollapsed(c => !c)}
    >
      <View style={sw.header}>
        <View style={sw.dot} />
        <Text style={sw.label}>{t.todayAnbu}</Text>
        {count > 0 && (
          <View style={sw.badge}>
            <Text style={sw.badgeText}>{count}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Ionicons
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={13}
          color="rgba(255,255,255,0.35)"
        />
      </View>

      {!collapsed && (
        <View style={sw.body}>
          <Text style={sw.preview} numberOfLines={2}>{previewText}</Text>
          {count > 1 && (
            <Text style={sw.more}>{(t.todayAnbuMore as string).replace("{n}", String(count - 1))}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ─── 안부 화면 ────────────────────────────────────────────────────────────────
function AnbuScreen({ familyCode, allFamilyCodes, myName, myRole, deviceId, topBarH }: {
  familyCode: string | null; allFamilyCodes: string[]; myName: string | null; myRole: string | null; deviceId: string; topBarH: number;
}) {
  const { t } = useLang();
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
    if (allFamilyCodes.length === 0) return;
    try {
      const results = await Promise.allSettled(allFamilyCodes.map(c => api.getMessages(c)));
      const all: FamilyMessage[] = [];
      results.forEach(r => { if (r.status === "fulfilled") all.push(...r.value); });
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMsgs(all);
    } catch {}
  }, [allFamilyCodes]);

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
      ActionSheetIOS.showActionSheetWithOptions({ options: [t.anbuActionSheetCancel, t.anbuActionSheetCamera, t.anbuActionSheetGallery], cancelButtonIndex: 0 }, i => { if (i === 1) pickCamera(); if (i === 2) pickLibrary(); });
    } else {
      Alert.alert(t.anbuActionSheetTitle, "", [{ text: t.anbuActionSheetCancel, style: "cancel" }, { text: t.anbuActionSheetCamera, onPress: pickCamera }, { text: t.anbuActionSheetGallery, onPress: pickLibrary }]);
    }
  };

  const send = async () => {
    if ((!text.trim() && !photo) || allFamilyCodes.length === 0 || !myName || !myRole) return;
    setSending(true);
    try {
      const results = await Promise.allSettled(
        allFamilyCodes.map(c => api.sendMessage(c, deviceId, myName, myRole, text.trim(), photo || null))
      );
      const first = results.find(r => r.status === "fulfilled") as PromiseFulfilledResult<FamilyMessage> | undefined;
      if (first) setMsgs(p => [first.value, ...p]);
      setText(""); setPhoto(null); setSent(true); setShowCompose(false);
      setTimeout(() => setSent(false), 2500);
    } catch (e: any) {
      Alert.alert(t.anbuSendFailed, e?.message === "request entity too large" ? t.anbuSendFailedSizeTip : t.anbuSendFailedRetryTip);
    }
    finally { setSending(false); }
  };

  const del = async (id: number) => {
    const msg = msgs.find(m => m.id === id);
    const code = msg?.familyCode ?? familyCode;
    if (!code) return;
    Alert.alert(t.anbuDelete, t.anbuDeleteConfirm, [
      { text: t.anbuActionSheetCancel, style: "cancel" },
      { text: t.anbuDelete, style: "destructive", onPress: async () => {
        setDelId(id);
        try { await api.deleteMessage(code, id, deviceId); setMsgs(p => p.filter(m => m.id !== id)); }
        catch { Alert.alert(t.anbuSendFailed, t.anbuDeleteFailed); }
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
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" }}>{t.anbuDelete}</Text>
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
            <Text style={ab.sheetTitle}>{t.anbuCompose}</Text>
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
              placeholder={t.anbuPlaceholder}
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
          <View style={ab.pill}><Text style={ab.pillText}>{t.anbuLive}</Text></View>
          <Text style={ab.bigTitle}>{t.anbuTitle}</Text>
        </View>

        <View style={ab.seg}>
          {(["messages", "gallery"] as const).map(v => (
            <Pressable key={v} onPress={() => setSubView(v)} style={[ab.segBtn, subView === v && ab.segBtnOn]}>
              <Text style={[ab.segText, subView === v && ab.segTextOn]}>{v === "messages" ? t.anbuSegMessages : `${t.anbuSegGallery}${photos.length > 0 ? ` ${photos.length}` : ""}`}</Text>
            </Pressable>
          ))}
        </View>

        {sent && (
          <View style={ab.toast}><Ionicons name="checkmark-circle" size={14} color={COLORS.neonText} /><Text style={ab.toastText}>{t.anbuSentToast}</Text></View>
        )}

        {!familyCode && (
          <View style={ab.connectCard}>
            <Text style={ab.connectTitle}>{t.anbuConnectHint}</Text>
            <Pressable style={ab.connectBtn} onPress={() => router.push("/setup")}><Text style={ab.connectBtnText}>{t.anbuConnect}</Text></Pressable>
          </View>
        )}

        {subView === "messages" && (
          <>
            {loading && <ActivityIndicator color={COLORS.neon} style={{ marginVertical: 20 }} />}
            {!loading && msgs.length === 0 && familyCode && (
              <View style={ab.empty}><Ionicons name="chatbubble-outline" size={32} color={COLORS.textMuted} /><Text style={ab.emptyText}>{t.anbuNoMessages}</Text></View>
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
                      <Text style={[ab.cardTime, first && { color: "rgba(26,37,53,0.55)" }]}>{formatTimeI18n(msg.createdAt, t)}</Text>
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
              <View style={ab.empty}><Ionicons name="images-outline" size={32} color={COLORS.textMuted} /><Text style={ab.emptyText}>{t.anbuNoPhotos}</Text></View>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {photos.map(m => (
                <View key={m.id} style={{ width: THUMB, height: THUMB, borderRadius: 16, overflow: "visible", position: "relative" }}>
                  <Pressable onPress={() => { setViewerUri(m.photoData!); setViewerMid(m.id); }} style={{ flex: 1, borderRadius: 16, overflow: "hidden" }}>
                    <Image source={{ uri: m.photoData! }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.38)", padding: 4, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: "#fff", textAlign: "center" }}>{formatTimeI18n(m.createdAt, t)}</Text>
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

// ─── 자녀 대기방 (부모 미연결) ────────────────────────────────────────────────
const QR_API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

function WaitingRoom({ familyCode, topBarH, bottomInset }: {
  familyCode: string; topBarH: number; bottomInset: number;
}) {
  const { t } = useLang();
  const qrUri = `${QR_API_BASE}/qr/${familyCode}`;
  const segments = familyCode.match(/.{1,3}/g) ?? [familyCode];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.child.bg }}
      contentContainerStyle={{ paddingTop: topBarH + 24, paddingBottom: bottomInset + 40, alignItems: "center", paddingHorizontal: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={wr.badge}>
        <View style={wr.badgeDot} />
        <Text style={wr.badgeText}>{t.waitingBadge}</Text>
      </View>
      <Text style={wr.title}>{t.waitingTitle}</Text>
      <Text style={wr.sub}>{t.waitingSub}</Text>

      {/* QR 코드 */}
      <View style={wr.qrWrap}>
        <Image
          source={{ uri: qrUri }}
          style={{ width: 220, height: 220 }}
          resizeMode="contain"
        />
      </View>

      <Text style={wr.codeLabel}>{t.waitingCodeLabel}</Text>
      <View style={wr.codeRow}>
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Text style={wr.codeSep}>·</Text>}
            <View style={wr.codePill}>
              <Text style={wr.codeDigits}>{seg}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <View style={wr.infoCard}>
        <View style={wr.infoRow}>
          <View style={[wr.infoIcon, { backgroundColor: "#eff6ff" }]}>
            <Ionicons name="qr-code-outline" size={18} color="#3b82f6" />
          </View>
          <Text style={wr.infoText}>{t.waitingInfo1}</Text>
        </View>
        <View style={wr.infoRow}>
          <View style={[wr.infoIcon, { backgroundColor: "#f0fdf4" }]}>
            <Ionicons name="keypad-outline" size={18} color="#22c55e" />
          </View>
          <Text style={wr.infoText}>{t.waitingInfo2}</Text>
        </View>
        <View style={wr.infoRow}>
          <View style={[wr.infoIcon, { backgroundColor: "rgba(212,242,0,0.18)" }]}>
            <Ionicons name="radio-outline" size={18} color="#84a800" />
          </View>
          <Text style={wr.infoText}>{t.waitingInfo3}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── 홈 대시보드 ──────────────────────────────────────────────────────────────
type ActivityItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  time: string;
  timestamp: number;
};

function HomeScreen({
  familyCode, allFamilyCodes, deviceId, topBarH, bottomInset, onGoToAnbu,
}: {
  familyCode: string | null;
  allFamilyCodes: string[];
  deviceId: string;
  topBarH: number;
  bottomInset: number;
  onGoToAnbu: () => void;
}) {
  const { t } = useLang();
  const [parentLoc, setParentLoc] = useState<LocationData | null>(null);
  const [messages, setMessages]   = useState<FamilyMessage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAll, setShowAll]     = useState(false);
  const [parentJoined, setParentJoined] = useState(false);
  const [parentChecked, setParentChecked] = useState(false);
  const [parentMemberName, setParentMemberName] = useState<string | null>(null);
  const [parentPhoto, setParentPhoto] = useState<string | null>(null);
  const revealAnim = useRef(new Animated.Value(0)).current;

  // ── 부모 연결 감지 (5초 폴링) ──
  useEffect(() => {
    if (!familyCode) { setParentChecked(true); return; }
    let cancelled = false;
    const check = async () => {
      try {
        const group = await api.getFamily(familyCode);
        const parentMember = group.members.find(m => m.role === "parent");
        if (!cancelled) {
          setParentChecked(true);
          if (parentMember) {
            setParentMemberName(parentMember.memberName);
            if (parentMember.photoData) setParentPhoto(parentMember.photoData);
            revealAnim.setValue(1);
            setParentJoined(true);
          }
        }
      } catch {
        if (!cancelled) setParentChecked(true);
      }
    };
    check();
    const iv = setInterval(check, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [familyCode]);

  const [parentActivities, setParentActivities] = useState<ParentActivityLog[]>([]);

  const load = useCallback(async () => {
    if (!allFamilyCodes.length) { setLoading(false); return; }
    try {
      const [locsArr, msgsArr, actsArr] = await Promise.all([
        Promise.all(allFamilyCodes.map(c => api.getAllLocations(c))),
        Promise.all(allFamilyCodes.map(c => api.getMessages(c))),
        Promise.all(allFamilyCodes.map(c => api.getParentActivities(c).catch(() => [] as ParentActivityLog[]))),
      ]);
      const parentLocs = locsArr.flat().filter(l => l.role === "parent");
      const newest = parentLocs.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0] ?? null;
      setParentLoc(newest);
      setMessages(
        msgsArr.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
      setParentActivities(
        actsArr.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
    } catch {}
    setLoading(false);
  }, [allFamilyCodes]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const minsAgo = parentLoc
    ? Math.floor((Date.now() - new Date(parentLoc.updatedAt).getTime()) / 60000)
    : null;
  const statusLevel =
    minsAgo === null ? "none"
    : minsAgo < 30   ? "good"
    : minsAgo < 120  ? "warn"
    :                  "alert";

  const STATUS_COLOR = { good: "#22c55e", warn: "#f59e0b", alert: "#ef4444", none: "#94a3b8" } as const;
  const STATUS_LABEL = { good: t.statusLabelGood, warn: t.statusLabelWarn, alert: t.statusLabelAlert, none: t.statusLabelNone };
  const STATUS_MSG   = {
    good:  { title: t.statusMsgGoodTitle, sub: (t.statusMsgGoodSub as string).replace("{m}", String(minsAgo)) },
    warn:  { title: t.statusMsgWarnTitle, sub: (t.statusMsgWarnSub as string).replace("{m}", String(minsAgo)) },
    alert: { title: t.statusMsgAlertTitle, sub: (t.statusMsgAlertSub as string).replace("{h}", String(Math.floor((minsAgo ?? 0) / 60))) },
    none:  { title: t.statusMsgNoneTitle, sub: t.statusMsgNoneSub },
  };

  const statusColor = STATUS_COLOR[statusLevel];
  const statusMsg   = STATUS_MSG[statusLevel];

  const ACTIVITY_ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string }> = {
    heart:      { icon: "heart",           iconColor: "#ec4899", iconBg: "#fdf2f8" },
    view_slide: { icon: "eye",             iconColor: "#8b5cf6", iconBg: "#f5f3ff" },
    location:   { icon: "location",        iconColor: "#3b82f6", iconBg: "#eff6ff" },
    app_open:   { icon: "phone-portrait",  iconColor: "#22c55e", iconBg: "#f0fdf4" },
    quiz:       { icon: "bulb",            iconColor: "#f59e0b", iconBg: "#fffbeb" },
    message:    { icon: "chatbubble",      iconColor: "#06b6d4", iconBg: "#ecfeff" },
  };
  const DEFAULT_ICON = { icon: "ellipse" as keyof typeof Ionicons.glyphMap, iconColor: "#94a3b8", iconBg: "#f1f5f9" };

  const ACTIVITY_LABEL_MAP: Record<string, string> = {
    app_open:   t.parentLogAppOpen as string,
    location:   t.parentLogLocShared as string,
    view_slide: t.parentLogViewPhoto as string,
    heart:      t.parentLogHeartPhoto as string,
    message:    t.parentLogViewMsg as string,
  };

  const activities = useMemo<ActivityItem[]>(() => {
    return parentActivities.slice(0, showAll ? 20 : 4).map((a) => {
      const style = ACTIVITY_ICON_MAP[a.activityType] || DEFAULT_ICON;
      const baseLabel = ACTIVITY_LABEL_MAP[a.activityType] || a.activityType;
      const detailAddr = a.detail?.includes(" · ") ? a.detail.split(" · ").slice(1).join(" · ") : null;
      const label = detailAddr ? `${baseLabel} · ${detailAddr}` : baseLabel;
      return {
        id: `pa${a.id}`,
        icon: style.icon,
        iconColor: style.iconColor,
        iconBg: style.iconBg,
        label,
        time: formatTimeI18n(a.createdAt, t),
        timestamp: new Date(a.createdAt).getTime(),
      };
    });
  }, [parentActivities, showAll, t]);

  const parentName = parentLoc?.memberName ?? parentMemberName ?? t.parentDefault;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.homeGreetMorning : hour < 18 ? t.homeGreetDay : t.homeGreetEvening;

  // 가족 코드 없음 (회원가입 전 직접 접근)
  if (!familyCode) {
    return (
      <View style={[{ flex: 1, backgroundColor: "#f4f6fb", paddingTop: topBarH }, hm.centerEmpty]}>
        <View style={hm.emptyIcon}><Ionicons name="wifi-outline" size={28} color="#94a3b8" /></View>
        <Text style={hm.emptyTitle}>{t.homeNotConnected}</Text>
        <Text style={hm.emptySub}>{t.homeNotConnectedSub}</Text>
      </View>
    );
  }

  // 첫 폴링 결과 도착 전 — 빈 화면 (깜빡임 방지)
  if (!parentChecked) {
    return <View style={{ flex: 1, backgroundColor: COLORS.child.bg }} />;
  }

  // 가족 코드 있지만 부모 미연결 → 대기방
  if (!parentJoined) {
    return <WaitingRoom familyCode={familyCode} topBarH={topBarH} bottomInset={bottomInset} />;
  }

  // 부모 연결 완료 → 대시보드 (페이드인)
  return (
    <Animated.View style={{ flex: 1, opacity: revealAnim }}>
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f4f6fb" }}
      contentContainerStyle={{ paddingTop: topBarH + 12, paddingBottom: bottomInset + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 인사말 */}
      <Text style={hm.greeting}>{greeting} 👋</Text>

      {/* 상태 배너 */}
      <View style={hm.statusBanner}>
        <View style={hm.statusRow}>
          <View style={[hm.statusDot, { backgroundColor: statusColor }]} />
          <Text style={hm.statusTitle}>{statusMsg.title}</Text>
        </View>
        <Text style={hm.statusSub}>{statusMsg.sub}</Text>
      </View>

      {/* 부모님 카드 */}
      <View style={hm.parentCard}>
        <View style={hm.parentAvatar}>
          {parentPhoto ? (
            <Image source={{ uri: parentPhoto }} style={{ width: 50, height: 50, borderRadius: 25 }} />
          ) : (
            <Ionicons name="person" size={26} color="#3b82f6" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={hm.parentName}>{parentName}</Text>
          <View style={hm.parentStatusRow}>
            <View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor }]} />
            <Text style={hm.parentStatusText}>{STATUS_LABEL[statusLevel]}</Text>
          </View>
          {parentLoc && (
            <Text style={hm.parentTime}>{t.lastActivity} · {formatTimeI18n(parentLoc.updatedAt, t)}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
      </View>

      {/* 최근 활동 */}
      <Text style={hm.sectionTitle}>{t.recentActivity}</Text>
      {loading ? (
        <ActivityIndicator style={{ marginVertical: 20 }} color="#3b82f6" />
      ) : activities.length === 0 ? (
        <View style={[hm.activityCard, { padding: 28, alignItems: "center", gap: 8 }]}>
          <Ionicons name="time-outline" size={26} color="#cbd5e1" />
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: "#94a3b8" }}>{t.noActivityYet}</Text>
        </View>
      ) : (
        <View style={hm.activityCard}>
          {activities.map((item, i) => (
            <React.Fragment key={item.id}>
              {i > 0 && <View style={hm.activityDivider} />}
              <View style={hm.activityRow}>
                <View style={[hm.activityIconBg, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={14} color={item.iconColor} />
                </View>
                <Text style={hm.activityLabel}>{item.label}</Text>
                <Text style={hm.activityTime}>{item.time}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      {!showAll && parentActivities.length > 4 && (
        <Pressable style={hm.viewAllBtn} onPress={() => setShowAll(true)}>
          <Text style={hm.viewAllText}>{t.viewAllActivity}</Text>
        </Pressable>
      )}

      {/* 연락하기 */}
      <Text style={hm.sectionTitle}>{t.contactSection}</Text>
      <View style={hm.actionsRow}>
        <Pressable style={({ pressed }) => [hm.actionBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => Linking.openURL("tel:")}>
          <View style={[hm.actionIconBg, { backgroundColor: "#f0fdf4" }]}>
            <Ionicons name="call" size={22} color="#22c55e" />
          </View>
          <Text style={hm.actionLabel}>{t.contactCall}</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [hm.actionBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={onGoToAnbu}>
          <View style={[hm.actionIconBg, { backgroundColor: "#eff6ff" }]}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#3b82f6" />
          </View>
          <Text style={hm.actionLabel}>{t.contactMessage}</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [hm.actionBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => Linking.openURL("facetime:")}>
          <View style={[hm.actionIconBg, { backgroundColor: "#fdf4ff" }]}>
            <Ionicons name="videocam" size={22} color="#a855f7" />
          </View>
          <Text style={hm.actionLabel}>{t.contactVideo}</Text>
        </Pressable>
      </View>
    </ScrollView>
    </Animated.View>
  );
}

// ─── 알림 화면 ────────────────────────────────────────────────────────────────
function NotificationScreen({ allFamilyCodes, topBarH, bottomInset }: {
  allFamilyCodes: string[]; topBarH: number; bottomInset: number;
}) {
  const { t } = useLang();
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!allFamilyCodes.length) { setLoading(false); return; }
    Promise.all(allFamilyCodes.map(c => api.getMessages(c)))
      .then(arr => setMessages(
        arr.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      ))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [allFamilyCodes]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f4f6fb" }}
      contentContainerStyle={{ paddingTop: topBarH + 12, paddingBottom: bottomInset + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={hm.sectionTitle}>{t.notifTitle}</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#3b82f6" />
      ) : messages.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 56 }}>
          <View style={hm.emptyIcon}><Ionicons name="notifications-outline" size={28} color="#94a3b8" /></View>
          <Text style={hm.emptyTitle}>{t.notifEmpty}</Text>
          <Text style={hm.emptySub}>{t.notifEmptySub}</Text>
        </View>
      ) : (
        <View style={hm.activityCard}>
          {messages.slice(0, 30).map((m, i) => (
            <React.Fragment key={m.id}>
              {i > 0 && <View style={hm.activityDivider} />}
              <View style={hm.activityRow}>
                <View style={[hm.activityIconBg, { backgroundColor: m.fromRole === "parent" ? "#eff6ff" : "#f0fdf4" }]}>
                  <Ionicons
                    name={m.photoData ? "image" : m.fromRole === "parent" ? "chatbubble" : "paper-plane"}
                    size={14}
                    color={m.fromRole === "parent" ? "#3b82f6" : "#22c55e"}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={hm.activityLabel}>{m.fromName}</Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#64748b" }} numberOfLines={1}>
                    {m.text || t.notifSentPhoto}
                  </Text>
                </View>
                <Text style={hm.activityTime}>{formatTimeI18n(m.createdAt, t)}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── 선물샵 화면 ──────────────────────────────────────────────────────────────
type GiftItem = { id: number; name: string; price: string; category: string; icon: string; popular: boolean };

function GiftScreen({ topBarH }: { topBarH: number }) {
  const { t } = useLang();
  const GIFTS: GiftItem[] = useMemo(() =>
    (t.giftItems as any[]).map((g: any, i: number) => ({
      id: i,
      name: g.name,
      price: g.price,
      category: g.category,
      icon: GIFT_ICONS[i] ?? "gift",
      popular: GIFT_POPULAR[i] ?? false,
    })),
  [t.giftItems]);

  const [sel, setSel]       = useState<GiftItem | null>(null);
  const [bought, setBought] = useState<GiftItem | null>(null);
  const [filter, setFilter] = useState("all");
  const cats = [
    { key: "all",    label: t.giftFilterAll },
    { key: "food",   label: t.giftFilterFood },
    { key: "health", label: t.giftFilterHealth },
    { key: "flower", label: t.giftFilterFlower },
  ];
  const CAT_MAP: Record<string, string> = useMemo(() => {
    const items = t.giftItems as any[];
    const unique = [...new Set(items.map((g: any) => g.category))];
    const keys = ["food", "health", "flower"];
    const map: Record<string, string> = {};
    unique.forEach((cat: string, i: number) => { map[keys[i] ?? cat] = cat; });
    return map;
  }, [t.giftItems]);
  const filtered = filter === "all" ? GIFTS : GIFTS.filter(g => g.category === CAT_MAP[filter]);

  return (
    <>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: topBarH + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={gf.hdr}>
          <View style={ab.pill}><Text style={ab.pillText}>{t.giftFilterAll}</Text></View>
          <Text style={ab.bigTitle}>{t.giftShopTitle}</Text>
        </View>

        {bought && (
          <View style={gf.success}><Ionicons name="checkmark-circle" size={16} color={COLORS.neonText} /><Text style={gf.successText}>{bought.name} {t.giftOrderDone}</Text></View>
        )}

        <View style={gf.filterRow}>
          {cats.map(c => (
            <Pressable key={c.key} onPress={() => setFilter(c.key)} style={[gf.chip, filter === c.key && gf.chipOn]}>
              <Text style={[gf.chipText, filter === c.key && gf.chipTextOn]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={gf.grid}>
          {filtered.map((g, idx) => {
            const first = idx === 0 && filter === "all";
            return (
              <Pressable key={g.id} style={({ pressed }) => [gf.card, first && gf.cardNeon, { opacity: pressed ? 0.9 : 1 }]} onPress={() => setSel(g)}>
                {g.popular && <View style={gf.pop}><Text style={gf.popText}>{t.giftPopular}</Text></View>}
                {first && <><View style={ab.deco1} /><View style={ab.deco2} /></>}
                <View style={[gf.iconBg, first && { backgroundColor: "rgba(0,0,0,0.1)" }]}>
                  <Ionicons name={g.icon as any} size={26} color={first ? COLORS.neonText : COLORS.neon} />
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
              <Ionicons name={(sel?.icon ?? "gift") as any} size={32} color={COLORS.neonText} />
            </View>
            <Text style={gf.sheetTitle}>{sel?.name}</Text>
            <Text style={gf.sheetPrice}>{sel?.price}</Text>
            <Text style={gf.sheetDesc}>{t.giftSheetDesc}</Text>
            <Pressable style={ab.sendBtn} onPress={() => { setBought(sel); setSel(null); }}>
              <Ionicons name="gift" size={16} color={COLORS.neonText} />
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.neonText, marginLeft: 8 }}>{t.giftSendBtn} · {sel?.price}</Text>
            </Pressable>
            <Pressable style={{ marginTop: 12 }} onPress={() => setSel(null)}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.textMuted }}>{t.giftCancel}</Text>
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
  const { familyCode, allFamilyCodes, myName, myRole, deviceId, isMasterChild, childRole } = useFamilyContext();
  const [tab, setTab] = useState<Tab>("home");

  const topInset    = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;
  const TOP_H       = topInset + 60;
  const isMap       = tab === "map";

  return (
    <View style={{ flex: 1, backgroundColor: isMap ? COLORS.mapBg : COLORS.bg }}>

      {tab === "home" && (
        <HomeScreen
          familyCode={familyCode}
          allFamilyCodes={allFamilyCodes}
          deviceId={deviceId}
          topBarH={TOP_H}
          bottomInset={bottomInset}
          onGoToAnbu={() => setTab("photo")}
        />
      )}

      {tab === "photo" && (
        <AnbuScreen familyCode={familyCode} allFamilyCodes={allFamilyCodes} myName={myName} myRole={myRole} deviceId={deviceId} topBarH={TOP_H} />
      )}

      {isMap && (
        <View style={StyleSheet.absoluteFillObject}>
          <MapScreen familyCode={familyCode} bottomInset={bottomInset} />
        </View>
      )}

      {tab === "alarm" && (
        <NotificationScreen allFamilyCodes={allFamilyCodes} topBarH={TOP_H} bottomInset={bottomInset} />
      )}

      {/* ══ 상단 바 — 항상 위에 ══ */}
      <TopBar tab={tab} topInset={topInset} />

      {/* ══ 하단 탭 바 ══ */}
      <BottomNav
        tab={tab}
        onTab={setTab}
        onSettings={() => router.push("/profile")}
        bottomInset={bottomInset}
      />

    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

// 하단 탭 바
const bn = StyleSheet.create({
  wrap:          { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 400, flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 },
  item:          { flex: 1, alignItems: "center", gap: 3, paddingVertical: 2 },
  iconWrap:      { width: 36, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  iconWrapActive:{ backgroundColor: "rgba(26,34,48,0.08)" },
  label:         { fontFamily: "Inter_500Medium", fontSize: 10, color: "#94a3b8" },
  labelActive:   { color: COLORS.navPill, fontFamily: "Inter_600SemiBold" },
});

// 대기방
const wr = StyleSheet.create({
  badge:       { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(212,242,0,0.15)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, marginBottom: 20, borderWidth: 1, borderColor: "rgba(212,242,0,0.2)" },
  badgeDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.neon },
  badgeText:   { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#84a800" },
  title:       { fontFamily: "Inter_700Bold", fontSize: 30, color: COLORS.child.text, textAlign: "center", lineHeight: 38, marginBottom: 10 },
  sub:         { fontFamily: "Inter_400Regular", fontSize: 15, color: COLORS.child.textSub, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  qrWrap:      { width: 232, height: 232, backgroundColor: "#fff", borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 6, borderWidth: 1, borderColor: "rgba(0,0,0,0.04)", overflow: "hidden" },
  qrNative:    { width: 200, height: 200, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f8ff", borderRadius: 18 },
  qrNativeText:{ fontFamily: "Inter_700Bold", fontSize: 28, color: COLORS.child.text, letterSpacing: 8 },
  codeLabel:   { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.child.textMuted, letterSpacing: 1, marginBottom: 10 },
  codeRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 32 },
  codePill:    { backgroundColor: COLORS.child.bgCard, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1.5, borderColor: COLORS.child.bgCardBorder, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  codeDigits:  { fontFamily: "Inter_700Bold", fontSize: 26, color: COLORS.child.text, letterSpacing: 4 },
  codeSep:     { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.child.textMuted },
  infoCard:    { width: "100%", backgroundColor: COLORS.child.bgCard, borderRadius: 20, padding: 20, gap: 14, borderWidth: 1, borderColor: COLORS.child.bgCardBorder },
  infoRow:     { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon:    { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoText:    { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.textSub, flex: 1 },
});

// 홈 대시보드
const hm = StyleSheet.create({
  centerEmpty:     { alignItems: "center", justifyContent: "center", flex: 1 },
  greeting:        { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#64748b", marginHorizontal: 20, marginBottom: 10 },
  statusBanner:    { marginHorizontal: 16, marginBottom: 12, borderRadius: 24, padding: 22, backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 3 },
  statusRow:       { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  statusDot:       { width: 10, height: 10, borderRadius: 5 },
  statusTitle:     { fontFamily: "Inter_700Bold", fontSize: 20, color: "#1a2535", flex: 1, lineHeight: 26 },
  statusSub:       { fontFamily: "Inter_400Regular", fontSize: 14, color: "#64748b", lineHeight: 20 },
  parentCard:      { marginHorizontal: 16, marginBottom: 6, borderRadius: 20, backgroundColor: "#fff", padding: 16, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  parentAvatar:    { width: 52, height: 52, borderRadius: 26, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  parentName:      { fontFamily: "Inter_700Bold", fontSize: 17, color: "#1a2535", marginBottom: 4 },
  parentStatusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  parentStatusText:{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#64748b" },
  parentTime:      { fontFamily: "Inter_400Regular", fontSize: 12, color: "#94a3b8", marginTop: 3 },
  sectionTitle:    { fontFamily: "Inter_700Bold", fontSize: 16, color: "#1a2535", marginHorizontal: 20, marginTop: 22, marginBottom: 10 },
  activityCard:    { marginHorizontal: 16, borderRadius: 20, backgroundColor: "#fff", overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  activityRow:     { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, paddingHorizontal: 14 },
  activityDivider: { height: 1, backgroundColor: "#f1f5f9", marginHorizontal: 14 },
  activityIconBg:  { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  activityLabel:   { fontFamily: "Inter_500Medium", fontSize: 14, color: "#1e293b", flex: 1 },
  activityTime:    { fontFamily: "Inter_400Regular", fontSize: 12, color: "#94a3b8" },
  viewAllBtn:      { marginHorizontal: 16, marginTop: 10, borderRadius: 16, borderWidth: 1.5, borderColor: "#e2e8f0", paddingVertical: 14, alignItems: "center", backgroundColor: "#fff" },
  viewAllText:     { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#475569" },
  actionsRow:      { flexDirection: "row", gap: 12, marginHorizontal: 16 },
  actionBtn:       { flex: 1, borderRadius: 20, backgroundColor: "#fff", paddingVertical: 18, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  actionIconBg:    { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  actionLabel:     { fontFamily: "Inter_500Medium", fontSize: 12, color: "#475569" },
  emptyIcon:       { width: 64, height: 64, borderRadius: 32, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle:      { fontFamily: "Inter_700Bold", fontSize: 18, color: "#1a2535", textAlign: "center" },
  emptySub:        { fontFamily: "Inter_400Regular", fontSize: 14, color: "#94a3b8", textAlign: "center", marginTop: 6, lineHeight: 22 },
});

// 상단 바
const tb = StyleSheet.create({
  wrap:         { position: "absolute", top: 0, left: 0, right: 0, zIndex: 200, flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 10 },
  logo:         { fontFamily: "Inter_700Bold", fontSize: 19, color: COLORS.white, letterSpacing: 1 },
  codeChip:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(212,242,0,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: "rgba(212,242,0,0.2)" },
  codeText:     { fontFamily: "Inter_600SemiBold", fontSize: 10, color: COLORS.neon, letterSpacing: 1 },
  rightGroup:   { flexDirection: "row", alignItems: "center", gap: 8 },
  tabRow:       { flexDirection: "row", gap: 4, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 50, padding: 3 },
  tabRowLight:  { backgroundColor: "rgba(0,0,0,0.06)" },
  tabChip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50 },
  tabChipOnDark:  { backgroundColor: COLORS.neon },
  tabChipOnLight: { backgroundColor: COLORS.navPill },
  tabText:      { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.55)" },
  masterBadge:  { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.neon, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, borderWidth: 1, borderColor: "rgba(212,242,0,0.4)" },
  masterText:   { fontFamily: "Inter_700Bold", fontSize: 10, color: COLORS.neonText, letterSpacing: 0.5 },
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

// 오늘 안부 상태창
const sw = StyleSheet.create({
  card:    { position: "absolute", left: 16, right: 16, zIndex: 250, backgroundColor: "rgba(20,28,42,0.88)", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(212,242,0,0.15)" },
  header:  { flexDirection: "row", alignItems: "center", gap: 7 },
  dot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.neon },
  label:   { fontFamily: "Inter_700Bold", fontSize: 13, color: COLORS.white },
  badge:   { backgroundColor: COLORS.neon, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: COLORS.neonText },
  body:    { marginTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", paddingTop: 10 },
  preview: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 18 },
  more:    { fontFamily: "Inter_500Medium", fontSize: 11, color: "rgba(212,242,0,0.6)", marginTop: 5 },
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

