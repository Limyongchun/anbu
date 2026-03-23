import React from "react";

const FAMILY_CODE = "A1B2C3";
const segments = FAMILY_CODE.match(/.{1,3}/g) ?? [FAMILY_CODE];

const QR_PLACEHOLDER = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${FAMILY_CODE}&bgcolor=FFFFFF&color=000000`;

const BRAND = "#7A5454";
const TEXT_TERTIARY = "#9B8080";

const NAV_ITEMS = [
  { id: "home", label: "홈", active: true, icon: "home", iconOutline: "home-outline" },
  { id: "photo", label: "사진", active: false, icon: "images", iconOutline: "images-outline" },
  { id: "map", label: "위치", active: false, icon: "location", iconOutline: "location-outline" },
  { id: "alarm", label: "알림", active: false, icon: "notifications", iconOutline: "notifications-outline" },
  { id: "settings", label: "설정", active: false, icon: "settings", iconOutline: "settings-outline" },
];

const ION_SVG: Record<string, string> = {
  "home": `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 512 512"><path d="M261.56 101.28a8 8 0 00-11.06 0L66.4 277.15a8 8 0 00-2.47 5.79L63.9 448a32 32 0 0032 32H192a16 16 0 0016-16V328a8 8 0 018-8h80a8 8 0 018 8v136a16 16 0 0016 16h96.06a32 32 0 0032-32V282.94a8 8 0 00-2.47-5.79z" fill="${BRAND}"/><path d="M490.91 244.15l-74.8-71.56V64a16 16 0 00-16-16h-48a16 16 0 00-16 16v51.69l-36.55-35.1a40 40 0 00-55.06 0l-184.4 176.8a8 8 0 00-.3 11.31l20.27 21.15a8 8 0 0011.31.27L256 133.36l164.76 157.87a8 8 0 0011.31-.27l20.27-21.15a8 8 0 00-.43-11.31 8 8 0 010-14.35z" fill="${BRAND}"/></svg>`,
  "images-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 512 512"><path d="M432 112V96a48.14 48.14 0 00-48-48H64a48.14 48.14 0 00-48 48v256a48.14 48.14 0 0048 48h16" fill="none" stroke="${TEXT_TERTIARY}" stroke-linejoin="round" stroke-width="32"/><rect x="96" y="128" width="400" height="336" rx="45.99" ry="45.99" fill="none" stroke="${TEXT_TERTIARY}" stroke-linejoin="round" stroke-width="32"/><ellipse cx="372.92" cy="219.64" rx="30.77" ry="30.55" fill="none" stroke="${TEXT_TERTIARY}" stroke-miterlimit="10" stroke-width="32"/><path d="M342.15 372.17L255 285.78a30.93 30.93 0 00-42.18-1.21L96 387.64M265.23 464l118.59-117.73a31 31 0 0141.46-1.21L496 403.9" fill="none" stroke="${TEXT_TERTIARY}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
  "location-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 512 512"><path d="M256 48c-79.5 0-144 61.39-144 137 0 87 96 224.87 131.25 272.49a15.77 15.77 0 0025.5 0C304 409.89 400 272.07 400 185c0-75.61-64.5-137-144-137z" fill="none" stroke="${TEXT_TERTIARY}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><circle cx="256" cy="192" r="48" fill="none" stroke="${TEXT_TERTIARY}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
  "notifications-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 512 512"><path d="M427.68 351.43C402 320 383.87 304 383.87 217.35 383.87 138 343.35 109.73 310 96c-4.43-1.82-8.6-6-9.95-10.55C294.2 65.54 277.8 48 256 48s-38.21 17.55-44 37.47c-1.35 4.6-5.52 8.71-9.95 10.53-33.39 13.75-73.87 41.92-73.87 121.35C128.13 304 110 320 84.32 351.43 73.68 364.45 83 384 101.61 384h308.88c18.51 0 27.77-19.61 17.19-32.57zM320 384v16a64 64 0 01-128 0v-16" fill="none" stroke="${TEXT_TERTIARY}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
  "settings-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 512 512"><path d="M262.29 192.31a64 64 0 1057.4 57.4 64.13 64.13 0 00-57.4-57.4zM416.39 256a154.34 154.34 0 01-1.53 20.79l45.21 35.46A10.81 10.81 0 01462.52 googled M320.09 467a10.7 10.7 0 01-11.33 2.44l-53.35-21.4a148.64 148.64 0 01-36 20.79l-8 56.89A10.78 10.78 0 01200.74 536H311.26a10.78 10.78 0 0010.64-9.28l8-56.89a148.64 148.64 0 0036-20.79l53.35 21.4" fill="none" stroke="${TEXT_TERTIARY}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
};

function IonIcon({ name, size = 21, color }: { name: string; size?: number; color: string }) {
  const svgMap: Record<string, string> = {
    "home": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M261.56 101.28a8 8 0 00-11.06 0L66.4 277.15a8 8 0 00-2.47 5.79L63.9 448a32 32 0 0032 32H192a16 16 0 0016-16V328a8 8 0 018-8h80a8 8 0 018 8v136a16 16 0 0016 16h96.06a32 32 0 0032-32V282.94a8 8 0 00-2.47-5.79z" fill="${color}"/><path d="M490.91 244.15l-74.8-71.56V64a16 16 0 00-16-16h-48a16 16 0 00-16 16v51.69l-36.55-35.1a40 40 0 00-55.06 0l-184.4 176.8a8 8 0 00-.3 11.31l20.27 21.15a8 8 0 0011.31.27L256 133.36l164.76 157.87a8 8 0 0011.31-.27l20.27-21.15a8 8 0 00-.43-11.31z" fill="${color}"/></svg>`,
    "home-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M80 212v236a16 16 0 0016 16h96V328a24 24 0 0124-24h80a24 24 0 0124 24v136h96a16 16 0 0016-16V212" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M480 256L266.89 52c-5-5.28-16.69-5.34-21.78 0L32 256M400 179V64h-48v69" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "images-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M432 112V96a48.14 48.14 0 00-48-48H64a48.14 48.14 0 00-48 48v256a48.14 48.14 0 0048 48h16" fill="none" stroke="${color}" stroke-linejoin="round" stroke-width="32"/><rect x="96" y="128" width="400" height="336" rx="45.99" ry="45.99" fill="none" stroke="${color}" stroke-linejoin="round" stroke-width="32"/><ellipse cx="372.92" cy="219.64" rx="30.77" ry="30.55" fill="none" stroke="${color}" stroke-miterlimit="10" stroke-width="32"/><path d="M342.15 372.17L255 285.78a30.93 30.93 0 00-42.18-1.21L96 387.64M265.23 464l118.59-117.73a31 31 0 0141.46-1.21L496 403.9" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "location-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M256 48c-79.5 0-144 61.39-144 137 0 87 96 224.87 131.25 272.49a15.77 15.77 0 0025.5 0C304 409.89 400 272.07 400 185c0-75.61-64.5-137-144-137z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><circle cx="256" cy="192" r="48" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "notifications-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M427.68 351.43C402 320 383.87 304 383.87 217.35 383.87 138 343.35 109.73 310 96c-4.43-1.82-8.6-6-9.95-10.55C294.2 65.54 277.8 48 256 48s-38.21 17.55-44 37.47c-1.35 4.6-5.52 8.71-9.95 10.53-33.39 13.75-73.87 41.92-73.87 121.35C128.13 304 110 320 84.32 351.43 73.68 364.45 83 384 101.61 384h308.88c18.51 0 27.77-19.61 17.19-32.57zM320 384v16a64 64 0 01-128 0v-16" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "settings-outline": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M256 176a80 80 0 1080 80 80.24 80.24 0 00-80-80zm0 112a32 32 0 1132-32 32 32 0 01-32 32z" fill="${color}"/><path d="M431 256c0-6-1-12-2-18l43-38a10 10 0 002-12l-40-70a10 10 0 00-12-4l-51 20a152 152 0 00-31-18l-8-54a10 10 0 00-10-8h-80a10 10 0 00-10 8l-8 54a152 152 0 00-31 18l-51-20a10 10 0 00-12 4l-40 70a10 10 0 002 12l43 38a178 178 0 000 36l-43 38a10 10 0 00-2 12l40 70a10 10 0 0012 4l51-20a152 152 0 0031 18l8 54a10 10 0 0010 8h80a10 10 0 0010-8l8-54a152 152 0 0031-18l51 20a10 10 0 0012-4l40-70a10 10 0 00-2-12l-43-38c1-6 2-12 2-18z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>`,
    "shield-checkmark": `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><path d="M479.07 111.36a16 16 0 00-13.15-14.74c-86.5-17.2-133.77-43.48-167.28-72.94a16 16 0 00-21.28 0c-33.51 29.46-80.78 55.74-167.28 72.94A16 16 0 0096.93 111.36C92.48 181 96 264 144.84 340.36 192.21 414.42 268 464 256 464s63.79-49.58 111.16-123.64C415.99 264 419.52 181 479.07 111.36z" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M213.63 282.72L248 310l60.67-68.13"/></svg>`,
  };
  const svg = svgMap[name];
  if (!svg) return null;
  return <span dangerouslySetInnerHTML={{ __html: svg }} style={{ display: "flex", alignItems: "center", justifyContent: "center" }} />;
}

export default function WaitingRoomCopyPpHYBDP() {
  return (
    <div style={styles.container}>
      <div style={styles.gradient}>
        <div style={styles.topBar}>
          <span style={styles.topBarTitle}>A N B U</span>
          <div style={styles.masterBadge}>
            <IonIcon name="shield-checkmark" size={11} color="#D4A843" />
            <span style={styles.masterText}>마스터</span>
          </div>
        </div>

        <div style={styles.scrollContent}>
          <div style={styles.badge}>
            <div style={styles.badgeDot} />
            <span style={styles.badgeText}>연결 대기 중</span>
          </div>

          <div style={styles.title}>부모님을{"\n"}초대해보세요</div>
          <div style={styles.sub}>아래 QR코드 또는 코드번호를{"\n"}부모님 기기에서 입력하면 연결됩니다</div>

          <div style={styles.qrWrap}>
            <img src={QR_PLACEHOLDER} alt="QR Code" style={{ width: 200, height: 200, display: "block", objectFit: "contain" }} />
          </div>

          <div style={styles.codeLabel}>코드 번호</div>
          <div style={styles.codeRow}>
            {segments.map((seg, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={styles.codeSep}>·</span>}
                <div style={styles.codePill}>
                  <span style={styles.codeDigits}>{seg}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoRow}>
              <div style={styles.infoIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512"><rect x="80" y="16" width="352" height="480" rx="48" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/><path d="M256 464a16 16 0 1016-16 16 16 0 00-16 16z" fill="#FFFFFF"/></svg>
              </div>
              <span style={styles.infoText}>부모님 앱에서 QR을 스캔하거나</span>
            </div>
            <div style={styles.infoRow}>
              <div style={styles.infoIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512"><path d="M336 336h80M256 336h80M176 336h80M96 336h80M336 256h80M256 256h80M176 256h80M96 256h80M336 176h80M256 176h80M176 176h80M96 176h80" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/></svg>
              </div>
              <span style={styles.infoText}>코드번호를 직접 입력하면 연결됩니다</span>
            </div>
            <div style={styles.infoRow}>
              <div style={styles.infoIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512"><path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" fill="none" stroke="#FFFFFF" strokeMiterlimit="10" strokeWidth="32"/><path d="M256 176v160M336 256H176" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/></svg>
              </div>
              <span style={styles.infoText}>연결되는 순간 홈이 자동으로 열려요</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.tabBar}>
        {NAV_ITEMS.map(item => {
          const iconName = item.active ? item.icon : item.iconOutline;
          const color = item.active ? BRAND : TEXT_TERTIARY;
          return (
            <div key={item.id} style={styles.tabItem}>
              <div style={{
                ...styles.iconCircle,
                ...(item.active ? { backgroundColor: "rgba(122,84,84,0.10)" } : {}),
              }}>
                <IonIcon name={iconName} size={21} color={color} />
              </div>
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                color: item.active ? BRAND : TEXT_TERTIARY,
                fontWeight: item.active ? 600 : 500,
              }}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    background: "linear-gradient(180deg, #D4843A 0%, #C4692E 50%, #A85528 100%)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: "14px 20px 12px",
  },
  topBarTitle: {
    fontWeight: 700,
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: 3,
  },
  masterBadge: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "transparent",
    borderRadius: 50,
    padding: "4px 10px",
    border: "1.5px solid #D4A843",
  },
  masterText: {
    fontWeight: 700,
    fontSize: 10,
    color: "#D4A843",
    letterSpacing: 0.5,
  },
  scrollContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 24px 40px",
    overflowY: "auto",
  },
  badge: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    background: "rgba(255,255,255,0.18)",
    padding: "7px 14px",
    borderRadius: 50,
    marginBottom: 20,
    border: "1px solid rgba(255,255,255,0.3)",
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    background: "#FFFFFF",
  },
  badgeText: {
    fontWeight: 600,
    fontSize: 13,
    color: "#FFFFFF",
  },
  title: {
    fontWeight: 700,
    fontSize: 26,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: "34px",
    marginBottom: 8,
    whiteSpace: "pre-line",
  },
  sub: {
    fontWeight: 400,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: "20px",
    marginBottom: 24,
    whiteSpace: "pre-line",
  },
  qrWrap: {
    width: 220,
    height: 220,
    background: "#FFFFFF",
    borderRadius: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
    overflow: "hidden",
  },
  codeLabel: {
    fontWeight: 400,
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 1,
    marginBottom: 10,
  },
  codeRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 28,
  },
  codePill: {
    background: "#FFFFFF",
    borderRadius: 14,
    padding: "12px 18px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  },
  codeDigits: {
    fontWeight: 700,
    fontSize: 24,
    color: "#D4843A",
    letterSpacing: 4,
  },
  codeSep: {
    fontWeight: 700,
    fontSize: 20,
    color: "rgba(255,255,255,0.5)",
  },
  infoCard: {
    width: "100%",
    background: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    border: "1px solid rgba(255,255,255,0.2)",
  },
  infoRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: "rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoText: {
    fontWeight: 400,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    flex: 1,
  },
  tabBar: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
    paddingBottom: 20,
    borderTop: "1px solid rgba(0,0,0,0.10)",
    boxShadow: "0 -2px 12px rgba(0,0,0,0.1)",
  },
  tabItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    padding: "2px 0",
  },
  iconCircle: {
    width: 36,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
};
