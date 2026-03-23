export type StatusLevel =
  | "SAFE"
  | "CHECK_CANDIDATE"
  | "CHECK"
  | "DANGER_CANDIDATE"
  | "DANGER";

export type ConfirmedStatus = "SAFE" | "CHECK" | "DANGER";

export type PlaceType =
  | "HOME"
  | "SENIOR_CENTER"
  | "HOSPITAL"
  | "FRIEND_HOME"
  | "MOVING"
  | "UNKNOWN";

export interface ParentSignals {
  lastActiveAt: number;
  lastLocationChangedAt: number;
  currentPlace: PlaceType;
  candidatePlace?: PlaceType;
  candidatePlaceStartedAt?: number;
  lastConfirmedStatus: ConfirmedStatus;
  lastConfirmedStatusAt: number;
  candidateStatus?: StatusLevel;
  candidateStatusStartedAt?: number;
}

export interface ScheduleConfig {
  wakeHour: number;
  wakeMinute: number;
  sleepHour: number;
  sleepMinute: number;
}

export interface StatusConfig {
  activityUiDelayMs: number;
  placeEnterDelayMs: number;
  placeExitDelayMs: number;
  movingDelayMs: number;
  farPlaceConfirmDelayMs: number;
  checkNeedDelayMs: number;
  dangerDelayMs: number;
  sleepApplyDelayMs: number;
  wakeCheckDelayMs: number;
  activeWindowMs: number;
}

export interface StatusResult {
  level: ConfirmedStatus;
  statusLevel: StatusLevel;
  place: PlaceType;
  message: string;
  isSleeping: boolean;
  lastActiveAt: number;
  updatedSignals: ParentSignals;
}

export interface ParentStatusInfo {
  parentName: string;
  deviceId: string;
  result: StatusResult;
  photo?: string;
}