import type { MotionState, MapStatusText } from "./mapTypes";

const MOTION_LABELS: Record<string, Record<MotionState, string>> = {
  ko: { moving: "이동 중", stationary: "한 장소에 머무는 중", unknown: "" },
  en: { moving: "Moving", stationary: "Staying in one place", unknown: "" },
  ja: { moving: "移動中", stationary: "一か所に留まっている", unknown: "" },
};

const FRESHNESS: Record<string, { justNow: string; delayed: string }> = {
  ko: { justNow: "방금 업데이트됨", delayed: "위치 확인이 조금 늦어지고 있어요" },
  en: { justNow: "Just updated", delayed: "Location update is a bit delayed" },
  ja: { justNow: "たった今更新", delayed: "位置情報の更新が少し遅れています" },
};

const NO_DATA: Record<string, string> = {
  ko: "아직 위치 정보가 없어요",
  en: "No location data yet",
  ja: "まだ位置情報がありません",
};

export function getMotionLabel(state: MotionState, lang: string): string {
  const l = MOTION_LABELS[lang] ?? MOTION_LABELS.ko;
  return l[state] ?? l.unknown;
}

export function getFreshnessLabel(capturedAt: string, lang: string): string {
  const l = FRESHNESS[lang] ?? FRESHNESS.ko;
  const diffMs = Date.now() - new Date(capturedAt).getTime();
  const diffMin = diffMs / 60000;
  if (diffMin <= 1) return l.justNow;
  if (diffMin > 5) return l.delayed;
  return formatTimeAgo(diffMin, lang);
}

export function getNoDataLabel(lang: string): string {
  return NO_DATA[lang] ?? NO_DATA.ko;
}

function formatTimeAgo(minutes: number, lang: string): string {
  const m = Math.floor(minutes);
  if (lang === "en") return `${m} min ago`;
  if (lang === "ja") return `${m}分前`;
  return `${m}분 전`;
}

export function getStatusText(
  motionState: MotionState,
  capturedAt: string,
  lang: string
): MapStatusText {
  return {
    motion: getMotionLabel(motionState, lang),
    freshness: getFreshnessLabel(capturedAt, lang),
  };
}

export const MOCK_PARENT_LOCATION = {
  lat: 37.5665,
  lng: 126.978,
  accuracy: 15,
  capturedAt: new Date(Date.now() - 30000).toISOString(),
  motionState: "moving" as const,
  parentName: "엄마",
};
