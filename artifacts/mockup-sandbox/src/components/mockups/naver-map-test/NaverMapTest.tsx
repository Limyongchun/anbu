import React, { useEffect, useRef, useState } from "react";

const NAVER_CLIENT_ID = "rg1fro3mez";

export default function NaverMapTest() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = document.querySelector(`script[src*="oapi.map.naver.com"]`);
    if (existing) {
      if ((window as any).naver?.maps) {
        setLoaded(true);
      } else {
        existing.addEventListener("load", () => setLoaded(true));
        existing.addEventListener("error", () => setError("Script load failed"));
      }
      return;
    }
    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CLIENT_ID}`;
    script.async = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => setError("Script load failed");
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const N = (window as any).naver?.maps;
    if (!N) { setError("naver.maps not available"); return; }

    try {
      const center = new N.LatLng(37.5665, 126.978);
      const map = new N.Map(mapRef.current, {
        center,
        zoom: 16,
        zoomControl: true,
        zoomControlOptions: { position: N.Position.RIGHT_CENTER, style: N.ZoomControlStyle.SMALL },
      });

      const style = document.createElement("style");
      style.textContent = `@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(52,199,89,0.5)}70%{box-shadow:0 0 0 12px rgba(52,199,89,0)}100%{box-shadow:0 0 0 0 rgba(52,199,89,0)}}.marker-ring{animation:pulse 2s infinite}`;
      document.head.appendChild(style);

      const markerEl = document.createElement("div");
      markerEl.className = "marker-ring";
      markerEl.style.cssText = "width:28px;height:28px;border-radius:50%;background:#34C759;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);";

      new N.Marker({
        position: center,
        map,
        icon: { content: markerEl.outerHTML, anchor: new N.Point(14, 14) },
      });

      new N.Circle({
        map, center, radius: 15,
        fillColor: "#34C759", fillOpacity: 0.08,
        strokeColor: "#34C759", strokeOpacity: 0.2, strokeWeight: 1,
      });
    } catch (e: any) {
      setError(e.message || "Map init error");
    }
  }, [loaded]);

  return (
    <div style={{ width: "100%", height: "100vh", background: "#F5EDED", position: "relative" }}>
      {error && (
        <div style={{ position: "absolute", top: 20, left: 20, right: 20, background: "#fee", padding: 16, borderRadius: 8, zIndex: 200, color: "#c00", fontSize: 14 }}>
          Error: {error}
        </div>
      )}
      {!loaded && !error && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 200 }}>
          Loading Naver Maps...
        </div>
      )}
      <div ref={mapRef} style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
      <div style={{
        position: "absolute", bottom: 24, left: 16, right: 16,
        background: "#fff", borderRadius: 16, padding: "16px 20px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 100,
        fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#2D2D2D", marginBottom: 6 }}>엄마</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34C759" }} />
          <span style={{ fontSize: 14, color: "#555" }}>이동 중</span>
        </div>
        <div style={{ fontSize: 13, color: "#999", marginTop: 2 }}>방금 업데이트됨</div>
      </div>
    </div>
  );
}
