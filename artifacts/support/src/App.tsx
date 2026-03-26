import { Router as WouterRouter } from "wouter";

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

        <p style={{ marginTop: "20px", fontSize: "12px", color: "#888" }}>
          ANBU - 부모 안부 확인 앱
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <SupportPage />
    </WouterRouter>
  );
}

export default App;
