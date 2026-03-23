import type { ConfirmedStatus, PlaceType } from "./statusTypes";

type Lang = "ko" | "en" | "ja";

const PLACE_MESSAGES: Record<Lang, Record<PlaceType, string>> = {
  ko: {
    HOME: "집에 계세요",
    SENIOR_CENTER: "노인정에 계세요",
    HOSPITAL: "병원에 계세요",
    FRIEND_HOME: "지인 댁에 계세요",
    MOVING: "이동 중이에요",
    UNKNOWN: "외출 중이에요",
  },
  en: {
    HOME: "At home",
    SENIOR_CENTER: "At the senior center",
    HOSPITAL: "At the hospital",
    FRIEND_HOME: "At a friend's home",
    MOVING: "On the move",
    UNKNOWN: "Out and about",
  },
  ja: {
    HOME: "自宅にいます",
    SENIOR_CENTER: "老人センターにいます",
    HOSPITAL: "病院にいます",
    FRIEND_HOME: "知人宅にいます",
    MOVING: "移動中です",
    UNKNOWN: "外出中です",
  },
};

const SLEEP_MESSAGES: Record<Lang, string> = {
  ko: "편안히 쉬고 계세요",
  en: "Resting comfortably",
  ja: "ゆっくり休んでいます",
};

const CHECK_MESSAGES: Record<Lang, string[]> = {
  ko: [
    "조금 더 지켜보는 중이에요",
    "확인이 필요해요",
  ],
  en: [
    "Keeping an eye on things",
    "Check-in needed",
  ],
  ja: [
    "もう少し様子を見ています",
    "確認が必要です",
  ],
};

const DANGER_MESSAGES: Record<Lang, string[]> = {
  ko: [
    "장시간 변화가 없어 확인이 필요합니다",
    "연락을 확인해 주세요",
  ],
  en: [
    "No changes for a long time, please check in",
    "Please verify contact",
  ],
  ja: [
    "長時間変化がありません。確認してください",
    "連絡を確認してください",
  ],
};

export function getStatusMessage(
  status: ConfirmedStatus,
  place: PlaceType,
  isSleeping: boolean,
  lang: Lang
): string {
  if (isSleeping && status === "SAFE") {
    return SLEEP_MESSAGES[lang];
  }

  if (status === "SAFE") {
    return PLACE_MESSAGES[lang][place] || PLACE_MESSAGES[lang].UNKNOWN;
  }

  if (status === "CHECK") {
    const msgs = CHECK_MESSAGES[lang];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  if (status === "DANGER") {
    const msgs = DANGER_MESSAGES[lang];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  return PLACE_MESSAGES[lang].UNKNOWN;
}

export function getStatusColor(status: ConfirmedStatus): string {
  switch (status) {
    case "SAFE": return "#4CAF50";
    case "CHECK": return "#FFC107";
    case "DANGER": return "#F44336";
    default: return "#9E9E9E";
  }
}

export function getStatusLabel(status: ConfirmedStatus, lang: Lang): string {
  const labels: Record<Lang, Record<ConfirmedStatus, string>> = {
    ko: { SAFE: "안전", CHECK: "확인 필요", DANGER: "위험" },
    en: { SAFE: "Safe", CHECK: "Check Needed", DANGER: "Danger" },
    ja: { SAFE: "安全", CHECK: "確認必要", DANGER: "危険" },
  };
  return labels[lang][status];
}