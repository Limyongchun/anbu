import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { View, Text, StyleSheet, Platform, ActivityIndicator } from "react-native";
import type { ParentLocation } from "./mapTypes";
import { getNoDataLabel, getMarkerColor } from "./mapUtils";

const NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID || "rg1fro3mez";

export interface NaverMapHandle {
  zoomTo: (lat: number, lng: number, zoom?: number) => void;
}

interface NaverMapViewProps {
  locations: ParentLocation[];
  selectedIndex: number;
  lang: string;
  onMarkerPress?: (index: number) => void;
  onMapTap?: () => void;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildMarkerHtml(selected: boolean, color: string, initial: string): string {
  const size = selected ? 36 : 24;
  const border = selected ? 4 : 3;
  const fontSize = selected ? 16 : 11;
  const shadow = selected ? "0 3px 12px rgba(0,0,0,0.35)" : "0 2px 6px rgba(0,0,0,0.25)";
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border}px solid #fff;box-shadow:${shadow};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:700;color:#fff;font-family:sans-serif;transition:all 0.3s ease;">${escapeHtml(initial)}</div>`;
}

function buildMapHtml(locs: ParentLocation[], selectedIdx: number): string {
  if (locs.length === 0) return "";

  const sel = locs[selectedIdx] || locs[0];
  const markersJs = locs.map((loc, i) => {
    const color = getMarkerColor(loc.capturedAt);
    const initial = (loc.parentName || "?").charAt(0);
    const isSel = i === selectedIdx;
    const html = buildMarkerHtml(isSel, color, initial);
    const anchorSize = isSel ? 18 : 12;
    return `
(function(){
  var m = new naver.maps.Marker({
    position: new naver.maps.LatLng(${loc.lat}, ${loc.lng}),
    map: map,
    icon: { content: '${html.replace(/'/g, "\\'")}', anchor: new naver.maps.Point(${anchorSize}, ${anchorSize}) },
    zIndexOffset: ${isSel ? 100 : 0}
  });
  var c = new naver.maps.Circle({
    map: map, center: new naver.maps.LatLng(${loc.lat}, ${loc.lng}),
    radius: ${Math.max(loc.accuracy, 10)},
    fillColor: '${color}', fillOpacity: ${isSel ? 0.12 : 0.06},
    strokeColor: '${color}', strokeOpacity: ${isSel ? 0.3 : 0.15}, strokeWeight: 1
  });
  _markers.push({marker:m,circle:c,lat:${loc.lat},lng:${loc.lng}});
  naver.maps.Event.addListener(m, 'click', function(){
    if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerClick',index:${i}}));}
    else{window.parent.postMessage(JSON.stringify({type:'markerClick',index:${i}}),'*');}
  });
})();`;
  }).join("\n");

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%}
</style>
<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CLIENT_ID}"></script>
</head><body>
<div id="map"></div>
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
map.fitBounds(bounds, { top:80, right:60, bottom:200, left:60 });
` : ""}
window.addEventListener('message', function(e) {
  try {
    var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (msg.type === 'panTo' && msg.data) {
      map.panTo(new naver.maps.LatLng(msg.data.lat, msg.data.lng));
    }
    if (msg.type === 'updateLocation' && msg.data) {
      var p = msg.data;
      var pos = new naver.maps.LatLng(p.lat, p.lng);
      if (_markers[p.index]) {
        _markers[p.index].marker.setPosition(pos);
        _markers[p.index].circle.setCenter(pos);
        if (p.accuracy) _markers[p.index].circle.setRadius(p.accuracy);
        _markers[p.index].lat = p.lat;
        _markers[p.index].lng = p.lng;
      }
    }
  } catch(ex) {}
});
naver.maps.Event.addListener(map, 'click', function(){
  if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapTap'}));}
  else{window.parent.postMessage(JSON.stringify({type:'mapTap'}),'*');}
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

const WebNaverMap = forwardRef<NaverMapHandle, {
  locs: ParentLocation[];
  selectedIdx: number;
  lang: string;
  onMarkerPress?: (index: number) => void;
  onMapTap?: () => void;
}>(function WebNaverMap({ locs, selectedIdx, lang, onMarkerPress, onMapTap }, ref) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Array<{ marker: any; circle: any }>>([]);
  const prevSelectedRef = useRef(selectedIdx);

  useImperativeHandle(ref, () => ({
    zoomTo(lat: number, lng: number, zoom = 18) {
      if (mapInstanceRef.current && (window as any).naver?.maps) {
        const N = (window as any).naver.maps;
        mapInstanceRef.current.setCenter(new N.LatLng(lat, lng));
        mapInstanceRef.current.setZoom(zoom);
      }
    },
  }));

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

      const mapInst = new N.Map(mapRef.current, {
        center,
        zoom: 16,
        zoomControl: true,
        zoomControlOptions: { position: N.Position.RIGHT_CENTER, style: N.ZoomControlStyle.SMALL },
        mapTypeControl: false,
        scaleControl: false,
        logoControl: true,
        logoControlOptions: { position: N.Position.BOTTOM_LEFT },
      });
      mapInstanceRef.current = mapInst;

      N.Event.addListener(mapInst, "click", () => {
        onMapTap?.();
      });
    }

    markersRef.current.forEach(m => {
      m.marker.setMap(null);
      m.circle.setMap(null);
    });
    markersRef.current = [];

    locs.forEach((loc, i) => {
      const color = getMarkerColor(loc.capturedAt);
      const initial = (loc.parentName || "?").charAt(0);
      const isSel = i === selectedIdx;
      const html = buildMarkerHtml(isSel, color, initial);
      const anchorSize = isSel ? 18 : 12;

      const pos = new N.LatLng(loc.lat, loc.lng);
      const marker = new N.Marker({
        position: pos,
        map: mapInstanceRef.current,
        icon: { content: html, anchor: new N.Point(anchorSize, anchorSize) },
        zIndexOffset: isSel ? 100 : 0,
      });

      const circle = new N.Circle({
        map: mapInstanceRef.current,
        center: pos,
        radius: Math.max(loc.accuracy, 10),
        fillColor: color,
        fillOpacity: isSel ? 0.12 : 0.06,
        strokeColor: color,
        strokeOpacity: isSel ? 0.3 : 0.15,
        strokeWeight: 1,
      });

      N.Event.addListener(marker, "click", () => {
        onMarkerPress?.(i);
      });

      markersRef.current.push({ marker, circle });
    });

    if (locs.length > 1 && prevSelectedRef.current === selectedIdx) {
      const bounds = new N.LatLngBounds(
        new N.LatLng(Math.min(...locs.map(l => l.lat)), Math.min(...locs.map(l => l.lng))),
        new N.LatLng(Math.max(...locs.map(l => l.lat)), Math.max(...locs.map(l => l.lng)))
      );
      mapInstanceRef.current.fitBounds(bounds, { top: 80, right: 60, bottom: 200, left: 60 });
    }

    prevSelectedRef.current = selectedIdx;
  }, [loaded, locs, selectedIdx]);

  useEffect(() => {
    if (!loaded || !mapInstanceRef.current || !(window as any).naver?.maps) return;
    const N = (window as any).naver.maps;
    const sel = locs[selectedIdx];
    if (sel) {
      mapInstanceRef.current.panTo(new N.LatLng(sel.lat, sel.lng));
    }
  }, [selectedIdx, loaded]);

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
    </View>
  );
});

const NativeNaverMap = forwardRef<NaverMapHandle, {
  locs: ParentLocation[];
  selectedIdx: number;
  onMarkerPress?: (index: number) => void;
  onMapTap?: () => void;
}>(function NativeNaverMap({ locs, selectedIdx, onMarkerPress, onMapTap }, ref) {
  const webViewRef = useRef<any>(null);
  const WebView = require("react-native-webview").default;
  const mapHtml = buildMapHtml(locs, selectedIdx);

  useImperativeHandle(ref, () => ({
    zoomTo(lat: number, lng: number, zoom = 18) {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          try{map.setCenter(new naver.maps.LatLng(${lat},${lng}));map.setZoom(${zoom});}catch(e){}true;
        `);
      }
    },
  }));

  useEffect(() => {
    const sel = locs[selectedIdx];
    if (sel && webViewRef.current) {
      const msg = JSON.stringify({ type: "panTo", data: { lat: sel.lat, lng: sel.lng } });
      webViewRef.current.injectJavaScript(`
        try{var msg=${msg};var pos=new naver.maps.LatLng(msg.data.lat,msg.data.lng);map.panTo(pos);}catch(e){}true;
      `);
    }
  }, [selectedIdx]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
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
            } else if (msg.type === "mapTap") {
              onMapTap?.();
            }
          } catch {}
        }}
      />
    </View>
  );
});

const NaverMapView = forwardRef<NaverMapHandle, NaverMapViewProps>(function NaverMapView({ locations, selectedIndex, lang, onMarkerPress, onMapTap }, ref) {
  if (locations.length === 0) return <NoDataView lang={lang} />;

  if (Platform.OS === "web") {
    return <WebNaverMap ref={ref} locs={locations} selectedIdx={selectedIndex} lang={lang} onMarkerPress={onMarkerPress} onMapTap={onMapTap} />;
  }

  return <NativeNaverMap ref={ref} locs={locations} selectedIdx={selectedIndex} onMarkerPress={onMarkerPress} onMapTap={onMapTap} />;
});

export default NaverMapView;

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
