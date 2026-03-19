import { useCallback, useRef, useState } from "react";
import { Animated } from "react-native";

const AUTO_HIDE_DELAY = 5000;

export function useOverlayUI() {
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
    uiHideTimer.current = setTimeout(() => hideUI(), AUTO_HIDE_DELAY);
  }, [topBarAnim, bottomBarAnim, hideUI]);

  return {
    uiVisible,
    topBarAnim,
    bottomBarAnim,
    showUI,
    hideUI,
  };
}
