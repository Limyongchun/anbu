import { ParentPlace } from "./types";
import { isInsidePlace, getPlaceDisplayName } from "./utils";
import { getDistanceMeters } from "./distance";

export interface PlaceMatch {
  place: ParentPlace;
  displayName: string;
  distance: number;
}

export function matchParentPlace(
  lat: number,
  lng: number,
  places: ParentPlace[],
  lang: "ko" | "en" | "ja",
): PlaceMatch | null {
  const match = matchPlaceByLocation({ latitude: lat, longitude: lng }, places);
  if (!match) return null;
  return {
    place: match,
    displayName: getPlaceDisplayName(match, lang),
    distance: getDistanceMeters(lat, lng, match.latitude, match.longitude),
  };
}

export function matchPlaceByLocation(
  currentLocation: { latitude: number; longitude: number },
  savedPlaces: ParentPlace[],
): ParentPlace | null {
  let best: { place: ParentPlace; dist: number } | null = null;

  for (const p of savedPlaces) {
    const dist = getDistanceMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      p.latitude,
      p.longitude,
    );
    if (dist > p.radius) continue;
    if (!best || dist < best.dist) {
      best = { place: p, dist };
    }
  }

  return best?.place ?? null;
}
