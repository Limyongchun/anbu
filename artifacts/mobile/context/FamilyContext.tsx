import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useGuestMode } from "@/context/GuestModeContext";

export type FamilyRole = "parent" | "child";
export type ChildRole = "master" | "sub" | null;

export interface FamilyState {
  familyCode: string | null;
  allFamilyCodes: string[];
  deviceId: string;
  accountId: number | null;
  myName: string | null;
  myRole: FamilyRole | null;
  childRole: ChildRole;
  isMasterChild: boolean;
  isConnected: boolean;
}

export interface FamilyContextValue extends FamilyState {
  connect: (
    code: string,
    name: string,
    role: FamilyRole,
    childRole?: ChildRole,
    accountId?: number | null,
  ) => Promise<void>;
  disconnect: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  setAccountId: (id: number) => Promise<void>;
  addExtraFamily: (code: string) => Promise<void>;
  removeExtraFamily: (code: string) => Promise<void>;
  loading: boolean;
}

const STORAGE_KEYS = {
  familyCode: "family_code",
  extraCodes: "extra_family_codes",
  deviceId: "device_id",
  accountId: "account_id",
  myName: "my_name",
  myRole: "my_role",
  childRole: "child_role",
};

function generateDeviceId(): string {
  return `device_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

function buildAllCodes(primary: string | null, extras: string[]): string[] {
  if (!primary) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of [primary, ...extras]) {
    if (!seen.has(c)) {
      seen.add(c);
      result.push(c);
    }
  }
  return result;
}

export const FamilyContext = createContext<FamilyContextValue | null>(null);

const GUEST_FAMILY_CODE = "DEMO01";
const GUEST_DEVICE_ID = "guest_device_demo";

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { isGuestMode } = useGuestMode();
  const [state, setState] = useState<FamilyState>({
    familyCode: null,
    allFamilyCodes: [],
    deviceId: "",
    accountId: null,
    myName: null,
    myRole: null,
    childRole: null,
    isMasterChild: false,
    isConnected: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isGuestMode) {
      setState({
        familyCode: GUEST_FAMILY_CODE,
        allFamilyCodes: [GUEST_FAMILY_CODE],
        deviceId: GUEST_DEVICE_ID,
        accountId: null,
        myName: "체험자",
        myRole: "child",
        childRole: "master",
        isMasterChild: true,
        isConnected: true,
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    setState({
      familyCode: null,
      allFamilyCodes: [],
      deviceId: "",
      accountId: null,
      myName: null,
      myRole: null,
      childRole: null,
      isMasterChild: false,
      isConnected: false,
    });
  }, [isGuestMode]);

  useEffect(() => {
    if (isGuestMode) return;
    async function load() {
      try {
        const [code, extrasRaw, deviceId, acctIdRaw, name, role, cr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.familyCode),
          AsyncStorage.getItem(STORAGE_KEYS.extraCodes),
          AsyncStorage.getItem(STORAGE_KEYS.deviceId),
          AsyncStorage.getItem(STORAGE_KEYS.accountId),
          AsyncStorage.getItem(STORAGE_KEYS.myName),
          AsyncStorage.getItem(STORAGE_KEYS.myRole),
          AsyncStorage.getItem(STORAGE_KEYS.childRole),
        ]);
        const accountId = acctIdRaw ? Number(acctIdRaw) : null;

        let effectiveDeviceId = deviceId;
        if (!effectiveDeviceId) {
          effectiveDeviceId = generateDeviceId();
          await AsyncStorage.setItem(STORAGE_KEYS.deviceId, effectiveDeviceId);
        }

        let extras: string[] = [];
        try {
          extras = extrasRaw ? JSON.parse(extrasRaw) : [];
        } catch {}

        let childRole = (cr as ChildRole) || null;

        if (!childRole && code && role === "child" && effectiveDeviceId) {
          try {
            const BASE = process.env.EXPO_PUBLIC_DOMAIN
              ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
              : "/api";
            const res = await fetch(`${BASE}/family/${code}`);
            if (res.ok) {
              const data = await res.json();
              const me = (data.members ?? []).find(
                (m: { deviceId: string; childRole: string | null }) =>
                  m.deviceId === effectiveDeviceId,
              );
              if (me?.childRole) {
                childRole = me.childRole as ChildRole;
                await AsyncStorage.setItem(
                  STORAGE_KEYS.childRole,
                  childRole as string,
                );
              }
            }
          } catch {}
        }

        setState({
          familyCode: code,
          allFamilyCodes: buildAllCodes(code, extras),
          deviceId: effectiveDeviceId,
          accountId,
          myName: name,
          myRole: (role as FamilyRole) || null,
          childRole,
          isMasterChild: childRole === "master",
          isConnected: !!(code && name && role),
        });
      } catch (e) {
        console.error("Failed to load family state", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isGuestMode]);

  const connect = async (
    code: string,
    name: string,
    role: FamilyRole,
    childRole: ChildRole = null,
    acctId?: number | null,
  ) => {
    const tasks: Promise<void>[] = [
      AsyncStorage.setItem(STORAGE_KEYS.familyCode, code),
      AsyncStorage.setItem(STORAGE_KEYS.myName, name),
      AsyncStorage.setItem(STORAGE_KEYS.myRole, role),
    ];
    if (childRole) {
      tasks.push(AsyncStorage.setItem(STORAGE_KEYS.childRole, childRole));
    } else {
      tasks.push(AsyncStorage.removeItem(STORAGE_KEYS.childRole));
    }
    if (acctId) {
      tasks.push(AsyncStorage.setItem(STORAGE_KEYS.accountId, String(acctId)));
    }
    await Promise.all(tasks);
    setState((prev) => ({
      ...prev,
      familyCode: code,
      allFamilyCodes: buildAllCodes(code, []),
      accountId: acctId ?? prev.accountId,
      myName: name,
      myRole: role,
      childRole,
      isMasterChild: childRole === "master",
      isConnected: true,
    }));
  };

  const setAccountId = async (id: number) => {
    await AsyncStorage.setItem(STORAGE_KEYS.accountId, String(id));
    setState((prev) => ({ ...prev, accountId: id }));
  };

  const addExtraFamily = async (code: string) => {
    const extrasRaw = await AsyncStorage.getItem(STORAGE_KEYS.extraCodes);
    let extras: string[] = [];
    try {
      extras = extrasRaw ? JSON.parse(extrasRaw) : [];
    } catch {}
    if (!extras.includes(code)) {
      extras = [...extras, code];
      await AsyncStorage.setItem(
        STORAGE_KEYS.extraCodes,
        JSON.stringify(extras),
      );
    }
    setState((prev) => ({
      ...prev,
      allFamilyCodes: buildAllCodes(prev.familyCode, extras),
    }));
  };

  const removeExtraFamily = async (code: string) => {
    const extrasRaw = await AsyncStorage.getItem(STORAGE_KEYS.extraCodes);
    let extras: string[] = [];
    try {
      extras = extrasRaw ? JSON.parse(extrasRaw) : [];
    } catch {}
    extras = extras.filter((c) => c !== code);
    await AsyncStorage.setItem(STORAGE_KEYS.extraCodes, JSON.stringify(extras));
    setState((prev) => ({
      ...prev,
      allFamilyCodes: buildAllCodes(prev.familyCode, extras),
    }));
  };

  const updateName = async (name: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.myName, name);
    setState((prev) => ({ ...prev, myName: name }));
  };

  const disconnect = async () => {
    const { deviceId: did, allFamilyCodes: codes } = state;
    if (did && codes.length > 0) {
      await Promise.all(
        codes.map((code) => api.leaveFamily(code, did).catch(() => {})),
      );
    }
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.familyCode),
      AsyncStorage.removeItem(STORAGE_KEYS.extraCodes),
      AsyncStorage.removeItem(STORAGE_KEYS.myName),
      AsyncStorage.removeItem(STORAGE_KEYS.myRole),
      AsyncStorage.removeItem(STORAGE_KEYS.childRole),
    ]);
    setState((prev) => ({
      ...prev,
      familyCode: null,
      allFamilyCodes: [],
      myName: null,
      myRole: null,
      childRole: null,
      isMasterChild: false,
      isConnected: false,
    }));
  };

  return (
    <FamilyContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        updateName,
        setAccountId,
        addExtraFamily,
        removeExtraFamily,
        loading,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamilyContext(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx)
    throw new Error("useFamilyContext must be used inside FamilyProvider");
  return ctx;
}
