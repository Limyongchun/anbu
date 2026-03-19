import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
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

function logActivity(
  familyCode: string | null,
  deviceId: string | null,
  parentName: string | null,
  type: string,
  detail?: string,
) {
  if (!familyCode || !deviceId || !parentName) return;
  api.logParentActivity(familyCode, deviceId, parentName, type, detail).catch(() => {});
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SLIDE_INTERVAL = 6000;
const SLIDE_DURATION = 900;
const AUTO_RESUME_DELAY = 5000;
const DOUBLE_TAP_DELAY = 300;
const DEMO_SLIDE_BGS = ["#1a3a2a", "#1a2a3a", "#2a1a3a"];
const EASE_SLIDE = Easing.bezier(0.25, 0.1, 0.25, 1);

type Slide =
  | { kind: "msg"; msg: FamilyMessage }
  | { kind: "demo"; id: number; emoji: string; text: string; name: string; bg: string };

function buildSlides(msgs: FamilyMessage[], demoSlides: any[]): Slide[] {
  if (msgs.length > 0) return msgs.map((msg) => ({ kind: "msg", msg }));
  return demoSlides.map((d, i) => ({
    kind: "demo",
    id: -(i + 1),
    emoji: d.emoji,
    text: d.text,
    name: d.name,
    bg: DEMO_SLIDE_BGS[i] ?? "#1a2a3a",
  }));
}

interface FloatHeart {
  id: number;
  x: number;
  y: number;
  delay: number;
  anim: Animated.Value;
}

function HeartParticle({ h }: { h: FloatHeart }) {
  useEffect(() => {
    Animated.timing(h.anim, {
      toValue: 1,
      duration: 1600,
      delay: h.delay,
      useNativeDriver: true,
    }).start();
  }, []);
  const ty = h.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -260] });
  const op = h.anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0.9, 0] });
  const sc = h.anim.interpolate({ inputRange: [0, 0.15, 0.4, 1], outputRange: [0, 1.6, 1.2, 0.8] });
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: h.x,
        top: h.y,
        transform: [{ translateY: ty }, { scale: sc }],
        opacity: op,
        zIndex: 999,
      }}
    >
      <Ionicons name="heart" size={36} color={COLORS.coral} />
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

const PhotoSlide = React.memo(function PhotoSlide({ msg }: { msg: FamilyMessage }) {
  const { t } = useLang();
  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]}>
      <ExpoImage
        source={{ uri: msg.photoData! }}
        style={{ width: SCREEN_W, height: SCREEN_H }}
        contentFit="cover"
        contentPosition="top center"
        transition={0}
        cachePolicy="memory-disk"
      />
      <View style={sl.photoMeta}>
        {!!msg.text && (
          <Text style={sl.captionText} numberOfLines={3}>
            {msg.text}
          </Text>
        )}
        <View style={sl.metaRow}>
          <Text style={sl.fromName}>{msg.fromName}</Text>
          <Text style={sl.captionTime}>{formatTimeI18n(msg.createdAt, t)}</Text>
        </View>
      </View>
    </View>
  );
});

const TextSlide = React.memo(function TextSlide({ slide }: { slide: Slide }) {
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
  const { t } = useLang();
  return (
    <View style={[StyleSheet.absoluteFillObject, sl.textSlideBg]}>
      <View style={sl.decoCircle1} />
      <View style={sl.decoCircle2} />
      <View style={sl.textCenter}>
        <Text style={sl.bigQuote}>"</Text>
        <Text style={sl.bigText}>{msg.text}</Text>
        <Text style={[sl.bigQuote, { alignSelf: "flex-end", marginTop: 8 }]}>"</Text>
        <View style={[sl.metaRow, { marginTop: 18 }]}>
          <Text style={sl.fromName}>{msg.fromName}</Text>
          <Text style={sl.captionTime2}>{formatTimeI18n(msg.createdAt, t)}</Text>
        </View>
      </View>
    </View>
  );
});

function RenderSlide({ slide }: { slide: Slide | null }) {
  if (!slide) return <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]} />;
  if (slide.kind === "msg" && slide.msg.photoData) return <PhotoSlide msg={slide.msg} />;
  return <TextSlide slide={slide} />;
}

export default function ParentScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, allFamilyCodes, myName, deviceId, isConnected } = useFamilyContext();
  const { t, lang } = useLang();

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [msgs, setMsgs] = useState<FamilyMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [curIdx, setCurIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const transitioningRef = useRef(false);
  const currentMsgIdRef = useRef<number | null>(null);

  const slideY = useRef(new Animated.Value(0)).current;
  const [nextIdx, setNextIdx] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressRef = useRef<Animated.CompositeAnimation | null>(null);

  const [floatHearts, setFloatHearts] = useState<FloatHeart[]>([]);
  const lastTapRef = useRef(0);
  const autoResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spawnHeartsAt = useCallback((x: number, y: number) => {
    const hs: FloatHeart[] = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: x - 18 + (Math.random() - 0.5) * 80,
      y: y - 18,
      delay: i * 60,
      anim: new Animated.Value(0),
    }));
    setFloatHearts((p) => [...p, ...hs]);
    setTimeout(() => setFloatHearts((p) => p.filter((h) => !hs.some((n) => n.id === h.id))), 2200);
  }, []);

  const [uiVisible, setUiVisible] = useState(false);
  const topBarAnim = useRef(new Animated.Value(-160)).current;
  const bottomBarAnim = useRef(new Animated.Value(160)).current;
  const uiHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideUI = useCallback(() => {
    if (uiHideTimer.current) {
      clearTimeout(uiHideTimer.current);
      uiHideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(topBarAnim, { toValue: -160, duration: 300, useNativeDriver: true }),
      Animated.timing(bottomBarAnim, { toValue: 160, duration: 300, useNativeDriver: true }),
    ]).start(() => setUiVisible(false));
  }, [topBarAnim, bottomBarAnim]);

  const showUI = useCallback(() => {
    setUiVisible(true);
    Animated.parallel([
      Animated.spring(topBarAnim, { toValue: 0, useNativeDriver: true, tension: 90, friction: 14 }),
      Animated.spring(bottomBarAnim, { toValue: 0, useNativeDriver: true, tension: 90, friction: 14 }),
    ]).start();
    if (uiHideTimer.current) clearTimeout(uiHideTimer.current);
    uiHideTimer.current = setTimeout(() => hideUI(), 5000);
  }, [topBarAnim, bottomBarAnim, hideUI]);

  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [isSharing, setIsSharing] = useState(true);
  const [currentLoc, setCurrentLoc] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState("");
  const [locUploading, setLocUploading] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const pendingMsgsRef = useRef<FamilyMessage[] | null>(null);

  const applyNewMsgs = useCallback(
    (newMsgs: FamilyMessage[]) => {
      const watchId = currentMsgIdRef.current;
      setMsgs((prevMsgs) => {
        if (watchId !== null && newMsgs.length > 0) {
          const newIndex = newMsgs.findIndex((m) => m.id === watchId);
          if (newIndex >= 0) {
            setTimeout(() => setCurIdx(newIndex), 0);
          }
        }
        return newMsgs;
      });
      pendingMsgsRef.current = null;
    },
    [],
  );

  const loadMsgs = useCallback(async () => {
    if (allFamilyCodes.length === 0) return;
    try {
      const results = await Promise.all(
        allFamilyCodes.map((code) => api.getMessages(code).catch(() => [] as FamilyMessage[])),
      );
      const merged = results
        .flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (transitioningRef.current) {
        pendingMsgsRef.current = merged;
      } else {
        applyNewMsgs(merged);
      }
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
  const uploadLoc = useCallback(
    async (loc: Location.LocationObject, sharing: boolean) => {
      if (!familyCode || !myName || !deviceId) return;
      setLocUploading(true);
      try {
        let addr = "";
        try {
          const geo = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geo.length > 0) {
            const g = geo[0];
            addr = [g.city || g.district, g.street].filter(Boolean).join(" ");
          }
        } catch {}
        setAddress(addr);
        await api.updateLocation(familyCode, {
          deviceId,
          memberName: myName,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          address: addr,
          accuracy: loc.coords.accuracy ?? undefined,
          isSharing: sharing,
        });
        const now = Date.now();
        if (sharing && addr && now - lastLocLogRef.current > 300000) {
          lastLocLogRef.current = now;
          logActivity(familyCode, deviceId, myName, "location", `${t.parentLogLocShared} · ${addr}`);
        }
      } catch {
      } finally {
        setLocUploading(false);
      }
    },
    [familyCode, myName, deviceId],
  );

  const startWatch = useCallback(async () => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    try {
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 20000, distanceInterval: 30 },
        (loc) => {
          setCurrentLoc(loc);
          uploadLoc(loc, true);
        },
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
        .then((l) => {
          setCurrentLoc(l);
          uploadLoc(l, true);
        })
        .catch(() => {});
      startWatch().catch(() => {});
    } else if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    return () => {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
    };
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
    const next = !isSharing;
    setIsSharing(next);
    if (currentLoc) await uploadLoc(currentLoc, next);
  };

  const slides = useMemo(() => buildSlides(msgs, t.parentDemoSlides as any[]), [msgs, t.parentDemoSlides]);
  const total = slides.length;

  useEffect(() => {
    const cur = slides[curIdx];
    if (cur?.kind === "msg") {
      currentMsgIdRef.current = cur.msg.id;
    }
  }, [curIdx, slides]);

  useEffect(() => {
    if (total <= 1) return;
    const ni = (curIdx + 1) % total;
    const nextSlide = slides[ni];
    if (nextSlide?.kind === "msg" && nextSlide.msg.photoData) {
      ExpoImage.prefetch(nextSlide.msg.photoData);
    }
  }, [curIdx, total, slides]);

  const slideViewCountRef = useRef(0);
  const lastSlideLogRef = useRef(0);

  const goNext = useCallback(() => {
    if (transitioningRef.current || total <= 1) return;
    transitioningRef.current = true;
    progressAnim.stopAnimation();

    slideViewCountRef.current += 1;
    const ni = (curIdx + 1) % total;
    const now = Date.now();
    if (now - lastSlideLogRef.current > 60000) {
      lastSlideLogRef.current = now;
      const s = slides[ni];
      const detail =
        s?.kind === "msg" && s.msg.photoData
          ? (t.parentLogViewPhoto as string)
          : (t.parentLogViewMsg as string);
      logActivity(familyCode, deviceId, myName, "view_slide", detail);
    }

    setNextIdx(ni);
    slideY.setValue(0);

    Animated.timing(slideY, {
      toValue: -SCREEN_H,
      duration: SLIDE_DURATION,
      easing: EASE_SLIDE,
      useNativeDriver: true,
    }).start(() => {
      setCurIdx(ni);
      slideY.setValue(0);
      transitioningRef.current = false;
      if (pendingMsgsRef.current) applyNewMsgs(pendingMsgsRef.current);
    });
  }, [total, curIdx, slideY, progressAnim, slides, familyCode, deviceId, myName, applyNewMsgs]);

  const startProgress = useCallback(() => {
    progressAnim.setValue(0);
    progressRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: SLIDE_INTERVAL,
      useNativeDriver: false,
    });
    progressRef.current.start(({ finished }) => {
      if (finished) goNext();
    });
  }, [progressAnim, goNext]);

  const stopProgress = useCallback(() => {
    progressRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!isPaused && total > 0 && !transitioningRef.current) startProgress();
    else stopProgress();
    return stopProgress;
  }, [isPaused, curIdx, total]);

  const clearAutoResume = () => {
    if (autoResumeTimer.current) {
      clearTimeout(autoResumeTimer.current);
      autoResumeTimer.current = null;
    }
  };

  const pauseSlideshow = useCallback(() => {
    clearAutoResume();
    setIsPaused(true);
    stopProgress();
    autoResumeTimer.current = setTimeout(() => {
      setIsPaused(false);
    }, AUTO_RESUME_DELAY);
  }, [stopProgress]);

  const resumeSlideshow = useCallback(() => {
    clearAutoResume();
    setIsPaused(false);
  }, []);

  useEffect(() => {
    return () => clearAutoResume();
  }, []);

  const heartSlide = useCallback(
    async (slide: Slide, x: number, y: number) => {
      spawnHeartsAt(x, y);
      if (slide.kind !== "msg" || !familyCode) return;
      const hasPhoto = !!slide.msg.photoData;
      logActivity(
        familyCode,
        deviceId,
        myName,
        "heart",
        hasPhoto ? (t.parentLogHeartPhoto as string) : (t.parentLogHeartMsg as string),
      );
      try {
        const updated = await api.heartMessage(familyCode, slide.msg.id);
        setMsgs((p) => p.map((m) => (m.id === updated.id ? updated : m)));
      } catch {
        setMsgs((p) =>
          p.map((m) => (m.id === slide.msg.id ? { ...m, hearts: m.hearts + 1 } : m)),
        );
      }
    },
    [familyCode, deviceId, myName, spawnHeartsAt],
  );

  const activeSlide = slides[curIdx] ?? null;
  const nextSlideData = slides[nextIdx] ?? null;

  const onTouchStart = () => {
    if (isPaused) {
      resumeSlideshow();
    } else {
      pauseSlideshow();
    }
  };

  const touchStartRef = useRef({ y: 0, t: 0, x: 0 });

  const onTouchStartFull = (e: any) => {
    touchStartRef.current = {
      y: e.nativeEvent?.pageY ?? e.touches?.[0]?.pageY ?? 0,
      x: e.nativeEvent?.pageX ?? e.touches?.[0]?.pageX ?? 0,
      t: Date.now(),
    };
  };

  const onTouchEndFull = (e: any) => {
    const endY = e.nativeEvent?.pageY ?? e.changedTouches?.[0]?.pageY ?? 0;
    const endX = e.nativeEvent?.pageX ?? e.changedTouches?.[0]?.pageX ?? 0;
    const deltaY = endY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.t;

    if (deltaY < -60 && elapsed < 500) {
      hideUI();
      goNext();
      return;
    }

    if (Math.abs(deltaY) < 50 && elapsed < 300) {
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        lastTapRef.current = 0;
        if (activeSlide) heartSlide(activeSlide, endX, endY);
        hideUI();
        return;
      }
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          if (uiVisible) {
            hideUI();
            resumeSlideshow();
          } else {
            showUI();
            pauseSlideshow();
          }
        }
      }, DOUBLE_TAP_DELAY + 30);
    }
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const currentHearts = activeSlide?.kind === "msg" ? activeSlide.msg.hearts : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={ps.slideArea}>
        <View
          style={StyleSheet.absoluteFillObject}
          onTouchStart={onTouchStartFull}
          onTouchEnd={onTouchEndFull}
        >
          {loadingMsgs && msgs.length === 0 ? (
            <View style={ps.loadingWrap}>
              <ActivityIndicator color={COLORS.neon} size="large" />
              <Text style={ps.loadingText}>{t.parentLoadingPhotos}</Text>
            </View>
          ) : total > 0 ? (
            <>
              <View style={StyleSheet.absoluteFillObject}>
                <RenderSlide slide={nextSlideData} />
              </View>

              <Animated.View
                style={[
                  StyleSheet.absoluteFillObject,
                  { transform: [{ translateY: slideY }] },
                ]}
              >
                <RenderSlide slide={activeSlide} />
              </Animated.View>
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

        {floatHearts.map((h) => (
          <HeartParticle key={h.id} h={h} />
        ))}

        {total > 1 && (
          <View style={[ps.storyBars, { top: topInset + 10 }]} pointerEvents="none">
            {slides.map((_, i) => (
              <View key={i} style={ps.storyBar}>
                <Animated.View
                  style={[
                    ps.storyBarFill,
                    { width: i < curIdx ? "100%" : i === curIdx ? progressWidth : "0%" },
                  ]}
                />
              </View>
            ))}
          </View>
        )}

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
              {locUploading ? (
                <ActivityIndicator size="small" color={COLORS.neon} style={{ width: 10, height: 10 }} />
              ) : (
                <View style={[ps.gpsDot, !isSharing && { backgroundColor: "rgba(255,255,255,0.3)" }]} />
              )}
              <Text
                style={[ps.gpsText, !isSharing && { color: "rgba(255,255,255,0.35)" }]}
                numberOfLines={1}
              >
                {isSharing ? address || t.parentLocSharing : t.parentLocStopped}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            ps.bottomOverlay,
            { paddingBottom: Math.max(bottomInset, 22), transform: [{ translateY: bottomBarAnim }] },
          ]}
          pointerEvents={uiVisible ? "box-none" : "none"}
        >
          <View style={ps.bottomGradient} pointerEvents="none" />
          <View style={ps.bottomRow}>
            <Pressable
              style={ps.heartPill}
              onPress={() => activeSlide && heartSlide(activeSlide, SCREEN_W / 2, SCREEN_H / 2)}
            >
              <Ionicons name="heart" size={19} color={COLORS.coral} />
              {currentHearts > 0 && <Text style={ps.heartCount}>{currentHearts}</Text>}
            </Pressable>
            {total > 0 && (
              <Text style={ps.slideCounter}>
                {curIdx + 1} / {total}
              </Text>
            )}
            <View style={ps.iconGroup}>
              <Pressable style={ps.iconBtn} onPress={() => router.push("/profile")}>
                <Ionicons name="person-circle-outline" size={23} color="rgba(255,255,255,0.88)" />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {isPaused && !transitioningRef.current && (
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

const sl = StyleSheet.create({
  photoMeta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  captionText: { fontFamily: "Inter_400Regular", fontSize: 17, color: "#fff", lineHeight: 26, marginBottom: 8 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fromName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.7)" },
  captionTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.45)" },
  textSlideBg: { backgroundColor: COLORS.navPill, alignItems: "center", justifyContent: "center" },
  decoCircle1: {
    position: "absolute",
    right: -60,
    top: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 30,
    borderColor: "rgba(212,242,0,0.07)",
  },
  decoCircle2: {
    position: "absolute",
    left: -80,
    bottom: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 30,
    borderColor: "rgba(212,242,0,0.05)",
  },
  textCenter: { paddingHorizontal: 36, paddingVertical: 24, maxWidth: 360 },
  bigQuote: { fontFamily: "Inter_700Bold", fontSize: 56, color: COLORS.neon, lineHeight: 56 },
  bigText: { fontFamily: "Inter_700Bold", fontSize: 24, color: COLORS.white, lineHeight: 34, marginTop: -10 },
  captionTime2: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.35)" },
});

const ps = StyleSheet.create({
  slideArea: { flex: 1, overflow: "hidden", backgroundColor: "#000" },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: "#000" },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.4)" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    backgroundColor: "#000",
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff", textAlign: "center" },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 22,
  },
  connectBtn: { marginTop: 16, backgroundColor: COLORS.neon, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  connectBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.neonText },

  storyBars: { position: "absolute", left: 12, right: 12, flexDirection: "row", gap: 4, zIndex: 30 },
  storyBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
  storyBarFill: { height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.9)" },

  topOverlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, paddingHorizontal: 16 },
  topGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  topRow: { flexDirection: "row", alignItems: "center" },
  logo: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff", letterSpacing: 4, marginRight: 14 },
  gpsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(212,242,0,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 200,
  },
  gpsChipOff: { backgroundColor: "rgba(255,255,255,0.08)" },
  gpsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.neon },
  gpsText: { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.neon },

  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  bottomGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heartPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heartCount: { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.coral },
  slideCounter: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.5)" },
  iconGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { padding: 8 },

  pauseOverlay: { position: "absolute", top: "50%", left: 0, right: 0, alignItems: "center", zIndex: 50 },
  pauseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pauseText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.8)" },
});
