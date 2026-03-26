import { Router as WouterRouter, Route, Link, useLocation } from "wouter";

function SupportPage() {
  return (
    <div style={{
      margin: 0,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "#f5f7fa",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      padding: "20px",
      boxSizing: "border-box",
    }}>
      <div style={{
        background: "white",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        maxWidth: "400px",
        width: "100%",
        textAlign: "center",
      }}>
        <h1 style={{ marginBottom: "10px", fontSize: "22px", color: "#333" }}>
          ANBU 고객지원
        </h1>
        <p style={{ color: "#555", fontSize: "14px", lineHeight: 1.6 }}>
          부모님의 안부를 확인하는 가족 케어 서비스
        </p>

        <div style={{
          margin: "20px 0",
          fontWeight: "bold",
          color: "#2b7cff",
          fontSize: "16px",
        }}>
          2011atrees@gmail.com
        </div>

        <p style={{ color: "#555", fontSize: "14px", lineHeight: 1.6 }}>
          문의사항이 있으시면 이메일로 연락주세요.<br />
          빠르게 답변드리겠습니다.
        </p>

        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
          <Link href="/privacy" style={{
            color: "#2b7cff",
            fontSize: "13px",
            textDecoration: "underline",
            cursor: "pointer",
          }}>
            개인정보처리방침
          </Link>
          <Link href="/account-delete" style={{
            color: "#2b7cff",
            fontSize: "13px",
            textDecoration: "underline",
            cursor: "pointer",
          }}>
            계정 삭제 요청
          </Link>
        </div>

        <p style={{ marginTop: "20px", fontSize: "12px", color: "#888" }}>
          ANBU - 부모 안부 확인 앱
        </p>
      </div>
    </div>
  );
}

function PrivacyPage() {
  return (
    <div style={{
      margin: 0,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "#f5f7fa",
      display: "flex",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "20px",
      boxSizing: "border-box",
    }}>
      <div style={{
        background: "white",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        maxWidth: "600px",
        width: "100%",
        lineHeight: 1.6,
      }}>
        <h1 style={{ fontSize: "22px", color: "#333", marginBottom: "20px" }}>
          개인정보처리방침
        </h1>

        <p style={{ color: "#555", fontSize: "14px" }}>
          ANBU는 사용자의 개인정보를 중요하게 생각하며 다음과 같이 처리합니다.
        </p>

        <h3 style={{ fontSize: "16px", color: "#333", marginTop: "24px", marginBottom: "8px" }}>
          수집하는 정보
        </h3>
        <p style={{ color: "#555", fontSize: "14px" }}>
          - 위치 정보<br />
          - 사용자 계정 정보
        </p>

        <h3 style={{ fontSize: "16px", color: "#333", marginTop: "24px", marginBottom: "8px" }}>
          사용 목적
        </h3>
        <p style={{ color: "#555", fontSize: "14px" }}>
          - 가족 간 안부 확인 서비스 제공<br />
          - 앱 기능 개선
        </p>

        <h3 style={{ fontSize: "16px", color: "#333", marginTop: "24px", marginBottom: "8px" }}>
          데이터 보관
        </h3>
        <p style={{ color: "#555", fontSize: "14px" }}>
          필요한 기간 동안만 보관 후 삭제됩니다.
        </p>

        <h3 style={{ fontSize: "16px", color: "#333", marginTop: "24px", marginBottom: "8px" }}>
          제3자 제공
        </h3>
        <p style={{ color: "#555", fontSize: "14px" }}>
          개인정보를 외부에 제공하지 않습니다.
        </p>

        <h3 style={{ fontSize: "16px", color: "#333", marginTop: "24px", marginBottom: "8px" }}>
          문의
        </h3>
        <p style={{ color: "#555", fontSize: "14px" }}>
          이메일: 2011atrees@gmail.com
        </p>

        <div style={{ marginTop: "30px", textAlign: "center" }}>
          <Link href="/" style={{
            color: "#2b7cff",
            fontSize: "14px",
            textDecoration: "underline",
            cursor: "pointer",
          }}>
            ← 고객지원으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

function AccountDeletePage() {
  return (
    <div style={{
      margin: 0,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "#f5f7fa",
      display: "flex",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "20px",
      boxSizing: "border-box",
    }}>
      <div style={{
        background: "white",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        maxWidth: "600px",
        width: "100%",
        lineHeight: 1.6,
      }}>
        <h1 style={{ fontSize: "22px", color: "#333", marginBottom: "20px" }}>
          ANBU 계정 삭제 요청
        </h1>

        <p style={{ color: "#555", fontSize: "14px" }}>
          계정 삭제를 원하시면 아래 이메일로 요청해주세요.
        </p>

        <div style={{
          margin: "20px 0",
          fontWeight: "bold",
          color: "#2b7cff",
          fontSize: "16px",
        }}>
          이메일: 2011atrees@gmail.com
        </div>

        <p style={{ color: "#555", fontSize: "14px" }}>
          요청 시 아래 정보를 함께 보내주세요:
        </p>
        <ul style={{ color: "#555", fontSize: "14px", paddingLeft: "20px" }}>
          <li>등록된 전화번호</li>
          <li>사용자 이름</li>
        </ul>

        <p style={{ color: "#555", fontSize: "14px", marginTop: "16px" }}>
          요청 접수 후 최대 7일 이내 삭제 처리됩니다.
        </p>

        <div style={{ marginTop: "30px", textAlign: "center" }}>
          <Link href="/" style={{
            color: "#2b7cff",
            fontSize: "14px",
            textDecoration: "underline",
            cursor: "pointer",
          }}>
            ← 고객지원으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Route path="/" component={SupportPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/account-delete" component={AccountDeletePage} />
    </WouterRouter>
  );
}

export default App;
