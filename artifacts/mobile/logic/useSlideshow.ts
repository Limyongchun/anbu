import { useCallback, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { Image as ExpoImage } from "expo-image";
import type { FamilyMessage } from "@/lib/api";

const SLIDE_INTERVAL = 6000;
const AUTO_RESUME_DELAY = 5000;

export type Slide =
  | { kind: "msg"; msg: FamilyMessage }
  | { kind: "demo"; id: number; emoji: string; text: string; name: string };

export function buildSlides(msgs: FamilyMessage[], demoSlides: any[]): Slide[] {
  if (msgs.length > 0) return msgs.map((msg) => ({ kind: "msg", msg }));
  return demoSlides.map((d, i) => ({
    kind: "demo",
    id: -(i + 1),
    emoji: d.emoji,
    text: d.text,
    name: d.name,
  }));
}

interface UseSlideshowOptions {
  slides: Slide[];
  onSlideChange?: (nextIdx: number, slide: Slide) => void;
}

export function useSlideshow({ slides, onSlideChange }: UseSlideshowOptions) {
  const total = slides.length;
  const [curIdx, setCurIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const transitioningRef = useRef(false);
  const autoResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSlideChangeRef = useRef(onSlideChange);
  onSlideChangeRef.current = onSlideChange;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressRef = useRef<Animated.CompositeAnimation | null>(null);

  const clearAutoResume = useCallback(() => {
    if (autoResumeTimer.current) {
      clearTimeout(autoResumeTimer.current);
      autoResumeTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (total <= 1) return;
    const ni = (curIdx + 1) % total;
    const nextSlide = slides[ni];
    if (nextSlide?.kind === "msg" && nextSlide.msg.photoData) {
      ExpoImage.prefetch(nextSlide.msg.photoData);
    }
  }, [curIdx, total, slides]);

  const goNext = useCallback(() => {
    if (transitioningRef.current || total <= 1) return;
    transitioningRef.current = true;
    progressAnim.stopAnimation();

    const ni = (curIdx + 1) % total;
    onSlideChangeRef.current?.(ni, slides[ni]);

    setCurIdx(ni);
    transitioningRef.current = false;
  }, [total, curIdx, progressAnim, slides]);

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

  const pause = useCallback(() => {
    clearAutoResume();
    setIsPaused(true);
    stopProgress();
    autoResumeTimer.current = setTimeout(() => {
      setIsPaused(false);
    }, AUTO_RESUME_DELAY);
  }, [stopProgress, clearAutoResume]);

  const resume = useCallback(() => {
    clearAutoResume();
    setIsPaused(false);
  }, [clearAutoResume]);

  useEffect(() => {
    return () => clearAutoResume();
  }, [clearAutoResume]);

  const activeSlide = slides[curIdx] ?? null;
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return {
    curIdx,
    setCurIdx,
    isPaused,
    setIsPaused,
    transitioningRef,
    progressAnim,
    progressWidth,
    activeSlide,
    total,
    goNext,
    pause,
    resume,
    stopProgress,
  };
}
