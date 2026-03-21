import { Ionicons } from "@expo/vector-icons";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
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
  LayoutChangeEvent,
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
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";

import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";
import { useLang } from "@/context/LanguageContext";
import { api, FamilyMessage, LocationData, ParentActivityLog } from "@/lib/api";

const { width, height } = Dimensions.get("window");
type Tab = "home" | "photo" | "map" | "alarm";

const DS = {
  bg: COLORS.background,
  surface: COLORS.surface,
  surfaceSoft: COLORS.surfaceSoft,
  textPrimary: COLORS.textPrimary,
  textSecondary: COLORS.textSecondary,
  textTertiary: COLORS.textTertiary,
  brand: COLORS.brandPrimary,
  brandDeep: COLORS.brandDeep,
  success: COLORS.success,
  warning: COLORS.warning,
  danger: COLORS.danger,
  info: COLORS.info,
  border: COLORS.border,
  radius: { card: 11, cardLg: 14, pill: 999 },
  space: { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 },
};

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function BorderGlow({ w, h, r, duration = 8000 }: { w: number; h: number; r: number; duration?: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const perimeter = 2 * (w + h) - 8 * r + 2 * Math.PI * r;
  const glowSpan = perimeter * 0.32;

  useEffect(() => {
    Animated.loop(
      Animated.timing(progress, { toValue: 1, duration, useNativeDriver: false })
    ).start();
  }, [duration]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -perimeter],
  });

  const roseColor = "#C4787A";
  const inset = 0.5;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="roseGlow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={roseColor} stopOpacity="0" />
            <Stop offset="0.3" stopColor={roseColor} stopOpacity="0.25" />
            <Stop offset="0.5" stopColor={roseColor} stopOpacity="0.45" />
            <Stop offset="0.7" stopColor={roseColor} stopOpacity="0.25" />
            <Stop offset="1" stopColor={roseColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <AnimatedRect
          x={inset}
          y={inset}
          width={w - inset * 2}
          height={h - inset * 2}
          rx={r}
          ry={r}
          fill="none"
          stroke="url(#roseGlow)"
          strokeWidth={5}
          strokeDasharray={`${glowSpan} ${perimeter - glowSpan}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

function formatTimeI18n(dateStr: string, t: any): string {
  const d = new Date(dateStr), now = new Date();
  const m = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (m < 1) return t.timeJustNow;
  if (m < 60) return (t.timeMinAgo as string).replace("{m}", String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return (t.timeHourAgo as string).replace("{h}", String(h));
  return (t.timeDayAgo as string).replace("{d}", String(Math.floor(h / 24)));
}

function AppHeader({ topInset, isMap }: { topInset: number; isMap: boolean }) {
  const { isMasterChild } = useFamilyContext();
  const { t } = useLang();
  return (
    <View style={[hdr.wrap, {
      paddingTop: topInset + 12,
      backgroundColor: isMap ? "rgba(180,100,50,0.92)" : "transparent",
      borderBottomWidth: isMap ? 0 : 0,
    }]}>
      <Image source={require("@/assets/images/logo-anbu.png")} style={{ width: 80, height: 24 }} resizeMode="contain" />
      <View style={{ flex: 1 }} />
      {isMasterChild && (
        <View style={hdr.masterBadge}>
          <Ionicons name="shield-checkmark" size={11} color="#D4A843" />
          <Text style={hdr.masterText}>{t.masterLabel}</Text>
        </View>
      )}
    </View>
  );
}

const NAV_ITEMS = [
  { id: "home",     iconOn: "home"          as const, iconOff: "home-outline"          as const, labelKey: "tabHome" },
  { id: "photo",    iconOn: "images"        as const, iconOff: "images-outline"        as const, labelKey: "tabPhoto" },
  { id: "map",      iconOn: "location"      as const, iconOff: "location-outline"      as const, labelKey: "tabMap" },
  { id: "alarm",    iconOn: "notifications" as const, iconOff: "notifications-outline" as const, labelKey: "tabAlarm" },
  { id: "settings", iconOn: "settings"      as const, iconOff: "settings-outline"      as const, labelKey: "tabSettings" },
] as const;

function BottomTabBar({ tab, onTab, onSettings, bottomInset }: {
  tab: Tab; onTab: (t: Tab) => void; onSettings: () => void; bottomInset: number;
}) {
  const { t } = useLang();
  return (
    <View style={[nav.wrap, { paddingBottom: Math.max(bottomInset, 12) }]}>
      {NAV_ITEMS.map(item => {
        const active = item.id !== "settings" && tab === (item.id as Tab);
        const onPress = item.id === "settings" ? onSettings : () => onTab(item.id as Tab);
        return (
          <Pressable key={item.id} style={({ pressed }) => [nav.item, { opacity: pressed ? 0.6 : 1 }]} onPress={onPress}>
            <View style={[nav.iconCircle, active && nav.iconCircleActive]}>
              <Ionicons
                name={active ? item.iconOn : item.iconOff}
                size={21}
                color={active ? DS.brand : DS.textTertiary}
              />
            </View>
            <Text style={[nav.label, active && nav.labelActive]}>{t[item.labelKey]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatusChip({ level, label }: { level: "good" | "warn" | "alert" | "none"; label: string }) {
  const colorMap = { good: DS.success, warn: DS.warning, alert: DS.danger, none: DS.textTertiary };
  const bgMap = { good: "rgba(52,168,83,0.15)", warn: "rgba(212,168,67,0.15)", alert: "rgba(229,57,53,0.15)", none: "rgba(155,128,128,0.10)" };
  const textMap = { good: "#34A853", warn: "#D4A843", alert: "#E53935", none: DS.textTertiary };
  return (
    <View style={[chip.wrap, { backgroundColor: bgMap[level] }]}>
      <View style={[chip.dot, { backgroundColor: colorMap[level] }]} />
      <Text style={[chip.text, { color: textMap[level] }]}>{label}</Text>
    </View>
  );
}

function CircleBtn({ icon, size = 18, bg, color, onPress, style }: {
  icon: keyof typeof Ionicons.glyphMap; size?: number;
  bg?: string; color?: string; onPress?: () => void; style?: object;
}) {
  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg ?? "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1 }, style]}>
      <Ionicons name={icon} size={size} color={color ?? "#fff"} />
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAP SCREEN (Forest style)
// ═══════════════════════════════════════════════════════════════════════════════
function MapScreen({ familyCode, bottomInset }: { familyCode: string | null; bottomInset: number }) {
  const { t } = useLang();
  const [locs, setLocs] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const bannerY = useRef(new Animated.Value(120)).current;
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

  const allParentLocs = locs.filter(l => l.role === "parent" && l.isSharing);
  const parentLocs = allParentLocs.filter(l => !l.privacyMode);
  const privacyParents = allParentLocs.filter(l => l.privacyMode);
  const hasParents = parentLocs.length > 0;
  const hasAnyParent = allParentLocs.length > 0;
  const activeLoc = parentLocs[selectedIdx] ?? parentLocs[0] ?? null;
  const centerLat = hasParents ? parentLocs.reduce((s, l) => s + l.latitude, 0) / parentLocs.length : 37.5665;
  const centerLon = hasParents ? parentLocs.reduce((s, l) => s + l.longitude, 0) / parentLocs.length : 126.978;

  const PIN_COLORS = [DS.brand, "#C0766E"];

  const openBannerFor = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setShowBanner(true);
    Animated.parallel([
      Animated.spring(bannerY, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 }),
      Animated.timing(bannerAlpha, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(closeBanner, 8000);
  }, []);

  const closeBanner = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(bannerY, { toValue: 120, duration: 260, useNativeDriver: false }),
      Animated.timing(bannerAlpha, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start(() => setShowBanner(false));
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: MessageEvent) => {
      if (typeof e.data === "string" && e.data.startsWith("markerClick:")) {
        const idx = parseInt(e.data.split(":")[1], 10);
        if (!isNaN(idx) && idx < parentLocs.length) openBannerFor(idx);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [parentLocs.length, openBannerFor]);

  const openMapsFor = (loc: LocationData) => {
    const { latitude: la, longitude: lo } = loc;
    const url = Platform.OS === "ios"
      ? `maps://maps.apple.com/maps?q=${la},${lo}`
      : Platform.OS === "android"
      ? `geo:${la},${lo}?q=${la},${lo}`
      : `https://www.google.com/maps/search/?api=1&query=${la},${lo}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${la},${lo}`));
  };

  const TAB_BAR_H = 58 + Math.max(bottomInset, 12);
  const BOTTOM_SAFE = TAB_BAR_H;

  const markersJs = parentLocs.map((pl, i) => {
    const c = PIN_COLORS[i % PIN_COLORS.length];
    return `
(function(){
  var pinHtml='<div class="pin-wrap"><div class="pin-ring" style="background:${c.replace("#", "rgba(")
    .replace(/(..)(..)(..)/, (_, r: string, g: string, b: string) => `${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)}`)},0.25)"></div><div class="pin-dot" style="background:${c}; box-shadow:0 2px 12px ${c}99"></div><div class="pin-label">${pl.memberName}</div></div>';
  var m=L.marker([${pl.latitude},${pl.longitude}],{icon:L.divIcon({className:'',html:pinHtml,iconSize:[22,22],iconAnchor:[11,11]})}).addTo(map);
  m.on('click',function(){window.parent.postMessage('markerClick:${i}','*');});
})();`;
  }).join("\n");

  const boundsJs = parentLocs.length > 1
    ? `map.fitBounds([${parentLocs.map(p => `[${p.latitude},${p.longitude}]`).join(",")}],{padding:[60,60]});`
    : "";

  const mapHtml = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
#map{width:100vw;height:100vh}
.leaflet-control-attribution{display:none}
.pin-wrap{cursor:pointer;position:relative;width:22px;height:22px}
.pin-ring{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;animation:pulse 1.5s ease-out infinite}
.pin-dot{width:22px;height:22px;border-radius:50%;border:3.5px solid #fff}
.pin-label{position:absolute;bottom:28px;left:50%;transform:translateX(-50%);background:#1C2430;color:#fff;font-size:11px;font-family:sans-serif;white-space:nowrap;padding:4px 10px;border-radius:12px;pointer-events:none;opacity:0;transition:opacity 0.2s}
.pin-wrap:hover .pin-label{opacity:1}
@keyframes pulse{0%{transform:translate(-50%,-50%) scale(0.5);opacity:1}100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}
</style>
</head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${centerLat},${centerLon}],16);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:20,subdomains:'abcd'}).addTo(map);
${markersJs}
${boundsJs}
</script></body></html>`;

  const bannerLoc = activeLoc;
  const bannerMinsAgo = bannerLoc ? Math.floor((Date.now() - new Date(bannerLoc.updatedAt).getTime()) / 60000) : 0;
  const bannerIsRecent = bannerMinsAgo < 5;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {Platform.OS === "web" ? (
        <View style={[StyleSheet.absoluteFillObject, { overflow: "hidden" }]}>
          {/* @ts-ignore */}
          <iframe srcDoc={mapHtml} style={{ width: "100%", height: "100%", border: "none" }} title={t.mapIframeTitle as string} />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#F5EDED" }]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`r${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${12 + i * 11}%` as any, height: i % 3 === 0 ? 3 : 1.5, backgroundColor: "#fff" }} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={`c${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${10 + i * 16}%` as any, width: i % 2 === 0 ? 3 : 1.5, backgroundColor: "#fff" }} />
          ))}
          {parentLocs.map((pl, i) => (
            <Pressable key={pl.deviceId} style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}
              onPress={() => openBannerFor(i)}>
              <PulsingPin color={PIN_COLORS[i % PIN_COLORS.length]} />
              <View style={mp.pinHint}>
                <Text style={mp.pinHintText}>{pl.memberName}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {!loading && !hasAnyParent && (
        <View style={[mp.floatingPanel, { bottom: BOTTOM_SAFE + 16 }]}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.blueSoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="location-outline" size={18} color={DS.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={mp.panelName}>{!familyCode ? t.mapNoFamily : t.mapWaiting}</Text>
            <Text style={mp.panelAddr}>{!familyCode ? t.mapNoFamilyDesc : t.mapWaitingDesc}</Text>
          </View>
          {!familyCode && (
            <Pressable style={mp.panelBtn} onPress={() => router.push("/setup")}>
              <Text style={mp.panelBtnText}>{t.mapConnect}</Text>
            </Pressable>
          )}
        </View>
      )}

      {!loading && privacyParents.length > 0 && (
        <View style={[mp.floatingPanel, { bottom: BOTTOM_SAFE + (hasParents ? 100 : 16), borderColor: "rgba(122,84,84,0.2)" }]}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(122,84,84,0.10)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="eye-off" size={18} color={DS.brand} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            {privacyParents.map(pp => {
              const mins = Math.floor((Date.now() - new Date(pp.updatedAt).getTime()) / 60000);
              const isActive = mins < 10;
              return (
                <View key={pp.deviceId} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={[mp.statusDot, { backgroundColor: isActive ? DS.success : DS.warning }]} />
                  <Text style={mp.privacyName}>{pp.memberName}</Text>
                  <Text style={mp.privacyStatus}>
                    {isActive ? t.mapPrivacyActive : `${t.mapPrivacyLastSeen} · ${(t.timeMinAgo as string).replace("{m}", String(mins))}`}
                  </Text>
                </View>
              );
            })}
            <Text style={mp.privacyLabel}>{t.mapPrivacyMode}</Text>
          </View>
        </View>
      )}

      {loading && (
        <View style={{ position: "absolute", bottom: BOTTOM_SAFE + 60, left: 0, right: 0, alignItems: "center" }}>
          <ActivityIndicator color={DS.info} />
        </View>
      )}

      {!loading && hasParents && !showBanner && (
        <View style={[mp.hintPill, { bottom: BOTTOM_SAFE + 16 }]}>
          <Ionicons name="location" size={13} color={DS.info} />
          <Text style={mp.hintText}>
            {parentLocs.length === 1
              ? `${parentLocs[0].memberName}${t.mapTapHint}`
              : `${parentLocs.map(p => p.memberName).join(", ")}${t.mapTapHint}`}
          </Text>
        </View>
      )}

      {showBanner && bannerLoc && (
        <Animated.View style={[mp.banner, { bottom: BOTTOM_SAFE + 12, transform: [{ translateY: bannerY }], opacity: bannerAlpha }]}>
          <Pressable style={mp.bannerClose} onPress={closeBanner}>
            <Ionicons name="close" size={16} color={DS.textTertiary} />
          </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={[mp.statusDot, { backgroundColor: bannerIsRecent ? DS.success : DS.warning }]} />
              <Text style={mp.bannerStatusText}>{bannerIsRecent ? t.mapSafe : (t.timeMinAgo as string).replace("{m}", String(bannerMinsAgo))}</Text>
            </View>
            <Text style={mp.bannerName}>{bannerLoc.memberName}</Text>
            <Text style={mp.bannerAddr} numberOfLines={1}>
              {bannerLoc.address || `${bannerLoc.latitude.toFixed(4)}, ${bannerLoc.longitude.toFixed(4)}`}
            </Text>
          </View>
          <View style={mp.bannerActions}>
            <CircleBtn icon="call" size={15} bg={DS.success + "20"} color={DS.success} style={mp.bannerBtn} onPress={() => Linking.openURL("tel:")} />
            <CircleBtn icon="navigate" size={15} bg={DS.info + "20"} color={DS.info} style={mp.bannerBtn} onPress={() => openMapsFor(bannerLoc)} />
            <CircleBtn icon="refresh" size={15} bg="rgba(0,0,0,0.06)" color={DS.textSecondary} style={mp.bannerBtn} onPress={() => { load(); closeBanner(); }} />
          </View>
        </Animated.View>
      )}

      {parentLocs.length > 1 && showBanner && (
        <View style={[mp.parentTabs, { bottom: BOTTOM_SAFE + 100 }]}>
          {parentLocs.map((pl, i) => (
            <Pressable
              key={pl.deviceId}
              style={[mp.parentTab, selectedIdx === i && mp.parentTabActive]}
              onPress={() => openBannerFor(i)}>
              <View style={[mp.parentTabDot, { backgroundColor: PIN_COLORS[i % PIN_COLORS.length] }]} />
              <Text style={[mp.parentTabText, selectedIdx === i && mp.parentTabTextActive]}>{pl.memberName}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function PulsingPin({ color = "#7A5454" }: { color?: string } = {}) {
  const s = useRef(new Animated.Value(1)).current;
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(s, { toValue: 2.6, duration: 950, useNativeDriver: false }),
        Animated.timing(o, { toValue: 0, duration: 950, useNativeDriver: false }),
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
      <Animated.View style={{ position: "absolute", width: 34, height: 34, borderRadius: 17, backgroundColor: color, transform: [{ scale: s }], opacity: o }} />
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: color, borderWidth: 3, borderColor: "#fff" }} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANBU SCREEN (Photo/Messages)
// ═══════════════════════════════════════════════════════════════════════════════
function AnbuScreen({ familyCode, allFamilyCodes, myName, myRole, deviceId, topBarH }: {
  familyCode: string | null; allFamilyCodes: string[]; myName: string | null; myRole: string | null; deviceId: string; topBarH: number;
}) {
  const { t } = useLang();
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
  const GAL_GAP = 6;
  const GAL_COLS = 3;
  const THUMB = (width - 40 - GAL_GAP * (GAL_COLS - 1)) / GAL_COLS;

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
            <Ionicons name="close-circle" size={36} color="#fff" />
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
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowCompose(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
          </Pressable>
          <Pressable onPress={() => {}} style={ab.sheet}>
            <View style={ab.handle} />
            <Text style={ab.sheetTitle}>{t.anbuCompose}</Text>
            <TextInput
              style={ab.input}
              value={text}
              onChangeText={setText}
              placeholder={t.anbuPlaceholder}
              placeholderTextColor={DS.textTertiary}
              multiline
              maxLength={200}
            />
            {photo && (
              <View style={ab.photoPreviewRow}>
                <Image source={{ uri: photo }} style={ab.photoThumb} resizeMode="cover" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={ab.photoLabel}>{t.anbuPhotoAttached || "사진 첨부됨"}</Text>
                  <Text style={ab.photoHint}>{t.anbuPhotoHint || "메시지와 함께 전송됩니다"}</Text>
                </View>
                <Pressable onPress={() => setPhoto(null)} style={ab.photoRemoveBtn}>
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            )}
            <View style={ab.sheetBar}>
              <Pressable style={ab.attachBtn} onPress={pickCamera}>
                <Ionicons name="camera" size={18} color={DS.textSecondary} />
              </Pressable>
              <Pressable style={ab.attachBtn} onPress={pickLibrary}>
                <Ionicons name="images" size={18} color={DS.textSecondary} />
              </Pressable>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: DS.textTertiary, marginLeft: 4 }}>{text.length}/200</Text>
              <View style={{ flex: 1 }} />
              <Pressable onPress={send} disabled={(!text.trim() && !photo) || sending || !familyCode}
                style={[ab.sendBtn, ((!text.trim() && !photo) || sending || !familyCode) && { opacity: 0.35 }]}>
                {sending
                  ? <ActivityIndicator size="small" color="#000000" />
                  : <Ionicons name="send" size={17} color="#000000" />}
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Modal>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: topBarH + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text style={ab.screenTitle}>{t.anbuTitle}</Text>

        <View style={ab.seg}>
          {(["messages", "gallery"] as const).map(v => (
            <Pressable key={v} onPress={() => setSubView(v)} style={[ab.segBtn, subView === v && ab.segBtnOn]}>
              <Text style={[ab.segText, subView === v && ab.segTextOn]}>{v === "messages" ? t.anbuSegMessages : `${t.anbuSegGallery}${photos.length > 0 ? ` ${photos.length}` : ""}`}</Text>
            </Pressable>
          ))}
        </View>

        {sent && (
          <View style={ab.toast}><Ionicons name="checkmark-circle" size={14} color={DS.success} /><Text style={ab.toastText}>{t.anbuSentToast}</Text></View>
        )}

        {!familyCode && (
          <View style={ab.connectCard}>
            <Text style={ab.connectTitle}>{t.anbuConnectHint}</Text>
            <Pressable style={ab.connectBtn} onPress={() => router.push("/setup")}><Text style={ab.connectBtnText}>{t.anbuConnect}</Text></Pressable>
          </View>
        )}

        {subView === "messages" && (
          <>
            {loading && <ActivityIndicator color={DS.info} style={{ marginVertical: 20 }} />}
            {!loading && msgs.length === 0 && familyCode && (
              <View style={ab.empty}><Ionicons name="chatbubble-outline" size={32} color="#FFFFFF" /><Text style={[ab.emptyText, { color: "#FFFFFF" }]}>{t.anbuNoMessages}</Text></View>
            )}
            {msgs.map((msg) => (
              <View key={msg.id} style={ab.card}>
                <View style={ab.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={ab.cardName}>{msg.fromName}</Text>
                    <Text style={ab.cardTime}>{formatTimeI18n(msg.createdAt, t)}</Text>
                  </View>
                  {msg.hearts > 0 && (
                    <View style={ab.heartBadge}>
                      <Ionicons name="heart" size={10} color={COLORS.coral} />
                      <Text style={ab.heartN}>{msg.hearts}</Text>
                    </View>
                  )}
                  {msg.deviceId === deviceId && (
                    <Pressable onPress={() => del(msg.id)} disabled={delId === msg.id} style={{ marginLeft: 6 }}>
                      {delId === msg.id ? <ActivityIndicator size="small" color={DS.danger} /> : <Ionicons name="trash-outline" size={15} color={DS.danger} />}
                    </Pressable>
                  )}
                </View>
                {!!msg.text && <Text style={ab.cardText}>{msg.text}</Text>}
                {msg.photoData && (
                  <Pressable onPress={() => { setViewerUri(msg.photoData!); setViewerMid(msg.id); }}>
                    <Image source={{ uri: msg.photoData }} style={ab.cardPhoto} resizeMode="cover" />
                  </Pressable>
                )}
              </View>
            ))}
          </>
        )}

        {subView === "gallery" && (
          <>
            {loading && <ActivityIndicator color={DS.info} style={{ marginVertical: 24 }} />}
            {!loading && photos.length === 0 && (
              <View style={ab.empty}><Ionicons name="images-outline" size={32} color={DS.textTertiary} /><Text style={ab.emptyText}>{t.anbuNoPhotos}</Text></View>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAL_GAP }}>
              {photos.map(m => (
                <View key={m.id} style={{ width: THUMB, height: THUMB, borderRadius: 12, overflow: "visible", position: "relative" }}>
                  <Pressable onPress={() => { setViewerUri(m.photoData!); setViewerMid(m.id); }} style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}>
                    <Image source={{ uri: m.photoData! }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.35)", paddingVertical: 4, paddingHorizontal: 6, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: "#fff", textAlign: "center" }}>{formatTimeI18n(m.createdAt, t)}</Text>
                    </View>
                  </Pressable>
                  {m.deviceId === deviceId && (
                    <Pressable style={{ position: "absolute", top: -4, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: DS.danger, alignItems: "center", justifyContent: "center", zIndex: 10 }} onPress={() => del(m.id)}>
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
          <Ionicons name="add" size={26} color="#000000" />
        </Pressable>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WAITING ROOM (child waiting for parent)
// ═══════════════════════════════════════════════════════════════════════════════
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
    <ExpoLinearGradient
      colors={["#D4843A", "#C4692E", "#A85528"]}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topBarH + 20, paddingBottom: bottomInset + 40, alignItems: "center", paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={wr.badge}>
          <View style={wr.badgeDot} />
          <Text style={wr.badgeText}>{t.waitingBadge}</Text>
        </View>
        <Text style={wr.title}>{t.waitingTitle}</Text>
        <Text style={wr.sub}>{t.waitingSub}</Text>

        <View style={wr.qrWrap}>
          <Image source={{ uri: qrUri }} style={{ width: 200, height: 200 }} resizeMode="contain" />
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
            <View style={[wr.infoIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" />
            </View>
            <Text style={wr.infoText}>{t.waitingInfo1}</Text>
          </View>
          <View style={wr.infoRow}>
            <View style={[wr.infoIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="keypad-outline" size={18} color="#FFFFFF" />
            </View>
            <Text style={wr.infoText}>{t.waitingInfo2}</Text>
          </View>
          <View style={wr.infoRow}>
            <View style={[wr.infoIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="radio-outline" size={18} color="#FFFFFF" />
            </View>
            <Text style={wr.infoText}>{t.waitingInfo3}</Text>
          </View>
        </View>
      </ScrollView>
    </ExpoLinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
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
  type ParentInfo = { name: string; photo: string | null; loc: LocationData | null; deviceId: string };
  const [parentInfos, setParentInfos] = useState<ParentInfo[]>([]);
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [parentJoined, setParentJoined] = useState(false);
  const [parentChecked, setParentChecked] = useState(false);
  const [tracerSize, setTracerSize] = useState({ w: 0, h: 0 });
  const revealAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!familyCode) { setParentChecked(true); return; }
    let cancelled = false;
    const check = async () => {
      try {
        const results = await Promise.all(allFamilyCodes.map(c => api.getFamily(c).catch(() => null)));
        const allParents: ParentInfo[] = [];
        const seen = new Set<string>();
        results.forEach(group => {
          if (!group) return;
          group.members.filter(m => m.role === "parent").forEach(m => {
            const key = m.deviceId ?? m.memberName;
            if (!seen.has(key)) {
              seen.add(key);
              allParents.push({ name: m.memberName, photo: m.photoData || null, loc: null, deviceId: m.deviceId ?? "" });
            }
          });
        });
        if (!cancelled) {
          setParentChecked(true);
          if (allParents.length > 0) {
            setParentInfos(prev => {
              return allParents.map(p => {
                const existing = prev.find(e => e.deviceId === p.deviceId || e.name === p.name);
                return { ...p, loc: existing?.loc ?? null };
              });
            });
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
  }, [familyCode, allFamilyCodes]);

  const [parentActivities, setParentActivities] = useState<ParentActivityLog[]>([]);

  const load = useCallback(async () => {
    if (!allFamilyCodes.length) { setLoading(false); return; }
    try {
      const [locsArr, msgsArr, actsArr] = await Promise.all([
        Promise.all(allFamilyCodes.map(c => api.getAllLocations(c))),
        Promise.all(allFamilyCodes.map(c => api.getMessages(c))),
        Promise.all(allFamilyCodes.map(c => api.getParentActivities(c, 200).catch(() => [] as ParentActivityLog[]))),
      ]);
      const parentLocs = locsArr.flat().filter(l => l.role === "parent");
      setParentInfos(prev => prev.map(p => {
        const loc = parentLocs.find(l => l.deviceId === p.deviceId || l.memberName === p.name) ?? null;
        return { ...p, loc };
      }));
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

  const STATUS_COLOR = { good: DS.success, warn: DS.warning, alert: DS.danger, none: DS.textTertiary } as const;

  const getParentStatus = (loc: LocationData | null) => {
    const minsAgo = loc ? Math.floor((Date.now() - new Date(loc.updatedAt).getTime()) / 60000) : null;
    const level = minsAgo === null ? "none" : minsAgo < 60 ? "good" : minsAgo < 180 ? "warn" : "alert";
    const color = STATUS_COLOR[level];
    const msgs: Record<string, { title: string; sub: string }> = {
      good:  { title: t.statusMsgGoodTitle, sub: (t.statusMsgGoodSub as string).replace("{m}", String(minsAgo)) },
      warn:  { title: t.statusMsgWarnTitle, sub: (t.statusMsgWarnSub as string).replace("{m}", String(minsAgo)) },
      alert: { title: t.statusMsgAlertTitle, sub: (t.statusMsgAlertSub as string).replace("{h}", String(Math.floor((minsAgo ?? 0) / 60))) },
      none:  { title: t.statusMsgNoneTitle, sub: t.statusMsgNoneSub },
    };
    return { level: level as "good" | "warn" | "alert" | "none", color, msg: msgs[level], minsAgo, isActive: level === "good" };
  };

  const ACTIVITY_ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string }> = {
    heart:      { icon: "heart",           iconColor: "#C0766E", iconBg: "rgba(192,118,110,0.10)" },
    view_slide: { icon: "eye",             iconColor: DS.brand, iconBg: "rgba(122,84,84,0.10)" },
    location:   { icon: "location",        iconColor: DS.info,   iconBg: COLORS.blueSoft },
    app_open:   { icon: "phone-portrait",  iconColor: DS.success, iconBg: COLORS.greenSoft },
    quiz:       { icon: "bulb",            iconColor: DS.warning, iconBg: COLORS.orangeSoft },
    message:    { icon: "chatbubble",      iconColor: DS.brand, iconBg: DS.surfaceSoft },
  };
  const DEFAULT_ICON = { icon: "ellipse" as keyof typeof Ionicons.glyphMap, iconColor: DS.textTertiary, iconBg: DS.surfaceSoft };

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
      const namePrefix = a.parentName ? `${a.parentName} · ` : "";
      const label = detailAddr ? `${namePrefix}${baseLabel} · ${detailAddr}` : `${namePrefix}${baseLabel}`;
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

  const dailySummary = useMemo(() => {
    const counts: Record<string, number> = { walk: 0, photo: 0, rest: 0, location: 0 };
    parentActivities.forEach(a => {
      if (a.activityType === "location") counts.location++;
      else if (a.activityType === "view_slide" || a.activityType === "heart") counts.photo++;
      else if (a.activityType === "app_open") counts.rest++;
      else counts.walk++;
    });
    return [
      { key: "walk", icon: "walk-outline" as keyof typeof Ionicons.glyphMap, label: t.parentDailyWalk, count: counts.walk, color: DS.success },
      { key: "photo", icon: "camera-outline" as keyof typeof Ionicons.glyphMap, label: t.parentDailyPhoto, count: counts.photo, color: DS.brand },
      { key: "rest", icon: "cafe-outline" as keyof typeof Ionicons.glyphMap, label: t.parentDailyRest, count: counts.rest, color: DS.warning },
      { key: "location", icon: "navigate-outline" as keyof typeof Ionicons.glyphMap, label: t.parentDailyLocation, count: counts.location, color: DS.info },
    ];
  }, [parentActivities, t]);

  const breatheAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 3000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const parentActivityStats = useMemo(() => {
    return parentInfos.map(p => {
      const myActs = parentActivities.filter(
        a => a.parentName === p.name || a.deviceId === p.deviceId
      );
      const locCount = myActs.filter(a => a.activityType === "location").length;
      const touchCount = myActs.filter(a =>
        a.activityType === "app_open" || a.activityType === "view_slide" || a.activityType === "heart"
      ).length;
      const lastAct = myActs.length > 0 ? myActs[0] : null;
      const lastTime = lastAct ? formatTimeI18n(lastAct.createdAt, t) : null;
      const lastMinsAgo = lastAct ? Math.floor((Date.now() - new Date(lastAct.createdAt).getTime()) / 60000) : null;
      return { name: p.name, deviceId: p.deviceId, locCount, touchCount, lastTime, lastMinsAgo, loc: p.loc };
    });
  }, [parentInfos, parentActivities, t]);

  const randomCheckIdx = useMemo(() => Math.floor(Math.random() * 30), []);

  if (!familyCode) {
    return (
      <View style={[{ flex: 1, paddingTop: topBarH }, hm.centerEmpty]}>
        <View style={hm.emptyIconWrap}><Ionicons name="wifi-outline" size={28} color="rgba(255,255,255,0.6)" /></View>
        <Text style={hm.emptyTitle}>{t.homeNotConnected}</Text>
        <Text style={hm.emptySub}>{t.homeNotConnectedSub}</Text>
      </View>
    );
  }

  if (!parentChecked) {
    return <View style={{ flex: 1 }} />;
  }

  if (!parentJoined) {
    return <WaitingRoom familyCode={familyCode} topBarH={topBarH} bottomInset={bottomInset} />;
  }

  return (
    <Animated.View style={{ flex: 1, opacity: revealAnim }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: topBarH + 12, paddingBottom: bottomInset + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={hm.summaryTitleRow}>
        <Ionicons name="calendar-outline" size={22} color="#FFFFFF" />
        <Text style={hm.summaryTitleText}>{t.todayAnbu}</Text>
      </View>

      {/* Today Summary Card */}
      {(() => {
        const anyLongIdle = parentActivityStats.some(ps => {
          const st = getParentStatus(ps.loc);
          return st.level !== "good" && ps.lastMinsAgo !== null && ps.lastMinsAgo >= 720;
        });
        const cardShadow = anyLongIdle ? {
          shadowColor: "#c0392b",
          shadowOpacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.25] }),
          shadowRadius: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 18] }),
        } : {};
        const CardWrap = anyLongIdle ? Animated.View : View;
        return (
      <CardWrap style={[hm.summaryCard, cardShadow]}>
        <View style={hm.summaryBody}>
          <View style={hm.parentStatsRow}>
            {parentActivityStats.map((ps, i) => {
              const status = getParentStatus(ps.loc);
              const isActive = status.level === "good";
              const nowHr = new Date().getHours();
              const isNightTime = nowHr >= 22 || nowHr < 7;
              const isResting = !isActive && isNightTime;
              const isLongIdle = !isActive && !isResting && ps.lastMinsAgo !== null && ps.lastMinsAgo >= 720;
              const activityText = ps.lastMinsAgo !== null
                ? (t.summaryActivityDetected as string).replace("{m}", String(ps.lastMinsAgo))
                : (t.summaryNoActivity as string);
              const badgeScale = (!isActive && !isResting) ? breatheAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) : undefined;
              const badgeOpacity = (!isActive && !isResting) ? breatheAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.7, 1] }) : undefined;
              const badgeColor = isActive ? DS.success : isResting ? DS.warning : DS.danger;
              const badgeText = isActive ? t.parentStatusActive : isResting ? t.parentStatusResting : t.parentStatusIdle;
              return (
                <React.Fragment key={ps.deviceId || i}>
                  {i > 0 && <View style={hm.parentStatsVerticalLine} />}
                  <View style={hm.parentStatsCol}>
                    <Text style={hm.parentStatsName} numberOfLines={1}>{ps.name}</Text>
                    {(isActive || isResting) ? (
                      <View style={[hm.statusBadge, { backgroundColor: badgeColor }]}>
                        <Text style={hm.statusBadgeText}>{badgeText}</Text>
                      </View>
                    ) : (
                      <Animated.View style={[hm.statusBadge, { backgroundColor: DS.danger, transform: [{ scale: badgeScale! }], opacity: badgeOpacity }]}>
                        <Text style={hm.statusBadgeText}>{t.parentStatusIdle}</Text>
                      </Animated.View>
                    )}
                    <Text style={[hm.parentStatsLastTime, { color: isActive ? DS.success : DS.textTertiary }]}>{activityText}</Text>
                    <Text style={hm.parentStatsCountText}>
                      {(t.summaryLocationCount as string).replace("{n}", String(ps.locCount))}{"   "}{(t.summaryTouchCount as string).replace("{n}", String(ps.touchCount))}
                    </Text>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        </View>
        
      </CardWrap>
        );
      })()}

      {/* Anbu Interpretation Card */}
      {(() => {
        const now = new Date();
        const nowHour = now.getHours();
        const isNight = nowHour >= 22 || nowHour < 7;
        const todayStr = now.toISOString().slice(0, 10);
        const todayActs = parentActivities.filter(a => a.createdAt.startsWith(todayStr));
        const totalActs = todayActs.length;
        const todayLoc = todayActs.filter(a => a.activityType === "location").length;
        const todayTouch = todayActs.filter(a => a.activityType === "app_open" || a.activityType === "view_slide" || a.activityType === "heart").length;
        const allParentsAlert = parentActivityStats.length > 0 && parentActivityStats.every(ps => {
          const st = getParentStatus(ps.loc);
          return st.level === "alert" || st.level === "none";
        });
        const level = isNight ? "sleep" : allParentsAlert ? "alert" : (todayLoc >= 2 && todayTouch >= 3) ? "safe" : (totalActs > 0) ? "quiet" : "check";
        const emoji = level === "sleep" ? "🌙" : level === "safe" ? "☀️" : level === "quiet" ? "🌤️" : level === "alert" ? "🚨" : "💌";
        const checkMsgs = t.anbuCheckMessages;
        const alertMsgs = t.anbuAlertMessages;
        const msg = level === "sleep" ? t.anbuSleep : level === "safe" ? t.anbuSafe : level === "quiet" ? t.anbuQuiet : level === "alert" ? alertMsgs[randomCheckIdx % alertMsgs.length] : checkMsgs[randomCheckIdx % checkMsgs.length];
        const sub = level === "sleep" ? t.anbuSleepSub : level === "safe" ? t.anbuSafeSub : level === "quiet" ? t.anbuQuietSub : level === "alert" ? t.anbuAlertSub : t.anbuCheckSub;
        const accentColor = level === "sleep" ? DS.textTertiary : level === "safe" ? DS.success : level === "quiet" ? DS.warning : level === "alert" ? DS.danger : DS.info;
        const isAlert = level === "alert";
        return (
          <View
            style={[hm.interpretCard, isAlert && { borderColor: "rgba(196,120,122,0.2)" }]}
            onLayout={(e: LayoutChangeEvent) => {
              if (isAlert) {
                const { width: cw, height: ch } = e.nativeEvent.layout;
                setTracerSize({ w: cw, h: ch });
              }
            }}
          >
            {isAlert && tracerSize.w > 0 && (
              <BorderGlow w={tracerSize.w} h={tracerSize.h} r={DS.radius.cardLg} />
            )}
            <Text style={hm.interpretLabel}>{t.anbuInterpretLabel}</Text>
            <Text style={hm.interpretMsg}>{emoji} {msg}</Text>
            <Text style={[hm.interpretSub, { color: accentColor }]}>{sub}</Text>
          </View>
        );
      })()}

      {/* Recent Activity */}
      <Text style={hm.sectionTitle}>{t.recentActivity}</Text>
      {loading ? (
        <ActivityIndicator style={{ marginVertical: 20 }} color={DS.info} />
      ) : activities.length === 0 ? (
        <View style={[hm.activityCard, { padding: 28, alignItems: "center", gap: 8 }]}>
          <Ionicons name="time-outline" size={26} color={DS.textTertiary} />
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: DS.textTertiary }}>{t.noActivityYet}</Text>
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

      {/* Monthly Activity Chart */}
      <Text style={hm.sectionTitle}>{t.monthlyActivity}</Text>
      {(() => {
        const now = new Date();
        const days: { key: string; label: string; count: number }[] = [];
        for (let d = 29; d >= 0; d--) {
          const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          const count = parentActivities.filter(a => a.createdAt.startsWith(key)).length;
          days.push({ key, label, count });
        }
        const maxCount = Math.max(...days.map(d => d.count), 1);
        const barW = (width - 64) / 30;
        if (parentActivities.length === 0) {
          return (
            <View style={[hm.activityCard, { padding: 28, alignItems: "center", gap: 8 }]}>
              <Ionicons name="bar-chart-outline" size={26} color={DS.textTertiary} />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: DS.textTertiary }}>{t.monthlyNoData}</Text>
            </View>
          );
        }
        return (
          <View style={hm.chartCard}>
            <View style={hm.chartBarArea}>
              {days.map((d, i) => {
                const h = d.count > 0 ? Math.max((d.count / maxCount) * 80, 4) : 2;
                const isToday = i === 29;
                return (
                  <View key={d.key} style={{ alignItems: "center", width: barW }}>
                    <View style={{ width: Math.max(barW - 2, 3), height: h, borderRadius: 2, backgroundColor: isToday ? DS.brand : d.count > 0 ? DS.success : DS.border }} />
                  </View>
                );
              })}
            </View>
            <View style={hm.chartLabelRow}>
              {days.filter((_, i) => i % 7 === 0 || i === 29).map(d => (
                <Text key={d.key} style={hm.chartLabel}>{d.label}</Text>
              ))}
            </View>
          </View>
        );
      })()}

    </ScrollView>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
type NotifFilter = "all" | "photo" | "location" | "alert";

function NotificationScreen({ allFamilyCodes, topBarH, bottomInset }: {
  allFamilyCodes: string[]; topBarH: number; bottomInset: number;
}) {
  const { t } = useLang();
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotifFilter>("all");

  useEffect(() => {
    if (!allFamilyCodes.length) { setLoading(false); return; }
    Promise.all(allFamilyCodes.map(c => api.getMessages(c)))
      .then(arr => setMessages(
        arr.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      ))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [allFamilyCodes]);

  const filters: { key: NotifFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "all", label: t.notifFilterAll || "All", icon: "list-outline" },
    { key: "photo", label: t.notifFilterPhoto || "Photo", icon: "image-outline" },
    { key: "location", label: t.notifFilterLocation || "Location", icon: "location-outline" },
    { key: "alert", label: t.notifFilterAlert || "Alert", icon: "warning-outline" },
  ];

  const filtered = useMemo(() => {
    if (filter === "all") return messages;
    if (filter === "photo") return messages.filter(m => !!m.photoData);
    if (filter === "location") return messages.filter(m => m.fromRole === "parent");
    return messages.filter(m => m.hearts > 0);
  }, [messages, filter]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: topBarH + 12, paddingBottom: bottomInset + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={hm.sectionTitle}>{t.notifTitle}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {filters.map(f => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[nf.chip, filter === f.key && nf.chipOn]}
          >
            <Ionicons name={f.icon} size={14} color={filter === f.key ? DS.brandDeep : DS.textSecondary} />
            <Text style={[nf.chipText, filter === f.key && nf.chipTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={DS.info} />
      ) : filtered.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 56 }}>
          <View style={hm.emptyIconWrap}><Ionicons name="notifications-outline" size={28} color={DS.textTertiary} /></View>
          <Text style={hm.emptyTitle}>{t.notifEmpty}</Text>
          <Text style={hm.emptySub}>{t.notifEmptySub}</Text>
        </View>
      ) : (
        <View style={hm.activityCard}>
          {filtered.slice(0, 30).map((m, i) => (
            <React.Fragment key={m.id}>
              {i > 0 && <View style={hm.activityDivider} />}
              <View style={hm.activityRow}>
                <View style={[hm.activityIconBg, { backgroundColor: m.fromRole === "parent" ? COLORS.blueSoft : COLORS.greenSoft }]}>
                  <Ionicons
                    name={m.photoData ? "image" : m.fromRole === "parent" ? "chatbubble" : "paper-plane"}
                    size={14}
                    color={m.fromRole === "parent" ? DS.info : DS.success}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={hm.activityLabel}>{m.fromName}</Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: DS.textSecondary }} numberOfLines={1}>
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CHILD SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function ChildScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, allFamilyCodes, myName, myRole, deviceId, isMasterChild, childRole } = useFamilyContext();
  const [tab, setTab] = useState<Tab>("home");

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;
  const TOP_H = topInset + 56;
  const isMap = tab === "map";

  return (
    <ExpoLinearGradient
      colors={isMap ? [DS.brandDeep, DS.brandDeep] : ["#D4843A", "#C4692E", "#A85528"]}
      style={{ flex: 1 }}
    >
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

      <AppHeader topInset={topInset} isMap={isMap} />
      <BottomTabBar
        tab={tab}
        onTab={setTab}
        onSettings={() => router.push("/profile")}
        bottomInset={bottomInset}
      />
    </ExpoLinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const hdr = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 200, flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 20, paddingBottom: 12 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 3 },
  masterBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "transparent", borderRadius: DS.radius.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, borderColor: "#D4A843" },
  masterText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#D4A843", letterSpacing: 0.5 },
});

const nav = StyleSheet.create({
  wrap: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 400, flexDirection: "row", backgroundColor: DS.surface, paddingTop: 8, borderTopWidth: 1, borderTopColor: DS.border, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  item: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 2 },
  iconCircle: { width: 36, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  iconCircleActive: { backgroundColor: "rgba(122,84,84,0.10)" },
  label: { fontFamily: "Inter_500Medium", fontSize: 10, color: DS.textTertiary },
  labelActive: { color: DS.brand, fontFamily: "Inter_600SemiBold" },
});

const chip = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: DS.radius.pill },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});

const nf = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: DS.radius.pill, backgroundColor: DS.surface, borderWidth: 1, borderColor: DS.border },
  chipOn: { backgroundColor: "rgba(45,212,191,0.18)", borderColor: "rgba(45,212,191,0.4)" },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: DS.textSecondary },
  chipTextOn: { color: DS.brand, fontFamily: "Inter_600SemiBold" },
});

const mp = StyleSheet.create({
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  floatingPanel: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: DS.surface, borderRadius: DS.radius.cardLg, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6, borderWidth: 1, borderColor: DS.border },
  panelName: { fontFamily: "Inter_700Bold", fontSize: 15, color: DS.textPrimary, marginBottom: 2 },
  panelAddr: { fontFamily: "Inter_400Regular", fontSize: 12, color: DS.textSecondary, lineHeight: 16 },
  panelBtn: { backgroundColor: DS.brand, paddingHorizontal: 18, paddingVertical: 10, borderRadius: DS.radius.pill },
  panelBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#FFFFFF" },
  hintPill: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  hintText: { fontFamily: "Inter_500Medium", fontSize: 12, color: DS.textPrimary, backgroundColor: DS.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: DS.radius.pill, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  banner: { position: "absolute", left: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: DS.surface, borderRadius: DS.radius.cardLg, paddingVertical: 16, paddingHorizontal: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8, borderWidth: 1, borderColor: DS.border },
  bannerClose: { position: "absolute", top: 12, right: 14, padding: 4 },
  bannerStatusText: { fontFamily: "Inter_500Medium", fontSize: 11, color: DS.textSecondary },
  bannerName: { fontFamily: "Inter_700Bold", fontSize: 16, color: DS.textPrimary },
  bannerAddr: { fontFamily: "Inter_400Regular", fontSize: 12, color: DS.textSecondary },
  bannerActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 4 },
  bannerBtn: { width: 36, height: 36, borderRadius: 18 },
  pinHint: { position: "absolute", bottom: 80, alignSelf: "center", backgroundColor: DS.surface, borderRadius: DS.radius.pill, paddingHorizontal: 14, paddingVertical: 7, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  pinHintText: { fontFamily: "Inter_500Medium", fontSize: 12, color: DS.textPrimary },
  privacyName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: DS.textPrimary },
  privacyStatus: { fontFamily: "Inter_400Regular", fontSize: 12, color: DS.textSecondary },
  privacyLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: DS.brand, marginTop: 2 },
  parentTabs: { position: "absolute", left: 14, right: 14, flexDirection: "row", gap: 8, justifyContent: "center" },
  parentTab: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: DS.surface, borderRadius: DS.radius.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: DS.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 2 },
  parentTabActive: { borderColor: DS.info, backgroundColor: COLORS.blueSoft },
  parentTabDot: { width: 8, height: 8, borderRadius: 4 },
  parentTabText: { fontFamily: "Inter_500Medium", fontSize: 12, color: DS.textSecondary },
  parentTabTextActive: { color: DS.info, fontFamily: "Inter_600SemiBold" },
});

const wr = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: DS.radius.pill, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFFFFF" },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFFFFF" },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, color: "#FFFFFF", textAlign: "center", lineHeight: 34, marginBottom: 8 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  qrWrap: { width: 220, height: 220, backgroundColor: "#FFFFFF", borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6, overflow: "hidden" },
  codeLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.65)", letterSpacing: 1, marginBottom: 10 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 28 },
  codePill: { backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2 },
  codeDigits: { fontFamily: "Inter_700Bold", fontSize: 24, color: "#D4843A", letterSpacing: 4 },
  codeSep: { fontFamily: "Inter_700Bold", fontSize: 20, color: "rgba(255,255,255,0.5)" },
  infoCard: { width: "100%", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20, padding: 20, gap: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.85)", flex: 1 },
});

const hm = StyleSheet.create({
  centerEmpty: { alignItems: "center", justifyContent: "center", flex: 1 },
  greeting: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: DS.textPrimary, marginHorizontal: 20, marginBottom: 16 },

  summaryTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginBottom: 3, marginTop: 2 },
  summaryTitleText: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#FFFFFF" },
  summaryCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: DS.radius.cardLg, backgroundColor: DS.surface, overflow: "hidden", borderWidth: 1, borderColor: DS.border },
  summaryBody: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 17 },
  parentStatsRow: { flexDirection: "row", alignItems: "flex-start" },
  parentStatsVerticalLine: { width: 1, backgroundColor: DS.border, alignSelf: "stretch", marginHorizontal: 8 },
  parentStatsCol: { flex: 1, alignItems: "flex-start", gap: 6 },
  parentStatsName: { fontFamily: "Inter_700Bold", fontSize: 15, color: DS.textPrimary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 2 },
  statusBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  parentStatsLastTime: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  parentStatsCountText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: DS.textPrimary, marginTop: 4 },
  summaryExpandRow: { alignItems: "center", paddingBottom: 10, paddingTop: 2 },
  interpretCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: DS.radius.cardLg, backgroundColor: DS.surface, padding: 16, borderWidth: 1, borderColor: DS.border, overflow: "hidden" },
  interpretLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: DS.textTertiary, marginBottom: 6, letterSpacing: 0.5 },
  interpretMsg: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: DS.textPrimary, lineHeight: 22, marginBottom: 4 },
  interpretSub: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  chartCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: DS.radius.cardLg, backgroundColor: DS.surface, padding: 16, borderWidth: 1, borderColor: DS.border },
  chartBarArea: { flexDirection: "row", alignItems: "flex-end", height: 88, paddingHorizontal: 4 },
  chartLabelRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingHorizontal: 4 },
  chartLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: DS.textTertiary },

  parentCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: DS.radius.cardLg, backgroundColor: DS.surface, overflow: "hidden", flexDirection: "row", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: DS.border },
  parentIndicator: { width: 5, borderTopLeftRadius: DS.radius.cardLg, borderBottomLeftRadius: DS.radius.cardLg },
  parentContent: { flex: 1, padding: 18 },
  parentHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  parentAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  parentName: { fontFamily: "Inter_700Bold", fontSize: 18, color: DS.textPrimary, marginBottom: 4 },
  parentStatusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  parentLastTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: DS.textTertiary },
  parentEmotionBox: { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: DS.surfaceSoft, borderRadius: DS.radius.card, marginBottom: 14 },
  parentEmotionText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: DS.textPrimary, marginBottom: 2, lineHeight: 22 },
  parentEmotionSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: DS.textSecondary, lineHeight: 18 },
  parentDailyRow: { flexDirection: "row", justifyContent: "space-around" },
  parentDailyItem: { alignItems: "center", gap: 4 },
  parentDailyIconBg: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  parentDailyCount: { fontFamily: "Inter_700Bold", fontSize: 15, color: DS.textPrimary },
  parentDailyLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: DS.textTertiary },

  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: DS.textPrimary, marginHorizontal: 20, marginTop: 8, marginBottom: 12 },
  activityCard: { marginHorizontal: 16, borderRadius: DS.radius.cardLg, backgroundColor: DS.surface, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: DS.border },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
  activityDivider: { height: 1, backgroundColor: DS.surfaceSoft, marginHorizontal: 16 },
  activityIconBg: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  activityLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: DS.textPrimary, flex: 1 },
  activityTime: { fontFamily: "Inter_400Regular", fontSize: 12, color: DS.textTertiary },
  viewAllBtn: { marginHorizontal: 16, marginTop: 10, borderRadius: DS.radius.card, borderWidth: 1.5, borderColor: DS.border, paddingVertical: 14, alignItems: "center", backgroundColor: DS.surface },
  viewAllText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: DS.textSecondary },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: DS.surfaceSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: DS.textPrimary, textAlign: "center" },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 14, color: DS.textTertiary, textAlign: "center", marginTop: 6, lineHeight: 22 },
});

const ab = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", alignItems: "center", justifyContent: "center" },
  viewerDel: { position: "absolute", bottom: 56, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(239,68,68,0.85)", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 18 },
  sheet: { backgroundColor: DS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, alignItems: "center", paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", marginBottom: 18 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: DS.textPrimary, marginBottom: 16 },
  input: { width: "100%", backgroundColor: DS.surfaceSoft, borderRadius: DS.radius.card, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: DS.textPrimary, minHeight: 80, textAlignVertical: "top", marginBottom: 12, borderWidth: 1, borderColor: DS.border },
  sheetBar: { width: "100%", flexDirection: "row", alignItems: "center", gap: 8 },
  attachBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: DS.surfaceSoft, alignItems: "center", justifyContent: "center" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFD700", alignItems: "center", justifyContent: "center" },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: DS.textPrimary, marginBottom: 16 },
  seg: { flexDirection: "row", backgroundColor: DS.surfaceSoft, borderRadius: DS.radius.pill, padding: 4, marginBottom: 16, alignSelf: "flex-start" },
  segBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: DS.radius.pill },
  segBtnOn: { backgroundColor: "#FFD700" },
  segText: { fontFamily: "Inter_500Medium", fontSize: 14, color: DS.textSecondary },
  segTextOn: { color: "#000000", fontFamily: "Inter_600SemiBold" },
  toast: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: COLORS.greenSoft, borderRadius: DS.radius.pill, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: DS.success + "33" },
  toastText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: DS.success },
  connectCard: { backgroundColor: DS.surface, borderRadius: DS.radius.cardLg, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: DS.border, alignItems: "center", gap: 14 },
  connectTitle: { fontFamily: "Inter_500Medium", fontSize: 15, color: DS.textSecondary, textAlign: "center", lineHeight: 22 },
  connectBtn: { backgroundColor: DS.brand, paddingHorizontal: 22, paddingVertical: 11, borderRadius: DS.radius.pill },
  connectBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#FFFFFF" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: DS.textTertiary },
  card: { backgroundColor: DS.surface, borderRadius: DS.radius.cardLg, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: DS.border, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  cardAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.blueSoft, alignItems: "center", justifyContent: "center" },
  cardName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: DS.textSecondary, marginBottom: 1 },
  cardTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: DS.textTertiary },
  heartBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(232,133,106,0.15)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  heartN: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.coral },
  cardText: { fontFamily: "Inter_400Regular", fontSize: 15, color: DS.textPrimary, lineHeight: 22 },
  cardPhoto: { width: "100%", height: 180, borderRadius: 14, marginTop: 8 },
  fab: { position: "absolute", bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFD700", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  photoPreviewRow: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: DS.surfaceSoft, borderRadius: DS.radius.card, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: DS.brand + "33" },
  photoThumb: { width: 60, height: 60, borderRadius: 10 },
  photoLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: DS.brand },
  photoHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: DS.textTertiary, marginTop: 2 },
  photoRemoveBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
});
