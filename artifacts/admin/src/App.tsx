import { useState, useEffect, useCallback, useRef } from "react";
import "./index.css";

const API = "/api";

function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch { return null; }
}

type Tab = "dashboard" | "families" | "members" | "inquiries";

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

  const post = useCallback(async (path: string, body?: unknown) => {
    const r = await fetch(`${API}${path}`, { method: "POST", headers, body: body ? JSON.stringify(body) : undefined });
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

interface InquiryRow {
  id: number;
  userId: string | null;
  userName: string;
  userEmail: string;
  title: string;
  content: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

function InquiriesTab({ api }: { api: ReturnType<typeof useApi> }) {
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InquiryRow | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/admin/inquiries").then(d => { setInquiries(Array.isArray(d) ? d : []); setLoading(false); });
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const deleteInquiry = async (id: number) => {
    if (!confirm("Delete this inquiry?")) return;
    await api.del(`/admin/inquiries/${id}`);
    if (selected?.id === id) setSelected(null);
    load();
  };

  const saveReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSaving(true);
    await api.post(`/admin/inquiries/${selected.id}/reply`, { reply: replyText.trim() });
    setSaving(false);
    setSelected(null);
    setReplyText("");
    load();
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openMailto = (inq: InquiryRow) => {
    const subject = encodeURIComponent(`[ANBU] ${inq.title} - 문의 답변드립니다`);
    const body = encodeURIComponent(`안녕하세요 ${inq.userName}님,\n\nANBU를 이용해주셔서 감사합니다.\n\n문의하신 내용에 대해 답변드립니다:\n\n---\n\n\n\n---\n\n추가 문의사항이 있으시면 언제든 연락해주세요.\n\n감사합니다.\nANBU 팀`);
    window.open(`mailto:${inq.userEmail}?subject=${subject}&body=${body}`);
  };

  if (loading) return <p style={{ color: "#8899aa" }}>Loading...</p>;

  if (selected) {
    return (
      <div>
        <button onClick={() => { setSelected(null); setReplyText(""); }} style={{ padding: "6px 16px", background: "transparent", color: "#8899aa", border: "1px solid #1e2d3d", borderRadius: 6, fontSize: 13, cursor: "pointer", marginBottom: 20 }}>
          &larr; Back to list
        </button>
        <div style={{ background: "#152030", borderRadius: 12, padding: 24, border: "1px solid #1e2d3d" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{selected.title}</h3>
              <div style={{ color: "#8899aa", fontSize: 13 }}>
                {selected.userName} &middot; {new Date(selected.createdAt).toLocaleString("ko-KR")}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => openMailto(selected)} style={{ padding: "8px 16px", background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                ✉ Reply via Email
              </button>
              <DangerBtn onClick={() => deleteInquiry(selected.id)}>Delete</DangerBtn>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "10px 14px", background: "#1a2535", borderRadius: 8, border: "1px solid #1e2d3d" }}>
            <span style={{ color: "#8899aa", fontSize: 13 }}>Email:</span>
            <a href={`mailto:${selected.userEmail}`} style={{ color: "#d4f200", fontSize: 14, textDecoration: "none" }}>{selected.userEmail}</a>
            <button onClick={() => copyContent(selected.userEmail)} style={{ padding: "2px 8px", background: "rgba(212,242,0,0.1)", color: "#d4f200", border: "1px solid rgba(212,242,0,0.2)", borderRadius: 4, fontSize: 11, cursor: "pointer", marginLeft: "auto" }}>
              Copy
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: "#8899aa", fontSize: 12, textTransform: "uppercase" }}>Inquiry Content</span>
              <button onClick={() => copyContent(selected.content)} style={{ padding: "2px 8px", background: "rgba(212,242,0,0.1)", color: "#d4f200", border: "1px solid rgba(212,242,0,0.2)", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>
                Copy
              </button>
            </div>
            <div style={{ padding: 16, background: "#1a2535", borderRadius: 8, border: "1px solid #1e2d3d", whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}>
              {selected.content}
            </div>
          </div>

          {selected.userId && (
            <div style={{ color: "#8899aa", fontSize: 12, marginBottom: 16 }}>
              Device ID: <span style={{ fontFamily: "monospace" }}>{selected.userId}</span>
            </div>
          )}

          {selected.reply && (
            <div style={{ marginBottom: 20, padding: 16, background: "rgba(76,175,80,0.08)", borderRadius: 8, border: "1px solid rgba(76,175,80,0.2)" }}>
              <div style={{ color: "#4caf50", fontSize: 12, textTransform: "uppercase", marginBottom: 8 }}>Saved Reply ({selected.repliedAt ? new Date(selected.repliedAt).toLocaleString("ko-KR") : ""})</div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{selected.reply}</div>
            </div>
          )}

          <div style={{ borderTop: "1px solid #1e2d3d", paddingTop: 16 }}>
            <div style={{ color: "#8899aa", fontSize: 12, textTransform: "uppercase", marginBottom: 8 }}>Save Reply (optional)</div>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Paste or type your email reply here to save a record..."
              style={{ width: "100%", minHeight: 100, padding: 12, background: "#1a2535", border: "1px solid #1e2d3d", borderRadius: 8, color: "#e2e8f0", fontSize: 14, resize: "vertical" }}
            />
            <button
              onClick={saveReply}
              disabled={!replyText.trim() || saving}
              style={{ marginTop: 8, padding: "8px 20px", background: replyText.trim() ? "#d4f200" : "#1e2d3d", color: replyText.trim() ? "#0f1923" : "#555", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: replyText.trim() ? "pointer" : "default" }}
            >
              {saving ? "Saving..." : "Save Reply"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Inquiries ({inquiries.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1e2d3d" }}>
            <Th>Date</Th><Th>Name</Th><Th>Email</Th><Th>Title</Th><Th>Status</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map(inq => (
            <tr key={inq.id} style={{ borderBottom: "1px solid #1e2d3d", cursor: "pointer" }} onClick={() => { setSelected(inq); setReplyText(inq.reply || ""); }}>
              <Td>{new Date(inq.createdAt).toLocaleDateString("ko-KR")}</Td>
              <Td>{inq.userName}</Td>
              <Td><span style={{ color: "#60a5fa", fontSize: 13 }}>{inq.userEmail}</span></Td>
              <Td>{inq.title}</Td>
              <Td>
                {inq.reply ? (
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: "rgba(76,175,80,0.15)", color: "#4caf50" }}>Replied</span>
                ) : (
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: "rgba(255,193,7,0.15)", color: "#ffc107" }}>Pending</span>
                )}
              </Td>
              <Td>
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openMailto(inq)} style={{ padding: "4px 10px", background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    ✉ Mail
                  </button>
                  <DangerBtn onClick={() => deleteInquiry(inq.id)}>Delete</DangerBtn>
                </div>
              </Td>
            </tr>
          ))}
          {inquiries.length === 0 && <tr><Td colSpan={6}>No inquiries yet</Td></tr>}
        </tbody>
      </table>
    </div>
  );
}

const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "families", label: "Families" },
  { key: "members", label: "Members" },
  { key: "inquiries", label: "Inquiries" },
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
        {tab === "inquiries" && <InquiriesTab api={api} />}
      </main>
    </div>
  );
}

export default App;
