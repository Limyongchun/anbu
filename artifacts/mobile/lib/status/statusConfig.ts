import type { StatusConfig, ScheduleConfig } from "./statusTypes";

export const DEFAULT_STATUS_CONFIG: StatusConfig = {
  activityUiDelayMs: 2 * 60 * 1000,
  placeEnterDelayMs: 3 * 60 * 1000,
  placeExitDelayMs: 3 * 60 * 1000,
  movingDelayMs: 2 * 60 * 1000,
  farPlaceConfirmDelayMs: 5 * 60 * 1000,
  checkNeedDelayMs: 20 * 60 * 1000,
  dangerDelayMs: 40 * 60 * 1000,
  sleepApplyDelayMs: 30 * 60 * 1000,
  wakeCheckDelayMs: 60 * 60 * 1000,
  activeWindowMs: 2 * 60 * 60 * 1000,
};

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  wakeHour: 7,
  wakeMinute: 0,
  sleepHour: 22,
  sleepMinute: 0,
};

export const INACTIVITY_THRESHOLD_MS = 60 * 60 * 1000;

export const KNOWN_PLACES = ["HOME", "SENIOR_CENTER", "HOSPITAL", "FRIEND_HOME"] as const;