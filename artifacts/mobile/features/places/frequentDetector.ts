import AsyncStorage from "@react-native-async-storage/async-storage";
import { distanceBetween } from "./utils";
import type { ParentPlace } from "./types";

const STORAGE_KEY = "anbu_location_history";
const CLUSTER_RADIUS_M = 100;
const MIN_VISITS = 3;
const MAX_HISTORY = 200;
const DISMISSED_KEY = "anbu_suggestion_dismissed";

export interface LocationRecord {
  parentId: string;
  lat: number;
  lng: number;
  ts: number;
}

export interface PlaceSuggestion {
  parentId: string;
  lat: number;
  lng: number;
  visitCount: number;
}

export async function recordLocation(
  parentId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const history = await getHistory();
  history.push({ parentId, lat, lng, ts: Date.now() });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

async function getHistory(): Promise<LocationRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LocationRecord[];
  } catch {
    return [];
  }
}

export async function detectFrequentPlaces(
  parentId: string,
  existingPlaces: ParentPlace[],
): Promise<PlaceSuggestion | null> {
  const history = await getHistory();
  const records = history.filter((r) => r.parentId === parentId);
  if (records.length < MIN_VISITS) return null;

  const clusters: { lat: number; lng: number; count: number; sumLat: number; sumLng: number }[] = [];

  for (const rec of records) {
    let found = false;
    for (const c of clusters) {
      const centerLat = c.sumLat / c.count;
      const centerLng = c.sumLng / c.count;
      if (distanceBetween(rec.lat, rec.lng, centerLat, centerLng) <= CLUSTER_RADIUS_M) {
        c.sumLat += rec.lat;
        c.sumLng += rec.lng;
        c.count++;
        c.lat = c.sumLat / c.count;
        c.lng = c.sumLng / c.count;
        found = true;
        break;
      }
    }
    if (!found) {
      clusters.push({ lat: rec.lat, lng: rec.lng, count: 1, sumLat: rec.lat, sumLng: rec.lng });
    }
  }

  const candidates = clusters
    .filter((c) => c.count >= MIN_VISITS)
    .sort((a, b) => b.count - a.count);

  for (const c of candidates) {
    const alreadySaved = existingPlaces.some(
      (p) => distanceBetween(c.lat, c.lng, p.latitude, p.longitude) <= p.radius + 30,
    );
    if (alreadySaved) continue;

    const dismissed = await isDismissed(parentId, c.lat, c.lng);
    if (dismissed) continue;

    return { parentId, lat: c.lat, lng: c.lng, visitCount: c.count };
  }

  return null;
}

async function isDismissed(parentId: string, lat: number, lng: number): Promise<boolean> {
  const raw = await AsyncStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  try {
    const list = JSON.parse(raw) as Array<{ parentId: string; lat: number; lng: number; ts: number }>;
    const week = 7 * 24 * 60 * 60 * 1000;
    return list.some(
      (d) =>
        d.parentId === parentId &&
        distanceBetween(lat, lng, d.lat, d.lng) <= CLUSTER_RADIUS_M &&
        Date.now() - d.ts < week,
    );
  } catch {
    return false;
  }
}

export async function dismissSuggestion(parentId: string, lat: number, lng: number): Promise<void> {
  const raw = await AsyncStorage.getItem(DISMISSED_KEY);
  let list: Array<{ parentId: string; lat: number; lng: number; ts: number }> = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch {}
  }
  list.push({ parentId, lat, lng, ts: Date.now() });
  if (list.length > 50) list.splice(0, list.length - 50);
  await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
}
