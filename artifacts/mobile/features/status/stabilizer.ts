import type { ParentStatus } from "./types";
import {
  CHECK_STABILIZE_MINUTES,
  DANGER_STABILIZE_MINUTES,
  CRITICAL_STABILIZE_MINUTES,
} from "./constants";

const SAFE_STABILIZE_MS = 5 * 60 * 1000;
const CHECK_STABILIZE_MS = CHECK_STABILIZE_MINUTES * 60 * 1000;
const DANGER_STABILIZE_MS = DANGER_STABILIZE_MINUTES * 60 * 1000;
const CRITICAL_STABILIZE_MS = CRITICAL_STABILIZE_MINUTES * 60 * 1000;

const SEVERITY: Record<ParentStatus, number> = {
  SAFE: 0,
  CHECK: 1,
  DANGER: 2,
  CRITICAL: 3,
  SIGNAL_LOST: 4,
};

function getStabilizeMs(status: ParentStatus): number {
  switch (status) {
    case "SAFE": return SAFE_STABILIZE_MS;
    case "CHECK": return CHECK_STABILIZE_MS;
    case "DANGER": return DANGER_STABILIZE_MS;
    case "CRITICAL": return CRITICAL_STABILIZE_MS;
    case "SIGNAL_LOST": return CHECK_STABILIZE_MS;
    default: return CHECK_STABILIZE_MS;
  }
}

export interface StabilizerState {
  confirmedStatus: ParentStatus;
  confirmedAt: number;
  pendingStatus: ParentStatus | null;
  pendingSince: number | null;
  pendingCount: number;
}

export function createStabilizerState(initialStatus?: ParentStatus): StabilizerState {
  return {
    confirmedStatus: initialStatus ?? "SAFE",
    confirmedAt: Date.now(),
    pendingStatus: null,
    pendingSince: null,
    pendingCount: 0,
  };
}

export function stabilize(
  state: StabilizerState,
  computedStatus: ParentStatus,
  now: number = Date.now()
): StabilizerState {
  if (computedStatus === state.confirmedStatus) {
    return {
      ...state,
      pendingStatus: null,
      pendingSince: null,
      pendingCount: 0,
    };
  }

  const computedSev = SEVERITY[computedStatus] ?? 0;
  const confirmedSev = SEVERITY[state.confirmedStatus] ?? 0;

  if (computedSev < confirmedSev) {
    return {
      confirmedStatus: computedStatus,
      confirmedAt: now,
      pendingStatus: null,
      pendingSince: null,
      pendingCount: 0,
    };
  }

  if (computedStatus !== state.pendingStatus) {
    return {
      ...state,
      pendingStatus: computedStatus,
      pendingSince: now,
      pendingCount: 1,
    };
  }

  const elapsed = now - (state.pendingSince ?? now);
  const requiredMs = getStabilizeMs(computedStatus);
  const requiredCount = computedStatus === "CRITICAL" ? 2 : 1;

  const newCount = state.pendingCount + 1;

  if (elapsed >= requiredMs && newCount >= requiredCount) {
    return {
      confirmedStatus: computedStatus,
      confirmedAt: now,
      pendingStatus: null,
      pendingSince: null,
      pendingCount: 0,
    };
  }

  return {
    ...state,
    pendingCount: newCount,
  };
}
