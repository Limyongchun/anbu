import React, { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform, ActivityIndicator } from "react-native";
import type { ParentLocation } from "./mapTypes";
import { getStatusText, getNoDataLabel } from "./mapUtils";

const NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID || "rg1fro3mez";

const MARKER_COLORS = ["#34C759", "#FF9500", "#AF52DE"];

interface NaverMapViewProps {
  locations: ParentLocation[];
  selectedIndex?: number;
  lang: string;
  onMarkerPress?: (index: number) => void;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildMapHtml(locs: ParentLocation[], selectedIdx: number, lang: string): string {
  const sel = locs[selectedIdx] || locs[0];
  if (!sel) return "";

  const markersJs = locs.map((loc, i) => {
    const isMoving = loc.motionState === "moving";
    const dotColor = isMoving ? "#34C759" : "#FF9500";
    const pulseClass = isMoving ? "marker-ring" : "";
    return `
(function(){
  var el = document.createElement('div');
  el.className = '${pulseClass}';
  el.style.cssText = 'width:28px;height:28px;border-radius:50%;background:${dotColor};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;';
  var m = new naver.maps.Marker({
    position: new naver.maps.LatLng(${loc.lat}, ${loc.lng}),
    map: map,
    icon: { content: el.outerHTML, anchor: new naver.maps.Point(14, 14) }
  });
  var c = new naver.maps.Circle({
    map: map, center: new naver.maps.LatLng(${loc.lat}, ${loc.lng}),
    radius: ${loc.accuracy}, fillColor: '${dotColor}', fillOpacity: 0.08,
    strokeColor: '${dotColor}', strokeOpacity: 0.2, strokeWeight: 1
  });
  _markers.push({marker:m,circle:c});
  naver.maps.Event.addListener(m, 'click', function(){
    if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerClick',index:${i}}));}
    else{window.parent.postMessage(JSON.stringify({type:'markerClick',index:${i}}),'*');}
  });
})();`;
  }).join("\n");

  const status = getStatusText(sel.motionState, sel.capturedAt, lang);
  const diffMin = (Date.now() - new Date(sel.capturedAt).getTime()) / 60000;
  const isDelayed = diffMin > 5;
  const isMoving = sel.motionState === "moving";
  const dotColor = isMoving ? "#34C759" : "#FF9500";

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(52,199,89,0.5)}70%{box-shadow:0 0 0 12px rgba(52,199,89,0)}100%{box-shadow:0 0 0 0 rgba(52,199,89,0)}}
.marker-ring{animation:pulse 2s infinite}
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
.info-freshness{font-size:13px;color:${isDelayed ? "#E85D3A" : "#999"};margin-top:2px}
</style>
<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CLIENT_ID}"></script>
</head><body>
<div id="map"></div>
<div class="info-card">
  <div class="info-name">${escapeHtml(sel.parentName)}</div>
  ${status.motion ? `<div class="info-status"><div class="info-dot"></div><span class="info-motion">${escapeHtml(status.motion)}</span></div>` : ""}
  <div class="info-freshness">${escapeHtml(status.freshness)}</div>
</div>
<script>
var map = new naver.maps.Map('map', {
  center: new naver.maps.LatLng(${sel.lat}, ${sel.lng}),
  zoom: 16,
  zoomControl: true,
  zoomControlOptions: { position: naver.maps.Position.RIGHT_CENTER, style: naver.maps.ZoomControlStyle.SMALL },
  mapTypeControl: false, scaleControl: false, logoControl: true,
  logoControlOptions: { position: naver.maps.Position.BOTTOM_LEFT }
});
var _markers = [];
${markersJs}
${locs.length > 1 ? `
var bounds = new naver.maps.LatLngBounds();
${locs.map(l => `bounds.extend(new naver.maps.LatLng(${l.lat}, ${l.lng}));`).join("\n")}
map.fitBounds(bounds, { top:60, right:60, bottom:160, left:60 });
` : ""}
window.addEventListener('message', function(e) {
  try {
    var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (msg.type === 'updateLocation') {
      var p = msg.data;
      var pos = new naver.maps.LatLng(p.lat, p.lng);
      if (_markers[p.index]) {
        _markers[p.index].marker.setPosition(pos);
        _markers[p.index].circle.setCenter(pos);
        if (p.accuracy) _markers[p.index].circle.setRadius(p.accuracy);
      }
    }
  } catch(ex) {}
});
if(window.ReactNativeWebView){
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapReady'}));
}
</script>
</body></html>`;
}

function NoDataView({ lang }: { lang: string }) {
  return (
    <View style={styles.noData}>
      <Text style={styles.noDataIcon}>📍</Text>
      <Text style={styles.noDataText}>{getNoDataLabel(lang)}</Text>
    </View>
  );
}

function WebNaverMap({ locs, selectedIdx, lang, onMarkerPress }: {
  locs: ParentLocation[];
  selectedIdx: number;
  lang: string;
  onMarkerPress?: (index: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Array<{ marker: any; circle: any }>>([]);

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

    if (!mapInstanceRef.current) {
      const center = locs.length > 0
        ? new N.LatLng(locs[0].lat, locs[0].lng)
        : new N.LatLng(37.5665, 126.978);

      mapInstanceRef.current = new N.Map(mapRef.current, {
        center,
        zoom: 16,
        zoomControl: true,
        zoomControlOptions: { position: N.Position.RIGHT_CENTER, style: N.ZoomControlStyle.SMALL },
        mapTypeControl: false,
        scaleControl: false,
        logoControl: true,
        logoControlOptions: { position: N.Position.BOTTOM_LEFT },
      });

      const style = document.createElement("style");
      style.textContent = `@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(52,199,89,0.5)}70%{box-shadow:0 0 0 12px rgba(52,199,89,0)}100%{box-shadow:0 0 0 0 rgba(52,199,89,0)}}.marker-ring{animation:pulse 2s infinite}`;
      document.head.appendChild(style);
    }

    markersRef.current.forEach(m => {
      m.marker.setMap(null);
      m.circle.setMap(null);
    });
    markersRef.current = [];

    locs.forEach((loc, i) => {
      const isMoving = loc.motionState === "moving";
      const dotColor = isMoving ? "#34C759" : "#FF9500";
      const pulseClass = isMoving ? "marker-ring" : "";

      const markerEl = document.createElement("div");
      markerEl.className = pulseClass;
      markerEl.style.cssText = `width:28px;height:28px;border-radius:50%;background:${dotColor};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;`;

      const pos = new N.LatLng(loc.lat, loc.lng);
      const marker = new N.Marker({
        position: pos,
        map: mapInstanceRef.current,
        icon: { content: markerEl.outerHTML, anchor: new N.Point(14, 14) },
      });

      const circle = new N.Circle({
        map: mapInstanceRef.current,
        center: pos,
        radius: loc.accuracy,
        fillColor: dotColor,
        fillOpacity: 0.08,
        strokeColor: dotColor,
        strokeOpacity: 0.2,
        strokeWeight: 1,
      });

      N.Event.addListener(marker, "click", () => {
        onMarkerPress?.(i);
      });

      markersRef.current.push({ marker, circle });
    });

    if (locs.length > 1) {
      const bounds = new N.LatLngBounds(
        new N.LatLng(Math.min(...locs.map(l => l.lat)), Math.min(...locs.map(l => l.lng))),
        new N.LatLng(Math.max(...locs.map(l => l.lat)), Math.max(...locs.map(l => l.lng)))
      );
      mapInstanceRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 160, left: 60 });
    } else if (locs.length === 1) {
      mapInstanceRef.current.panTo(new N.LatLng(locs[0].lat, locs[0].lng));
    }
  }, [loaded, locs]);

  const sel = locs[selectedIdx] || locs[0];
  if (!sel) return <NoDataView lang={lang} />;

  const status = getStatusText(sel.motionState, sel.capturedAt, lang);
  const diffMin = (Date.now() - new Date(sel.capturedAt).getTime()) / 60000;
  const isDelayed = diffMin > 5;
  const isMoving = sel.motionState === "moving";
  const dotColor = isMoving ? "#34C759" : "#FF9500";

  if (error) {
    return (
      <View style={styles.noData}>
        <Text style={styles.noDataIcon}>🗺️</Text>
        <Text style={styles.noDataText}>{getNoDataLabel(lang)}</Text>
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
          {sel.parentName}
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

export default function NaverMapView({ locations, selectedIndex = 0, lang, onMarkerPress }: NaverMapViewProps) {
  if (locations.length === 0) return <NoDataView lang={lang} />;

  if (Platform.OS === "web") {
    return <WebNaverMap locs={locations} selectedIdx={selectedIndex} lang={lang} onMarkerPress={onMarkerPress} />;
  }

  const mapHtml = buildMapHtml(locations, selectedIndex, lang);
  const WebView = require("react-native-webview").default;
  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: mapHtml, baseUrl: "http://localhost" }}
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
            if (msg.type === "markerClick") {
              onMarkerPress?.(msg.index);
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
