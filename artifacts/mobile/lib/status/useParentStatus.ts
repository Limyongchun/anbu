import { useState, useCallback, useRef, useMemo } from "react";
import type {
  ParentSignals,
  ConfirmedStatus,
  PlaceType,
  StatusResult,
  ScheduleConfig,
  ParentStatusInfo,
} from "./statusTypes";
import { DEFAULT_STATUS_CONFIG, DEFAULT_SCHEDULE } from "./statusConfig";
import { computeParentStatus, createInitialSignals, updateSignalWithActivity } from "./statusEngine";
import { getStatusColor, getStatusLabel } from "./statusMessages";

interface LocationData {
  deviceId: string;
  memberName: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
  role?: string;
  address?: string;
}

interface ParentActivityLog {
  id: number;
  deviceId: string;
  parentName: string;
  activityType: string;
  createdAt: string;
}

interface ParentInfo {
  name: string;
  photo: string | null;
  loc: LocationData | null;
  deviceId: string;
}

export function useParentStatusEngine(lang: "ko" | "en" | "ja" = "ko") {
  const signalsRef = useRef<Record<string, ParentSignals>>({});

  const computeAll = useCallback(
    (
      parentInfos: ParentInfo[],
      parentActivities: ParentActivityLog[],
      schedule?: ScheduleConfig
    ): ParentStatusInfo[] => {
      const now = Date.now();
      const sched = schedule || DEFAULT_SCHEDULE;

      return parentInfos.map((p) => {
        const key = p.deviceId || p.name;
        if (!signalsRef.current[key]) {
          const lastLocTime = p.loc
            ? new Date(p.loc.updatedAt).getTime()
            : now;
          signalsRef.current[key] = createInitialSignals(lastLocTime);
        }

        let signals = signalsRef.current[key];

        const myActs = parentActivities.filter(
          (a) => a.parentName === p.name || a.deviceId === p.deviceId
        );
        if (myActs.length > 0) {
          const latestActTime = Math.max(
            ...myActs.map((a) => new Date(a.createdAt).getTime())
          );
          signals = updateSignalWithActivity(signals, latestActTime);
        }

        if (p.loc) {
          const locTime = new Date(p.loc.updatedAt).getTime();
          if (locTime > signals.lastActiveAt) {
            signals = updateSignalWithActivity(signals, locTime);
          }
          signals = { ...signals, lastLocationChangedAt: locTime };
        }

        const result = computeParentStatus(signals, now, DEFAULT_STATUS_CONFIG, sched, lang);

        signalsRef.current[key] = result.updatedSignals;

        return {
          parentName: p.name,
          deviceId: p.deviceId,
          result,
          photo: p.photo || undefined,
        };
      });
    },
    [lang]
  );

  const getStatusColorForLevel = useCallback((level: ConfirmedStatus) => {
    return getStatusColor(level);
  }, []);

  const getStatusLabelForLevel = useCallback(
    (level: ConfirmedStatus) => {
      return getStatusLabel(level, lang);
    },
    [lang]
  );

  return {
    computeAll,
    getStatusColor: getStatusColorForLevel,
    getStatusLabel: getStatusLabelForLevel,
  };
}