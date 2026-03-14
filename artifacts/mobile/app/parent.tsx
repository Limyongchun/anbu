import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "@/constants/colors";

const { width } = Dimensions.get("window");

const photos = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1511895426328-dc8714191011?w=600&q=80",
    caption: "민준이가 보냈어요",
    sender: "민준",
    time: "방금 전",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=600&q=80",
    caption: "지은이가 보냈어요",
    sender: "지은",
    time: "1시간 전",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=600&q=80",
    caption: "민준이가 보냈어요",
    sender: "민준",
    time: "오늘 오전",
  },
];

const messages = [
  { id: 1, from: "민준", text: "엄마 오늘 날씨 좋죠? 산책 다녀오셨어요?", time: "오전 10:23", hearts: 3, avatar: "M" },
  { id: 2, from: "지은", text: "아버지 건강하게 계세요! 다음 주에 갈게요", time: "어제", hearts: 5, avatar: "J" },
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

function PhotoSlide({ photo, index, isActive, onHeart, heartCount }: {
  photo: typeof photos[0];
  index: number;
  isActive: boolean;
  onHeart: () => void;
  heartCount: number;
}) {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 1.05)).current;
  const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: isActive ? 1 : 1.05,
        duration: 700,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: isActive ? 1 : 0,
        duration: 700,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive]);

  const handleHeart = () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 120, useNativeDriver: false }),
      Animated.timing(heartScale, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
    onHeart();
  };

  if (!isActive) return null;

  return (
    <Animated.View style={[styles.photoSlide, { opacity: opacityAnim }]}>
      <Animated.Image
        source={{ uri: photo.url }}
        style={[styles.photoImage, { transform: [{ scale: scaleAnim }] }]}
        resizeMode="cover"
      />
      <View style={styles.photoGradient} />
      <View style={styles.photoBottom}>
        <View style={styles.photoCaptionRow}>
          <View style={styles.senderBadge}>
            <Text style={styles.senderBadgeText}>{photo.sender[0]}</Text>
          </View>
          <View>
            <Text style={styles.photoCaption}>{photo.caption}</Text>
            <Text style={styles.photoTime}>{photo.time}</Text>
          </View>
        </View>
        <Pressable onPress={handleHeart} style={styles.heartBtn}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons name="heart" size={22} color={heartCount > 0 ? COLORS.coral : "rgba(255,255,255,0.6)"} />
          </Animated.View>
          {heartCount > 0 && (
            <Text style={styles.heartCount}>{heartCount}</Text>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

function MessageCard({ msg, onHeart, heartCount }: {
  msg: typeof messages[0];
  onHeart: () => void;
  heartCount: number;
}) {
  const heartScale = useRef(new Animated.Value(1)).current;
  const slideIn = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, { toValue: 0, duration: 500, useNativeDriver: false }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleHeart = () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.5, duration: 120, useNativeDriver: false }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: false }),
    ]).start();
    onHeart();
  };

  return (
    <Animated.View
      style={[
        styles.msgCard,
        { transform: [{ translateX: slideIn }], opacity: opacityAnim },
      ]}
    >
      <View style={styles.msgAvatarWrap}>
        <View style={styles.msgAvatar}>
          <Text style={styles.msgAvatarText}>{msg.avatar}</Text>
        </View>
      </View>
      <View style={styles.msgBody}>
        <Text style={styles.msgSender}>{msg.from} · {msg.time}</Text>
        <Text style={styles.msgText}>{msg.text}</Text>
      </View>
      <Pressable onPress={handleHeart} style={styles.msgHeartBtn}>
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Ionicons name="heart" size={22} color={(heartCount + msg.hearts) > 0 ? COLORS.coral : "rgba(255,255,255,0.3)"} />
        </Animated.View>
        <Text style={styles.msgHeartCount}>{heartCount + msg.hearts}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ParentScreen() {
  const insets = useSafeAreaInsets();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [heartedPhotos, setHeartedPhotos] = useState<Record<number, number>>({});
  const [heartedMessages, setHeartedMessages] = useState<Record<number, number>>({});
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setPhotoIndex((i) => (i + 1) % photos.length);
    }, 3500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const spawnHearts = useCallback(() => {
    const newHearts: FloatingHeart[] = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 70 + 10,
      delay: i * 80,
      anim: new Animated.Value(0),
    }));
    setFloatingHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setFloatingHearts((prev) =>
        prev.filter((h) => !newHearts.some((n) => n.id === h.id))
      );
    }, 1600);
  }, []);

  const heartPhoto = useCallback((id: number) => {
    setHeartedPhotos((p) => ({ ...p, [id]: (p[id] || 0) + 1 }));
    spawnHearts();
  }, [spawnHearts]);

  const heartMessage = useCallback((id: number) => {
    setHeartedMessages((p) => ({ ...p, [id]: (p[id] || 0) + 1 }));
    spawnHearts();
  }, [spawnHearts]);

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {floatingHearts.map((h) => (
        <HeartParticle key={h.id} heart={h} />
      ))}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>마음잇기</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={18} color={COLORS.parent.textSub} />
          <Text style={styles.backBtnText}>나가기</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.photoContainer}>
          <View style={styles.photoCard}>
            {photos.map((photo, index) => (
              <PhotoSlide
                key={photo.id}
                photo={photo}
                index={index}
                isActive={index === photoIndex}
                onHeart={() => heartPhoto(photo.id)}
                heartCount={heartedPhotos[photo.id] || 0}
              />
            ))}
            <View style={styles.indicators}>
              {photos.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => setPhotoIndex(i)}
                  style={[
                    styles.indicator,
                    { width: i === photoIndex ? 24 : 7, backgroundColor: i === photoIndex ? COLORS.white : "rgba(255,255,255,0.35)" },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>자녀들의 안부</Text>
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>실시간</Text>
            </View>
          </View>

          {messages.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              onHeart={() => heartMessage(msg.id)}
              heartCount={heartedMessages[msg.id] || 0}
            />
          ))}
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusIcon}>
              <Ionicons name="shield-checkmark" size={18} color="#4ade80" />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>안전 상태</Text>
              <Text style={styles.statusValue}>서울 강남구 자택 · 방금 전</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>안전</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.parent.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: COLORS.parent.text,
    letterSpacing: 2,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  photoContainer: {
    marginBottom: 28,
  },
  photoCard: {
    borderRadius: 24,
    overflow: "hidden",
    aspectRatio: 4 / 3,
    backgroundColor: "#111",
    position: "relative",
  },
  photoSlide: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: "transparent",
    backgroundImage: "linear-gradient(transparent, rgba(0,0,0,0.8))",
  },
  photoBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 18,
  },
  photoCaptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  senderBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  senderBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: COLORS.white,
  },
  photoCaption: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.white,
    marginBottom: 2,
  },
  photoTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },
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
  heartCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: COLORS.white,
  },
  indicators: {
    position: "absolute",
    top: 14,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
    transition: "all 0.3s",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: COLORS.parent.textSub,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(74, 222, 128, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.2)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
  },
  liveText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#4ade80",
  },
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
  msgAvatarWrap: {
    paddingTop: 2,
  },
  msgAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  msgAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: COLORS.white,
  },
  msgBody: {
    flex: 1,
  },
  msgSender: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: COLORS.coral,
    marginBottom: 5,
  },
  msgText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: COLORS.parent.text,
    lineHeight: 22,
  },
  msgHeartBtn: {
    alignItems: "center",
    paddingTop: 2,
    gap: 3,
  },
  msgHeartCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: COLORS.coral,
  },
  statusCard: {
    backgroundColor: "rgba(74,222,128,0.06)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.15)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(74,222,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: COLORS.parent.textSub,
    marginBottom: 2,
  },
  statusValue: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.parent.text,
  },
  statusBadge: {
    backgroundColor: "rgba(74,222,128,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#4ade80",
  },
});
