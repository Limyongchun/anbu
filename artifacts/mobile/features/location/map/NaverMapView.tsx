import React, { useMemo, useRef, useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform, ActivityIndicator } from "react-native";
import type { ParentLocation } from "./mapTypes";
import { getStatusText, getNoDataLabel, MOCK_PARENT_LOCATION } from "./mapUtils";

const NAVER_CLIENT_ID = "0v9ub0stzj";

const USE_MOCK = true;

interface NaverMapViewProps {
  location: ParentLocation | null;
  lang: string;
}

function buildMapHtml(loc: ParentLocation, lang: string): string {
  const status = getStatusText(loc.motionState, loc.capturedAt, lang);
  const diffMin = (Date.now() - new Date(loc.capturedAt).getTime()) / 60000;
  const isDelayed = diffMin > 5;
  const isMoving = loc.motionState === "moving";

  const dotColor = isMoving ? "#34C759" : "#FF9500";
  const freshnessColor = isDelayed ? "#E85D3A" : "#999";
  const pulseAnim = isMoving
    ? `@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(52,199,89,0.5)}70%{box-shadow:0 0 0 12px rgba(52,199,89,0)}100%{box-shadow:0 0 0 0 rgba(52,199,89,0)}} .marker-ring{animation:pulse 2s infinite}`
    : "";

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%}
${pulseAnim}
.info-card{
  position:absolute;bottom:24px;left:16px;right:16px;
  background:#fff;border-radius:16px;
  padding:16px 20px;
  box-shadow:0 4px 20px rgba(0,0,0,0.12);
  z-index:100;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
}
.info-name{font-size:17px;font-weight:700;color:#2D2D2D;margin-bottom:6px}
.info-status{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.info-dot{width:8px;height:8px;border-radius:50%;background:${dotColor}}
.info-motion{font-size:14px;color:#555}
.info-freshness{font-size:13px;color:${freshnessColor};margin-top:2px}
</style>
<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CLIENT_ID}"></script>
</head><body>
<div id="map"></div>
<div class="info-card">
  <div class="info-name">${escapeHtml(loc.parentName)}</div>
  ${status.motion ? `<div class="info-status"><div class="info-dot"></div><span class="info-motion">${escapeHtml(status.motion)}</span></div>` : ""}
  <div class="info-freshness">${escapeHtml(status.freshness)}</div>
</div>
<script>
var map = new naver.maps.Map('map', {
  center: new naver.maps.LatLng(${loc.lat}, ${loc.lng}),
  zoom: 16,
  zoomControl: true,
  zoomControlOptions: {
    position: naver.maps.Position.RIGHT_CENTER,
    style: naver.maps.ZoomControlStyle.SMALL
  },
  mapTypeControl: false,
  scaleControl: false,
  logoControl: true,
  logoControlOptions: { position: naver.maps.Position.BOTTOM_LEFT }
});

var markerEl = document.createElement('div');
markerEl.className = 'marker-ring';
markerEl.style.cssText = 'width:28px;height:28px;border-radius:50%;background:${dotColor};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;';

var marker = new naver.maps.Marker({
  position: new naver.maps.LatLng(${loc.lat}, ${loc.lng}),
  map: map,
  icon: {
    content: markerEl.outerHTML,
    anchor: new naver.maps.Point(14, 14)
  }
});

var circle = new naver.maps.Circle({
  map: map,
  center: new naver.maps.LatLng(${loc.lat}, ${loc.lng}),
  radius: ${loc.accuracy},
  fillColor: '${dotColor}',
  fillOpacity: 0.08,
  strokeColor: '${dotColor}',
  strokeOpacity: 0.2,
  strokeWeight: 1
});

window.addEventListener('message', function(e) {
  try {
    var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (msg.type === 'updateLocation') {
      var p = msg.data;
      var pos = new naver.maps.LatLng(p.lat, p.lng);
      marker.setPosition(pos);
      circle.setCenter(pos);
      if (p.accuracy) circle.setRadius(p.accuracy);
      map.panTo(pos);
    }
  } catch(ex) {}
});
if(window.ReactNativeWebView){
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapReady'}));
}
</script>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function NoDataView({ lang }: { lang: string }) {
  return (
    <View style={styles.noData}>
      <Text style={styles.noDataIcon}>📍</Text>
      <Text style={styles.noDataText}>{getNoDataLabel(lang)}</Text>
    </View>
  );
}

function WebNaverMap({ loc, lang }: { loc: ParentLocation; lang: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = document.querySelector(`script[src*="oapi.map.naver.com"]`);
    if (existing) {
      if ((window as any).naver?.maps) {
        setLoaded(true);
      } else {
        existing.addEventListener("load", () => setLoaded(true));
        existing.addEventListener("error", () => setError(true));
      }
      return;
    }
    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CLIENT_ID}`;
    script.async = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => setError(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current || !(window as any).naver?.maps) return;
    const N = (window as any).naver.maps;
    const center = new N.LatLng(loc.lat, loc.lng);

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new N.Map(mapRef.current, {
        center,
        zoom: 16,
        zoomControl: true,
        zoomControlOptions: {
          position: N.Position.RIGHT_CENTER,
          style: N.ZoomControlStyle.SMALL,
        },
        mapTypeControl: false,
        scaleControl: false,
        logoControl: true,
        logoControlOptions: { position: N.Position.BOTTOM_LEFT },
      });

      const isMoving = loc.motionState === "moving";
      const dotColor = isMoving ? "#34C759" : "#FF9500";
      const pulseClass = isMoving ? "marker-ring" : "";

      const style = document.createElement("style");
      style.textContent = `@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(52,199,89,0.5)}70%{box-shadow:0 0 0 12px rgba(52,199,89,0)}100%{box-shadow:0 0 0 0 rgba(52,199,89,0)}}.marker-ring{animation:pulse 2s infinite}`;
      document.head.appendChild(style);

      const markerEl = document.createElement("div");
      markerEl.className = pulseClass;
      markerEl.style.cssText = `width:28px;height:28px;border-radius:50%;background:${dotColor};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;`;

      markerRef.current = new N.Marker({
        position: center,
        map: mapInstanceRef.current,
        icon: { content: markerEl.outerHTML, anchor: new N.Point(14, 14) },
      });

      circleRef.current = new N.Circle({
        map: mapInstanceRef.current,
        center,
        radius: loc.accuracy,
        fillColor: dotColor,
        fillOpacity: 0.08,
        strokeColor: dotColor,
        strokeOpacity: 0.2,
        strokeWeight: 1,
      });
    } else {
      markerRef.current?.setPosition(center);
      circleRef.current?.setCenter(center);
      mapInstanceRef.current?.panTo(center);
    }
  }, [loaded, loc.lat, loc.lng]);

  const status = getStatusText(loc.motionState, loc.capturedAt, lang);
  const diffMin = (Date.now() - new Date(loc.capturedAt).getTime()) / 60000;
  const isDelayed = diffMin > 5;
  const isMoving = loc.motionState === "moving";
  const dotColor = isMoving ? "#34C759" : "#FF9500";

  if (error) {
    return (
      <View style={styles.noData}>
        <Text style={styles.noDataIcon}>🗺️</Text>
        <Text style={styles.noDataText}>지도를 불러올 수 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!loaded && (
        <View style={[StyleSheet.absoluteFillObject, styles.loadingOverlay]}>
          <ActivityIndicator size="large" color="#D4843A" />
        </View>
      )}
      {/* @ts-ignore */}
      <div ref={mapRef} style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />
      {/* @ts-ignore */}
      <div style={{
        position: "absolute",
        bottom: 24,
        left: 16,
        right: 16,
        background: "#fff",
        borderRadius: 16,
        padding: "16px 20px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        zIndex: 100,
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      }}>
        {/* @ts-ignore */}
        <div style={{ fontSize: 17, fontWeight: 700, color: "#2D2D2D", marginBottom: 6 }}>
          {loc.parentName}
        </div>
        {status.motion && (
          // @ts-ignore
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            {/* @ts-ignore */}
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
            {/* @ts-ignore */}
            <span style={{ fontSize: 14, color: "#555" }}>{status.motion}</span>
          </div>
        )}
        {/* @ts-ignore */}
        <div style={{ fontSize: 13, color: isDelayed ? "#E85D3A" : "#999", marginTop: 2 }}>
          {status.freshness}
        </div>
      </div>
    </View>
  );
}

export default function NaverMapView({ location: externalLoc, lang }: NaverMapViewProps) {
  const loc = USE_MOCK ? MOCK_PARENT_LOCATION : externalLoc;

  if (!loc) return <NoDataView lang={lang} />;

  if (Platform.OS === "web") {
    return <WebNaverMap loc={loc} lang={lang} />;
  }

  const mapHtml = buildMapHtml(loc, lang);
  const WebView = require("react-native-webview").default;
  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: mapHtml }}
        style={StyleSheet.absoluteFillObject}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} color="#D4843A" />}
        scrollEnabled={false}
        bounces={false}
        onMessage={(event: any) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === "mapReady") {
              console.log("[NaverMap] ready");
            }
          } catch {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5EDED",
  },
  loadingOverlay: {
    backgroundColor: "#F5EDED",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  noData: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5EDED",
    gap: 12,
  },
  noDataIcon: {
    fontSize: 40,
  },
  noDataText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 24,
  },
});
