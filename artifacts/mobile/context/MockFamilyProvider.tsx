import React, { createContext, useContext } from "react";

const MOCK_STATE = {
  familyCode: "DEMO01",
  allFamilyCodes: ["DEMO01"],
  deviceId: "preview_device_001",
  accountId: 999,
  myName: "미리보기",
  myRole: "child" as const,
  childRole: "master" as const,
  isMasterChild: true,
  isConnected: true,
  connect: async () => {},
  disconnect: async () => {},
  updateName: async () => {},
  setAccountId: async () => {},
  addExtraFamily: async () => {},
  removeExtraFamily: async () => {},
  loading: false,
};

const MOCK_PARENT_STATE = {
  ...MOCK_STATE,
  myRole: "parent" as const,
  myName: "부모님",
  childRole: null,
  isMasterChild: false,
};

const MockFamilyCtx = createContext(MOCK_STATE);

export function MockFamilyProvider({
  role = "child",
  children,
}: {
  role?: "child" | "parent";
  children: React.ReactNode;
}) {
  const value = role === "parent" ? MOCK_PARENT_STATE : MOCK_STATE;
  return <MockFamilyCtx.Provider value={value as any}>{children}</MockFamilyCtx.Provider>;
}

export function useMockFamilyContext() {
  return useContext(MockFamilyCtx);
}
