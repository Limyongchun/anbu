import React, { useState } from "react";

const BRAND = "#7A5454";
const SURFACE = "#FFFFFF";
const TEXT_PRIMARY = "#2D1F1F";
const TEXT_SECONDARY = "#6B5050";
const TEXT_TERTIARY = "#9B8080";
const BORDER = "rgba(0,0,0,0.10)";
const GOLD = "#FFD700";
const DANGER = "#E53935";

function IonSvg({ name, size = 21, color }: { name: string; size?: number; color: string }) {
  const svgs: Record<string, string> = {
    "home-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M80 212v236a16 16 0 0016 16h96V328a24 24 0 0124-24h80a24 24 0 0124 24v136h96a16 16 0 0016-16V212" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M480 256L266.89 52c-5-5.28-16.69-5.34-21.78 0L32 256" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "images": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M432 112V96a48.14 48.14 0 00-48-48H64a48.14 48.14 0 00-48 48v256a48.14 48.14 0 0048 48h16" fill="none" stroke="${color}" stroke-linejoin="round" stroke-width="32"/><rect x="96" y="128" width="400" height="336" rx="45.99" ry="45.99" fill="none" stroke="${color}" stroke-linejoin="round" stroke-width="32"/><ellipse cx="372.92" cy="219.64" rx="30.77" ry="30.55" fill="${color}"/><path d="M342.15 372.17L255 285.78a30.93 30.93 0 00-42.18-1.21L96 387.64M265.23 464l118.59-117.73a31 31 0 0141.46-1.21L496 403.9" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "location-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M256 48c-79.5 0-144 61.39-144 137 0 87 96 224.87 131.25 272.49a15.77 15.77 0 0025.5 0C304 409.89 400 272.07 400 185c0-75.61-64.5-137-144-137z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><circle cx="256" cy="192" r="48" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "notifications-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M427.68 351.43C402 320 383.87 304 383.87 217.35 383.87 138 343.35 109.73 310 96c-4.43-1.82-8.6-6-9.95-10.55C294.2 65.54 277.8 48 256 48s-38.21 17.55-44 37.47c-1.35 4.6-5.52 8.71-9.95 10.53-33.39 13.75-73.87 41.92-73.87 121.35C128.13 304 110 320 84.32 351.43 73.68 364.45 83 384 101.61 384h308.88c18.51 0 27.77-19.61 17.19-32.57zM320 384v16a64 64 0 01-128 0v-16" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "settings-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M262.29 192.31a64 64 0 1057.4 57.4 64.13 64.13 0 00-57.4-57.4zM416.39 256a154.34 154.34 0 01-1.53 20.79l45.21 35.46A10.81 10.81 0 01462.52 326l-42.77 74a10.81 10.81 0 01-13.14 4.59l-44.9-18.08a16.11 16.11 0 00-15.17 1.75A164.48 164.48 0 01325 400.8a15.94 15.94 0 00-8.82 12.14l-6.73 47.89a11.08 11.08 0 01-10.68 9.17h-85.54a11.11 11.11 0 01-10.69-8.87l-6.72-47.82a16.07 16.07 0 00-9-12.22 155.3 155.3 0 01-21.46-12.57 16 16 0 00-15.11-1.71l-44.89 18.07a10.81 10.81 0 01-13.14-4.58l-42.77-74a10.8 10.8 0 012.45-13.75l38.21-30a16.05 16.05 0 006-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 00-6.07-13.94l-38.19-30A10.81 10.81 0 0149.48 186l42.77-74a10.81 10.81 0 0113.14-4.59l44.9 18.08a16.11 16.11 0 0015.17-1.75A164.48 164.48 0 01187 111.2a15.94 15.94 0 008.82-12.14l6.73-47.89A11.08 11.08 0 01213.23 42h85.54a11.11 11.11 0 0110.69 8.87l6.72 47.82a16.07 16.07 0 009 12.22 155.3 155.3 0 0121.46 12.57 16 16 0 0015.11 1.71l44.89-18.07a10.81 10.81 0 0113.14 4.58l42.77 74a10.8 10.8 0 01-2.45 13.75l-38.21 30a16.05 16.05 0 00-6 14.08c.36 4.17.58 8.33.58 12.5z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "trash": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M112 112l20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path stroke="${color}" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 112h352"/><path d="M192 112V72h0a23.93 23.93 0 0124-24h80a23.93 23.93 0 0124 24h0v40" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "close-circle": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm75.31 260.69a16 16 0 11-22.62 22.62L256 278.63l-52.69 52.68a16 16 0 01-22.62-22.62L233.37 256l-52.68-52.69a16 16 0 0122.62-22.62L256 233.37l52.69-52.68a16 16 0 0122.62 22.62L278.63 256z" fill="${color}"/></svg>`,
    "shield-checkmark": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M479.07 111.36a16 16 0 00-13.15-14.74c-86.5-16.94-137.5-54.86-174.92-83.62a16 16 0 00-18-1.64l-.26.16C240.71 31.7 196.31 64.29 113.08 79.62a16 16 0 00-13.15 14.74C96.59 147.29 95.61 245.43 112 306c18.84 69.52 75.11 133.89 167.27 191.37a16 16 0 0015.46 0C386.89 439.89 443.16 375.52 462 306c16.39-60.57 15.41-158.71 12.07-194.64z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336 192L215.9 336 176 288"/></svg>`,
    "heart": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M256 448a32.85 32.85 0 01-13.87-3.06C224.28 436.58 32 349.19 32 208c0-60.55 49.45-112 112-112a112.35 112.35 0 0170.61 25.19A116.09 116.09 0 01256 96a112.35 112.35 0 0170.61 25.19C358.84 105.65 381.92 96 400 96c62.55 0 112 51.45 112 112 0 141.19-224.28 228.58-242.13 236.94A32.85 32.85 0 01256 448z" fill="${color}"/></svg>`,
    "person": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304z" fill="none" stroke="${color}" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/></svg>`,
    "expand-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320v112H320M421.8 421.77L304 304M80 192V80h112M90.2 90.23L208 208M320 80h112v112M421.77 90.2L304 208M192 432H80V320M90.23 421.8L208 304"/></svg>`,
  };
  const svg = svgs[name];
  if (!svg) return null;
  return <span dangerouslySetInnerHTML={{ __html: svg }} style={{ display: "inline-flex", alignItems: "center" }} />;
}

const logoAnbu = new URL("/assets/logo-anbu.png", import.meta.url).href;

const PHOTOS = [
  { id: 1, src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop", from: "김철수", time: "오늘", hearts: 3, isMine: true },
  { id: 2, src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=300&fit=crop", from: "엄마", time: "오늘", hearts: 1, isMine: false },
  { id: 3, src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&h=300&fit=crop", from: "김철수", time: "어제", hearts: 0, isMine: true },
  { id: 4, src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&h=300&fit=crop", from: "아빠", time: "어제", hearts: 2, isMine: false },
  { id: 5, src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=300&h=300&fit=crop", from: "김철수", time: "3일 전", hearts: 0, isMine: true },
  { id: 6, src: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&h=300&fit=crop", from: "엄마", time: "3일 전", hearts: 4, isMine: false },
  { id: 7, src: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=300&h=300&fit=crop", from: "김철수", time: "5일 전", hearts: 1, isMine: true },
  { id: 8, src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=300&h=300&fit=crop", from: "아빠", time: "1주 전", hearts: 0, isMine: false },
  { id: 9, src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&h=300&fit=crop", from: "김철수", time: "1주 전", hearts: 2, isMine: true },
  { id: 10, src: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300&h=300&fit=crop", from: "엄마", time: "2주 전", hearts: 0, isMine: false },
];

export function PhotoGallery() {
  const [viewer, setViewer] = useState<typeof PHOTOS[0] | null>(null);
  const GAP = 6;

  return (
    <div style={{
      width: 393, height: 852,
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
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px", paddingBottom: 100, height: "calc(100% - 160px)" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 14 }}>안부</div>

        {/* Segment Control */}
        <div style={{
          display: "flex", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 3, marginBottom: 16,
        }}>
          <div style={{
            flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 10,
            fontWeight: 600, fontSize: 14, cursor: "pointer",
            backgroundColor: "transparent", color: "rgba(255,255,255,0.8)",
          }}>
            메시지
          </div>
          <div style={{
            flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 10,
            fontWeight: 600, fontSize: 14, cursor: "pointer",
            backgroundColor: SURFACE, color: TEXT_PRIMARY,
          }}>
            갤러리 {PHOTOS.length}
          </div>
        </div>

        {/* Gallery Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: GAP,
        }}>
          {PHOTOS.map((photo) => (
            <div key={photo.id} style={{
              borderRadius: 12, overflow: "visible",
              position: "relative", aspectRatio: "1",
            }}>
              <div
                onClick={() => setViewer(photo)}
                style={{ width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", cursor: "pointer", position: "relative" }}
              >
                <img src={photo.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
                  padding: "16px 6px 5px",
                  borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: "#fff", fontWeight: 500 }}>{photo.time}</span>
                    {photo.hearts > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <IonSvg name="heart" size={9} color="#ff6b6b" />
                        <span style={{ fontSize: 9, color: "#fff", fontWeight: 600 }}>{photo.hearts}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{
                  position: "absolute", top: 5, left: 5,
                  backgroundColor: "rgba(0,0,0,0.45)",
                  borderRadius: 8, padding: "2px 6px",
                }}>
                  <span style={{ fontSize: 9, color: "#fff", fontWeight: 600 }}>{photo.from}</span>
                </div>
              </div>
              {photo.isMine && (
                <div style={{
                  position: "absolute", top: -4, right: -4,
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: DANGER,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", zIndex: 10,
                }}>
                  <IonSvg name="trash" size={11} color="#fff" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {viewer && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.92)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          zIndex: 200,
        }}>
          <div
            onClick={() => setViewer(null)}
            style={{ position: "absolute", top: 54, right: 20, cursor: "pointer", zIndex: 10 }}
          >
            <IonSvg name="close-circle" size={36} color="#fff" />
          </div>
          <img src={viewer.src.replace("w=300&h=300", "w=600&h=500")} alt="" style={{
            width: "90%", maxHeight: "60%", objectFit: "contain", borderRadius: 14,
          }} />
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: "#F0EDE8",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <IonSvg name="person" size={14} color="#bbb" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{viewer.from}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>· {viewer.time}</span>
            </div>
            {viewer.hearts > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <IonSvg name="heart" size={14} color="#ff6b6b" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#ff6b6b" }}>{viewer.hearts}</span>
              </div>
            )}
          </div>
          {viewer.isMine && (
            <div style={{
              marginTop: 20, display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 12,
              backgroundColor: "rgba(229,57,53,0.2)",
              cursor: "pointer",
            }}>
              <IonSvg name="trash" size={17} color="#fff" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>삭제</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: SURFACE,
        borderTop: `1px solid ${BORDER}`,
        display: "flex",
        padding: "8px 0 28px",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.1)",
        zIndex: 10,
      }}>
        {[
          { id: "home", label: "홈", icon: "home-outline", active: false },
          { id: "photo", label: "사진", icon: "images", active: true },
          { id: "map", label: "위치", icon: "location-outline", active: false },
          { id: "alarm", label: "알림", icon: "notifications-outline", active: false },
          { id: "settings", label: "설정", icon: "settings-outline", active: false },
        ].map(item => (
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