import type { ParentStatus } from "./types";

export const STATUS_FLAG_USE_NEW = true;

export function getStatusLabel(status: ParentStatus, lang: "ko" | "en" | "ja" = "ko"): string {
  const labels: Record<string, Record<ParentStatus, string>> = {
    ko: {
      SAFE: "정상",
      CHECK: "확인",
      DANGER: "주의",
      CRITICAL: "위험",
      SIGNAL_LOST: "연결 끊김",
    },
    en: {
      SAFE: "Normal",
      CHECK: "Check",
      DANGER: "Warning",
      CRITICAL: "Critical",
      SIGNAL_LOST: "Disconnected",
    },
    ja: {
      SAFE: "正常",
      CHECK: "確認",
      DANGER: "注意",
      CRITICAL: "危険",
      SIGNAL_LOST: "接続切断",
    },
  };
  return labels[lang]?.[status] ?? labels.ko[status] ?? "정상";
}

export function getStatusColor(status: ParentStatus): string {
  switch (status) {
    case "SAFE": return "#4CAF50";
    case "CHECK": return "#FFC107";
    case "DANGER": return "#F44336";
    case "CRITICAL": return "#B71C1C";
    case "SIGNAL_LOST": return "#9E9E9E";
    default: return "#4CAF50";
  }
}

export function getStatusBadgeBg(status: ParentStatus): string {
  switch (status) {
    case "SAFE": return "rgba(76,175,80,0.12)";
    case "CHECK": return "rgba(255,193,7,0.15)";
    case "DANGER": return "rgba(244,67,54,0.12)";
    case "CRITICAL": return "rgba(183,28,28,0.15)";
    case "SIGNAL_LOST": return "rgba(158,158,158,0.12)";
    default: return "rgba(76,175,80,0.12)";
  }
}

export type ActionType = "call" | "location" | "message" | "last_location" | "connection_check";

export interface StatusAction {
  type: ActionType;
  icon: string;
  priority: number;
}

export function getPrimaryActions(status: ParentStatus): StatusAction[] {
  switch (status) {
    case "SAFE":
      return [
        { type: "location", icon: "location-outline", priority: 1 },
      ];
    case "CHECK":
      return [
        { type: "location", icon: "location-outline", priority: 1 },
        { type: "message", icon: "chatbubble-outline", priority: 2 },
      ];
    case "DANGER":
      return [
        { type: "call", icon: "call-outline", priority: 1 },
        { type: "location", icon: "location-outline", priority: 2 },
      ];
    case "CRITICAL":
      return [
        { type: "call", icon: "call-outline", priority: 1 },
        { type: "last_location", icon: "navigate-outline", priority: 2 },
      ];
    case "SIGNAL_LOST":
      return [
        { type: "call", icon: "call-outline", priority: 1 },
        { type: "connection_check", icon: "wifi-outline", priority: 2 },
      ];
    default:
      return [
        { type: "location", icon: "location-outline", priority: 1 },
      ];
  }
}

export function getStatusSummaryText(status: ParentStatus, lang: "ko" | "en" | "ja" = "ko"): string {
  const texts: Record<string, Record<ParentStatus, string>> = {
    ko: {
      SAFE: "정상 활동 중",
      CHECK: "조용한 시간이 길어지고 있어요",
      DANGER: "확인이 필요해요",
      CRITICAL: "확인전화가 필요해요",
      SIGNAL_LOST: "기기 연결 상태를 확인해주세요",
    },
    en: {
      SAFE: "Active and well",
      CHECK: "It's been quiet for a while",
      DANGER: "Needs attention",
      CRITICAL: "Please call to check in",
      SIGNAL_LOST: "Please check device connection",
    },
    ja: {
      SAFE: "正常に活動中",
      CHECK: "静かな時間が続いています",
      DANGER: "確認が必要です",
      CRITICAL: "確認の電話が必要です",
      SIGNAL_LOST: "デバイスの接続状態を確認してください",
    },
  };
  return texts[lang]?.[status] ?? texts.ko[status] ?? "정상 활동 중";
}
