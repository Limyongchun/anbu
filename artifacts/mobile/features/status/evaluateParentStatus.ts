import type { EvaluateInput, EvaluateResult, ParentStatus, StatusReason } from "./types";
import {
  CHECK_INACTIVE_MINUTES,
  DANGER_INACTIVE_MINUTES,
  CRITICAL_INACTIVE_MINUTES,
  WAKE_CHECK_DELAY_MINUTES,
  WAKE_DANGER_DELAY_MINUTES,
  SIGNAL_CRITICAL_MINUTES,
} from "./constants";
import {
  safeParseDate,
  diffMinutes,
  isWithinSleepWindow,
  minutesSinceWake,
} from "./timeUtils";

const SUMMARY_KO: Record<ParentStatus, string> = {
  SAFE: "정상 활동 중",
  CHECK: "조용한 시간이 길어지고 있어요",
  DANGER: "확인이 필요해요",
  CRITICAL: "확인전화가 필요해요",
  SIGNAL_LOST: "기기 연결 상태를 확인해주세요",
};

function pickLatest(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

export function evaluateParentStatus(input: EvaluateInput): EvaluateResult {
  const now = safeParseDate(input.now) ?? Date.now();

  const lastApp = safeParseDate(input.lastAppActivityAt);
  const lastLoc = safeParseDate(input.lastLocationAt);
  const lastHb = safeParseDate(input.lastHeartbeatAt);

  const latestSignal = pickLatest(lastLoc, lastHb);

  const inactiveMinutes = lastApp != null ? diffMinutes(now, lastApp) : 0;
  const signalLostMinutes = latestSignal != null ? diffMinutes(now, latestSignal) : 0;

  const isSleeping = isWithinSleepWindow(now, input.sleepStart, input.sleepEnd);

  let wakeDelayMinutes = 0;
  if (!isSleeping) {
    const sinceWake = minutesSinceWake(now, input.expectedWakeTime);
    const todayWake = new Date(now);
    todayWake.setHours(input.expectedWakeTime, 0, 0, 0);
    const todayWakeMs = todayWake.getTime();

    if (now >= todayWakeMs) {
      const hasActivityAfterWake = lastApp != null && lastApp >= todayWakeMs;
      if (!hasActivityAfterWake) {
        wakeDelayMinutes = sinceWake;
      }
    }
  }

  let status: ParentStatus = "SAFE";
  let reason: StatusReason = "normal";

  if (lastApp == null && latestSignal == null) {
    status = "SIGNAL_LOST";
    reason = "signal_lost";
    return {
      status,
      reason,
      inactiveMinutes: 0,
      signalLostMinutes: 0,
      wakeDelayMinutes: 0,
      isSleeping,
      summaryText: SUMMARY_KO[status],
    };
  }

  if (signalLostMinutes >= SIGNAL_CRITICAL_MINUTES) {
    status = "SIGNAL_LOST";
    reason = "signal_lost";
  } else if (inactiveMinutes >= CRITICAL_INACTIVE_MINUTES) {
    status = "CRITICAL";
    reason = "inactive";
  } else if (wakeDelayMinutes >= WAKE_DANGER_DELAY_MINUTES) {
    status = "DANGER";
    reason = "wake_delay";
  } else if (inactiveMinutes >= DANGER_INACTIVE_MINUTES) {
    status = "DANGER";
    reason = "inactive";
  } else if (wakeDelayMinutes >= WAKE_CHECK_DELAY_MINUTES) {
    status = "CHECK";
    reason = "wake_delay";
  } else if (inactiveMinutes >= CHECK_INACTIVE_MINUTES) {
    status = "CHECK";
    reason = "inactive";
  } else if (isSleeping) {
    status = "SAFE";
    reason = "sleeping";
  } else {
    status = "SAFE";
    reason = "normal";
  }

  const SIGNAL_BUFFER_MINUTES = 10;
  if (status === "SIGNAL_LOST") {
    const appRecent = lastApp != null && diffMinutes(now, lastApp) <= SIGNAL_BUFFER_MINUTES;
    const hbRecent = lastHb != null && diffMinutes(now, lastHb) <= SIGNAL_BUFFER_MINUTES;
    if (appRecent || hbRecent) {
      if (inactiveMinutes >= CHECK_INACTIVE_MINUTES) {
        status = "CHECK";
        reason = "inactive";
      } else {
        status = "SAFE";
        reason = "normal";
      }
    }
  }

  if (isSleeping && status !== "SIGNAL_LOST" && status !== "CRITICAL") {
    status = "SAFE";
    reason = "sleeping";
  }

  return {
    status,
    reason,
    inactiveMinutes,
    signalLostMinutes,
    wakeDelayMinutes,
    isSleeping,
    summaryText: SUMMARY_KO[status],
  };
}
