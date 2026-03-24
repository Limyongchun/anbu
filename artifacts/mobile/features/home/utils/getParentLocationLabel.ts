import type { ParentPlace } from "@/features/places/types";
import { matchPlaceByLocation } from "@/features/places/matchPlace";
import { getPlaceDisplayName } from "@/features/places/utils";

interface LocationLabelConfig {
  lang: "ko" | "en" | "ja";
  template: string;
}

const AT_TEMPLATES: Record<string, string> = {
  ko: "{place}에 계세요",
  en: "At {place}",
  ja: "{place}にいらっしゃいます",
};

export function getParentLocationLabel(
  currentLocation: { latitude: number; longitude: number } | null,
  savedPlaces: ParentPlace[],
  fallbackStatusText: string,
  lang: "ko" | "en" | "ja" = "ko",
): string {
  if (!currentLocation) return fallbackStatusText;

  const matched = matchPlaceByLocation(currentLocation, savedPlaces);
  if (!matched) return fallbackStatusText;

  const placeName = getPlaceDisplayName(matched, lang);
  const template = AT_TEMPLATES[lang] || AT_TEMPLATES.ko;
  return template.replace("{place}", placeName);
}
