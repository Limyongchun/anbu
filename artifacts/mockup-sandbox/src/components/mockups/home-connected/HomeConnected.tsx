import React from "react";
const logoAnbu = new URL("/assets/logo-anbu.png", import.meta.url).href;

const BRAND = "#7A5454";
const BRAND_DEEP = "#5A3A3A";
const SURFACE = "#FFFFFF";
const SURFACE_SOFT = "#F5EDED";
const TEXT_PRIMARY = "#2D1F1F";
const TEXT_SECONDARY = "#6B5050";
const TEXT_TERTIARY = "#9B8080";
const SUCCESS = "#34A853";
const WARNING = "#FBBF24";
const DANGER = "#E53935";
const INFO = "#4A90D9";
const BORDER = "rgba(0,0,0,0.10)";

const NAV_ITEMS = [
  { id: "home", label: "홈", active: true, icon: "home" },
  { id: "photo", label: "사진", active: false, icon: "images-outline" },
  { id: "map", label: "위치", active: false, icon: "location-outline" },
  { id: "alarm", label: "알림", active: false, icon: "notifications-outline" },
  { id: "settings", label: "설정", active: false, icon: "settings-outline" },
];

function IonSvg({ name, size = 21, color }: { name: string; size?: number; color: string }) {
  const svgs: Record<string, string> = {
    "home": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M261.56 101.28a8 8 0 00-11.06 0L66.4 277.15a8 8 0 00-2.47 5.79L63.9 448a32 32 0 0032 32H192a16 16 0 0016-16V328a8 8 0 018-8h80a8 8 0 018 8v136a16 16 0 0016 16h96.06a32 32 0 0032-32V282.94a8 8 0 00-2.47-5.79z" fill="${color}"/><path d="M490.91 244.15l-74.8-71.56V64a16 16 0 00-16-16h-48a16 16 0 00-16 16v51.69l-36.55-35.1a40 40 0 00-55.06 0l-184.4 176.8a8 8 0 00-.3 11.31l20.27 21.15a8 8 0 0011.31.27L256 133.36l164.76 157.87a8 8 0 0011.31-.27l20.27-21.15a8 8 0 00-.43-11.31z" fill="${color}"/></svg>`,
    "images-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M432 112V96a48.14 48.14 0 00-48-48H64a48.14 48.14 0 00-48 48v256a48.14 48.14 0 0048 48h16" fill="none" stroke="${color}" stroke-linejoin="round" stroke-width="32"/><rect x="96" y="128" width="400" height="336" rx="45.99" ry="45.99" fill="none" stroke="${color}" stroke-linejoin="round" stroke-width="32"/><ellipse cx="372.92" cy="219.64" rx="30.77" ry="30.55" fill="none" stroke="${color}" stroke-miterlimit="10" stroke-width="32"/><path d="M342.15 372.17L255 285.78a30.93 30.93 0 00-42.18-1.21L96 387.64M265.23 464l118.59-117.73a31 31 0 0141.46-1.21L496 403.9" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "location-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M256 48c-79.5 0-144 61.39-144 137 0 87 96 224.87 131.25 272.49a15.77 15.77 0 0025.5 0C304 409.89 400 272.07 400 185c0-75.61-64.5-137-144-137z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><circle cx="256" cy="192" r="48" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "notifications-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M427.68 351.43C402 320 383.87 304 383.87 217.35 383.87 138 343.35 109.73 310 96c-4.43-1.82-8.6-6-9.95-10.55C294.2 65.54 277.8 48 256 48s-38.21 17.55-44 37.47c-1.35 4.6-5.52 8.71-9.95 10.53-33.39 13.75-73.87 41.92-73.87 121.35C128.13 304 110 320 84.32 351.43 73.68 364.45 83 384 101.61 384h308.88c18.51 0 27.77-19.61 17.19-32.57zM320 384v16a64 64 0 01-128 0v-16" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "settings-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M262.29 192.31a64 64 0 1057.4 57.4 64.13 64.13 0 00-57.4-57.4zM416.39 256a154.34 154.34 0 01-1.53 20.79l45.21 35.46a10.81 10.81 0 012.45 13.75l-42.77 74a10.81 10.81 0 01-13.14 4.59l-44.9-18.08a16.11 16.11 0 00-15.17 1.75A164.48 164.48 0 01325 400.8a15.94 15.94 0 00-8.82 12.14l-6.73 47.89a11.08 11.08 0 01-10.68 9.17h-85.54a11.11 11.11 0 01-10.69-8.87l-6.72-47.82a16.07 16.07 0 00-9-12.22 155.3 155.3 0 01-21.46-12.57 16 16 0 00-15.11-1.71l-44.89 18.07a10.81 10.81 0 01-13.14-4.58l-42.77-74a10.8 10.8 0 012.45-13.75l38.21-30a16.05 16.05 0 006-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 00-6.07-13.94l-38.19-30A10.81 10.81 0 0149.48 186l42.77-74a10.81 10.81 0 0113.14-4.59l44.9 18.08a16.11 16.11 0 0015.17-1.75A164.48 164.48 0 01187 111.2a15.94 15.94 0 008.82-12.14l6.73-47.89A11.08 11.08 0 01213.23 42h85.54a11.11 11.11 0 0110.69 8.87l6.72 47.82a16.07 16.07 0 009 12.22 155.3 155.3 0 0121.46 12.57 16 16 0 0015.11 1.71l44.89-18.07a10.81 10.81 0 0113.14 4.58l42.77 74a10.8 10.8 0 01-2.45 13.75l-38.21 30a16.05 16.05 0 00-6 14.08c.36 4.17.58 8.33.58 12.5s-.21 8.27-.58 12.35a16 16 0 006.07 13.94l38.19 30a10.81 10.81 0 012.45 13.75l-42.77 74a10.81 10.81 0 01-13.14 4.59l-44.9-18.08a16.11 16.11 0 00-15.17 1.75 164.48 164.48 0 01-21.46 12.57 15.94 15.94 0 00-8.82 12.14l-6.73 47.89a11.08 11.08 0 01-10.68 9.17h-85.54" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "checkmark-circle": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm108.25 138.29l-134.4 160a16 16 0 01-12 5.71h-.27a16 16 0 01-11.89-5.3l-57.6-64a16 16 0 1123.78-21.4l45.29 50.32 122.59-145.91a16 16 0 0124.5 20.58z" fill="${color}"/></svg>`,
    "shield-checkmark": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M479.07 111.36a16 16 0 00-13.15-14.74c-86.5-16.94-137.5-54.86-174.92-83.62a16 16 0 00-18-1.64l-.26.16C240.71 31.7 196.31 64.29 113.08 79.62a16 16 0 00-13.15 14.74C96.59 147.29 95.61 245.43 112 306c18.84 69.52 75.11 133.89 167.27 191.37a16 16 0 0015.46 0C386.89 439.89 443.16 375.52 462 306c16.39-60.57 15.41-158.71 12.07-194.64z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336 192L215.9 336 176 288"/></svg>`,
    "person": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304z" fill="none" stroke="${color}" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/></svg>`,
    "call-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M451 374c-15.88-16-54.34-39.35-73-48.76-24.3-12.24-26.3-13.24-45.4.95-12.74 9.47-21.21 17.93-36.12 14.75s-47.31-21.11-75.68-49.39-47.34-61.62-50.53-76.48 5.41-23.23 14.79-36c13.22-18 12.22-21 .92-45.3-8.81-18.9-32.84-57-48.9-72.86C119.92 44 119.92 47 108.73 51.6A160.15 160.15 0 0083 65.37C67 76 58.12 84.83 51.91 98.1s-9 44.38 23.07 102.64 54.57 88.05 101.14 134.49S258.5 406.64 310.85 436c64.76 36.27 89.6 29.2 102.91 23s22.18-15 32.83-31a159.09 159.09 0 0013.8-25.8C465 391.17 468 391.17 451 374z" fill="none" stroke="${color}" stroke-miterlimit="10" stroke-width="32"/></svg>`,
    "location": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><circle cx="256" cy="192" r="32" fill="${color}"/><path d="M256 32c-88.22 0-160 68.65-160 156 0 40.17 18.31 93.59 54.42 158.78 29.21 52.71 62.17 101.33 81.28 126.05a17.78 17.78 0 0024.6 0c19.11-24.72 52.07-73.34 81.28-126.05C373.69 281.59 392 228.17 392 188 392 100.65 344.22 32 256 32zm0 224a64 64 0 1164-64 64.07 64.07 0 01-64 64z" fill="${color}"/></svg>`,
    "heart": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M256 448a32.85 32.85 0 01-13.87-3.06C224.28 436.58 32 349.19 32 208c0-60.55 49.45-112 112-112a112.35 112.35 0 0170.61 25.19A116.09 116.09 0 01256 96a112.35 112.35 0 0170.61 25.19C358.84 105.65 381.92 96 400 96c62.55 0 112 51.45 112 112 0 141.19-224.28 228.58-242.13 236.94A32.85 32.85 0 01256 448z" fill="${color}"/></svg>`,
    "eye": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><circle cx="256" cy="256" r="64" fill="${color}"/><path d="M490.84 238.6c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 256 96s-93 14.55-135.57 42.07c-38.48 24.85-72.81 59.61-99.27 100.53a32.35 32.35 0 000 34.8c26.46 40.92 60.79 75.68 99.27 100.53C163 401.45 210 416 256 416s93-14.55 135.57-42.07c38.48-24.85 72.81-59.61 99.27-100.53a32.35 32.35 0 000-34.8zM256 352a96 96 0 1196-96 96.11 96.11 0 01-96 96z" fill="${color}"/></svg>`,
    "phone-portrait": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect x="128" y="16" width="256" height="480" rx="48" ry="48" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M176 16h160M192 480h128" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "time-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z" fill="none" stroke="${color}" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 128v144h96"/></svg>`,
    "bar-chart-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M32 32v432a16 16 0 0016 16h432" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><rect x="96" y="224" width="80" height="192" rx="20" ry="20" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><rect x="240" y="176" width="80" height="240" rx="20" ry="20" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><rect x="383.64" y="112" width="80" height="304" rx="20" ry="20" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
  };
  const svg = svgs[name];
  if (!svg) return null;
  return <span dangerouslySetInnerHTML={{ __html: svg }} />;
}

const PARENTS = [
  { name: "엄마", status: "safe" as const, statusLabel: "안전", locationText: "집 근처에서 활동 중", lastActivity: "마지막 활동 · 5분 전", photo: null },
  { name: "아빠", status: "warning" as const, statusLabel: "확인필요", locationText: "이동 중", lastActivity: "마지막 활동 · 35분 전", photo: null },
];

const ACTIVITIES = [
  { id: 1, type: "app_open", label: "엄마 · 앱 열림", time: "5분 전", iconColor: SUCCESS, iconBg: "rgba(52,168,83,0.10)" },
  { id: 2, type: "location", label: "엄마 · 위치 공유", time: "12분 전", iconColor: INFO, iconBg: "rgba(74,144,217,0.10)" },
  { id: 3, type: "heart", label: "아빠 · 사진에 하트", time: "28분 전", iconColor: "#C0766E", iconBg: "rgba(192,118,110,0.10)" },
  { id: 4, type: "view_slide", label: "엄마 · 사진 확인", time: "42분 전", iconColor: BRAND, iconBg: "rgba(122,84,84,0.10)" },
];

const ICON_MAP: Record<string, string> = {
  app_open: "phone-portrait",
  location: "location",
  heart: "heart",
  view_slide: "eye",
};

const STATUS_COLORS = { safe: SUCCESS, warning: WARNING, danger: DANGER };
const STATUS_BADGE_BG = { safe: "rgba(76,175,80,0.12)", warning: "rgba(255,193,7,0.15)", danger: "rgba(244,67,54,0.12)" };

export function HomeConnected() {
  const chartDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return { label: `${d.getMonth() + 1}/${d.getDate()}`, count: Math.floor(Math.random() * 12) + (i > 20 ? 3 : 0) };
  });
  const maxCount = Math.max(...chartDays.map(d => d.count), 1);

  return (
    <div style={{
      width: 393, minHeight: 852,
      background: "linear-gradient(180deg, #D4843A 0%, #C4692E 40%, #A85528 100%)",
      fontFamily: "'Inter', -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "54px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src={logoAnbu} alt="ANBU" style={{ height: 24 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1.5px solid #D4A843", borderRadius: 999, padding: "4px 10px" }}>
          <IonSvg name="shield-checkmark" size={11} color="#D4A843" />
          <span style={{ fontWeight: 700, fontSize: 10, color: "#D4A843", letterSpacing: 0.5 }}>MASTER</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 90 }}>
        {/* Summary Bar */}
        <div style={{
          margin: "4px 20px 14px",
          display: "flex", alignItems: "center", gap: 8,
          backgroundColor: SURFACE, borderRadius: 12,
          padding: "12px 16px",
          border: `1px solid ${BORDER}`,
        }}>
          <IonSvg name="checkmark-circle" size={22} color={SUCCESS} />
          <span style={{ fontWeight: 700, fontSize: 16, color: SUCCESS }}>모든 부모님이 안전합니다</span>
        </div>

        {/* Parent Cards */}
        {PARENTS.map((p, i) => (
          <div key={i} style={{
            margin: "0 16px 12px",
            borderRadius: 16,
            backgroundColor: SURFACE,
            overflow: "hidden",
            borderLeft: `6px solid ${STATUS_COLORS[p.status]}`,
            boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", padding: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: "#F0EDE8",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginRight: 12, flexShrink: 0,
              }}>
                <IonSvg name="person" size={22} color="#bbb" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: TEXT_PRIMARY }}>{p.name}</span>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 6,
                    backgroundColor: STATUS_BADGE_BG[p.status],
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: STATUS_COLORS[p.status] }} />
                    <span style={{ fontWeight: 600, fontSize: 11, color: STATUS_COLORS[p.status] }}>{p.statusLabel}</span>
                  </div>
                </div>
                <div style={{ fontWeight: 500, fontSize: 15, color: TEXT_PRIMARY, marginTop: 4 }}>{p.locationText}</div>
                <div style={{ fontSize: 13, color: TEXT_TERTIARY, marginTop: 2 }}>{p.lastActivity}</div>
              </div>
              <div style={{ marginLeft: 8, display: "flex", gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: SURFACE_SOFT,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <IonSvg name="call-outline" size={20} color={BRAND} />
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: SURFACE_SOFT,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <IonSvg name="location-outline" size={20} color={INFO} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Anbu Interpretation Card */}
        <div style={{
          margin: "0 16px 16px",
          borderRadius: 14, backgroundColor: SURFACE,
          padding: 16,
          border: `1px solid ${BORDER}`,
        }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: TEXT_TERTIARY, marginBottom: 6, letterSpacing: 0.5 }}>오늘의 안부 해석</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: TEXT_PRIMARY, lineHeight: "22px", marginBottom: 4 }}>
            ☀️ 오늘도 부모님들의 하루가 평안합니다
          </div>
          <div style={{ fontSize: 13, color: SUCCESS, lineHeight: "18px" }}>
            활동이 꾸준히 감지되고 있어 안심하셔도 됩니다
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ fontWeight: 700, fontSize: 16, color: TEXT_PRIMARY, margin: "8px 20px 12px" }}>최근 활동</div>
        <div style={{
          margin: "0 16px",
          borderRadius: 14, backgroundColor: SURFACE,
          overflow: "hidden",
          boxShadow: "0 1px 8px rgba(0,0,0,0.2)",
          border: `1px solid ${BORDER}`,
        }}>
          {ACTIVITIES.map((a, i) => (
            <React.Fragment key={a.id}>
              {i > 0 && <div style={{ height: 1, backgroundColor: SURFACE_SOFT, margin: "0 16px" }} />}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: a.iconBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <IonSvg name={ICON_MAP[a.type] || "time-outline"} size={14} color={a.iconColor} />
                </div>
                <span style={{ fontWeight: 500, fontSize: 14, color: TEXT_PRIMARY, flex: 1 }}>{a.label}</span>
                <span style={{ fontSize: 12, color: TEXT_TERTIARY }}>{a.time}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Monthly Activity Chart */}
        <div style={{ fontWeight: 700, fontSize: 16, color: TEXT_PRIMARY, margin: "20px 20px 12px" }}>월간 활동</div>
        <div style={{
          margin: "0 16px 16px",
          borderRadius: 14, backgroundColor: SURFACE,
          padding: 16,
          border: `1px solid ${BORDER}`,
        }}>
          <div style={{ display: "flex", alignItems: "flex-end", height: 88, gap: 1 }}>
            {chartDays.map((d, i) => {
              const h = d.count > 0 ? Math.max((d.count / maxCount) * 80, 4) : 2;
              const isToday = i === 29;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: "80%", height: h, borderRadius: 2,
                    backgroundColor: isToday ? BRAND : d.count > 0 ? SUCCESS : BORDER,
                  }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 4px" }}>
            {chartDays.filter((_, i) => i % 7 === 0 || i === 29).map((d, i) => (
              <span key={i} style={{ fontSize: 10, color: TEXT_TERTIARY }}>{d.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        backgroundColor: SURFACE,
        borderTop: `1px solid ${BORDER}`,
        display: "flex",
        padding: "8px 0 28px",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.1)",
      }}>
        {NAV_ITEMS.map(item => (
          <div key={item.id} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, padding: "2px 0",
          }}>
            <div style={{
              width: 36, height: 28, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: item.active ? "rgba(122,84,84,0.10)" : "transparent",
            }}>
              <IonSvg name={item.icon} size={21} color={item.active ? BRAND : TEXT_TERTIARY} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: item.active ? 600 : 500,
              color: item.active ? BRAND : TEXT_TERTIARY,
            }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}