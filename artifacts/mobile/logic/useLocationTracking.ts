import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";

import { api } from "@/lib/api";
import {
  saveBackgroundLocationConfig,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from "@/lib/backgroundLocation";

interface UseLocationTrackingOptions {
  familyCode: string | null;
  deviceId: string | null;
  myName: string | null;
  lang: string;
  logActivity: (type: string, detail?: string) => void;
  locSharedLabel: string;
}

export function useLocationTracking({
  familyCode,
  deviceId,
  myName,
  lang,
  logActivity,
  locSharedLabel,
}: UseLocationTrackingOptions) {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [isSharing, setIsSharing] = useState(true);
  const [currentLoc, setCurrentLoc] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState("");
  const [locUploading, setLocUploading] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocLogRef = useRef(0);

  const uploadLoc = useCallback(
    async (loc: Location.LocationObject, sharing: boolean) => {
      if (!familyCode || !myName || !deviceId) return;
      setLocUploading(true);
      try {
        let addr = "";
        try {
          const geo = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (geo.length > 0) {
            const g = geo[0];
            addr = [g.city || g.district, g.street].filter(Boolean).join(" ");
          }
        } catch {}
        setAddress(addr);
        await api.updateLocation(familyCode, {
          deviceId,
          memberName: myName,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          address: addr,
          accuracy: loc.coords.accuracy ?? undefined,
          isSharing: sharing,
        });
        const now = Date.now();
        if (sharing && addr && now - lastLocLogRef.current > 300000) {
          lastLocLogRef.current = now;
          logActivity("location", `${locSharedLabel} · ${addr}`);
        }
      } catch {
      } finally {
        setLocUploading(false);
      }
    },
    [familyCode, myName, deviceId, logActivity, locSharedLabel],
  );

  const startWatch = useCallback(async () => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    try {
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 20000, distanceInterval: 30 },
        (loc) => {
          setCurrentLoc(loc);
          uploadLoc(loc, true);
        },
      );
    } catch {}
  }, [uploadLoc]);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission().catch(() => {});
      return;
    }
    if (isSharing) {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((l) => {
          setCurrentLoc(l);
          uploadLoc(l, true);
        })
        .catch(() => {});
      startWatch().catch(() => {});
    } else if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    return () => {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
    };
  }, [permission?.granted, isSharing]);

  useEffect(() => {
    if (Platform.OS === "web" || !familyCode || !deviceId || !myName) return;
    if (!permission?.granted) return;
    if (isSharing) {
      (async () => {
        try {
          await saveBackgroundLocationConfig(familyCode, deviceId, myName, lang);
          await startBackgroundLocationTracking();
        } catch {}
      })();
    } else {
      stopBackgroundLocationTracking().catch(() => {});
    }
  }, [permission?.granted, isSharing, familyCode, deviceId, myName]);

  const toggleShare = useCallback(async () => {
    const next = !isSharing;
    setIsSharing(next);
    if (currentLoc) await uploadLoc(currentLoc, next);
  }, [isSharing, currentLoc, uploadLoc]);

  return {
    permission,
    requestPermission,
    isSharing,
    address,
    locUploading,
    toggleShare,
  };
}
