import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";
import { api, FamilyMessage, LocationData } from "@/lib/api";

const { width } = Dimensions.get("window");

const DEMO_PHOTOS = [
  { id: 1, url: "https://images.unsplash.com/photo-1511895426328-dc8714191011?w=600&q=80", caption: "자녀가 보냈어요", time: "방금 전" },
  { id: 2, url: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=600&q=80", caption: "자녀가 보냈어요", time: "1시간 전" },
  { id: 3, url: "https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=600&q=80", caption: "자녀가 보냈어요", time: "오늘 오전" },
];

interface FloatingHeart {
  id: number;
  x: number;
  delay: number;
  anim: Animated.Value;
}

function HeartParticle({ heart }: { heart: FloatingHeart }) {
  useEffect(() => {
    Animated.timing(heart.anim, {
      toValue: 1,
      duration: 1400,
      delay: heart.delay,
      useNativeDriver: false,
    }).start();
  }, []);

  const translateY = heart.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -160] });
  const opacity = heart.anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.8, 0] });
  const scale = heart.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1.3, 1.1] });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${heart.x}%` as any,
        bottom: "30%",
        transform: [{ translateY }, { scale }],
        opacity,
        zIndex: 9999,
      }}
    >
      <Ionicons name="heart" size={28} color={COLORS.coral} />
    </Animated.View>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return `${Math.floor(diffHr / 24)}일 전`;
}

export default function ParentScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, myName, isConnected } = useFamilyContext();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [heartedPhotos, setHeartedPhotos] = useState<Record<number, number>>({});
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setPhotoIndex((i) => (i + 1) % DEMO_PHOTOS.length);
    }, 3500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const loadData = useCallback(async () => {
    if (!familyCode) return;
    try {
      const [msgs, locs] = await Promise.all([
        api.getMessages(familyCode),
        api.getAllLocations(familyCode),
      ]);
      setMessages(msgs);
      setLocations(locs);
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }, [familyCode]);

  useEffect(() => {
    if (familyCode) {
      setLoadingMsgs(true);
      loadData().finally(() => setLoadingMsgs(false));
      // Poll every 10s
      refreshRef.current = setInterval(loadData, 10000);
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [familyCode, loadData]);

  const spawnHearts = useCallback(() => {
    const newHearts: FloatingHeart[] = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 70 + 10,
      delay: i * 80,
      anim: new Animated.Value(0),
    }));
    setFloatingHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.some((n) => n.id === h.id)));
    }, 1600);
  }, []);

  const heartPhoto = (id: number) => {
    setHeartedPhotos((p) => ({ ...p, [id]: (p[id] || 0) + 1 }));
    spawnHearts();
  };

  const heartMessage = async (msg: FamilyMessage) => {
    spawnHearts();
    if (!familyCode) return;
    try {
      const updated = await api.heartMessage(familyCode, msg.id);
      setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
    } catch {
      // Optimistic update fallback
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, hearts: m.hearts + 1 } : m));
    }
  };

  const childLocations = locations.filter(l => l.isSharing);

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {floatingHearts.map((h) => (
        <HeartParticle key={h.id} heart={h} />
      ))}

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>마음잇기</Text>
          {isConnected && myName && (
            <Text style={styles.headerSub}>{myName} · 부모님 화면</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {isConnected && familyCode && (
            <View style={styles.codeChip}>
              <Ionicons name="link" size={11} color={COLORS.coral} />
              <Text style={styles.codeChipText}>{familyCode}</Text>
            </View>
          )}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={COLORS.parent.textSub} />
            <Text style={styles.backBtnText}>나가기</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo slideshow */}
        <View style={styles.photoCard}>
          <View style={styles.photoSlide}>
            <Animated.Image
              source={{ uri: DEMO_PHOTOS[photoIndex].url }}
              style={styles.photoImage}
              resizeMode="cover"
            />
            <View style={styles.photoOverlay} />
            <View style={styles.photoBottom}>
              <View style={styles.photoCaptionRow}>
                <View style={styles.senderBadge}>
                  <Ionicons name="image" size={14} color={COLORS.white} />
                </View>
                <View>
                  <Text style={styles.photoCaption}>{DEMO_PHOTOS[photoIndex].caption}</Text>
                  <Text style={styles.photoTime}>{DEMO_PHOTOS[photoIndex].time}</Text>
                </View>
              </View>
              <Pressable onPress={() => heartPhoto(photoIndex)} style={styles.heartBtn}>
                <Ionicons
                  name="heart"
                  size={20}
                  color={heartedPhotos[photoIndex] > 0 ? COLORS.coral : "rgba(255,255,255,0.6)"}
                />
                {(heartedPhotos[photoIndex] || 0) > 0 && (
                  <Text style={styles.heartCount}>{heartedPhotos[photoIndex]}</Text>
                )}
              </Pressable>
            </View>
            <View style={styles.indicators}>
              {DEMO_PHOTOS.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => setPhotoIndex(i)}
                  style={[styles.indicator, { width: i === photoIndex ? 22 : 7, backgroundColor: i === photoIndex ? COLORS.white : "rgba(255,255,255,0.35)" }]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Location status */}
        {childLocations.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>위치 현황</Text>
            {childLocations.map((loc) => {
              const updatedAgo = formatTime(loc.updatedAt);
              return (
                <View key={loc.deviceId} style={styles.locationCard}>
                  <View style={styles.locationIcon}>
                    <Ionicons name="location" size={18} color="#4ade80" />
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{loc.memberName}</Text>
                    <Text style={styles.locationValue}>
                      {loc.address || `위도 ${loc.latitude.toFixed(4)}, 경도 ${loc.longitude.toFixed(4)}`}
                    </Text>
                    <Text style={styles.locationTime}>{updatedAgo}</Text>
                  </View>
                  <View style={styles.safeChip}>
                    <View style={styles.safeDot} />
                    <Text style={styles.safeText}>안전</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.noLocationCard}>
            <Ionicons name="location-outline" size={28} color={COLORS.parent.textMuted} />
            <Text style={styles.noLocationText}>자녀가 위치를 공유하면 여기에 표시돼요</Text>
          </View>
        )}

        {/* Messages */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>자녀들의 안부</Text>
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>실시간</Text>
            </View>
          </View>

          {loadingMsgs && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={COLORS.parent.textSub} />
            </View>
          )}

          {!loadingMsgs && messages.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="mail-outline" size={32} color={COLORS.parent.textMuted} />
              <Text style={styles.emptyText}>
                {isConnected
                  ? "자녀에게 연결 코드를 공유해보세요"
                  : "가족 연결 후 안부 메시지가 표시됩니다"}
              </Text>
              {!isConnected && (
                <Pressable style={styles.setupBtn} onPress={() => router.push("/setup")}>
                  <Text style={styles.setupBtnText}>가족 연결하기</Text>
                </Pressable>
              )}
            </View>
          )}

          {messages.map((msg) => (
            <View key={msg.id} style={styles.msgCard}>
              <View style={styles.msgAvatar}>
                <Text style={styles.msgAvatarText}>{msg.fromName[0]}</Text>
              </View>
              <View style={styles.msgBody}>
                <Text style={styles.msgSender}>{msg.fromName} · {formatTime(msg.createdAt)}</Text>
                <Text style={styles.msgText}>{msg.text}</Text>
              </View>
              <Pressable onPress={() => heartMessage(msg)} style={styles.msgHeartBtn}>
                <Ionicons name="heart" size={22} color={msg.hearts > 0 ? COLORS.coral : "rgba(255,255,255,0.3)"} />
                <Text style={styles.msgHeartCount}>{msg.hearts}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.parent.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: COLORS.parent.text,
    letterSpacing: 2,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.parent.textSub,
    marginTop: 2,
  },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 6 },
  codeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(232,133,106,0.12)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(232,133,106,0.2)",
  },
  codeChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: COLORS.coral,
    letterSpacing: 1,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  backBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.parent.textSub,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  photoCard: {
    borderRadius: 24,
    overflow: "hidden",
    aspectRatio: 4 / 3,
    backgroundColor: "#111",
    marginBottom: 20,
  },
  photoSlide: { flex: 1, position: "relative" },
  photoImage: { width: "100%", height: "100%" },
  photoOverlay: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: "55%",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  photoBottom: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 18,
  },
  photoCaptionRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  senderBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.coral,
    alignItems: "center", justifyContent: "center",
  },
  photoCaption: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.white, marginBottom: 2 },
  photoTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)" },
  heartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heartCount: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.white },
  indicators: {
    position: "absolute",
    top: 14, right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  indicator: { height: 6, borderRadius: 3 },
  section: { marginBottom: 20 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: COLORS.parent.textSub,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(74,222,128,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  liveText: { fontFamily: "Inter_500Medium", fontSize: 11, color: "#4ade80" },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74,222,128,0.06)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.15)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  locationIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(74,222,128,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  locationInfo: { flex: 1 },
  locationName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.parent.text, marginBottom: 2 },
  locationValue: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.parent.textSub, marginBottom: 2 },
  locationTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.parent.textMuted },
  safeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(74,222,128,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  safeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  safeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#4ade80" },
  noLocationCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.parent.bgCard,
    borderRadius: 18,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.parent.bgCardBorder,
    gap: 8,
  },
  noLocationText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.parent.textMuted,
    textAlign: "center",
  },
  loadingRow: { alignItems: "center", padding: 20 },
  emptyCard: {
    alignItems: "center",
    backgroundColor: COLORS.parent.bgCard,
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: COLORS.parent.bgCardBorder,
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.parent.textMuted,
    textAlign: "center",
  },
  setupBtn: {
    backgroundColor: COLORS.coral,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  setupBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.white },
  msgCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.parent.bgCard,
    borderWidth: 1,
    borderColor: COLORS.parent.bgCardBorder,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  msgAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.coral,
    alignItems: "center", justifyContent: "center",
  },
  msgAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.white },
  msgBody: { flex: 1 },
  msgSender: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.coral, marginBottom: 5 },
  msgText: { fontFamily: "Inter_400Regular", fontSize: 15, color: COLORS.parent.text, lineHeight: 22 },
  msgHeartBtn: { alignItems: "center", paddingTop: 2, gap: 3 },
  msgHeartCount: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.coral },
});
