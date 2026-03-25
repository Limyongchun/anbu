import { getApiBase } from "@/lib/api";
import type { ParentStatus, StatusReason } from "./types";

interface StatusLogEntry {
  parentId: string;
  parentName: string;
  familyCode: string;
  previousStatus: ParentStatus;
  nextStatus: ParentStatus;
  reason: StatusReason;
  inactiveMinutes: number;
  signalLostMinutes: number;
  wakeDelayMinutes: number;
  lastAppActivityAt: number | null;
  lastLocationAt: number | null;
  lastHeartbeatAt: number | null;
}

const _cache: Record<string, { status: ParentStatus; savedAt: number }> = {};
const DEDUP_MS = 60_000;

export function saveParentStatusLog(entry: StatusLogEntry): void {
  const key = entry.parentId || entry.parentName;
  const now = Date.now();

  const cached = _cache[key];
  if (cached && cached.status === entry.nextStatus && now - cached.savedAt < DEDUP_MS) {
    return;
  }

  _cache[key] = { status: entry.nextStatus, savedAt: now };

  const base = getApiBase();
  const url = `${base}/family/${encodeURIComponent(entry.familyCode)}/status-log`;

  const reasonDetail = JSON.stringify({
    reason: entry.reason,
    inactiveMinutes: entry.inactiveMinutes,
    signalLostMinutes: entry.signalLostMinutes,
    wakeDelayMinutes: entry.wakeDelayMinutes,
    lastAppActivityAt: entry.lastAppActivityAt,
    lastLocationAt: entry.lastLocationAt,
    lastHeartbeatAt: entry.lastHeartbeatAt,
  });

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId: entry.parentId,
      parentName: entry.parentName,
      previousStatus: entry.previousStatus,
      newStatus: entry.nextStatus,
      reason: reasonDetail,
    }),
  }).catch((err) => {
    console.warn("[StatusLog] save failed:", err?.message ?? err);
  });
}
