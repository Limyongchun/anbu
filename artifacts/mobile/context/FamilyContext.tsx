import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type FamilyRole = "parent" | "child";
export type ChildRole = "master" | "sub" | null;

export interface FamilyState {
  familyCode: string | null;
  allFamilyCodes: string[];
  deviceId: string;
  myName: string | null;
  myRole: FamilyRole | null;
  childRole: ChildRole;
  isMasterChild: boolean;
  isConnected: boolean;
}

interface FamilyContextValue extends FamilyState {
  connect: (code: string, name: string, role: FamilyRole, childRole?: ChildRole) => Promise<void>;
  disconnect: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  addExtraFamily: (code: string) => Promise<void>;
  removeExtraFamily: (code: string) => Promise<void>;
  loading: boolean;
}

const STORAGE_KEYS = {
  familyCode:  "family_code",
  extraCodes:  "extra_family_codes",
  deviceId:    "device_id",
  myName:      "my_name",
  myRole:      "my_role",
  childRole:   "child_role",
};

function generateDeviceId(): string {
  return `device_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

function buildAllCodes(primary: string | null, extras: string[]): string[] {
  if (!primary) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of [primary, ...extras]) {
    if (!seen.has(c)) { seen.add(c); result.push(c); }
  }
  return result;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FamilyState>({
    familyCode:     null,
    allFamilyCodes: [],
    deviceId:       "",
    myName:         null,
    myRole:         null,
    childRole:      null,
    isMasterChild:  false,
    isConnected:    false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [code, extrasRaw, deviceId, name, role, cr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.familyCode),
          AsyncStorage.getItem(STORAGE_KEYS.extraCodes),
          AsyncStorage.getItem(STORAGE_KEYS.deviceId),
          AsyncStorage.getItem(STORAGE_KEYS.myName),
          AsyncStorage.getItem(STORAGE_KEYS.myRole),
          AsyncStorage.getItem(STORAGE_KEYS.childRole),
        ]);

        let effectiveDeviceId = deviceId;
        if (!effectiveDeviceId) {
          effectiveDeviceId = generateDeviceId();
          await AsyncStorage.setItem(STORAGE_KEYS.deviceId, effectiveDeviceId);
        }

        let extras: string[] = [];
        try { extras = extrasRaw ? JSON.parse(extrasRaw) : []; } catch {}

        let childRole = (cr as ChildRole) || null;

        if (!childRole && code && role === "child" && effectiveDeviceId) {
          try {
            const BASE = process.env.EXPO_PUBLIC_DOMAIN
              ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
              : "/api";
            const res = await fetch(`${BASE}/family/${code}`);
            if (res.ok) {
              const data = await res.json();
              const me = (data.members ?? []).find((m: { deviceId: string; childRole: string | null }) => m.deviceId === effectiveDeviceId);
              if (me?.childRole) {
                childRole = me.childRole as ChildRole;
                await AsyncStorage.setItem(STORAGE_KEYS.childRole, childRole as string);
              }
            }
          } catch {}
        }

        setState({
          familyCode:     code,
          allFamilyCodes: buildAllCodes(code, extras),
          deviceId:       effectiveDeviceId,
          myName:         name,
          myRole:         (role as FamilyRole) || null,
          childRole,
          isMasterChild:  childRole === "master",
          isConnected:    !!(code && name && role),
        });
      } catch (e) {
        console.error("Failed to load family state", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const connect = async (code: string, name: string, role: FamilyRole, childRole: ChildRole = null) => {
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
    await Promise.all(tasks);
    setState((prev) => ({
      ...prev,
      familyCode:     code,
      allFamilyCodes: buildAllCodes(code, []),
      myName:         name,
      myRole:         role,
      childRole,
      isMasterChild:  childRole === "master",
      isConnected:    true,
    }));
  };

  const addExtraFamily = async (code: string) => {
    const extrasRaw = await AsyncStorage.getItem(STORAGE_KEYS.extraCodes);
    let extras: string[] = [];
    try { extras = extrasRaw ? JSON.parse(extrasRaw) : []; } catch {}
    if (!extras.includes(code)) {
      extras = [...extras, code];
      await AsyncStorage.setItem(STORAGE_KEYS.extraCodes, JSON.stringify(extras));
    }
    setState((prev) => ({
      ...prev,
      allFamilyCodes: buildAllCodes(prev.familyCode, extras),
    }));
  };

  const removeExtraFamily = async (code: string) => {
    const extrasRaw = await AsyncStorage.getItem(STORAGE_KEYS.extraCodes);
    let extras: string[] = [];
    try { extras = extrasRaw ? JSON.parse(extrasRaw) : []; } catch {}
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
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.familyCode),
      AsyncStorage.removeItem(STORAGE_KEYS.extraCodes),
      AsyncStorage.removeItem(STORAGE_KEYS.myName),
      AsyncStorage.removeItem(STORAGE_KEYS.myRole),
      AsyncStorage.removeItem(STORAGE_KEYS.childRole),
    ]);
    setState((prev) => ({
      ...prev,
      familyCode:     null,
      allFamilyCodes: [],
      myName:         null,
      myRole:         null,
      childRole:      null,
      isMasterChild:  false,
      isConnected:    false,
    }));
  };

  return (
    <FamilyContext.Provider value={{ ...state, connect, disconnect, updateName, addExtraFamily, removeExtraFamily, loading }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamilyContext(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamilyContext must be used inside FamilyProvider");
  return ctx;
}
