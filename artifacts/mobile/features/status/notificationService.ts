import { Platform } from "react-native";
import type { ParentStatus } from "./types";
import { isWithinSleepWindow } from "./timeUtils";
import { DAY_START_HOUR, NIGHT_START_HOUR } from "./constants";

let Notifications: typeof import("expo-notifications") | null = null;

if (Platform.OS !== "web") {
  import("expo-notifications").then((mod) => {
    Notifications = mod;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }).catch(() => {});
}

const COOLDOWN_MS: Record<ParentStatus, number> = {
  SAFE: Infinity,
  CHECK: 6 * 60 * 60 * 1000,
  DANGER: 6 * 60 * 60 * 1000,
  CRITICAL: 2 * 60 * 60 * 1000,
  SIGNAL_LOST: 6 * 60 * 60 * 1000,
};

const _cache: Record<string, { status: ParentStatus; sentAt: number }> = {};

interface NotifyTexts {
  title: string;
  body: string;
}

function getNotifyTexts(
  status: ParentStatus,
  parentName: string,
  lang: "ko" | "en" | "ja"
): NotifyTexts | null {
  const texts: Record<string, Record<Exclude<ParentStatus, "SAFE">, { title: string; body: string }>> = {
    ko: {
      CHECK: {
        title: "안부 확인",
        body: `${parentName}님의 조용한 시간이 길어지고 있어요.`,
      },
      DANGER: {
        title: "안부 주의",
        body: `${parentName}님 상태를 확인해보세요.`,
      },
      CRITICAL: {
        title: "안부 위험",
        body: `${parentName}님이 장시간 반응이 없어 확인전화가 필요해요.`,
      },
      SIGNAL_LOST: {
        title: "연결 끊김",
        body: `${parentName}님 기기 연결 상태를 확인해주세요.`,
      },
    },
    en: {
      CHECK: {
        title: "ANBU Check",
        body: `${parentName} has been quiet for a while.`,
      },
      DANGER: {
        title: "ANBU Warning",
        body: `Please check on ${parentName}.`,
      },
      CRITICAL: {
        title: "ANBU Critical",
        body: `${parentName} has not responded for a long time. Please call to check in.`,
      },
      SIGNAL_LOST: {
        title: "Connection Lost",
        body: `Please check ${parentName}'s device connection.`,
      },
    },
    ja: {
      CHECK: {
        title: "安否確認",
        body: `${parentName}さんの静かな時間が長くなっています。`,
      },
      DANGER: {
        title: "安否注意",
        body: `${parentName}さんの状態を確認してください。`,
      },
      CRITICAL: {
        title: "安否危険",
        body: `${parentName}さんが長時間反応がありません。確認の電話が必要です。`,
      },
      SIGNAL_LOST: {
        title: "接続切断",
        body: `${parentName}さんのデバイス接続状態を確認してください。`,
      },
    },
  };

  if (status === "SAFE") return null;
  return texts[lang]?.[status] ?? texts.ko[status] ?? null;
}

function getPriority(status: ParentStatus): string {
  switch (status) {
    case "CRITICAL": return "max";
    case "DANGER": return "high";
    default: return "default";
  }
}

export function sendStatusNotification(
  parentId: string,
  parentName: string,
  previousStatus: ParentStatus,
  nextStatus: ParentStatus,
  lang: "ko" | "en" | "ja" = "ko"
): void {
  if (nextStatus === "SAFE") return;
  if (previousStatus === nextStatus) return;

  const now = Date.now();
  const cached = _cache[parentId];
  if (cached && cached.status === nextStatus) {
    const cooldown = COOLDOWN_MS[nextStatus];
    if (now - cached.sentAt < cooldown) return;
  }

  const isSleeping = isWithinSleepWindow(now, NIGHT_START_HOUR, DAY_START_HOUR);
  if (isSleeping) {
    if (nextStatus === "CHECK") return;
    if (nextStatus === "SIGNAL_LOST") return;
  }

  const texts = getNotifyTexts(nextStatus, parentName, lang);
  if (!texts) return;

  if (!Notifications) return;

  _cache[parentId] = { status: nextStatus, sentAt: now };

  try {
    Notifications.scheduleNotificationAsync({
      content: {
        title: texts.title,
        body: texts.body,
        sound: nextStatus === "CRITICAL" || nextStatus === "DANGER" ? "default" : undefined,
        priority: getPriority(nextStatus) as any,
        data: {
          type: "status_change",
          parentId,
          parentName,
          status: nextStatus,
        },
      },
      trigger: null,
    }).catch((err) => {
      console.warn("[StatusNotify] schedule failed:", err?.message ?? err);
    });
  } catch (err: any) {
    console.warn("[StatusNotify] failed:", err?.message ?? err);
  }
}
