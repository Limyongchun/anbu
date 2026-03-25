import React, { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { evaluateParentStatus } from "./evaluateParentStatus";
import type { EvaluateInput, EvaluateResult, ParentStatus } from "./types";
import { NIGHT_START_HOUR, DAY_START_HOUR } from "./constants";

const STATUS_COLORS: Record<ParentStatus, string> = {
  SAFE: "#22C55E",
  CHECK: "#F59E0B",
  DANGER: "#EF4444",
  CRITICAL: "#DC2626",
  SIGNAL_LOST: "#6B7280",
};

interface MockPreset {
  label: string;
  getInput: (now: number) => Partial<EvaluateInput>;
}

const H = 3600000;
const M = 60000;

const MOCK_PRESETS: MockPreset[] = [
  {
    label: "정상",
    getInput: (now) => ({
      lastAppActivityAt: now - 10 * M,
      lastLocationAt: now - 5 * M,
      lastHeartbeatAt: now - 2 * M,
      batteryLevel: 85,
      isOnline: true,
    }),
  },
  {
    label: "4시간 무활동",
    getInput: (now) => ({
      lastAppActivityAt: now - 4 * H,
      lastLocationAt: now - 1 * H,
      lastHeartbeatAt: now - 30 * M,
      batteryLevel: 60,
      isOnline: true,
    }),
  },
  {
    label: "7시간 무활동",
    getInput: (now) => ({
      lastAppActivityAt: now - 7 * H,
      lastLocationAt: now - 2 * H,
      lastHeartbeatAt: now - 1 * H,
      batteryLevel: 35,
      isOnline: true,
    }),
  },
  {
    label: "13시간 무활동",
    getInput: (now) => ({
      lastAppActivityAt: now - 13 * H,
      lastLocationAt: now - 1 * H,
      lastHeartbeatAt: now - 30 * M,
      batteryLevel: 15,
      isOnline: true,
    }),
  },
  {
    label: "신호 끊김",
    getInput: (now) => ({
      lastAppActivityAt: now - 3 * H,
      lastLocationAt: now - 13 * H,
      lastHeartbeatAt: now - 13 * H,
      batteryLevel: 5,
      isOnline: false,
    }),
  },
];

function fmtMins(ts: number | null): string {
  if (ts == null) return "—";
  const m = Math.floor((Date.now() - ts) / 60000);
  return `${m}m`;
}

interface StatusDebugCardProps {
  parentName: string;
  computedStatus: string;
  confirmedStatus: string;
  finalStatus: string;
  lastAppActivityAt: number | string | null | undefined;
  lastLocationAt: number | string | null | undefined;
  lastHeartbeatAt: number | string | null | undefined;
  batteryLevel: number | null | undefined;
  isOnline: boolean | null | undefined;
  pendingStatus?: string | null;
  pendingSince?: number | null;
}

export function StatusDebugCard({
  parentName,
  computedStatus,
  confirmedStatus,
  finalStatus,
  lastAppActivityAt,
  lastLocationAt,
  lastHeartbeatAt,
  batteryLevel,
  isOnline,
  pendingStatus: pendingStatusProp,
  pendingSince: pendingSinceProp,
}: StatusDebugCardProps) {
  const [mockOverride, setMockOverride] = useState<Partial<EvaluateInput> | null>(null);
  const [expanded, setExpanded] = useState(false);

  const newResult = useMemo<EvaluateResult>(() => {
    const now = Date.now();
    const input: EvaluateInput = {
      now,
      lastAppActivityAt: mockOverride?.lastAppActivityAt ?? lastAppActivityAt ?? null,
      lastLocationAt: mockOverride?.lastLocationAt ?? lastLocationAt ?? null,
      lastHeartbeatAt: mockOverride?.lastHeartbeatAt ?? lastHeartbeatAt ?? null,
      batteryLevel: mockOverride?.batteryLevel ?? batteryLevel ?? null,
      isOnline: mockOverride?.isOnline ?? isOnline ?? null,
      sleepStart: NIGHT_START_HOUR,
      sleepEnd: DAY_START_HOUR,
      expectedWakeTime: DAY_START_HOUR,
    };
    return evaluateParentStatus(input);
  }, [lastAppActivityAt, lastLocationAt, lastHeartbeatAt, batteryLevel, isOnline, mockOverride]);

  const finalColor = STATUS_COLORS[finalStatus as ParentStatus] ?? "#6B7280";

  const appTs = typeof lastAppActivityAt === "number" ? lastAppActivityAt : typeof lastAppActivityAt === "string" ? new Date(lastAppActivityAt).getTime() : null;
  const hbTs = typeof lastHeartbeatAt === "number" ? lastHeartbeatAt : typeof lastHeartbeatAt === "string" ? new Date(lastHeartbeatAt).getTime() : null;

  if (!expanded) {
    return (
      <Pressable style={s.collapsed} onPress={() => setExpanded(true)}>
        <View style={s.collapsedRow}>
          <Text style={s.debugLabel}>DEBUG</Text>
          <Text style={s.parentNameSmall}>{parentName}</Text>
          <View style={[s.dot, { backgroundColor: finalColor }]} />
          <Text style={[s.statusSmall, { color: finalColor }]}>
            {finalStatus}
          </Text>
          {mockOverride && <Text style={s.mockBadge}>MOCK</Text>}
        </View>
        <Text style={s.collapsedDetail}>
          computed={computedStatus} confirmed={confirmedStatus} app={fmtMins(appTs)} hb={fmtMins(hbTs)} online={String(isOnline ?? false)}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={s.card}>
      <Pressable style={s.headerRow} onPress={() => setExpanded(false)}>
        <Text style={s.debugLabel}>STATUS DEBUG — {parentName}</Text>
        <Text style={s.closeBtn}>▲</Text>
      </Pressable>

      <View style={s.compareRow}>
        <View style={s.compareBox}>
          <Text style={s.compareTitle}>Computed</Text>
          <Text style={[s.compareValue, { color: STATUS_COLORS[computedStatus as ParentStatus] ?? "#374151" }]}>
            {computedStatus}
          </Text>
        </View>
        <Text style={s.arrow}>→</Text>
        <View style={s.compareBox}>
          <Text style={s.compareTitle}>Confirmed</Text>
          <Text style={[s.compareValue, { color: STATUS_COLORS[confirmedStatus as ParentStatus] ?? "#374151" }]}>
            {confirmedStatus}
          </Text>
        </View>
        <Text style={s.arrow}>→</Text>
        <View style={s.compareBox}>
          <Text style={s.compareTitle}>Final</Text>
          <Text style={[s.compareValue, { color: finalColor }]}>
            {finalStatus}
          </Text>
        </View>
      </View>

      <View style={s.detailsBox}>
        <DetailRow label="computed" value={computedStatus} />
        <DetailRow label="confirmed" value={confirmedStatus} />
        <DetailRow label="final" value={finalStatus} />
        <DetailRow label="app" value={fmtMins(appTs)} />
        <DetailRow label="heartbeat" value={fmtMins(hbTs)} />
        <DetailRow label="online" value={String(isOnline ?? false)} />
        <DetailRow label="Pending" value={pendingStatusProp ?? "—"} />
        <DetailRow label="Pending Since" value={pendingSinceProp ? `${Math.floor((Date.now() - pendingSinceProp) / 60000)}m ago` : "—"} />
        <DetailRow label="Reason" value={newResult.reason} />
        <DetailRow label="Inactive" value={`${newResult.inactiveMinutes}m`} />
        <DetailRow label="Signal Lost" value={`${newResult.signalLostMinutes}m`} />
        <DetailRow label="Sleeping" value={newResult.isSleeping ? "true" : "false"} />
      </View>

      <Text style={s.mockTitle}>Mock 테스트</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mockRow}>
        <Pressable
          style={[s.mockBtn, !mockOverride && s.mockBtnActive]}
          onPress={() => setMockOverride(null)}
        >
          <Text style={[s.mockBtnText, !mockOverride && s.mockBtnTextActive]}>실데이터</Text>
        </Pressable>
        {MOCK_PRESETS.map((preset) => (
          <Pressable
            key={preset.label}
            style={[s.mockBtn, mockOverride === preset.getInput(0) && s.mockBtnActive]}
            onPress={() => setMockOverride(preset.getInput(Date.now()))}
          >
            <Text style={s.mockBtnText}>{preset.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  collapsed: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  collapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  collapsedDetail: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  debugLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#9CA3AF",
    letterSpacing: 1,
  },
  parentNameSmall: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#374151",
    flex: 1,
  },
  statusSmall: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  mockBadge: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#FFFFFF",
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  closeBtn: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 10,
  },
  compareBox: {
    alignItems: "center",
    minWidth: 70,
  },
  compareTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  compareValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#374151",
  },
  arrow: {
    fontSize: 16,
    color: "#D1D5DB",
  },
  detailsBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  detailLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#9CA3AF",
  },
  detailValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#374151",
  },
  mockTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 6,
  },
  mockRow: {
    flexDirection: "row",
  },
  mockBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.04)",
    marginRight: 6,
  },
  mockBtnActive: {
    backgroundColor: "#7A5454",
  },
  mockBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#374151",
  },
  mockBtnTextActive: {
    color: "#FFFFFF",
  },
});
