import type {
  StatusLevel,
  ConfirmedStatus,
  PlaceType,
  ParentSignals,
  ScheduleConfig,
  StatusConfig,
  StatusResult,
} from "./statusTypes";
import { DEFAULT_STATUS_CONFIG, DEFAULT_SCHEDULE, INACTIVITY_THRESHOLD_MS } from "./statusConfig";
import { getStatusMessage } from "./statusMessages";

function isSleepTime(now: number, schedule: ScheduleConfig): boolean {
  const d = new Date(now);
  const h = d.getHours();
  const m = d.getMinutes();
  const currentMinutes = h * 60 + m;
  const sleepMinutes = schedule.sleepHour * 60 + schedule.sleepMinute;
  const wakeMinutes = schedule.wakeHour * 60 + schedule.wakeMinute;

  if (sleepMinutes > wakeMinutes) {
    return currentMinutes >= sleepMinutes || currentMinutes < wakeMinutes;
  }
  return currentMinutes >= sleepMinutes && currentMinutes < wakeMinutes;
}

function resolvePlace(
  signals: ParentSignals,
  now: number,
  config: StatusConfig
): PlaceType {
  if (!signals.candidatePlace || !signals.candidatePlaceStartedAt) {
    return signals.currentPlace;
  }

  const elapsed = now - signals.candidatePlaceStartedAt;

  if (signals.candidatePlace === "MOVING") {
    if (elapsed >= config.movingDelayMs) return "MOVING";
    return signals.currentPlace;
  }

  if (signals.candidatePlace === "UNKNOWN") {
    if (elapsed >= config.farPlaceConfirmDelayMs) return "UNKNOWN";
    return signals.currentPlace;
  }

  const delay = signals.currentPlace !== "UNKNOWN" && signals.candidatePlace !== signals.currentPlace
    ? config.placeEnterDelayMs
    : config.placeEnterDelayMs;

  if (elapsed >= delay) return signals.candidatePlace;
  return signals.currentPlace;
}

function computeRawStatus(
  signals: ParentSignals,
  now: number,
  config: StatusConfig,
  schedule: ScheduleConfig
): { rawLevel: StatusLevel; isSleeping: boolean } {
  const inactiveMs = now - signals.lastActiveAt;
  const sleeping = isSleepTime(now, schedule);

  if (sleeping) {
    const d = new Date(now);
    const currentMinutes = d.getHours() * 60 + d.getMinutes();
    const sleepMinutes = schedule.sleepHour * 60 + schedule.sleepMinute;

    let msSinceSleepStart: number;
    if (currentMinutes >= sleepMinutes) {
      msSinceSleepStart = (currentMinutes - sleepMinutes) * 60 * 1000;
    } else {
      msSinceSleepStart = ((24 * 60 - sleepMinutes) + currentMinutes) * 60 * 1000;
    }

    if (msSinceSleepStart < config.sleepApplyDelayMs) {
      if (inactiveMs > INACTIVITY_THRESHOLD_MS) {
        return { rawLevel: "CHECK_CANDIDATE", isSleeping: false };
      }
      return { rawLevel: "SAFE", isSleeping: false };
    }

    return { rawLevel: "SAFE", isSleeping: true };
  }

  const wakeMinutes = schedule.wakeHour * 60 + schedule.wakeMinute;
  const dNow = new Date(now);
  const currentMinutes = dNow.getHours() * 60 + dNow.getMinutes();
  const msSinceWake = currentMinutes >= wakeMinutes
    ? (currentMinutes - wakeMinutes) * 60 * 1000
    : 0;

  if (msSinceWake > 0 && msSinceWake <= config.wakeCheckDelayMs * 2) {
    if (inactiveMs > config.wakeCheckDelayMs * 2) {
      return { rawLevel: "DANGER_CANDIDATE", isSleeping: false };
    }
    if (inactiveMs > config.wakeCheckDelayMs) {
      return { rawLevel: "CHECK_CANDIDATE", isSleeping: false };
    }
  }

  if (inactiveMs < INACTIVITY_THRESHOLD_MS) {
    return { rawLevel: "SAFE", isSleeping: false };
  }

  if (inactiveMs < INACTIVITY_THRESHOLD_MS + config.checkNeedDelayMs) {
    return { rawLevel: "CHECK_CANDIDATE", isSleeping: false };
  }

  if (inactiveMs < INACTIVITY_THRESHOLD_MS + config.checkNeedDelayMs + config.dangerDelayMs) {
    return { rawLevel: "CHECK", isSleeping: false };
  }

  return { rawLevel: "DANGER_CANDIDATE", isSleeping: false };
}

function promoteStatus(
  rawLevel: StatusLevel,
  signals: ParentSignals,
  now: number,
  config: StatusConfig
): { confirmedStatus: ConfirmedStatus; statusLevel: StatusLevel; updatedSignals: ParentSignals } {
  const updated = { ...signals };

  if (rawLevel === "SAFE") {
    updated.candidateStatus = undefined;
    updated.candidateStatusStartedAt = undefined;
    updated.lastConfirmedStatus = "SAFE";
    updated.lastConfirmedStatusAt = now;
    return { confirmedStatus: "SAFE", statusLevel: "SAFE", updatedSignals: updated };
  }

  if (rawLevel === "CHECK_CANDIDATE") {
    if (updated.candidateStatus !== "CHECK_CANDIDATE") {
      updated.candidateStatus = "CHECK_CANDIDATE";
      updated.candidateStatusStartedAt = now;
    }
    const elapsed = now - (updated.candidateStatusStartedAt || now);
    if (elapsed >= config.checkNeedDelayMs) {
      updated.lastConfirmedStatus = "CHECK";
      updated.lastConfirmedStatusAt = now;
      updated.candidateStatus = undefined;
      updated.candidateStatusStartedAt = undefined;
      return { confirmedStatus: "CHECK", statusLevel: "CHECK", updatedSignals: updated };
    }
    return {
      confirmedStatus: updated.lastConfirmedStatus,
      statusLevel: "CHECK_CANDIDATE",
      updatedSignals: updated,
    };
  }

  if (rawLevel === "CHECK") {
    updated.lastConfirmedStatus = "CHECK";
    updated.lastConfirmedStatusAt = now;
    updated.candidateStatus = undefined;
    updated.candidateStatusStartedAt = undefined;
    return { confirmedStatus: "CHECK", statusLevel: "CHECK", updatedSignals: updated };
  }

  if (rawLevel === "DANGER_CANDIDATE") {
    if (updated.lastConfirmedStatus !== "CHECK" && updated.lastConfirmedStatus !== "DANGER") {
      updated.lastConfirmedStatus = "CHECK";
      updated.lastConfirmedStatusAt = now;
    }

    if (updated.candidateStatus !== "DANGER_CANDIDATE") {
      updated.candidateStatus = "DANGER_CANDIDATE";
      updated.candidateStatusStartedAt = now;
    }
    const elapsed = now - (updated.candidateStatusStartedAt || now);
    if (elapsed >= config.dangerDelayMs) {
      updated.lastConfirmedStatus = "DANGER";
      updated.lastConfirmedStatusAt = now;
      updated.candidateStatus = undefined;
      updated.candidateStatusStartedAt = undefined;
      return { confirmedStatus: "DANGER", statusLevel: "DANGER", updatedSignals: updated };
    }
    return {
      confirmedStatus: updated.lastConfirmedStatus,
      statusLevel: "DANGER_CANDIDATE",
      updatedSignals: updated,
    };
  }

  if (rawLevel === "DANGER") {
    updated.lastConfirmedStatus = "DANGER";
    updated.lastConfirmedStatusAt = now;
    updated.candidateStatus = undefined;
    updated.candidateStatusStartedAt = undefined;
    return { confirmedStatus: "DANGER", statusLevel: "DANGER", updatedSignals: updated };
  }

  return {
    confirmedStatus: updated.lastConfirmedStatus,
    statusLevel: rawLevel,
    updatedSignals: updated,
  };
}

export function computeParentStatus(
  signals: ParentSignals,
  now: number = Date.now(),
  config: StatusConfig = DEFAULT_STATUS_CONFIG,
  schedule: ScheduleConfig = DEFAULT_SCHEDULE,
  lang: "ko" | "en" | "ja" = "ko"
): StatusResult {
  const place = resolvePlace(signals, now, config);
  const { rawLevel, isSleeping } = computeRawStatus(signals, now, config, schedule);
  const { confirmedStatus, statusLevel, updatedSignals } = promoteStatus(
    rawLevel,
    { ...signals, currentPlace: place },
    now,
    config
  );

  updatedSignals.currentPlace = place;

  const message = getStatusMessage(confirmedStatus, place, isSleeping, lang);

  return {
    level: confirmedStatus,
    statusLevel,
    place,
    message,
    isSleeping,
    lastActiveAt: signals.lastActiveAt,
    updatedSignals,
  };
}

export function createInitialSignals(lastActiveAt?: number): ParentSignals {
  const now = Date.now();
  return {
    lastActiveAt: lastActiveAt || now,
    lastLocationChangedAt: lastActiveAt || now,
    currentPlace: "UNKNOWN",
    lastConfirmedStatus: "SAFE",
    lastConfirmedStatusAt: now,
  };
}

export function updateSignalWithActivity(signals: ParentSignals, activityTime: number): ParentSignals {
  return {
    ...signals,
    lastActiveAt: Math.max(signals.lastActiveAt, activityTime),
  };
}

export function updateSignalWithLocation(
  signals: ParentSignals,
  newPlace: PlaceType,
  locationTime: number
): ParentSignals {
  if (newPlace === signals.currentPlace) {
    return {
      ...signals,
      lastLocationChangedAt: locationTime,
    };
  }

  if (newPlace === signals.candidatePlace) {
    return {
      ...signals,
      lastLocationChangedAt: locationTime,
    };
  }

  return {
    ...signals,
    candidatePlace: newPlace,
    candidatePlaceStartedAt: locationTime,
    lastLocationChangedAt: locationTime,
  };
}