import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

let TaskManager: any = null;
try { TaskManager = require("expo-task-manager"); } catch {}

const TASK_NAME = "ANBU_BACKGROUND_LOCATION";
const STORAGE_KEY_FAMILY_CODE = "bg_loc_familyCode";
const STORAGE_KEY_DEVICE_ID = "bg_loc_deviceId";
const STORAGE_KEY_MEMBER_NAME = "bg_loc_memberName";
const STORAGE_KEY_LANG = "bg_loc_lang";

const BG_STRINGS: Record<string, { notifBody: string; locShared: string; locSharedBg: string }> = {
  ko: { notifBody: "위치를 공유하고 있습니다", locShared: "백그라운드 위치 공유", locSharedBg: "백그라운드 위치를 공유했습니다" },
  en: { notifBody: "Sharing location", locShared: "Background location shared", locSharedBg: "Background location shared" },
  ja: { notifBody: "位置情報を共有しています", locShared: "バックグラウンド位置共有", locSharedBg: "バックグラウンド位置情報を共有しました" },
};

const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

async function uploadLocationInBackground(
  latitude: number,
  longitude: number,
  accuracy: number | null,
  heading: number | null = null,
  speed: number | null = null
) {
  try {
    const [familyCode, deviceId, memberName, lang] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_FAMILY_CODE),
      AsyncStorage.getItem(STORAGE_KEY_DEVICE_ID),
      AsyncStorage.getItem(STORAGE_KEY_MEMBER_NAME),
      AsyncStorage.getItem(STORAGE_KEY_LANG),
    ]);
    if (!familyCode || !deviceId || !memberName) return;
    const s = BG_STRINGS[lang || "ko"] || BG_STRINGS.ko;

    let address = "";
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo.length > 0) {
        const g = geo[0];
        address = [g.city || g.district, g.street].filter(Boolean).join(" ");
      }
    } catch {}

    await fetch(`${BASE}/family/${familyCode}/location`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        memberName,
        latitude,
        longitude,
        address,
        accuracy: accuracy ?? undefined,
        heading: heading != null && heading >= 0 ? heading : undefined,
        speed: speed != null && speed >= 0 ? speed : undefined,
        isSharing: true,
      }),
    });

    const detail = address
      ? `${s.locShared} · ${address}`
      : s.locSharedBg;
    await fetch(`${BASE}/family/${familyCode}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        parentName: memberName,
        activityType: "location",
        detail,
      }),
    }).catch(() => {});
  } catch {}
}

interface LocationTaskBody {
  data: { locations: Location.LocationObject[] } | null;
  error: any;
}

if (Platform.OS !== "web" && TaskManager?.isTaskDefined && !TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async ({ data, error }: LocationTaskBody) => {
    if (error) return;
    if (data && data.locations && data.locations.length > 0) {
      const loc = data.locations[data.locations.length - 1];
      await uploadLocationInBackground(
        loc.coords.latitude,
        loc.coords.longitude,
        loc.coords.accuracy,
        loc.coords.heading,
        loc.coords.speed
      );
    }
  });
}

export async function saveBackgroundLocationConfig(
  familyCode: string,
  deviceId: string,
  memberName: string,
  lang?: string
) {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEY_FAMILY_CODE, familyCode),
    AsyncStorage.setItem(STORAGE_KEY_DEVICE_ID, deviceId),
    AsyncStorage.setItem(STORAGE_KEY_MEMBER_NAME, memberName),
    AsyncStorage.setItem(STORAGE_KEY_LANG, lang || "ko"),
  ]);
}

export async function clearBackgroundLocationConfig() {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY_FAMILY_CODE),
    AsyncStorage.removeItem(STORAGE_KEY_DEVICE_ID),
    AsyncStorage.removeItem(STORAGE_KEY_MEMBER_NAME),
    AsyncStorage.removeItem(STORAGE_KEY_LANG),
  ]);
}

export async function startBackgroundLocationTracking(): Promise<boolean> {
  if (Platform.OS === "web" || !TaskManager) return false;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (isRegistered) return true;

  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== "granted") return false;

  const lang = await AsyncStorage.getItem(STORAGE_KEY_LANG);
  const s = BG_STRINGS[lang || "ko"] || BG_STRINGS.ko;

  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5 * 60 * 1000,
    distanceInterval: 50,
    deferredUpdatesInterval: 5 * 60 * 1000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "A N B U",
      notificationBody: s.notifBody,
      notificationColor: "#d4f200",
    },
  });

  return true;
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  if (Platform.OS === "web" || !TaskManager) return;
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
  await clearBackgroundLocationConfig();
}

export async function isBackgroundLocationRunning(): Promise<boolean> {
  if (Platform.OS === "web" || !TaskManager) return false;
  return TaskManager.isTaskRegisteredAsync(TASK_NAME);
}

export { TASK_NAME };
