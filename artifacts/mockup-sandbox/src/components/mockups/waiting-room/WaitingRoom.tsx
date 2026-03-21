import React from "react";

const FAMILY_CODE = "A1B2C3D4E";
const segments = FAMILY_CODE.match(/.{1,3}/g) ?? [FAMILY_CODE];

const QR_PLACEHOLDER = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${FAMILY_CODE}&bgcolor=FFFFFF&color=000000`;

const TAB_ITEMS = [
  { icon: "🏠", label: "홈", active: true },
  { icon: "📷", label: "사진", active: false },
  { icon: "📍", label: "위치", active: false },
  { icon: "🔔", label: "알림", active: false },
  { icon: "⚙️", label: "설정", active: false },
];

export default function WaitingRoom() {
  return (
    <div style={styles.container}>
      <div style={styles.gradient}>
        <div style={styles.topBar}>
          <span style={styles.topBarTitle}>A N B U</span>
          <span style={styles.masterBadge}>💎 마스터</span>
        </div>

        <div style={styles.scrollContent}>
          <div style={styles.badge}>
            <div style={styles.badgeDot} />
            <span style={styles.badgeText}>연결 대기 중</span>
          </div>

          <div style={styles.title}>부모님을{"\n"}초대해보세요</div>
          <div style={styles.sub}>아래 QR코드 또는 코드번호를{"\n"}부모님 기기에서 입력하면 연결됩니다</div>

          <div style={styles.qrWrap}>
            <img src={QR_PLACEHOLDER} alt="QR Code" width={200} height={200} />
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
              <div style={styles.infoIcon}>📱</div>
              <span style={styles.infoText}>부모님 앱에서 QR을 스캔하거나</span>
            </div>
            <div style={styles.infoRow}>
              <div style={styles.infoIcon}>🔢</div>
              <span style={styles.infoText}>코드번호를 직접 입력하면 연결됩니다</span>
            </div>
            <div style={styles.infoRow}>
              <div style={styles.infoIcon}>📡</div>
              <span style={styles.infoText}>연결되는 순간 홈이 자동으로 열려요</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.tabBar}>
        {TAB_ITEMS.map((item) => (
          <div key={item.label} style={styles.tabItem}>
            <span style={{ fontSize: 22, opacity: item.active ? 1 : 0.5 }}>{item.icon}</span>
            <span style={{
              ...styles.tabLabel,
              color: item.active ? "#D4843A" : "#999",
              fontWeight: item.active ? 700 : 400,
            }}>{item.label}</span>
          </div>
        ))}
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
    overflow: "auto",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
  },
  topBarTitle: {
    fontWeight: 800,
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: 3,
  },
  masterBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: "#FFFFFF",
    background: "rgba(255,255,255,0.18)",
    padding: "5px 12px",
    borderRadius: 20,
  },
  scrollContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 24px 40px",
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
    fontSize: 18,
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
    justifyContent: "space-around",
    alignItems: "center",
    padding: "10px 0 20px",
    background: "#FFFFFF",
    borderTop: "1px solid #eee",
  },
  tabItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
  },
};
