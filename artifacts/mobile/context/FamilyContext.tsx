import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type FamilyRole = "parent" | "child";

export interface FamilyState {
  familyCode: string | null;
  deviceId: string;
  myName: string | null;
  myRole: FamilyRole | null;
  isConnected: boolean;
}

interface FamilyContextValue extends FamilyState {
  connect: (code: string, name: string, role: FamilyRole) => Promise<void>;
  disconnect: () => Promise<void>;
  loading: boolean;
}

const STORAGE_KEYS = {
  familyCode: "family_code",
  deviceId: "device_id",
  myName: "my_name",
  myRole: "my_role",
};

function generateDeviceId(): string {
  return `device_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FamilyState>({
    familyCode: null,
    deviceId: "",
    myName: null,
    myRole: null,
    isConnected: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [code, deviceId, name, role] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.familyCode),
          AsyncStorage.getItem(STORAGE_KEYS.deviceId),
          AsyncStorage.getItem(STORAGE_KEYS.myName),
          AsyncStorage.getItem(STORAGE_KEYS.myRole),
        ]);

        let effectiveDeviceId = deviceId;
        if (!effectiveDeviceId) {
          effectiveDeviceId = generateDeviceId();
          await AsyncStorage.setItem(STORAGE_KEYS.deviceId, effectiveDeviceId);
        }

        setState({
          familyCode: code,
          deviceId: effectiveDeviceId,
          myName: name,
          myRole: (role as FamilyRole) || null,
          isConnected: !!(code && name && role),
        });
      } catch (e) {
        console.error("Failed to load family state", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const connect = async (code: string, name: string, role: FamilyRole) => {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.familyCode, code),
      AsyncStorage.setItem(STORAGE_KEYS.myName, name),
      AsyncStorage.setItem(STORAGE_KEYS.myRole, role),
    ]);
    setState((prev) => ({
      ...prev,
      familyCode: code,
      myName: name,
      myRole: role,
      isConnected: true,
    }));
  };

  const disconnect = async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.familyCode),
      AsyncStorage.removeItem(STORAGE_KEYS.myName),
      AsyncStorage.removeItem(STORAGE_KEYS.myRole),
    ]);
    setState((prev) => ({
      ...prev,
      familyCode: null,
      myName: null,
      myRole: null,
      isConnected: false,
    }));
  };

  return (
    <FamilyContext.Provider value={{ ...state, connect, disconnect, loading }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamilyContext(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamilyContext must be used inside FamilyProvider");
  return ctx;
}
