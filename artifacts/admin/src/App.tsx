import { useState, useEffect, useCallback, useRef } from "react";
import "./index.css";

const API = "/api";

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch { return null; }
}

type Tab = "dashboard" | "families" | "members";

interface Stats {
  families: number;
  members: number;
  parents: number;
  children: number;
}

interface FamilyRow {
  code: string;
  createdAt: string;
  memberCount: number;
  parentCount: number;
  childCount: number;
}

interface MemberRow {
  id: number;
  familyCode: string;
  deviceId: string;
  memberName: string;
  role: string;
  childRole: string | null;
  joinedAt: string;
}

function useApi(token: string) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const get = useCallback(async (path: string) => {
    const r = await fetch(`${API}${path}`, { headers });
    if (r.status === 401) { sessionStorage.removeItem("admin_token"); window.location.reload(); }
    return r.json();
  }, [token]);

  const del = useCallback(async (path: string) => {
    const r = await fetch(`${API}${path}`, { method: "DELETE", headers });
    if (r.status === 401) { sessionStorage.removeItem("admin_token"); window.location.reload(); }
    return r.json();
  }, [token]);

  const post = useCallback(async (path: string) => {
    const r = await fetch(`${API}${path}`, { method: "POST", headers });
    if (r.status === 401) { sessionStorage.removeItem("admin_token"); window.location.reload(); }
    return r.json();
  }, [token]);

  return { get, del, post };
}

function LoginPage({ onLogin }: { onLogin: (t: string) => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await r.json();
      if (r.ok && data.token) {
        sessionStorage.setItem("admin_token", data.token);
        onLogin(data.token);
      } else {
        setErr(data.error || "Login failed");
      }
    } catch {
      setErr("Network error");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1923" }}>
      <form onSubmit={submit} style={{ background: "#152030", borderRadius: 16, padding: 40, width: 380, border: "1px solid #1e2d3d" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 8, letterSpacing: 4, color: "#d4f200" }}>A N B U</h1>
        <p style={{ textAlign: "center", color: "#8899aa", marginBottom: 32, fontSize: 14 }}>Admin Dashboard</p>
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          style={{ width: "100%", padding: "12px 16px", background: "#1a2535", border: "1px solid #1e2d3d", borderRadius: 8, color: "#e2e8f0", fontSize: 15, outline: "none", marginBottom: 16 }}
        />
        {err && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{err}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: "12px 0", background: "#d4f200", color: "#1a2535", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer" }}
        >
          {loading ? "..." : "Login"}
        </button>
      </form>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div style={{ background: "#152030", borderRadius: 12, padding: "20px 24px", border: "1px solid #1e2d3d", flex: "1 1 0" }}>
      <div style={{ color: "#8899aa", fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? "#d4f200" : "#e2e8f0" }}>{value}</div>
    </div>
  );
}

function DashboardTab({ api }: { api: ReturnType<typeof useApi> }) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { api.get("/admin/stats").then(setStats); }, []);
  if (!stats) return <p style={{ color: "#8899aa" }}>Loading...</p>;
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Dashboard Overview</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard label="Families" value={stats.families} accent />
        <StatCard label="Total Members" value={stats.members} />
        <StatCard label="Parents" value={stats.parents} />
        <StatCard label="Children" value={stats.children} />
      </div>
    </div>
  );
}

function FamiliesTab({ api }: { api: ReturnType<typeof useApi> }) {
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/families").then(d => { setFamilies(d.families || []); setLoading(false); });
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const deleteFamily = async (code: string) => {
    if (!confirm(`Delete family ${code} and all its members?`)) return;
    await api.del(`/admin/families/${code}`);
    load();
  };

  if (loading) return <p style={{ color: "#8899aa" }}>Loading...</p>;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Families ({families.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
            <Th>Code</Th><Th>Members</Th><Th>Parents</Th><Th>Children</Th><Th>Created</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {families.map(f => (
            <tr key={f.code} style={{ borderBottom: "1px solid #1e2d3d" }}>
              <Td><span style={{ fontFamily: "monospace", color: "#d4f200" }}>{f.code}</span></Td>
              <Td>{f.memberCount}</Td>
              <Td>{f.parentCount}</Td>
              <Td>{f.childCount}</Td>
              <Td>{new Date(f.createdAt).toLocaleDateString("ko-KR")}</Td>
              <Td><DangerBtn onClick={() => deleteFamily(f.code)}>Delete</DangerBtn></Td>
            </tr>
          ))}
          {families.length === 0 && <tr><Td colSpan={6}>No families found</Td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function MembersTab({ api }: { api: ReturnType<typeof useApi> }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/members").then(d => { setMembers(d.members || []); setLoading(false); });
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const deleteMember = async (id: number) => {
    if (!confirm("Delete this member?")) return;
    await api.del(`/admin/members/${id}`);
    load();
  };

  const filtered = members.filter(m =>
    m.memberName.toLowerCase().includes(search.toLowerCase()) ||
    m.deviceId.toLowerCase().includes(search.toLowerCase()) ||
    m.familyCode.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p style={{ color: "#8899aa" }}>Loading...</p>;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Members ({members.length})</h2>
      <input
        type="search"
        placeholder="Search by name, device ID, or family code..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", maxWidth: 400, padding: "10px 14px", background: "#1a2535", border: "1px solid #1e2d3d", borderRadius: 8, color: "#e2e8f0", fontSize: 14, marginBottom: 16 }}
      />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
            <Th>Name</Th><Th>Role</Th><Th>Child Role</Th><Th>Family Code</Th><Th>Device ID</Th><Th>Joined</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(m => (
            <tr key={m.id} style={{ borderBottom: "1px solid #1e2d3d" }}>
              <Td>{m.memberName}</Td>
              <Td><RoleBadge role={m.role} /></Td>
              <Td>{m.childRole || "-"}</Td>
              <Td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{m.familyCode}</span></Td>
              <Td><span style={{ fontFamily: "monospace", fontSize: 11, color: "#8899aa" }}>{m.deviceId.slice(0, 12)}...</span></Td>
              <Td>{new Date(m.joinedAt).toLocaleDateString("ko-KR")}</Td>
              <Td><DangerBtn onClick={() => deleteMember(m.id)}>Delete</DangerBtn></Td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><Td colSpan={7}>No members found</Td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "10px 12px", color: "#8899aa", fontSize: 12, fontWeight: 500, textTransform: "uppercase" }}>{children}</th>;
}

function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} style={{ padding: "10px 12px", fontSize: 14 }}>{children}</td>;
}

function RoleBadge({ role }: { role: string }) {
  const isParent = role === "parent";
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500,
      background: isParent ? "rgba(212,242,0,0.15)" : "rgba(96,165,250,0.15)",
      color: isParent ? "#d4f200" : "#60a5fa",
    }}>
      {role}
    </span>
  );
}

function DangerBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "4px 12px", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "families", label: "Families" },
  { key: "members", label: "Members" },
];

function App() {
  const [token, setToken] = useState<string | null>(sessionStorage.getItem("admin_token"));
  const [tab, setTab] = useState<Tab>("dashboard");
  const api = useApi(token || "");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const logout = useCallback(() => { sessionStorage.removeItem("admin_token"); setToken(null); }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!token) return;
    const exp = decodeJwtExp(token);
    if (!exp) return;
    const ms = exp - Date.now();
    if (ms <= 0) { logout(); return; }
    timerRef.current = setTimeout(logout, ms);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [token, logout]);

  if (!token) return <LoginPage onLogin={setToken} />;

  return (
    <div style={{ minHeight: "100vh", background: "#0f1923" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, borderBottom: "1px solid #1e2d3d", background: "#0f1923" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, color: "#d4f200" }}>A N B U</span>
          <nav style={{ display: "flex", gap: 4 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500,
                  background: tab === t.key ? "#1a2535" : "transparent",
                  color: tab === t.key ? "#d4f200" : "#8899aa",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <button onClick={logout} style={{ padding: "6px 16px", background: "transparent", color: "#8899aa", border: "1px solid #1e2d3d", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
          Logout
        </button>
      </header>
      <main style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
        {tab === "dashboard" && <DashboardTab api={api} />}
        {tab === "families" && <FamiliesTab api={api} />}
        {tab === "members" && <MembersTab api={api} />}
      </main>
    </div>
  );
}

export default App;
