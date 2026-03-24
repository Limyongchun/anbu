export const PLACE_PRESETS = [
  "home",
  "school",
  "daycare",
  "kindergarten",
  "hospital",
  "seniorCenter",
  "friendHouse",
  "other",
] as const;

export type PlacePreset = (typeof PLACE_PRESETS)[number];

export const PLACE_PRESET_LABELS: Record<PlacePreset, { ko: string; en: string; ja: string }> = {
  home:         { ko: "집",       en: "Home",          ja: "自宅" },
  school:       { ko: "학교",     en: "School",        ja: "学校" },
  daycare:      { ko: "어린이집", en: "Daycare",       ja: "保育園" },
  kindergarten: { ko: "유치원",   en: "Kindergarten",  ja: "幼稚園" },
  hospital:     { ko: "병원",     en: "Hospital",      ja: "病院" },
  seniorCenter: { ko: "노인정",   en: "Senior Center", ja: "老人会館" },
  friendHouse:  { ko: "친구집",   en: "Friend's",      ja: "友人宅" },
  other:        { ko: "기타",     en: "Other",         ja: "その他" },
};

export const DEFAULT_RADIUS_METERS = 80;

export interface ParentPlace {
  id: string;
  parentId: string;
  name: string;
  preset: PlacePreset | null;
  latitude: number;
  longitude: number;
  radius: number;
  createdAt: string;
  updatedAt: string;
}
