export function SignupComplete() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #D4843A 0%, #C4692E 50%, #A85528 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        padding: "32px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="40" cy="40" r="40" fill="rgba(255,255,255,0.2)" />
            <path
              d="M24 40L34 50L56 28"
              stroke="#FFFFFF"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1
          style={{
            fontWeight: 700,
            fontSize: 32,
            color: "#FFFFFF",
            marginBottom: 12,
            textAlign: "center",
            margin: "0 0 12px 0",
          }}
        >
          가입 완료!
        </h1>

        <p
          style={{
            fontWeight: 400,
            fontSize: 16,
            color: "rgba(255,255,255,0.85)",
            textAlign: "center",
            lineHeight: 1.5,
            marginBottom: 48,
            whiteSpace: "pre-line",
          }}
        >
          {"민수님, 환영합니다\n이제 가족과 안부를 나눠보세요"}
        </p>

        <button
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: "#FFFFFF",
            border: "none",
            borderRadius: 16,
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 32,
            paddingRight: 32,
            cursor: "pointer",
            width: "100%",
            maxWidth: 320,
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 17,
              color: "#D4843A",
            }}
          >
            안부 시작하기
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#D4843A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
