export type ParentStatus = "SAFE" | "CHECK" | "DANGER" | "CRITICAL" | "SIGNAL_LOST";

export type StatusReason =
  | "normal"
  | "inactive"
  | "wake_delay"
  | "signal_lost"
  | "sleeping"
  | "battery_low";

export interface EvaluateInput {
  now: number | string | Date;
  lastAppActivityAt: number | string | Date | null | undefined;
  lastLocationAt: number | string | Date | null | undefined;
  lastHeartbeatAt: number | string | Date | null | undefined;
  batteryLevel: number | null | undefined;
  isOnline: boolean | null | undefined;
  sleepStart: number;
  sleepEnd: number;
  expectedWakeTime: number;
}

export interface EvaluateResult {
  status: ParentStatus;
  reason: StatusReason;
  inactiveMinutes: number;
  signalLostMinutes: number;
  wakeDelayMinutes: number;
  isSleeping: boolean;
  summaryText: string;
}
