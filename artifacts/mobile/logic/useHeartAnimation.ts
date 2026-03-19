import { useCallback, useState } from "react";
import { Animated } from "react-native";

export interface FloatHeart {
  id: number;
  x: number;
  y: number;
  delay: number;
  anim: Animated.Value;
}

export function useHeartAnimation() {
  const [floatHearts, setFloatHearts] = useState<FloatHeart[]>([]);

  const spawnHeartsAt = useCallback((x: number, y: number) => {
    const hs: FloatHeart[] = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: x - 18 + (Math.random() - 0.5) * 80,
      y: y - 18,
      delay: i * 60,
      anim: new Animated.Value(0),
    }));
    setFloatHearts((p) => [...p, ...hs]);
    setTimeout(
      () => setFloatHearts((p) => p.filter((h) => !hs.some((n) => n.id === h.id))),
      2200,
    );
  }, []);

  return { floatHearts, spawnHeartsAt };
}
