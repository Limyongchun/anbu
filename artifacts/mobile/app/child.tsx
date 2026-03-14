import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";
import { api, FamilyMessage, LocationData } from "@/lib/api";

const { width, height } = Dimensions.get("window");
type Tab = "지도" | "안부" | "선물샵";

const GIFTS = [
  { id: 1, name: "제철 과일 선물세트", price: "39,000원", icon: "nutrition" as const, category: "식품", popular: true },
  { id: 2, name: "한우 정육 세트", price: "89,000원", icon: "restaurant" as const, category: "식품", popular: false },
  { id: 3, name: "홍삼 건강세트", price: "59,000원", icon: "leaf" as const, category: "건강", popular: true },
  { id: 4, name: "꽃바구니 선물", price: "45,000원", icon: "flower" as const, category: "꽃", popular: false },
  { id: 5, name: "전통 한과 세트", price: "32,000원", icon: "cafe" as const, category: "식품", popular: false },
  { id: 6, name: "건강기능식품", price: "75,000원", icon: "fitness" as const, category: "건강", popular: true },
];

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

// ─── 박동 점 ──────────────────────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 2.2, duration: 1000, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: false }),
      ]),
    ]));
    a.start();
    return () => a.stop();
  }, []);
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: color, transform: [{ scale }], opacity }} />
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, borderWidth: 3, borderColor: "#fff", zIndex: 2 }} />
    </View>
  );
}

// ─── 전체화면 지도 ────────────────────────────────────────────────────────────
function FullscreenMap({ lat, lon }: { lat: number; lon: number }) {
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.008}%2C${lat - 0.006}%2C${lon + 0.008}%2C${lat + 0.006}&layer=mapnik&marker=${lat}%2C${lon}`;
  if (Platform.OS === "web") {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        {/* @ts-ignore */}
        <iframe src={mapSrc} style={{ width: "100%", height: "100%", border: "none" }} title="부모님 위치" />
      </View>
    );
  }
  // Native: styled map background
  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#d4e8c2", overflow: "hidden" }]}>
      {Array.from({ length: 12 }).map((_, i) => (
        <View key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${(i + 1) * 8}%` as any, height: 1, backgroundColor: "rgba(100,140,70,0.2)" }} />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${(i + 1) * 12}%` as any, width: 1, backgroundColor: "rgba(100,140,70,0.2)" }} />
      ))}
      <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}>
        <PulsingDot color="#ef4444" />
      </View>
    </View>
  );
}

// ─── 지도 탭 (전체화면) ────────────────────────────────────────────────────────
function MapTab({ familyCode, topInset, bottomInset }: { familyCode: string | null; topInset: number; bottomInset: number }) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const cardSlide = useRef(new Animated.Value(100)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  const loadLocations = useCallback(async () => {
    if (!familyCode) return;
    try {
      const locs = await api.getAllLocations(familyCode);
      setLocations(locs);
      setLastRefresh(new Date());
    } catch {}
  }, [familyCode]);

  useEffect(() => {
    if (!familyCode) return;
    setLoading(true);
    loadLocations().finally(() => setLoading(false));
    const iv = setInterval(loadLocations, 30000);
    return () => clearInterval(iv);
  }, [familyCode, loadLocations]);

  const parentLoc = locations.find(l => l.role === "parent" && l.isSharing) ?? null;

  useEffect(() => {
    if (parentLoc) {
      Animated.parallel([
        Animated.spring(cardSlide, { toValue: 0, useNativeDriver: false }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      ]).start();
    }
  }, [!!parentLoc]);

  const openInMaps = () => {
    if (!parentLoc) return;
    const { latitude: lat, longitude: lon } = parentLoc;
    const url = Platform.OS === "ios"
      ? `maps://maps.apple.com/maps?q=${lat},${lon}`
      : Platform.OS === "android"
        ? `geo:${lat},${lon}?q=${lat},${lon}`
        : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`)
    );
  };

  const minsAgo = parentLoc ? Math.floor((Date.now() - new Date(parentLoc.updatedAt).getTime()) / 60000) : 0;
  const isRecent = minsAgo < 5;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* ── 지도 배경 ── */}
      {parentLoc ? (
        <FullscreenMap lat={parentLoc.latitude} lon={parentLoc.longitude} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#e8f0e2" }]}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: `${(i + 1) * 9}%` as any, height: 1, backgroundColor: "rgba(100,140,70,0.15)" }} />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${(i + 1) * 13}%` as any, width: 1, backgroundColor: "rgba(100,140,70,0.15)" }} />
          ))}
        </View>
      )}

      {/* ── 상단 그라디언트 마스크 ── */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 120, backgroundColor: "rgba(0,0,0,0.18)" }} pointerEvents="none" />

      {/* ── 하단 그라디언트 마스크 ── */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 240, backgroundColor: "rgba(0,0,0,0.35)" }} pointerEvents="none" />

      {/* ── 로딩 오버레이 ── */}
      {loading && (
        <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.2)" }]}>
          <View style={mapStyles.loadingCard}>
            <ActivityIndicator color={COLORS.child.accent} />
            <Text style={mapStyles.loadingText}>위치 불러오는 중...</Text>
          </View>
        </View>
      )}

      {/* ── 위치 없음 안내 (연결 X 또는 공유 중 아님) ── */}
      {!loading && !parentLoc && (
        <View style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center" }]}>
          <View style={mapStyles.emptyCard}>
            <View style={mapStyles.emptyIconRing}>
              <Ionicons name="location-outline" size={32} color={COLORS.child.accent} />
            </View>
            <Text style={mapStyles.emptyTitle}>
              {!familyCode ? "가족을 연결해주세요" : "부모님 위치를 기다리는 중"}
            </Text>
            <Text style={mapStyles.emptyDesc}>
              {!familyCode
                ? "가족 코드를 입력하면 위치를 확인할 수 있어요"
                : "부모님이 앱을 실행하면 이 곳에 표시됩니다"}
            </Text>
            {!familyCode && (
              <Pressable style={mapStyles.emptyBtn} onPress={() => router.push("/setup")}>
                <Ionicons name="link" size={15} color="#fff" />
                <Text style={mapStyles.emptyBtnText}>연결하기</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* ── 부모님 위치 정보 카드 ── */}
      {parentLoc && (
        <Animated.View style={[mapStyles.infoCard, { transform: [{ translateY: cardSlide }], opacity: cardOpacity, bottom: bottomInset + 100 }]}>
          {/* 상태 + 이름 */}
          <View style={mapStyles.infoTop}>
            <View style={mapStyles.avatarWrap}>
              <Ionicons name="person" size={18} color="#fff" />
              <View style={[mapStyles.statusDot, { backgroundColor: isRecent ? "#4ade80" : "#fbbf24" }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={mapStyles.infoName}>{parentLoc.memberName}</Text>
              <Text style={mapStyles.infoTime}>
                {isRecent ? "안전 · 방금 업데이트" : `${minsAgo}분 전 업데이트`}
              </Text>
            </View>
            {/* 아이콘 액션 버튼 */}
            <View style={mapStyles.actionRow}>
              <Pressable onPress={() => Linking.openURL("tel:")} style={mapStyles.iconBtn}>
                <Ionicons name="call" size={18} color="#4ade80" />
              </Pressable>
              <Pressable onPress={openInMaps} style={mapStyles.iconBtn}>
                <Ionicons name="navigate" size={18} color="#818cf8" />
              </Pressable>
              <Pressable onPress={loadLocations} style={mapStyles.iconBtn}>
                <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
          </View>

          {/* 주소 */}
          <View style={mapStyles.addressRow}>
            <Ionicons name="location" size={13} color={COLORS.child.accent} />
            <Text style={mapStyles.addressText} numberOfLines={1}>
              {parentLoc.address || `${parentLoc.latitude.toFixed(5)}, ${parentLoc.longitude.toFixed(5)}`}
            </Text>
            {parentLoc.accuracy != null && (
              <Text style={mapStyles.accuracyText}>±{Math.round(parentLoc.accuracy)}m</Text>
            )}
          </View>
        </Animated.View>
      )}

      {/* ── 새로고침 (위치 없을 때) ── */}
      {!loading && !parentLoc && familyCode && (
        <Pressable onPress={loadLocations} style={[mapStyles.refreshFab, { bottom: bottomInset + 104 }]}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

// ─── 사진 뷰어 ────────────────────────────────────────────────────────────────
function PhotoViewer({ uri, visible, onClose, onDelete, canDelete }: {
  uri: string; visible: boolean; onClose: () => void; onDelete?: () => void; canDelete?: boolean;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={anbuStyles.viewerOverlay}>
        <Pressable style={anbuStyles.viewerClose} onPress={onClose}>
          <Ionicons name="close-circle" size={36} color="#fff" />
        </Pressable>
        <Image source={{ uri }} style={[anbuStyles.viewerImg, { height: height * 0.72 }]} resizeMode="contain" />
        {canDelete && onDelete && (
          <Pressable style={anbuStyles.viewerDeleteBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={anbuStyles.viewerDeleteText}>삭제</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

// ─── 안부 탭 ──────────────────────────────────────────────────────────────────
function AnbuTab({ familyCode, myName, myRole, deviceId }: {
  familyCode: string | null; myName: string | null; myRole: string | null; deviceId: string;
}) {
  const [subView, setSubView] = useState<"messages" | "gallery">("messages");
  const [messageText, setMessageText] = useState("");
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerMsgId, setViewerMsgId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const photoMessages = messages.filter(m => !!m.photoData);
  const THUMB = (width - 52) / 3;

  const load = useCallback(async () => {
    if (!familyCode) return;
    try { setMessages(await api.getMessages(familyCode)); } catch {}
  }, [familyCode]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [load]);

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("권한 필요", "사진 라이브러리 접근 권한이 필요합니다."); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.6, base64: true });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; setAttachedPhoto(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri); }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("권한 필요", "카메라 접근 권한이 필요합니다."); return; }
    const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6, base64: true });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; setAttachedPhoto(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri); }
  };

  const pickPhoto = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options: ["취소", "카메라로 찍기", "앨범에서 선택"], cancelButtonIndex: 0 }, i => { if (i === 1) pickFromCamera(); if (i === 2) pickFromLibrary(); });
    } else {
      Alert.alert("사진 첨부", "", [{ text: "취소", style: "cancel" }, { text: "카메라", onPress: pickFromCamera }, { text: "갤러리", onPress: pickFromLibrary }]);
    }
  };

  const send = async () => {
    if ((!messageText.trim() && !attachedPhoto) || !familyCode || !myName || !myRole) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(familyCode, deviceId, myName, myRole, messageText.trim(), attachedPhoto || null);
      setMessages(p => [msg, ...p]);
      setMessageText(""); setAttachedPhoto(null);
      setSent(true); setTimeout(() => setSent(false), 2000);
    } catch {}
    finally { setSending(false); }
  };

  const deleteMsg = async (id: number) => {
    if (!familyCode) return;
    Alert.alert("메시지 삭제", "삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: async () => {
        setDeletingId(id);
        try {
          await api.deleteMessage(familyCode, id, deviceId);
          setMessages(p => p.filter(m => m.id !== id));
          if (viewerMsgId === id) { setViewerUri(null); setViewerMsgId(null); }
        } catch { Alert.alert("오류", "삭제에 실패했습니다."); }
        finally { setDeletingId(null); }
      }},
    ]);
  };

  const canDelete = (msg: FamilyMessage) => msg.deviceId === deviceId;

  return (
    <>
      {viewerUri && (
        <PhotoViewer uri={viewerUri} visible={!!viewerUri} onClose={() => { setViewerUri(null); setViewerMsgId(null); }}
          canDelete={viewerMsgId !== null && messages.find(m => m.id === viewerMsgId)?.deviceId === deviceId}
          onDelete={() => { if (viewerMsgId) deleteMsg(viewerMsgId); setViewerUri(null); setViewerMsgId(null); }} />
      )}
      <ScrollView style={anbuStyles.scroll} contentContainerStyle={anbuStyles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!familyCode && (
          <View style={anbuStyles.connectBanner}>
            <Ionicons name="link-outline" size={24} color={COLORS.child.textMuted} />
            <Text style={anbuStyles.connectText}>가족 연결 후 안부를 주고받을 수 있어요</Text>
            <Pressable onPress={() => router.push("/setup")} style={anbuStyles.connectBtn}>
              <Ionicons name="link" size={14} color="#fff" />
              <Text style={anbuStyles.connectBtnText}>연결하기</Text>
            </Pressable>
          </View>
        )}

        {/* 세그먼트 */}
        <View style={anbuStyles.segment}>
          <Pressable onPress={() => setSubView("messages")} style={[anbuStyles.segBtn, subView === "messages" && anbuStyles.segBtnActive]}>
            <Ionicons name="chatbubble-ellipses" size={16} color={subView === "messages" ? COLORS.child.accent : COLORS.child.tabInactive} />
            <Text style={[anbuStyles.segText, subView === "messages" && anbuStyles.segTextActive]}>메시지</Text>
          </Pressable>
          <Pressable onPress={() => setSubView("gallery")} style={[anbuStyles.segBtn, subView === "gallery" && anbuStyles.segBtnActive]}>
            <Ionicons name="images" size={16} color={subView === "gallery" ? COLORS.child.accent : COLORS.child.tabInactive} />
            <Text style={[anbuStyles.segText, subView === "gallery" && anbuStyles.segTextActive]}>
              갤러리{photoMessages.length > 0 ? ` (${photoMessages.length})` : ""}
            </Text>
          </Pressable>
        </View>

        {subView === "messages" && (
          <>
            {sent && (
              <View style={anbuStyles.toast}>
                <Ionicons name="checkmark-circle" size={15} color="#4ade80" />
                <Text style={anbuStyles.toastText}>부모님께 전송됐어요</Text>
              </View>
            )}
            {/* 작성 카드 */}
            <View style={anbuStyles.compose}>
              {attachedPhoto && (
                <View style={anbuStyles.attachWrap}>
                  <Image source={{ uri: attachedPhoto }} style={anbuStyles.attachImg} resizeMode="cover" />
                  <Pressable style={anbuStyles.attachRemove} onPress={() => setAttachedPhoto(null)}>
                    <Ionicons name="close-circle" size={22} color="#fff" />
                  </Pressable>
                </View>
              )}
              <TextInput style={anbuStyles.input} value={messageText} onChangeText={setMessageText}
                placeholder="부모님께 안부를 전해요..." placeholderTextColor={COLORS.child.textMuted}
                multiline maxLength={200} />
              <View style={anbuStyles.composeBar}>
                {/* 아이콘 버튼만 */}
                <Pressable onPress={pickFromCamera} style={anbuStyles.iconAction}>
                  <Ionicons name="camera" size={20} color={COLORS.child.accent} />
                </Pressable>
                <Pressable onPress={pickFromLibrary} style={anbuStyles.iconAction}>
                  <Ionicons name="images" size={20} color={COLORS.child.accent} />
                </Pressable>
                <Text style={anbuStyles.charCount}>{messageText.length}/200</Text>
                <Pressable onPress={send} style={[anbuStyles.sendBtn, ((!messageText.trim() && !attachedPhoto) || sending || !familyCode) && anbuStyles.sendBtnOff]}
                  disabled={(!messageText.trim() && !attachedPhoto) || sending || !familyCode}>
                  {sending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="send" size={18} color="#fff" />}
                </Pressable>
              </View>
            </View>

            <Text style={anbuStyles.sectionLabel}>보낸 메시지</Text>
            {loading && <ActivityIndicator color={COLORS.child.accent} style={{ marginVertical: 16 }} />}
            {!loading && messages.length === 0 && familyCode && (
              <View style={anbuStyles.empty}><Ionicons name="mail-outline" size={28} color={COLORS.child.textMuted} /><Text style={anbuStyles.emptyText}>아직 보낸 메시지가 없어요</Text></View>
            )}
            {messages.map(msg => (
              <View key={msg.id} style={anbuStyles.msgCard}>
                <View style={anbuStyles.msgAvatarSmall}><Ionicons name="person" size={12} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  {!!msg.text && <Text style={anbuStyles.msgText}>{msg.text}</Text>}
                  {msg.photoData && (
                    <Pressable onPress={() => { setViewerUri(msg.photoData!); setViewerMsgId(msg.id); }}>
                      <Image source={{ uri: msg.photoData }} style={anbuStyles.msgPhoto} resizeMode="cover" />
                    </Pressable>
                  )}
                  <View style={anbuStyles.msgMeta}>
                    <Text style={anbuStyles.msgTime}>{formatTime(msg.createdAt)}</Text>
                    {msg.hearts > 0 && (
                      <View style={anbuStyles.heartChip}>
                        <Ionicons name="heart" size={10} color={COLORS.coral} />
                        <Text style={anbuStyles.heartChipText}>{msg.hearts}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {canDelete(msg) && (
                  <Pressable onPress={() => deleteMsg(msg.id)} style={{ paddingLeft: 8, paddingTop: 2 }} disabled={deletingId === msg.id}>
                    {deletingId === msg.id
                      ? <ActivityIndicator size="small" color="#ef4444" />
                      : <Ionicons name="trash-outline" size={17} color="#ef4444" />}
                  </Pressable>
                )}
              </View>
            ))}
          </>
        )}

        {subView === "gallery" && (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <Text style={anbuStyles.galleryTitle}>보낸 사진</Text>
              <Text style={anbuStyles.galleryCount}>{photoMessages.length}장</Text>
            </View>
            {loading && <ActivityIndicator color={COLORS.child.accent} style={{ marginVertical: 24 }} />}
            {!loading && photoMessages.length === 0 && (
              <View style={anbuStyles.galleryEmpty}>
                <Ionicons name="images-outline" size={40} color={COLORS.child.textMuted} />
                <Text style={anbuStyles.galleryEmptyTitle}>사진이 없어요</Text>
                <Pressable onPress={() => setSubView("messages")} style={anbuStyles.galleryGoBtn}>
                  <Ionicons name="camera" size={15} color="#fff" />
                  <Text style={anbuStyles.galleryGoBtnText}>사진 보내기</Text>
                </Pressable>
              </View>
            )}
            <View style={anbuStyles.grid}>
              {photoMessages.map(msg => (
                <View key={msg.id} style={[anbuStyles.thumbWrap, { width: THUMB, height: THUMB }]}>
                  <Pressable onPress={() => { setViewerUri(msg.photoData!); setViewerMsgId(msg.id); }} style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}>
                    <Image source={{ uri: msg.photoData! }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <View style={anbuStyles.thumbTime}><Text style={anbuStyles.thumbTimeText}>{formatTime(msg.createdAt)}</Text></View>
                    {msg.hearts > 0 && (
                      <View style={anbuStyles.thumbHeart}><Ionicons name="heart" size={9} color={COLORS.coral} /><Text style={anbuStyles.thumbHeartText}>{msg.hearts}</Text></View>
                    )}
                  </Pressable>
                  {canDelete(msg) && (
                    <Pressable style={anbuStyles.thumbDel} onPress={() => deleteMsg(msg.id)} disabled={deletingId === msg.id}>
                      {deletingId === msg.id ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="trash" size={12} color="#fff" />}
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

// ─── 선물샵 탭 ────────────────────────────────────────────────────────────────
function GiftTab() {
  const [selected, setSelected] = useState<typeof GIFTS[0] | null>(null);
  const [purchased, setPurchased] = useState<typeof GIFTS[0] | null>(null);
  const [filter, setFilter] = useState("전체");
  const cats = ["전체", "식품", "건강", "꽃"];
  const filtered = filter === "전체" ? GIFTS : GIFTS.filter(g => g.category === filter);
  return (
    <>
      <ScrollView style={giftStyles.scroll} contentContainerStyle={giftStyles.content} showsVerticalScrollIndicator={false}>
        <View style={giftStyles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={giftStyles.bannerTitle}>선물 보내기</Text>
            <Text style={giftStyles.bannerSub}>마음을 담은 특별한 선물</Text>
          </View>
          <Ionicons name="gift" size={36} color="rgba(255,255,255,0.75)" />
        </View>
        {purchased && (
          <View style={giftStyles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
            <Text style={giftStyles.successText}>{purchased.name} 주문 완료!</Text>
          </View>
        )}
        <View style={giftStyles.filterRow}>
          {cats.map(c => (
            <Pressable key={c} onPress={() => setFilter(c)} style={[giftStyles.filterChip, filter === c && giftStyles.filterActive]}>
              <Text style={[giftStyles.filterText, filter === c && giftStyles.filterTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>
        <View style={giftStyles.grid}>
          {filtered.map(g => (
            <Pressable key={g.id} style={({ pressed }) => [giftStyles.card, { opacity: pressed ? 0.9 : 1 }]} onPress={() => setSelected(g)}>
              {g.popular && <View style={giftStyles.popular}><Text style={giftStyles.popularText}>인기</Text></View>}
              <View style={giftStyles.iconBg}><Ionicons name={g.icon} size={28} color={COLORS.child.accent} /></View>
              <Text style={giftStyles.cardName}>{g.name}</Text>
              <Text style={giftStyles.cardPrice}>{g.price}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={giftStyles.modalOverlay} onPress={() => setSelected(null)}>
          <View style={giftStyles.sheet}>
            <View style={giftStyles.handle} />
            <View style={giftStyles.sheetIcon}><Ionicons name={selected?.icon ?? "gift"} size={38} color={COLORS.child.accent} /></View>
            <Text style={giftStyles.sheetTitle}>{selected?.name}</Text>
            <Text style={giftStyles.sheetPrice}>{selected?.price}</Text>
            <Text style={giftStyles.sheetDesc}>부모님께 따뜻한 마음을 전해보세요. 당일 배송 가능합니다.</Text>
            <Pressable style={giftStyles.buyBtn} onPress={() => { setPurchased(selected); setSelected(null); }}>
              <Ionicons name="gift" size={17} color="#fff" />
              <Text style={giftStyles.buyBtnText}>{selected?.price} · 선물하기</Text>
            </Pressable>
            <Pressable onPress={() => setSelected(null)} style={{ paddingVertical: 12 }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.child.textMuted }}>취소</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── 개발용 화면 전환 ─────────────────────────────────────────────────────────
function DevSwitcher({ isMapTab }: { isMapTab: boolean }) {
  const bg = isMapTab ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.65)";
  return (
    <View style={[devStyles.bar, { backgroundColor: bg }]}>
      <View style={devStyles.label}><Ionicons name="code-slash" size={11} color="rgba(255,255,255,0.4)" /><Text style={devStyles.labelText}>개발 모드</Text></View>
      <Pressable onPress={() => router.replace("/parent")} style={({ pressed }) => [devStyles.btn, { opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons name="home" size={13} color="rgba(255,255,255,0.8)" />
        <Text style={devStyles.btnText}>부모님 화면</Text>
      </Pressable>
      <Pressable onPress={() => router.replace("/")} style={({ pressed }) => [devStyles.btn, devStyles.btnHome, { opacity: pressed ? 0.7 : 1 }]}>
        <Ionicons name="apps" size={13} color="rgba(255,255,255,0.8)" />
        <Text style={devStyles.btnText}>홈</Text>
      </Pressable>
    </View>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
export default function ChildScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, myName, isConnected } = useFamilyContext();
  const { myRole, deviceId } = useFamilyContext();
  const [activeTab, setActiveTab] = useState<Tab>("지도");

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const isMapTab = activeTab === "지도";

  const TAB_CFG: { tab: Tab; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = [
    { tab: "지도", icon: "map-outline", iconActive: "map" },
    { tab: "안부", icon: "chatbubble-ellipses-outline", iconActive: "chatbubble-ellipses" },
    { tab: "선물샵", icon: "gift-outline", iconActive: "gift" },
  ];

  return (
    <View style={{ flex: 1, flexDirection: "column", backgroundColor: isMapTab ? "#d4e8c2" : COLORS.child.bg }}>

      {/* ══ 최상단 로고 (항상 최상위) ══ */}
      <View style={[topBar.wrap, { paddingTop: topInset + 10 }, isMapTab && topBar.mapMode]}>
        <View style={topBar.left}>
          <Text style={[topBar.logo, isMapTab && topBar.logoLight]}>DUGO</Text>
          {isConnected && familyCode && (
            <View style={[topBar.chip, isMapTab && topBar.chipLight]}>
              <View style={[topBar.chipDot, { backgroundColor: isMapTab ? "rgba(255,255,255,0.8)" : "#4ade80" }]} />
              <Text style={[topBar.chipText, isMapTab && topBar.chipTextLight]}>{familyCode}</Text>
            </View>
          )}
        </View>
        <Pressable onPress={() => router.replace("/")} style={[topBar.backBtn, isMapTab && topBar.backBtnLight]}>
          <Ionicons name="chevron-back" size={16} color={isMapTab ? "rgba(255,255,255,0.85)" : COLORS.child.textSub} />
          <Text style={[topBar.backText, isMapTab && topBar.backTextLight]}>나가기</Text>
        </Pressable>
      </View>

      {/* ── 콘텐츠 영역 ── */}
      <View style={{ flex: 1, position: "relative" }}>
        {/* 지도: 콘텐츠 영역 꽉 채움 */}
        {isMapTab && (
          <MapTab familyCode={familyCode} topInset={0} bottomInset={0} />
        )}
        {/* 비지도 탭 */}
        {!isMapTab && (
          <>
            {activeTab === "안부" && <AnbuTab familyCode={familyCode} myName={myName} myRole={myRole} deviceId={deviceId} />}
            {activeTab === "선물샵" && <GiftTab />}
          </>
        )}
      </View>

      {/* ══ 하단 탭 바 (아이콘 전용, flow 레이아웃) ══ */}
      <View style={[tabBar.wrap, { paddingBottom: bottomInset + 2 }, isMapTab && tabBar.wrapMap]}>
        {TAB_CFG.map(cfg => {
          const active = activeTab === cfg.tab;
          return (
            <Pressable key={cfg.tab} onPress={() => setActiveTab(cfg.tab)} style={tabBar.item}>
              <View style={[tabBar.iconWrap, active && (isMapTab ? tabBar.iconWrapActiveMap : tabBar.iconWrapActive)]}>
                <Ionicons
                  name={active ? cfg.iconActive : cfg.icon}
                  size={22}
                  color={active
                    ? (isMapTab ? "#fff" : COLORS.child.accent)
                    : (isMapTab ? "rgba(255,255,255,0.55)" : COLORS.child.tabInactive)}
                />
              </View>
              {active && <View style={[tabBar.dot, isMapTab ? tabBar.dotLight : tabBar.dotDark]} />}
            </Pressable>
          );
        })}
      </View>

      <DevSwitcher isMapTab={isMapTab} />
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

// 최상단 바
const topBar = StyleSheet.create({
  wrap: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, zIndex: 100, backgroundColor: COLORS.child.bg },
  mapMode: { backgroundColor: "rgba(10,20,10,0.72)" },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 22, color: COLORS.child.text, letterSpacing: 3 },
  logoLight: { color: "#fff" },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(74,222,128,0.12)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: "rgba(74,222,128,0.2)" },
  chipLight: { backgroundColor: "rgba(255,255,255,0.18)", borderColor: "rgba(255,255,255,0.3)" },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#4ade80", letterSpacing: 1 },
  chipTextLight: { color: "#fff" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(61,43,31,0.08)", paddingHorizontal: 11, paddingVertical: 6, borderRadius: 18 },
  backBtnLight: { backgroundColor: "rgba(0,0,0,0.3)" },
  backText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub },
  backTextLight: { color: "rgba(255,255,255,0.85)" },
});

// 하단 탭 바
const tabBar = StyleSheet.create({
  wrap: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingTop: 10, paddingHorizontal: 24, backgroundColor: COLORS.child.bg, borderTopWidth: 1, borderTopColor: "rgba(61,43,31,0.07)", zIndex: 100 },
  wrapMap: { backgroundColor: "rgba(10,20,10,0.72)", borderTopColor: "rgba(255,255,255,0.08)" },
  item: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4, gap: 4 },
  iconWrap: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  iconWrapActive: { backgroundColor: COLORS.child.accentSoft },
  iconWrapActiveMap: { backgroundColor: "rgba(255,255,255,0.15)" },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotDark: { backgroundColor: COLORS.child.accent },
  dotLight: { backgroundColor: "#fff" },
});

// 지도 오버레이
const mapStyles = StyleSheet.create({
  loadingCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20 },
  loadingText: { fontFamily: "Inter_500Medium", fontSize: 14, color: "#fff" },
  emptyCard: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 24, padding: 28, margin: 24, gap: 10, maxWidth: 320, alignSelf: "center" },
  emptyIconRing: { width: 72, height: 72, borderRadius: 22, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#fff", textAlign: "center" },
  emptyDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 18 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: COLORS.child.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, marginTop: 4 },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  infoCard: { position: "absolute", left: 16, right: 16, backgroundColor: "rgba(12,18,12,0.82)", borderRadius: 22, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  infoTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  avatarWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(200,112,74,0.7)", alignItems: "center", justifyContent: "center", position: "relative" },
  statusDot: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "rgba(12,18,12,0.82)" },
  infoName: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff", marginBottom: 2 },
  infoTime: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.6)" },
  actionRow: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  addressText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "rgba(255,255,255,0.8)", flex: 1 },
  accuracyText: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)" },
  refreshFab: { position: "absolute", right: 16, width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.child.accent, alignItems: "center", justifyContent: "center" },
});

// 안부 탭
const anbuStyles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  connectBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(200,112,74,0.06)", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(200,112,74,0.1)" },
  connectText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub },
  connectBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.child.accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  connectBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  segment: { flexDirection: "row", backgroundColor: "rgba(61,43,31,0.06)", borderRadius: 14, padding: 4, marginBottom: 16 },
  segBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 11 },
  segBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.tabInactive },
  segTextActive: { color: COLORS.child.accent, fontFamily: "Inter_600SemiBold" },
  toast: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(74,222,128,0.08)", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(74,222,128,0.18)" },
  toastText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#4ade80" },
  compose: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.child.bgCardBorder },
  attachWrap: { borderRadius: 12, overflow: "hidden", marginBottom: 10, height: 140, position: "relative" },
  attachImg: { width: "100%", height: "100%" },
  attachRemove: { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 14 },
  input: { backgroundColor: "rgba(61,43,31,0.04)", borderRadius: 12, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.child.text, minHeight: 64, textAlignVertical: "top", marginBottom: 10, borderWidth: 1, borderColor: "rgba(61,43,31,0.06)" },
  composeBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconAction: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center" },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.child.textMuted, marginLeft: 4 },
  sendBtn: { marginLeft: "auto" as any, width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.child.accent, alignItems: "center", justifyContent: "center" },
  sendBtnOff: { opacity: 0.35 },
  sectionLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.child.textSub, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  empty: { alignItems: "center", padding: 24, gap: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textMuted },
  msgCard: { flexDirection: "row", gap: 10, backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.child.bgCardBorder },
  msgAvatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.child.accent, alignItems: "center", justifyContent: "center" },
  msgText: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.text, lineHeight: 20, marginBottom: 6 },
  msgPhoto: { width: "100%", height: 150, borderRadius: 10, marginBottom: 6 },
  msgMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  msgTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.child.textMuted },
  heartChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.child.accentSoft, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  heartChipText: { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.child.accent },
  galleryTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: COLORS.child.text },
  galleryCount: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub },
  galleryEmpty: { alignItems: "center", paddingVertical: 48, gap: 10 },
  galleryEmptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: COLORS.child.text },
  galleryGoBtn: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: COLORS.child.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, marginTop: 4 },
  galleryGoBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumbWrap: { position: "relative", borderRadius: 12 },
  thumbTime: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.4)", padding: 4, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  thumbTimeText: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.85)", textAlign: "center" },
  thumbHeart: { position: "absolute", top: 5, left: 5, flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  thumbHeartText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#fff" },
  thumbDel: { position: "absolute", top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", zIndex: 10 },
  viewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", justifyContent: "center", alignItems: "center" },
  viewerClose: { position: "absolute", top: 54, right: 20, zIndex: 10 },
  viewerImg: { width: "100%", borderRadius: 14 },
  viewerDeleteBtn: { position: "absolute", bottom: 56, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(239,68,68,0.85)", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 18 },
  viewerDeleteText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
});

// 선물샵 탭
const giftStyles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  banner: { backgroundColor: COLORS.child.accent, borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  bannerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff", marginBottom: 4 },
  bannerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.75)" },
  successBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(74,222,128,0.08)", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(74,222,128,0.18)" },
  successText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#4ade80" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(61,43,31,0.06)", borderWidth: 1, borderColor: "rgba(61,43,31,0.08)" },
  filterActive: { backgroundColor: COLORS.child.accent, borderColor: COLORS.child.accent },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.textSub },
  filterTextActive: { color: "#fff" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: (width - 44) / 2, backgroundColor: "#fff", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.child.bgCardBorder, alignItems: "center", position: "relative" },
  popular: { position: "absolute", top: 10, right: 10, backgroundColor: COLORS.coral, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  popularText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#fff" },
  iconBg: { width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  cardName: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.text, textAlign: "center", marginBottom: 5, lineHeight: 18 },
  cardPrice: { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.child.accent },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: COLORS.child.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, alignItems: "center", paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(61,43,31,0.15)", marginBottom: 20 },
  sheetIcon: { width: 76, height: 76, borderRadius: 22, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 19, color: COLORS.child.text, textAlign: "center", marginBottom: 6 },
  sheetPrice: { fontFamily: "Inter_600SemiBold", fontSize: 21, color: COLORS.child.accent, marginBottom: 12 },
  sheetDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  buyBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.child.accent, borderRadius: 18, paddingVertical: 15, paddingHorizontal: 28, width: "100%", justifyContent: "center", marginBottom: 12 },
  buyBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
});

// 개발 모드 스위처
const devStyles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", zIndex: 200 },
  label: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: 4 },
  labelText: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.35)" },
  btn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  btnHome: { backgroundColor: "rgba(232,133,106,0.18)", borderColor: "rgba(232,133,106,0.25)" },
  btnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.8)" },
});
