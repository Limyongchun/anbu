import AsyncStorage from "@react-native-async-storage/async-storage";
import { ParentPlace, DEFAULT_RADIUS_METERS } from "./types";

const STORAGE_KEY = "anbu_parent_places";

let cache: ParentPlace[] | null = null;

async function readAll(): Promise<ParentPlace[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

async function persist(places: ParentPlace[]): Promise<void> {
  cache = places;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places));
}

export async function getPlacesForParent(parentId: string): Promise<ParentPlace[]> {
  const all = await readAll();
  return all.filter((p) => p.parentId === parentId);
}

export async function getAllPlaces(): Promise<ParentPlace[]> {
  return readAll();
}

export async function addPlace(
  data: Omit<ParentPlace, "id" | "createdAt" | "updatedAt" | "radius"> & { radius?: number },
): Promise<ParentPlace> {
  const all = await readAll();
  const now = new Date().toISOString();
  const place: ParentPlace = {
    id: `place_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    parentId: data.parentId,
    name: data.name,
    preset: data.preset,
    latitude: data.latitude,
    longitude: data.longitude,
    radius: data.radius ?? DEFAULT_RADIUS_METERS,
    createdAt: now,
    updatedAt: now,
  };
  all.push(place);
  await persist(all);
  return place;
}

export async function updatePlace(
  id: string,
  updates: Partial<Pick<ParentPlace, "name" | "preset" | "latitude" | "longitude" | "radius">>,
): Promise<ParentPlace | null> {
  const all = await readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated: ParentPlace = {
    ...all[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  await persist(all);
  return updated;
}

export async function removePlace(id: string): Promise<boolean> {
  const all = await readAll();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  await persist(filtered);
  return true;
}

export async function removePlacesForParent(parentId: string): Promise<number> {
  const all = await readAll();
  const filtered = all.filter((p) => p.parentId !== parentId);
  const removed = all.length - filtered.length;
  if (removed > 0) await persist(filtered);
  return removed;
}

export function clearCache(): void {
  cache = null;
}
