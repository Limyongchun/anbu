import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";
import { useLang } from "@/context/LanguageContext";
import { api, FamilyMessage } from "@/lib/api";
import {
  saveBackgroundLocationConfig,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from "@/lib/backgroundLocation";

function logActivity(familyCode: string | null, deviceId: string | null, parentName: string | null, type: string, detail?: string) {
  if (!familyCode || !deviceId || !parentName) return;
  api.logParentActivity(familyCode, deviceId, parentName, type, detail).catch(() => {});
}

const { width, height } = Dimensions.get("window");
const INTERVAL_MS = 6000;

const DEMO_SLIDE_BGS = ["#1a3a2a", "#1a2a3a", "#2a1a3a"];

// ── 하트 파티클 ──────────────────────────────────────────────────────────────
interface FloatHeart { id: number; x: number; delay: number; anim: Animated.Value }

function HeartParticle({ h }: { h: FloatHeart }) {
  useEffect(() => {
    Animated.timing(h.anim, { toValue: 1, duration: 1400, delay: h.delay, useNativeDriver: false }).start();
  }, []);
  const ty = h.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -200] });
  const op = h.anim.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0.85, 0] });
  const sc = h.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.5, 1.1] });
  return (
    <Animated.View style={{ position: "absolute", left: `${h.x}%` as any, bottom: "35%", transform: [{ translateY: ty }, { scale: sc }], opacity: op, zIndex: 999 }}>
      <Ionicons name="heart" size={32} color={COLORS.coral} />
    </Animated.View>
  );
}

function formatTimeI18n(s: string, t: any): string {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return t.timeJustNow;
  if (m < 60) return (t.timeMinAgo as string).replace("{m}", String(m));
  const hh = Math.floor(m / 60);
  if (hh < 24) return (t.timeHourAgo as string).replace("{h}", String(hh));
  return (t.timeDayAgo as string).replace("{d}", String(Math.floor(hh / 24)));
}

// ── 슬라이드 타입 ─────────────────────────────────────────────────────────────
type Slide =
  | { kind: "msg";  msg: FamilyMessage }
  | { kind: "demo"; id: number; emoji: string; text: string; name: string; bg: string };

function buildSlides(msgs: FamilyMessage[], demoSlides: any[]): Slide[] {
  if (msgs.length > 0) return msgs.map(msg => ({ kind: "msg", msg }));
  return demoSlides.map((d, i) => ({ kind: "demo", id: -(i + 1), emoji: d.emoji, text: d.text, name: d.name, bg: DEMO_SLIDE_BGS[i] ?? "#1a2a3a" }));
}

// ── 슬라이드 카드 (터치 없음 — 디지털 액자) ──────────────────────────────────
function SlideCard({ slide }: { slide: Slide }) {
  const { t } = useLang();
  if (slide.kind === "demo") {
    return (
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: slide.bg }]}>
        <View style={sl.decoCircle1} />
        <View style={sl.decoCircle2} />
        <View style={sl.textCenter}>
          <Text style={{ fontSize: 72, marginBottom: 28, textAlign: "center" }}>{slide.emoji}</Text>
          <Text style={sl.bigQuote}>"</Text>
          <Text style={sl.bigText}>{slide.text}</Text>
          <Text style={[sl.bigQuote, { alignSelf: "flex-end", marginTop: 8 }]}>"</Text>
        </View>
      </View>
    );
  }

  const { msg } = slide;
  if (msg.photoData) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <Image source={{ uri: msg.photoData }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        {/* 하단 자연스러운 그라디언트 효과 */}
        {!!msg.text && (
          <View style={sl.photoCaption}>
            <Text style={sl.captionText} numberOfLines={3}>{msg.text}</Text>
            <Text style={sl.captionTime}>{formatTimeI18n(msg.createdAt, t)}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFillObject, sl.textSlideBg]}>
      <View style={sl.decoCircle1} />
      <View style={sl.decoCircle2} />
      <View style={sl.textCenter}>
        <Text style={sl.bigQuote}>"</Text>
        <Text style={sl.bigText}>{msg.text}</Text>
        <Text style={[sl.bigQuote, { alignSelf: "flex-end", marginTop: 8 }]}>"</Text>
        <Text style={sl.captionTime2}>{formatTimeI18n(msg.createdAt, t)}</Text>
      </View>
    </View>
  );
}

// ── 부모님 메인 (디지털 액자) ─────────────────────────────────────────────────
export default function ParentScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, allFamilyCodes, myName, deviceId, isConnected } = useFamilyContext();
  const { t, lang } = useLang();

  const topInset    = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  // ── 슬라이드쇼 ──
  const [msgs, setMsgs]             = useState<FamilyMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [curIdx, setCurIdx]         = useState(0);
  const [nextIdx, setNextIdx]       = useState<number | null>(null);
  const [isPaused, setIsPaused]     = useState(false);
  const transitioningRef            = useRef(false);

  const fadeOut       = useRef(new Animated.Value(1)).current;
  const fadeIn        = useRef(new Animated.Value(0)).current;
  const scaleIn       = useRef(new Animated.Value(1.08)).current;
  const progressAnim  = useRef(new Animated.Value(0)).current;
  const progressRef   = useRef<Animated.CompositeAnimation | null>(null);
  const touchStartY   = useRef(0);
  const touchStartT   = useRef(0);
  const EASE_SMOOTH   = Easing.bezier(0.4, 0, 0.2, 1);

  // ── 하트 ──
  const [floatHearts, setFloatHearts] = useState<FloatHeart[]>([]);
  const spawnHearts = useCallback(() => {
    const hs: FloatHeart[] = Array.from({ length: 7 }, (_, i) => ({
      id: Date.now() + i, x: Math.random() * 70 + 10, delay: i * 80, anim: new Animated.Value(0),
    }));
    setFloatHearts(p => [...p, ...hs]);
    setTimeout(() => setFloatHearts(p => p.filter(h => !hs.some(n => n.id === h.id))), 1800);
  }, []);

  // ── UI 오버레이 토글 ──
  const [uiVisible, setUiVisible] = useState(false);
  const topBarAnim    = useRef(new Animated.Value(-160)).current;
  const bottomBarAnim = useRef(new Animated.Value(160)).current;
  const uiHideTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideUI = useCallback(() => {
    if (uiHideTimer.current) { clearTimeout(uiHideTimer.current); uiHideTimer.current = null; }
    Animated.parallel([
      Animated.timing(topBarAnim,    { toValue: -160, duration: 300, useNativeDriver: false }),
      Animated.timing(bottomBarAnim, { toValue: 160,  duration: 300, useNativeDriver: false }),
    ]).start(() => setUiVisible(false));
  }, [topBarAnim, bottomBarAnim]);

  const showUI = useCallback(() => {
    setUiVisible(true);
    Animated.parallel([
      Animated.spring(topBarAnim,    { toValue: 0, useNativeDriver: false, tension: 90, friction: 14 }),
      Animated.spring(bottomBarAnim, { toValue: 0, useNativeDriver: false, tension: 90, friction: 14 }),
    ]).start();
    if (uiHideTimer.current) clearTimeout(uiHideTimer.current);
    uiHideTimer.current = setTimeout(() => hideUI(), 5000);
  }, [topBarAnim, bottomBarAnim, hideUI]);

  // ── GPS ──
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [isSharing, setIsSharing]   = useState(true);
  const [currentLoc, setCurrentLoc] = useState<Location.LocationObject | null>(null);
  const [address, setAddress]       = useState("");
  const [locUploading, setLocUploading] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const loadMsgs = useCallback(async () => {
    if (allFamilyCodes.length === 0) return;
    try {
      const results = await Promise.all(allFamilyCodes.map(code => api.getMessages(code).catch(() => [] as FamilyMessage[])));
      const merged = results.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMsgs(merged);
    } catch {}
  }, [allFamilyCodes]);

  useEffect(() => {
    if (allFamilyCodes.length === 0) return;
    setLoadingMsgs(true);
    loadMsgs().finally(() => setLoadingMsgs(false));
    const iv = setInterval(loadMsgs, 10000);
    return () => clearInterval(iv);
  }, [allFamilyCodes, loadMsgs]);

  useEffect(() => {
    if (familyCode && deviceId && myName) {
      logActivity(familyCode, deviceId, myName, "app_open", t.parentLogAppOpen as string);
    }
  }, [familyCode, deviceId, myName]);

  const lastLocLogRef = useRef(0);
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
      const now = Date.now();
      if (sharing && addr && now - lastLocLogRef.current > 300000) {
        lastLocLogRef.current = now;
        logActivity(familyCode, deviceId, myName, "location", `${t.parentLogLocShared} · ${addr}`);
      }
    } catch {} finally { setLocUploading(false); }
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
    if (!permission.granted) {
      requestPermission().catch(() => {});
      return;
    }
    if (isSharing) {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then(l => { setCurrentLoc(l); uploadLoc(l, true); }).catch(() => {});
      startWatch().catch(() => {});
    } else if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    return () => { if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; } };
  }, [permission?.granted, isSharing]);

  useEffect(() => {
    if (Platform.OS === "web" || !familyCode || !deviceId || !myName) return;
    if (!permission?.granted) return;

    if (isSharing) {
      (async () => {
        try {
          await saveBackgroundLocationConfig(familyCode, deviceId, myName, lang);
          await startBackgroundLocationTracking();
        } catch {}
      })();
    } else {
      stopBackgroundLocationTracking().catch(() => {});
    }
  }, [permission?.granted, isSharing, familyCode, deviceId, myName]);

  const toggleShare = async () => {
    const next = !isSharing; setIsSharing(next);
    if (currentLoc) await uploadLoc(currentLoc, next);
  };

  const slides = useMemo(() => buildSlides(msgs, t.parentDemoSlides as any[]), [msgs, t.parentDemoSlides]);
  const total  = slides.length;

  const slideViewCountRef = useRef(0);
  const lastSlideLogRef = useRef(0);

  const goTo = useCallback((targetIdx: number) => {
    if (transitioningRef.current || total === 0) return;
    const safeIdx = ((targetIdx % total) + total) % total;
    transitioningRef.current = true;
    setNextIdx(safeIdx);

    fadeOut.setValue(1);
    fadeIn.setValue(0);
    scaleIn.setValue(1.08);
    progressAnim.stopAnimation();

    slideViewCountRef.current += 1;
    const now = Date.now();
    if (now - lastSlideLogRef.current > 60000) {
      lastSlideLogRef.current = now;
      const s = slides[safeIdx];
      const detail = s?.kind === "msg" && s.msg.photoData
        ? (t.parentLogViewPhoto as string)
        : (t.parentLogViewMsg as string);
      logActivity(familyCode, deviceId, myName, "view_slide", detail);
    }

    Animated.parallel([
      Animated.timing(fadeOut, { toValue: 0, duration: 700, easing: EASE_SMOOTH, useNativeDriver: false }),
      Animated.timing(fadeIn,  { toValue: 1, duration: 700, easing: EASE_SMOOTH, useNativeDriver: false }),
      Animated.timing(scaleIn, { toValue: 1, duration: 900, easing: EASE_SMOOTH, useNativeDriver: false }),
    ]).start(() => {
      setCurIdx(safeIdx);
      setNextIdx(null);
      fadeOut.setValue(1);
      fadeIn.setValue(0);
      scaleIn.setValue(1.08);
      transitioningRef.current = false;
    });
  }, [total, fadeOut, fadeIn, scaleIn, progressAnim, slides, familyCode, deviceId, myName]);

  const goNext = useCallback(() => goTo(curIdx + 1), [curIdx, goTo]);
  const goPrev = useCallback(() => goTo(curIdx - 1), [curIdx, goTo]);

  const startProgress = useCallback(() => {
    progressAnim.setValue(0);
    progressRef.current = Animated.timing(progressAnim, { toValue: 1, duration: INTERVAL_MS, useNativeDriver: false });
    progressRef.current.start(({ finished }) => { if (finished) goNext(); });
  }, [progressAnim, goNext]);

  const stopProgress = useCallback(() => { progressRef.current?.stop(); }, []);

  useEffect(() => {
    if (!isPaused && total > 0) startProgress();
    else stopProgress();
    return stopProgress;
  }, [isPaused, curIdx, total]);

  // ── 터치: 탭 → UI 토글 | 스와이프 → 슬라이드 이동 | 홀드 → 일시정지 ──
  const onTouchStart = (e: any) => {
    touchStartY.current = e.nativeEvent?.pageY ?? e.touches?.[0]?.pageY ?? 0;
    touchStartT.current = Date.now();
    setIsPaused(true);
    stopProgress();
  };

  const onTouchEnd = (e: any) => {
    const endY    = e.nativeEvent?.pageY ?? e.changedTouches?.[0]?.pageY ?? 0;
    const deltaY  = endY - touchStartY.current;
    const elapsed = Date.now() - touchStartT.current;
    setIsPaused(false);

    if (Math.abs(deltaY) < 50 && elapsed < 280) {
      // 빠른 탭 → UI 토글
      if (uiVisible) hideUI();
      else showUI();
      startProgress();
    } else if (deltaY < -60) {
      hideUI();
      goNext();
    } else if (deltaY > 60) {
      hideUI();
      goPrev();
    } else {
      startProgress();
    }
  };

  const heartSlide = async (slide: Slide) => {
    spawnHearts();
    if (slide.kind !== "msg" || !familyCode) return;
    const hasPhoto = !!slide.msg.photoData;
    logActivity(familyCode, deviceId, myName, "heart", hasPhoto ? (t.parentLogHeartPhoto as string) : (t.parentLogHeartMsg as string));
    try {
      const updated = await api.heartMessage(familyCode, slide.msg.id);
      setMsgs(p => p.map(m => m.id === updated.id ? updated : m));
    } catch {
      setMsgs(p => p.map(m => m.id === slide.msg.id ? { ...m, hearts: m.hearts + 1 } : m));
    }
  };

  const currentSlide  = slides[curIdx] ?? null;
  const pendingSlide  = nextIdx !== null ? slides[nextIdx] : null;
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const currentHearts = currentSlide?.kind === "msg" ? currentSlide.msg.hearts : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>

      {/* ══ 슬라이드 + 오버레이 영역 (flex: 1 — 화면을 꽉 채움) ══ */}
      <View style={ps.slideArea}>

        {/* ── 전체화면 슬라이드쇼 ── */}
        <View
          style={StyleSheet.absoluteFillObject}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {loadingMsgs && msgs.length === 0 ? (
            <View style={ps.loadingWrap}>
              <ActivityIndicator color={COLORS.neon} size="large" />
              <Text style={ps.loadingText}>{t.parentLoadingPhotos}</Text>
            </View>
          ) : currentSlide ? (
            <>
              <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: pendingSlide ? fadeOut : 1 }]}>
                <SlideCard slide={currentSlide} />
              </Animated.View>
              {pendingSlide && (
                <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeIn, transform: [{ scale: scaleIn }] }]}>
                  <SlideCard slide={pendingSlide} />
                </Animated.View>
              )}
            </>
          ) : (
            <View style={ps.emptyWrap}>
              <Ionicons name="images-outline" size={56} color="rgba(255,255,255,0.15)" />
              <Text style={ps.emptyTitle}>{t.parentNoPhotos}</Text>
              <Text style={ps.emptySub}>{t.parentNoPhotosSub}</Text>
              {!isConnected && (
                <Pressable style={ps.connectBtn} onPress={() => router.push("/profile")}>
                  <Text style={ps.connectBtnText}>{t.parentConnectFamily}</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* ── 하트 파티클 ── */}
        {floatHearts.map(h => <HeartParticle key={h.id} h={h} />)}

        {/* ── 프로그레스 바 (항상 표시) ── */}
        {total > 1 && (
          <View style={[ps.storyBars, { top: topInset + 10 }]} pointerEvents="none">
            {slides.map((_, i) => (
              <View key={i} style={ps.storyBar}>
                <Animated.View style={[ps.storyBarFill, {
                  width: i < curIdx ? "100%" : i === curIdx ? progressWidth : "0%",
                }]} />
              </View>
            ))}
          </View>
        )}

        {/* ══ 상단 오버레이 (탭 시 내려옴) ══ */}
        <Animated.View
          style={[ps.topOverlay, { paddingTop: topInset + 14, transform: [{ translateY: topBarAnim }] }]}
          pointerEvents={uiVisible ? "box-none" : "none"}
        >
          <View style={ps.topGradient} pointerEvents="none" />
          <View style={ps.topRow}>
            <Text style={ps.logo}>A N B U</Text>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={permission?.granted ? toggleShare : requestPermission}
              style={[ps.gpsChip, !isSharing && ps.gpsChipOff]}
            >
              {locUploading
                ? <ActivityIndicator size="small" color={COLORS.neon} style={{ width: 10, height: 10 }} />
                : <View style={[ps.gpsDot, !isSharing && { backgroundColor: "rgba(255,255,255,0.3)" }]} />}
              <Text style={[ps.gpsText, !isSharing && { color: "rgba(255,255,255,0.35)" }]} numberOfLines={1}>
                {isSharing ? (address || t.parentLocSharing) : t.parentLocStopped}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ══ 하단 오버레이 (탭 시 올라옴) ══ */}
        <Animated.View
          style={[ps.bottomOverlay, { paddingBottom: Math.max(bottomInset, 22), transform: [{ translateY: bottomBarAnim }] }]}
          pointerEvents={uiVisible ? "box-none" : "none"}
        >
          <View style={ps.bottomGradient} pointerEvents="none" />
          <View style={ps.bottomRow}>
            <Pressable style={ps.heartPill} onPress={() => currentSlide && heartSlide(currentSlide)}>
              <Ionicons name="heart" size={19} color={COLORS.coral} />
              {currentHearts > 0 && <Text style={ps.heartCount}>{currentHearts}</Text>}
            </Pressable>
            {total > 0 && (
              <Text style={ps.slideCounter}>{curIdx + 1} / {total}</Text>
            )}
            <View style={ps.iconGroup}>
              <Pressable style={ps.iconBtn} onPress={() => router.push("/profile")}>
                <Ionicons name="person-circle-outline" size={23} color="rgba(255,255,255,0.88)" />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ── 일시정지 표시 ── */}
        {isPaused && !transitioning && (
          <View style={ps.pauseOverlay} pointerEvents="none">
            <View style={ps.pauseBadge}>
              <Ionicons name="pause" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={ps.pauseText}>{t.parentPaused}</Text>
            </View>
          </View>
        )}
      </View>

    </View>
  );
}

// ── 슬라이드 스타일 ───────────────────────────────────────────────────────────
const sl = StyleSheet.create({
  photoCaption:   { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 24 },
  captionText:    { fontFamily: "Inter_400Regular", fontSize: 16, color: "#fff", lineHeight: 24, marginBottom: 4 },
  captionTime:    { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.5)" },
  textSlideBg:    { backgroundColor: COLORS.navPill, alignItems: "center", justifyContent: "center" },
  decoCircle1:    { position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: 110, borderWidth: 30, borderColor: "rgba(212,242,0,0.07)" },
  decoCircle2:    { position: "absolute", left: -80, bottom: -80, width: 300, height: 300, borderRadius: 150, borderWidth: 30, borderColor: "rgba(212,242,0,0.05)" },
  textCenter:     { paddingHorizontal: 36, paddingVertical: 24, maxWidth: 360 },
  bigQuote:       { fontFamily: "Inter_700Bold", fontSize: 56, color: COLORS.neon, lineHeight: 56 },
  bigText:        { fontFamily: "Inter_700Bold", fontSize: 24, color: COLORS.white, lineHeight: 34, marginTop: -10 },
  captionTime2:   { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 18, alignSelf: "flex-end" },
});

// ── 화면 스타일 ───────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  // 슬라이드 + 오버레이 래퍼
  slideArea:      { flex: 1, overflow: "hidden", backgroundColor: "#000" },

  // 로딩 / 빈 화면
  loadingWrap:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: "#111" },
  loadingText:    { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.4)" },
  emptyWrap:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40, backgroundColor: "#111" },
  emptyTitle:     { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff", textAlign: "center" },
  emptySub:       { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 20 },
  connectBtn:     { backgroundColor: COLORS.neon, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 50, marginTop: 8 },
  connectBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.neonText },

  // 프로그레스 바
  storyBars:      { position: "absolute", left: 14, right: 14, flexDirection: "row", gap: 4, zIndex: 50 },
  storyBar:       { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.22)", overflow: "hidden" },
  storyBarFill:   { height: "100%", backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 2 },

  // 상단 오버레이
  topOverlay:     { position: "absolute", top: 0, left: 0, right: 0, zIndex: 200 },
  topGradient:    { position: "absolute", top: 0, left: 0, right: 0, height: 130, backgroundColor: "rgba(0,0,0,0.62)" },
  topRow:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 20, gap: 10 },
  logo:           { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff", letterSpacing: 3 },
  gpsChip:        { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(212,242,0,0.14)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,242,0,0.22)", maxWidth: 140 },
  gpsChipOff:     { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.1)" },
  gpsDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.neon },
  gpsText:        { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.neon, flex: 1 },

  // 하단 오버레이
  bottomOverlay:  { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 200 },
  bottomGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 160, backgroundColor: "rgba(0,0,0,0.58)" },
  bottomRow:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 20, gap: 12 },

  // 하트 버튼
  heartPill:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 30, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  heartCount:     { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },

  // 카운터
  slideCounter:   { flex: 1, textAlign: "center", fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.45)" },

  // 아이콘 버튼
  iconGroup:      { flexDirection: "row", gap: 8 },
  iconBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },

  // 일시정지
  pauseOverlay:   { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "flex-start", paddingTop: 70, zIndex: 300 },
  pauseBadge:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50 },
  pauseText:      { fontFamily: "Inter_500Medium", fontSize: 13, color: "rgba(255,255,255,0.9)" },
});

