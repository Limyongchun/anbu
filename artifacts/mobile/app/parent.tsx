import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";

import { buildSlides, useSlideshow } from "@/logic/useSlideshow";
import { useLocationTracking } from "@/logic/useLocationTracking";
import { useParentMessages } from "@/logic/useParentMessages";
import { useOverlayUI } from "@/logic/useOverlayUI";
import { useHeartAnimation } from "@/logic/useHeartAnimation";

import {
  HeartParticle,
  RenderSlide,
  ProgressBars,
  TopOverlay,
  BottomOverlay,
  PauseBadge,
  EmptyState,
} from "@/components/parent";

const DOUBLE_TAP_DELAY = 300;

export default function ParentScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, allFamilyCodes, myName, deviceId } = useFamilyContext();
  const { t, lang } = useLang();

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const logActivity = useCallback(
    (type: string, detail?: string) => {
      if (!familyCode || !deviceId || !myName) return;
      api.logParentActivity(familyCode, deviceId, myName, type, detail).catch(() => {});
    },
    [familyCode, deviceId, myName],
  );

  const { msgs, loadingMsgs, trackCurrentMsgId, heartMessage, bindCurIdxSetter, bindIsTransitioning, flushPending } =
    useParentMessages({ allFamilyCodes });

  const slides = useMemo(() => buildSlides(msgs, t.parentDemoSlides as any[]), [msgs, t.parentDemoSlides]);

  const slideshowRef = useRef<ReturnType<typeof useSlideshow>>(null!);

  const slideshow = useSlideshow({
    slides,
    onSlideChange: (nextIdx: number, slide: any) => {
      const detail =
        slide?.kind === "msg" && slide.msg.photoData
          ? (t.parentLogViewPhoto as string)
          : (t.parentLogViewMsg as string);
      logActivity("view_slide", detail);
      flushPending();
    },
  });
  slideshowRef.current = slideshow;

  const {
    curIdx, setCurIdx, isPaused, transitioningRef,
    progressWidth,
    activeSlide, total,
    goNext, pause, resume,
  } = slideshow;

  useEffect(() => {
    bindCurIdxSetter(setCurIdx);
    bindIsTransitioning(() => transitioningRef.current);
  }, [bindCurIdxSetter, bindIsTransitioning, setCurIdx, transitioningRef]);

  useEffect(() => {
    trackCurrentMsgId(activeSlide);
  }, [curIdx, activeSlide, trackCurrentMsgId]);

  useEffect(() => {
    if (familyCode && deviceId && myName) {
      logActivity("app_open", t.parentLogAppOpen as string);
    }
  }, [familyCode, deviceId, myName]);

  const overlay = useOverlayUI();
  const { floatHearts, spawnHeartsAt } = useHeartAnimation();

  const location = useLocationTracking({
    familyCode,
    deviceId,
    myName,
    lang,
    logActivity,
    locSharedLabel: t.parentLogLocShared as string,
  });

  const heartSlide = useCallback(
    async (slide: any, x: number, y: number) => {
      spawnHeartsAt(x, y);
      if (slide.kind !== "msg" || !familyCode) return;
      const hasPhoto = !!slide.msg.photoData;
      logActivity(
        "heart",
        hasPhoto ? (t.parentLogHeartPhoto as string) : (t.parentLogHeartMsg as string),
      );
      await heartMessage(familyCode, slide.msg.id);
    },
    [familyCode, logActivity, spawnHeartsAt, heartMessage, t],
  );

  const lastTapRef = useRef(0);
  const touchStartRef = useRef({ y: 0, x: 0, t: 0 });
  const lastTouchEndRef = useRef(0);

  const handleGestureStart = (pageX: number, pageY: number) => {
    touchStartRef.current = { y: pageY, x: pageX, t: Date.now() };
  };

  const handleGestureEnd = (pageX: number, pageY: number) => {
    const deltaY = pageY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.t;

    if (deltaY < -60 && elapsed < 500) {
      overlay.hideUI();
      goNext();
      return;
    }

    if (Math.abs(deltaY) < 50 && elapsed < 300) {
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        lastTapRef.current = 0;
        if (activeSlide) heartSlide(activeSlide, pageX, pageY);
        overlay.hideUI();
        return;
      }
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          if (overlay.uiVisible) {
            overlay.hideUI();
            resume();
          } else {
            overlay.showUI();
            pause();
          }
        }
      }, DOUBLE_TAP_DELAY + 30);
    }
  };

  const onTouchStart = (e: any) => {
    const px = e.nativeEvent?.pageX ?? e.touches?.[0]?.pageX ?? 0;
    const py = e.nativeEvent?.pageY ?? e.touches?.[0]?.pageY ?? 0;
    handleGestureStart(px, py);
  };

  const onTouchEnd = (e: any) => {
    lastTouchEndRef.current = Date.now();
    const px = e.nativeEvent?.pageX ?? e.changedTouches?.[0]?.pageX ?? 0;
    const py = e.nativeEvent?.pageY ?? e.changedTouches?.[0]?.pageY ?? 0;
    handleGestureEnd(px, py);
  };

  const onMouseDown = (e: any) => {
    if (Platform.OS !== "web") return;
    if (e.nativeEvent?.button !== undefined && e.nativeEvent.button !== 0) return;
    if (Date.now() - lastTouchEndRef.current < 500) return;
    handleGestureStart(e.nativeEvent?.pageX ?? 0, e.nativeEvent?.pageY ?? 0);
  };

  const onMouseUp = (e: any) => {
    if (Platform.OS !== "web") return;
    if (e.nativeEvent?.button !== undefined && e.nativeEvent.button !== 0) return;
    if (Date.now() - lastTouchEndRef.current < 500) return;
    handleGestureEnd(e.nativeEvent?.pageX ?? 0, e.nativeEvent?.pageY ?? 0);
  };

  return (
    <View style={st.root}>
      <View style={st.slideArea}>
        <View
          style={StyleSheet.absoluteFillObject}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          {...(Platform.OS === "web" ? { onMouseDown, onMouseUp } : {})}
        >
          {loadingMsgs && msgs.length === 0 ? (
            <View style={st.loadingWrap}>
              <ActivityIndicator color={COLORS.neon} size="large" />
              <Text style={st.loadingText}>{t.parentLoadingPhotos}</Text>
            </View>
          ) : total > 0 ? (
            <View style={StyleSheet.absoluteFillObject}>
              <View style={st.overlayBg} />
              <RenderSlide slide={activeSlide} />
            </View>
          ) : (
            <EmptyState
              noPhotosLabel={t.parentNoPhotos as string}
              noPhotosSubLabel={t.parentNoPhotosSub as string}
              connectLabel={t.parentConnectFamily as string}
              settingsLabel={t.parentSettings as string}
            />
          )}
        </View>

        {floatHearts.map((h) => (
          <HeartParticle key={h.id} h={h} />
        ))}

        <ProgressBars
          slides={slides}
          curIdx={curIdx}
          progressWidth={progressWidth}
          topInset={topInset}
        />

        <TopOverlay
          topInset={topInset}
          topBarAnim={overlay.topBarAnim}
          uiVisible={overlay.uiVisible}
          isSharing={location.isSharing}
          address={location.address}
          locUploading={location.locUploading}
          locSharingLabel={t.parentLocSharing as string}
          locStoppedLabel={t.parentLocStopped as string}
          permissionGranted={!!location.permission?.granted}
          onToggleShare={location.toggleShare}
          onRequestPermission={location.requestPermission}
        />

        <BottomOverlay
          bottomInset={bottomInset}
          bottomBarAnim={overlay.bottomBarAnim}
          uiVisible={overlay.uiVisible}
          activeSlide={activeSlide}
          curIdx={curIdx}
          total={total}
          onHeart={heartSlide}
        />

        {isPaused && !transitioningRef.current && (
          <PauseBadge label={t.parentPaused as string} />
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  slideArea: { flex: 1, overflow: "hidden", backgroundColor: "#000" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: "#000" },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.4)" },
});
