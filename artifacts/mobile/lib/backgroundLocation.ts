import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TASK_NAME = "ANBU_BACKGROUND_LOCATION";
const STORAGE_KEY_FAMILY_CODE = "bg_loc_familyCode";
const STORAGE_KEY_DEVICE_ID = "bg_loc_deviceId";
const STORAGE_KEY_MEMBER_NAME = "bg_loc_memberName";

const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

async function uploadLocationInBackground(
  latitude: number,
  longitude: number,
  accuracy: number | null
) {
  try {
    const [familyCode, deviceId, memberName] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_FAMILY_CODE),
      AsyncStorage.getItem(STORAGE_KEY_DEVICE_ID),
      AsyncStorage.getItem(STORAGE_KEY_MEMBER_NAME),
    ]);
    if (!familyCode || !deviceId || !memberName) return;

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
        isSharing: true,
      }),
    });

    const detail = address
      ? `백그라운드 위치 공유 · ${address}`
      : "백그라운드 위치를 공유했습니다";
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
  error: TaskManager.TaskManagerError | null;
}

TaskManager.defineTask(TASK_NAME, async ({ data, error }: LocationTaskBody) => {
  if (error) return;
  if (data && data.locations && data.locations.length > 0) {
    const loc = data.locations[data.locations.length - 1];
    await uploadLocationInBackground(
      loc.coords.latitude,
      loc.coords.longitude,
      loc.coords.accuracy
    );
  }
});

export async function saveBackgroundLocationConfig(
  familyCode: string,
  deviceId: string,
  memberName: string
) {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEY_FAMILY_CODE, familyCode),
    AsyncStorage.setItem(STORAGE_KEY_DEVICE_ID, deviceId),
    AsyncStorage.setItem(STORAGE_KEY_MEMBER_NAME, memberName),
  ]);
}

export async function clearBackgroundLocationConfig() {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY_FAMILY_CODE),
    AsyncStorage.removeItem(STORAGE_KEY_DEVICE_ID),
    AsyncStorage.removeItem(STORAGE_KEY_MEMBER_NAME),
  ]);
}

export async function startBackgroundLocationTracking(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (isRegistered) return true;

  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== "granted") return false;

  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5 * 60 * 1000,
    distanceInterval: 50,
    deferredUpdatesInterval: 5 * 60 * 1000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "A N B U",
      notificationBody: "위치를 공유하고 있습니다",
      notificationColor: "#d4f200",
    },
  });

  return true;
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  if (Platform.OS === "web") return;
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
  await clearBackgroundLocationConfig();
}

export async function isBackgroundLocationRunning(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  return TaskManager.isTaskRegisteredAsync(TASK_NAME);
}

export { TASK_NAME };
