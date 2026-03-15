import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";
import { api, FamilyMessage } from "@/lib/api";

const { width, height } = Dimensions.get("window");

// ── 데모 슬라이드 (메시지 없을 때 표시) ────────────────────────────────────────
const DEMO_SLIDES = [
  { id: -1, emoji: "☀️", text: "오늘 날씨가 너무 좋아요!\n건강하게 지내세요 엄마 아빠 💛", name: "예진", bg: "#1a3a2a" },
  { id: -2, emoji: "🏠", text: "학교 잘 다녀왔어요~\n저녁 맛있게 드세요!", name: "민준", bg: "#1a2a3a" },
  { id: -3, emoji: "💌", text: "빨리 보고싶어요!\n사랑해요 ❤️", name: "예진", bg: "#2a1a3a" },
];

const INTERVAL_MS = 5000;

// ── 하트 파티클 ──────────────────────────────────────────────────────────────
interface FloatHeart { id: number; x: number; delay: number; anim: Animated.Value }

function HeartParticle({ h }: { h: FloatHeart }) {
  useEffect(() => {
    Animated.timing(h.anim, { toValue: 1, duration: 1400, delay: h.delay, useNativeDriver: false }).start();
  }, []);
  const ty = h.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -180] });
  const op = h.anim.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 0.85, 0] });
  const sc = h.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.5, 1.1] });
  return (
    <Animated.View style={{ position: "absolute", left: `${h.x}%` as any, bottom: "38%", transform: [{ translateY: ty }, { scale: sc }], opacity: op, zIndex: 999 }}>
      <Ionicons name="heart" size={30} color={COLORS.coral} />
    </Animated.View>
  );
}

function formatTime(s: string): string {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return "방금 전"; if (m < 60) return `${m}분 전`;
  const hh = Math.floor(m / 60); if (hh < 24) return `${hh}시간 전`;
  return `${Math.floor(hh / 24)}일 전`;
}

// ── 슬라이드 타입 ─────────────────────────────────────────────────────────────
type Slide =
  | { kind: "msg";  msg: FamilyMessage }
  | { kind: "demo"; id: number; emoji: string; text: string; name: string; bg: string };

function buildSlides(msgs: FamilyMessage[]): Slide[] {
  if (msgs.length > 0) return msgs.map(msg => ({ kind: "msg", msg }));
  return DEMO_SLIDES.map(d => ({ kind: "demo", ...d }));
}

// ── 슬라이드 카드 내용 ────────────────────────────────────────────────────────
function SlideCard({ slide, onHeart }: { slide: Slide; onHeart: () => void }) {
  if (slide.kind === "demo") {
    return (
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: slide.bg }]}>
        <View style={sl.filmTop} />
        <View style={sl.filmBottom} />
        <View style={sl.decoCircle1} />
        <View style={sl.decoCircle2} />
        <View style={sl.textCenter}>
          <Text style={{ fontSize: 80, marginBottom: 36, textAlign: "center" }}>{slide.emoji}</Text>
          <Text style={sl.bigQuote}>"</Text>
          <Text style={sl.bigText}>{slide.text}</Text>
          <Text style={[sl.bigQuote, { alignSelf: "flex-end", marginTop: 8 }]}>"</Text>
        </View>
        <Pressable style={sl.heartBtn} onPress={onHeart}>
          <Ionicons name="heart" size={26} color={COLORS.coral} />
        </Pressable>
      </View>
    );
  }

  const { msg } = slide;
  const hasPhoto = !!msg.photoData;

  if (hasPhoto) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        {/* 사진 — 오버레이 없이 밝게 표시 */}
        <Image source={{ uri: msg.photoData! }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <View style={sl.filmTop} />
        <View style={sl.filmBottom} />
        {/* 텍스트가 있을 때만 하단 반투명 바 */}
        {!!msg.text && (
          <View style={sl.photoBottomBar}>
            <Text style={sl.photoText} numberOfLines={3}>{msg.text}</Text>
            <Text style={sl.timeSmall}>{formatTime(msg.createdAt)}</Text>
          </View>
        )}
        <Pressable style={sl.heartBtn} onPress={onHeart}>
          <Ionicons name="heart" size={26} color={msg.hearts > 0 ? COLORS.coral : "rgba(255,255,255,0.55)"} />
          {msg.hearts > 0 && <Text style={sl.heartN}>{msg.hearts}</Text>}
        </Pressable>
      </View>
    );
  }

  // 텍스트 전용 슬라이드 (이름·아바타 없음)
  return (
    <View style={[StyleSheet.absoluteFillObject, sl.textSlideBg]}>
      <View style={sl.filmTop} />
      <View style={sl.filmBottom} />
      <View style={sl.decoCircle1} />
      <View style={sl.decoCircle2} />
      <View style={sl.textCenter}>
        <Text style={sl.bigQuote}>"</Text>
        <Text style={sl.bigText}>{msg.text}</Text>
        <Text style={[sl.bigQuote, { alignSelf: "flex-end", marginTop: 8 }]}>"</Text>
        <Text style={sl.timeSmall2}>{formatTime(msg.createdAt)}</Text>
      </View>
      <Pressable style={sl.heartBtn} onPress={onHeart}>
        <Ionicons name="heart" size={26} color={msg.hearts > 0 ? COLORS.coral : "rgba(255,255,255,0.3)"} />
        {msg.hearts > 0 && <Text style={sl.heartN}>{msg.hearts}</Text>}
      </Pressable>
    </View>
  );
}

// ── 부모님 메인 화면 ──────────────────────────────────────────────────────────
export default function ParentScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, myName, deviceId, isConnected } = useFamilyContext();

  // ── 슬라이드쇼 상태 ──
  const [msgs,       setMsgs]       = useState<FamilyMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [curIdx,     setCurIdx]     = useState(0);
  const [nextIdx,    setNextIdx]    = useState<number | null>(null);
  const [isPaused,      setIsPaused]      = useState(false); // finger-hold pause
  const [transitioning, setTransitioning] = useState(false);

  // ── 애니메이션 ──
  const curY  = useRef(new Animated.Value(0)).current;
  const nxtY  = useRef(new Animated.Value(height)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<Animated.CompositeAnimation | null>(null);
  const touchStartY = useRef(0);

  // ── 하트 파티클 ──
  const [floatHearts, setFloatHearts] = useState<FloatHeart[]>([]);
  const spawnHearts = useCallback(() => {
    const hs: FloatHeart[] = Array.from({ length: 7 }, (_, i) => ({
      id: Date.now() + i, x: Math.random() * 70 + 10, delay: i * 80, anim: new Animated.Value(0),
    }));
    setFloatHearts(p => [...p, ...hs]);
    setTimeout(() => setFloatHearts(p => p.filter(h => !hs.some(n => n.id === h.id))), 1700);
  }, []);

  // ── GPS ──
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [isSharing,  setIsSharing]   = useState(true);
  const [currentLoc, setCurrentLoc]  = useState<Location.LocationObject | null>(null);
  const [address,    setAddress]     = useState("");
  const [locUploading, setLocUploading] = useState(false);
  const [lastSynced, setLastSynced]  = useState<Date | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const topInset    = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  // ── 메시지 로드 ──
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

  // ── GPS 업로드 ──
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
    if (!permission.granted) { requestPermission(); return; }
    if (isSharing) {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then(l => { setCurrentLoc(l); uploadLoc(l, true); }).catch(() => {});
      startWatch();
    } else if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    return () => { if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; } };
  }, [permission?.granted, isSharing]);

  const toggleShare = async () => {
    const next = !isSharing; setIsSharing(next);
    if (currentLoc) await uploadLoc(currentLoc, next);
  };

  // ── 슬라이드 데이터 ──
  const slides = buildSlides(msgs);
  const total  = slides.length;

  // ── 슬라이드 이동 (방향: 'up'=다음, 'down'=이전) ──
  const goTo = useCallback((targetIdx: number, dir: "up" | "down" = "up") => {
    if (transitioning || total === 0) return;
    const safeIdx = ((targetIdx % total) + total) % total;
    setNextIdx(safeIdx);
    setTransitioning(true);

    // 진입 슬라이드 초기 위치
    nxtY.setValue(dir === "up" ? height : -height);
    progressAnim.stopAnimation();

    Animated.parallel([
      Animated.timing(curY, { toValue: dir === "up" ? -height : height, duration: 420, useNativeDriver: false }),
      Animated.timing(nxtY, { toValue: 0, duration: 420, useNativeDriver: false }),
    ]).start(() => {
      setCurIdx(safeIdx);
      setNextIdx(null);
      curY.setValue(0);
      nxtY.setValue(height);
      setTransitioning(false);
    });
  }, [transitioning, total, curY, nxtY, progressAnim]);

  const goNext = useCallback(() => goTo(curIdx + 1, "up"),   [curIdx, goTo]);
  const goPrev = useCallback(() => goTo(curIdx - 1, "down"), [curIdx, goTo]);

  // ── 프로그레스 바 애니메이션 ──
  const startProgress = useCallback(() => {
    progressAnim.setValue(0);
    progressRef.current = Animated.timing(progressAnim, {
      toValue: 1, duration: INTERVAL_MS, useNativeDriver: false,
    });
    progressRef.current.start(({ finished }) => {
      if (finished) goNext();
    });
  }, [progressAnim, goNext]);

  const stopProgress = useCallback(() => {
    progressRef.current?.stop();
  }, []);

  // ── 자동 재생 (항상 켜짐, 손가락 홀드 or 전환 중에만 일시정지) ──
  useEffect(() => {
    if (!isPaused && !transitioning && total > 0) {
      startProgress();
    } else {
      stopProgress();
    }
    return stopProgress;
  }, [isPaused, transitioning, curIdx, total]);

  // ── 터치 핸들러 ──
  const onTouchStart = (e: any) => {
    touchStartY.current = e.nativeEvent?.pageY ?? e.touches?.[0]?.pageY ?? 0;
    setIsPaused(true);
    stopProgress();
  };

  const onTouchEnd = (e: any) => {
    const endY = e.nativeEvent?.pageY ?? e.changedTouches?.[0]?.pageY ?? 0;
    const delta = endY - touchStartY.current;
    setIsPaused(false);
    if (delta < -60)     goNext();   // 위로 스와이프 → 다음
    else if (delta > 60) goPrev();   // 아래로 스와이프 → 이전
    else if (!transitioning) startProgress();
  };

  // ── 하트 ──
  const heartSlide = async (slide: Slide) => {
    spawnHearts();
    if (slide.kind !== "msg" || !familyCode) return;
    try {
      const updated = await api.heartMessage(familyCode, slide.msg.id);
      setMsgs(p => p.map(m => m.id === updated.id ? updated : m));
    } catch {
      setMsgs(p => p.map(m => m.id === slide.msg.id ? { ...m, hearts: m.hearts + 1 } : m));
    }
  };

  const currentSlide = slides[curIdx] ?? null;
  const pendingSlide  = nextIdx !== null ? slides[nextIdx] : null;

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.mapBg }}>
      {/* 하트 파티클 */}
      {floatHearts.map(h => <HeartParticle key={h.id} h={h} />)}

      {/* ── 상단 헤더 ── */}
      <View style={[p.header, { paddingTop: topInset + 10 }]}>
        <Text style={p.logo}>DUGO</Text>
        <View style={{ flex: 1 }} />

        {/* GPS 상태 칩 */}
        {isSharing && permission?.granted && (
          <Pressable onPress={toggleShare} style={p.gpsChip}>
            {locUploading
              ? <ActivityIndicator size="small" color={COLORS.neon} style={{ width: 12, height: 12 }} />
              : <View style={p.gpsDot} />}
            <Text style={p.gpsChipText} numberOfLines={1}>
              {address || "위치 공유 중"}
            </Text>
          </Pressable>
        )}
        {(!isSharing || !permission?.granted) && (
          <Pressable onPress={permission?.granted ? toggleShare : requestPermission} style={[p.gpsChip, p.gpsChipOff]}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.45)" />
            <Text style={[p.gpsChipText, { color: "rgba(255,255,255,0.4)" }]}>
              {permission?.granted ? "공유 중지됨" : "위치 권한 필요"}
            </Text>
          </Pressable>
        )}

        <Pressable onPress={() => router.push("/profile")} style={p.backBtn}>
          <Ionicons name="person-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
        <Pressable onPress={() => router.replace("/")} style={p.backBtn}>
          <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      {/* ── 슬라이드쇼 영역 ── */}
      <View
        style={p.slideWrap}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {loadingMsgs && msgs.length === 0 ? (
          <View style={p.loadingWrap}>
            <ActivityIndicator color={COLORS.neon} size="large" />
            <Text style={p.loadingText}>메시지 불러오는 중...</Text>
          </View>
        ) : currentSlide ? (
          <>
            {/* 현재 슬라이드 */}
            <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateY: curY }] }]}>
              <SlideCard slide={currentSlide} onHeart={() => heartSlide(currentSlide)} />
            </Animated.View>

            {/* 다음 슬라이드 (트랜지션 중) */}
            {pendingSlide && (
              <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateY: nxtY }] }]}>
                <SlideCard slide={pendingSlide} onHeart={() => heartSlide(pendingSlide)} />
              </Animated.View>
            )}

            {/* Stories 스타일 상단 진행 바 */}
            {total > 1 && (
              <View style={p.storyBars} pointerEvents="none">
                {slides.map((_, i) => (
                  <View key={i} style={p.storyBar}>
                    <Animated.View style={[
                      p.storyBarFill,
                      {
                        width: i < curIdx
                          ? "100%"
                          : i === curIdx
                          ? progressWidth
                          : "0%",
                      },
                    ]} />
                  </View>
                ))}
              </View>
            )}

            {/* 일시정지 배지 */}
            {isPaused && !transitioning && (
              <View style={p.pauseOverlay} pointerEvents="none">
                <View style={p.pauseBadge}>
                  <Ionicons name="pause" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={p.pauseText}>일시정지</Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={p.emptyWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={p.emptyTitle}>아직 메시지가 없어요</Text>
            <Text style={p.emptySubTitle}>{isConnected ? "자녀가 안부를 보내면 여기 표시됩니다" : "가족 코드로 연결해보세요"}</Text>
            {!isConnected && (
              <Pressable style={p.connectBtn} onPress={() => router.push("/setup")}>
                <Text style={p.connectBtnText}>가족 연결하기</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* ── 개발 스위처 ── */}
      <View style={dev.bar}>
        <Ionicons name="code-slash" size={11} color="rgba(255,255,255,0.3)" />
        <Text style={dev.label}>개발 모드</Text>
        <Pressable onPress={() => router.replace("/child")} style={dev.btn}>
          <Ionicons name="people" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={dev.btnText}>자녀 화면</Text>
        </Pressable>
        <Pressable onPress={() => router.replace("/")} style={[dev.btn, dev.btnAlt]}>
          <Ionicons name="apps" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={dev.btnText}>홈</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── 슬라이드 스타일 ───────────────────────────────────────────────────────────
const sl = StyleSheet.create({
  // 필름 프레임 효과 — 상/하단 얇은 검정 바
  filmTop:        { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: "#000", zIndex: 10 },
  filmBottom:     { position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: "#000", zIndex: 10 },

  // 사진 슬라이드
  photoBottomBar: { position: "absolute", bottom: 4, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.52)", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 },
  photoText:      { fontFamily: "Inter_400Regular", fontSize: 16, color: COLORS.white, lineHeight: 23, marginBottom: 4 },
  timeSmall:      { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.55)" },

  // 공통
  heartBtn:       { position: "absolute", right: 20, bottom: 32, alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.38)", borderRadius: 30, paddingHorizontal: 14, paddingVertical: 10 },
  heartN:         { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.white },

  // 텍스트 전용 슬라이드 (이름·아바타 없음)
  textSlideBg:    { backgroundColor: COLORS.navPill, alignItems: "center", justifyContent: "center" },
  decoCircle1:    { position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: 110, borderWidth: 30, borderColor: "rgba(212,242,0,0.07)" },
  decoCircle2:    { position: "absolute", left: -80, bottom: -80, width: 300, height: 300, borderRadius: 150, borderWidth: 30, borderColor: "rgba(212,242,0,0.05)" },
  textCenter:     { paddingHorizontal: 36, paddingVertical: 24, maxWidth: 360 },
  bigQuote:       { fontFamily: "Inter_700Bold", fontSize: 56, color: COLORS.neon, lineHeight: 56 },
  bigText:        { fontFamily: "Inter_700Bold", fontSize: 24, color: COLORS.white, lineHeight: 34, marginTop: -10 },
  timeSmall2:     { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 18, alignSelf: "flex-end" },
});

// ── 부모님 화면 스타일 ────────────────────────────────────────────────────────
const p = StyleSheet.create({
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, gap: 8, zIndex: 10 },
  logo:         { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.white, letterSpacing: 3 },

  gpsChip:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(212,242,0,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,242,0,0.2)", maxWidth: 130 },
  gpsChipOff:   { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" },
  gpsDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.neon },
  gpsChipText:  { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.neon, flex: 1 },

  codeChip:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.07)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  codeDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  codeText:     { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 1 },
  backBtn:      { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },

  slideWrap:    { flex: 1, overflow: "hidden", position: "relative", backgroundColor: "#111" },

  // Stories 스타일 상단 진행 바
  storyBars:    { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", gap: 4, zIndex: 50 },
  storyBar:     { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" },
  storyBarFill: { height: "100%", backgroundColor: COLORS.white, borderRadius: 2 },

  // 일시정지 오버레이
  pauseOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "flex-start", paddingTop: 18 },
  pauseBadge:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50 },
  pauseText:    { fontFamily: "Inter_500Medium", fontSize: 13, color: "rgba(255,255,255,0.9)" },

  // 로딩 / 빈 상태
  loadingWrap:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText:  { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.4)" },
  emptyWrap:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyTitle:   { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.white, textAlign: "center" },
  emptySubTitle:{ fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 20 },
  connectBtn:   { backgroundColor: COLORS.neon, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 50, marginTop: 8 },
  connectBtnText:{ fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.neonText },
});

const dev = StyleSheet.create({
  bar:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  label:  { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.35)", marginRight: 4 },
  btn:    { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  btnAlt: { backgroundColor: "rgba(212,242,0,0.15)", borderColor: "rgba(212,242,0,0.25)" },
  btnText:{ fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.75)" },
});
