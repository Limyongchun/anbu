import { ParentPlace } from "./types";
import { isInsidePlace, getPlaceDisplayName } from "./utils";

export interface PlaceMatch {
  place: ParentPlace;
  displayName: string;
}

export function matchParentPlace(
  lat: number,
  lng: number,
  places: ParentPlace[],
  lang: "ko" | "en" | "ja",
): PlaceMatch | null {
  for (const p of places) {
    if (isInsidePlace(lat, lng, p)) {
      return { place: p, displayName: getPlaceDisplayName(p, lang) };
    }
  }
  return null;
}
