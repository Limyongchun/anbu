import { PlacePreset, PLACE_PRESET_LABELS, PLACE_PRESETS, ParentPlace } from "./types";
import { getDistanceMeters } from "./distance";

export function getPresetLabel(preset: PlacePreset, lang: "ko" | "en" | "ja"): string {
  return PLACE_PRESET_LABELS[preset]?.[lang] ?? PLACE_PRESET_LABELS[preset]?.ko ?? preset;
}

export function getPresetOptions(lang: "ko" | "en" | "ja"): Array<{ value: PlacePreset; label: string }> {
  return PLACE_PRESETS.map((p) => ({ value: p, label: getPresetLabel(p, lang) }));
}

export { getDistanceMeters };

export function distanceBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return getDistanceMeters(lat1, lng1, lat2, lng2);
}

export function isInsidePlace(
  lat: number,
  lng: number,
  place: ParentPlace,
): boolean {
  return distanceBetween(lat, lng, place.latitude, place.longitude) <= place.radius;
}

export function findNearestPlace(
  lat: number,
  lng: number,
  places: ParentPlace[],
): { place: ParentPlace; distance: number } | null {
  if (places.length === 0) return null;
  let best: { place: ParentPlace; distance: number } | null = null;
  for (const p of places) {
    const d = distanceBetween(lat, lng, p.latitude, p.longitude);
    if (!best || d < best.distance) {
      best = { place: p, distance: d };
    }
  }
  return best;
}

export function getPlaceDisplayName(
  place: ParentPlace,
  lang: "ko" | "en" | "ja",
): string {
  if (place.preset && place.preset !== "other") {
    return getPresetLabel(place.preset, lang);
  }
  return place.name;
}
