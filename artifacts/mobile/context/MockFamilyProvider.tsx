import React, { useCallback, useMemo, useState } from "react";
import { FamilyContext } from "@/context/FamilyContext";
import type { FamilyContextValue, FamilyRole, ChildRole } from "@/context/FamilyContext";

const MOCK_DEVICE_ID = "preview_device_" + Math.random().toString(36).slice(2, 10);

function makeMockState(role: "child" | "parent", connected: boolean): FamilyContextValue {
  return {
    familyCode: connected ? "DEMO01" : null,
    allFamilyCodes: connected ? ["DEMO01"] : [],
    deviceId: MOCK_DEVICE_ID,
    accountId: connected ? 999 : null,
    myName: connected ? (role === "child" ? "미리보기" : "부모님") : null,
    myRole: connected ? (role as FamilyRole) : null,
    childRole: connected && role === "child" ? ("master" as ChildRole) : null,
    isMasterChild: connected && role === "child",
    isConnected: connected,
    connect: async () => {},
    disconnect: async () => {},
    updateName: async () => {},
    setAccountId: async () => {},
    addExtraFamily: async () => {},
    removeExtraFamily: async () => {},
    loading: false,
  };
}

export function MockFamilyProvider({
  role = "child",
  disconnected = false,
  children,
}: {
  role?: "child" | "parent";
  disconnected?: boolean;
  children: React.ReactNode;
}) {
  const [override, setOverride] = useState<Partial<FamilyContextValue> | null>(null);
  const base = useMemo(() => makeMockState(role, !disconnected), [role, disconnected]);

  const connect = useCallback(
    async (code: string, name: string, r: FamilyRole, cr: ChildRole = null, acctId?: number | null) => {
      setOverride({
        familyCode: code,
        allFamilyCodes: [code],
        myName: name,
        myRole: r,
        childRole: cr,
        isMasterChild: cr === "master",
        isConnected: true,
        accountId: acctId ?? null,
      });
    },
    [],
  );

  const value = useMemo<FamilyContextValue>(() => ({
    ...base,
    ...override,
    connect,
  }), [base, override, connect]);

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}
