import React from "react";
import { FamilyContext } from "@/context/FamilyContext";
import type { FamilyRole, ChildRole } from "@/context/FamilyContext";

const noop = async () => {};

const MOCK_CHILD_STATE = {
  familyCode: "DEMO01",
  allFamilyCodes: ["DEMO01"],
  deviceId: "preview_device_001",
  accountId: 999,
  myName: "미리보기",
  myRole: "child" as FamilyRole,
  childRole: "master" as ChildRole,
  isMasterChild: true,
  isConnected: true,
  connect: noop as any,
  disconnect: noop,
  updateName: noop,
  setAccountId: noop,
  addExtraFamily: noop,
  removeExtraFamily: noop,
  loading: false,
};

const MOCK_PARENT_STATE = {
  ...MOCK_CHILD_STATE,
  myRole: "parent" as FamilyRole,
  myName: "부모님",
  childRole: null as ChildRole,
  isMasterChild: false,
};

const MOCK_DISCONNECTED_STATE = {
  ...MOCK_CHILD_STATE,
  familyCode: null,
  allFamilyCodes: [],
  accountId: null,
  myName: null,
  myRole: null,
  childRole: null,
  isMasterChild: false,
  isConnected: false,
};

export function MockFamilyProvider({
  role = "child",
  disconnected = false,
  children,
}: {
  role?: "child" | "parent";
  disconnected?: boolean;
  children: React.ReactNode;
}) {
  const value = disconnected
    ? MOCK_DISCONNECTED_STATE
    : role === "parent"
      ? MOCK_PARENT_STATE
      : MOCK_CHILD_STATE;
  return (
    <FamilyContext.Provider value={value as any}>
      {children}
    </FamilyContext.Provider>
  );
}
