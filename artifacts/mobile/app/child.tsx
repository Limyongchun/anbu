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
const TABS = ["지도", "안부", "선물샵"] as const;
type Tab = typeof TABS[number];

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

// ─── 지도 탭 ──────────────────────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.8, duration: 1000, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: false }),
      ]),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: 40, height: 40, borderRadius: 20, backgroundColor: color, transform: [{ scale }], opacity }} />
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: color, borderWidth: 3, borderColor: COLORS.white, zIndex: 2 }} />
    </View>
  );
}

function MapView({ loc }: { loc: LocationData }) {
  const lat = loc.latitude;
  const lon = loc.longitude;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.008}%2C${lat - 0.006}%2C${lon + 0.008}%2C${lat + 0.006}&layer=mapnik&marker=${lat}%2C${lon}`;

  const openInMaps = () => {
    const url = Platform.OS === "ios"
      ? `maps://maps.apple.com/maps?q=${lat},${lon}`
      : Platform.OS === "android"
        ? `geo:${lat},${lon}?q=${lat},${lon}`
        : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`);
    });
  };

  return (
    <View style={styles.mapContainer}>
      {Platform.OS === "web" ? (
        // Web: real embedded OpenStreetMap
        <View style={styles.mapIframeWrap}>
          {/* @ts-ignore */}
          <iframe
            src={mapSrc}
            style={{ width: "100%", height: "100%", border: "none", borderRadius: 20 }}
            title="부모님 위치"
          />
        </View>
      ) : (
        // Native: styled map visual
        <View style={styles.mapNative}>
          <View style={styles.mapGrid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={`h${i}`} style={[styles.mapGridLine, styles.mapGridLineH, { top: `${(i + 1) * 11}%` as any }]} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={`v${i}`} style={[styles.mapGridLine, styles.mapGridLineV, { left: `${(i + 1) * 14}%` as any }]} />
            ))}
          </View>
          <View style={styles.mapPin}>
            <PulsingDot color="#ef4444" />
          </View>
        </View>
      )}

      {/* Open in maps button */}
      <Pressable onPress={openInMaps} style={styles.openMapBtn}>
        <Ionicons name="navigate" size={14} color={COLORS.white} />
        <Text style={styles.openMapBtnText}>지도 앱에서 보기</Text>
      </Pressable>
    </View>
  );
}

function LocationTab({ familyCode }: { familyCode: string | null }) {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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
    const interval = setInterval(loadLocations, 30000);
    return () => clearInterval(interval);
  }, [familyCode, loadLocations]);

  // Filter for parent locations that are sharing
  const parentLocations = locations.filter(l => l.role === "parent" && l.isSharing);
  const parentLoc = parentLocations[0] ?? null;

  if (!familyCode) {
    return (
      <View style={styles.mapEmptyCenter}>
        <View style={styles.mapEmptyIconWrap}>
          <Ionicons name="link-outline" size={40} color={COLORS.child.textMuted} />
        </View>
        <Text style={styles.mapEmptyTitle}>가족을 먼저 연결해주세요</Text>
        <Text style={styles.mapEmptyDesc}>가족 코드를 입력하면 부모님의 위치를 확인할 수 있어요</Text>
        <Pressable style={styles.mapEmptyBtn} onPress={() => router.push("/setup")}>
          <Ionicons name="link" size={16} color={COLORS.white} />
          <Text style={styles.mapEmptyBtnText}>가족 연결하기</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.mapEmptyCenter}>
        <ActivityIndicator size="large" color={COLORS.child.accent} />
        <Text style={styles.mapEmptyDesc}>위치를 불러오는 중...</Text>
      </View>
    );
  }

  if (!parentLoc) {
    return (
      <View style={styles.mapEmptyCenter}>
        <View style={styles.mapWaitingWrap}>
          <Animated.View>
            <Ionicons name="location-outline" size={48} color={COLORS.child.accent} />
          </Animated.View>
        </View>
        <Text style={styles.mapEmptyTitle}>부모님 위치를 기다리는 중</Text>
        <Text style={styles.mapEmptyDesc}>부모님이 앱을 실행하면 위치가 여기 표시됩니다</Text>
        <Pressable onPress={loadLocations} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={16} color={COLORS.child.accent} />
          <Text style={styles.refreshBtnText}>새로고침</Text>
        </Pressable>
      </View>
    );
  }

  const minsAgo = Math.floor((Date.now() - new Date(parentLoc.updatedAt).getTime()) / 60000);
  const isRecent = minsAgo < 5;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.mapScrollContent} showsVerticalScrollIndicator={false}>
      {/* Map */}
      <MapView loc={parentLoc} />

      {/* Status banner */}
      <View style={[styles.statusBanner, { backgroundColor: isRecent ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)" }]}>
        <View style={[styles.statusBannerDot, { backgroundColor: isRecent ? "#4ade80" : "#fbbf24" }]} />
        <Text style={[styles.statusBannerText, { color: isRecent ? "#4ade80" : "#fbbf24" }]}>
          {isRecent ? "실시간 위치 공유 중" : `${minsAgo}분 전 업데이트`}
        </Text>
        <Pressable onPress={loadLocations} style={styles.statusRefreshBtn}>
          <Ionicons name="refresh" size={14} color={isRecent ? "#4ade80" : "#fbbf24"} />
        </Pressable>
      </View>

      {/* Parent info card */}
      <View style={styles.parentInfoCard}>
        <View style={styles.parentAvatarRow}>
          <View style={styles.parentAvatar}>
            <Ionicons name="person" size={22} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.parentName}>{parentLoc.memberName}</Text>
            <Text style={styles.parentRole}>부모님</Text>
          </View>
          <View style={[styles.onlineBadge, { backgroundColor: isRecent ? "rgba(74,222,128,0.15)" : "rgba(251,191,36,0.15)" }]}>
            <View style={[styles.onlineDot, { backgroundColor: isRecent ? "#4ade80" : "#fbbf24" }]} />
            <Text style={[styles.onlineBadgeText, { color: isRecent ? "#4ade80" : "#fbbf24" }]}>
              {isRecent ? "안전" : "확인 필요"}
            </Text>
          </View>
        </View>

        <View style={styles.infoRows}>
          <View style={styles.infoRow}>
            <View style={styles.infoRowIcon}><Ionicons name="location" size={16} color={COLORS.child.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoRowLabel}>현재 위치</Text>
              <Text style={styles.infoRowValue}>
                {parentLoc.address || `위도 ${parentLoc.latitude.toFixed(5)}, 경도 ${parentLoc.longitude.toFixed(5)}`}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoRowIcon}><Ionicons name="time" size={16} color={COLORS.child.accent} /></View>
            <View>
              <Text style={styles.infoRowLabel}>마지막 업데이트</Text>
              <Text style={styles.infoRowValue}>{formatTime(parentLoc.updatedAt)}</Text>
            </View>
          </View>

          {parentLoc.accuracy != null && (
            <View style={styles.infoRow}>
              <View style={styles.infoRowIcon}><Ionicons name="radio" size={16} color={COLORS.child.accent} /></View>
              <View>
                <Text style={styles.infoRowLabel}>정확도</Text>
                <Text style={styles.infoRowValue}>±{Math.round(parentLoc.accuracy)}m</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Quick contact */}
      <View style={styles.quickActions}>
        <Pressable style={styles.quickActionBtn} onPress={() => Linking.openURL("tel:")}>
          <View style={[styles.quickActionIcon, { backgroundColor: "rgba(74,222,128,0.12)" }]}>
            <Ionicons name="call" size={22} color="#4ade80" />
          </View>
          <Text style={styles.quickActionLabel}>전화하기</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => {}}>
          <View style={[styles.quickActionIcon, { backgroundColor: "rgba(200,112,74,0.12)" }]}>
            <Ionicons name="chatbubble" size={22} color={COLORS.child.accent} />
          </View>
          <Text style={styles.quickActionLabel}>문자 보내기</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={loadLocations}>
          <View style={[styles.quickActionIcon, { backgroundColor: "rgba(99,102,241,0.12)" }]}>
            <Ionicons name="refresh" size={22} color="#818cf8" />
          </View>
          <Text style={styles.quickActionLabel}>새로고침</Text>
        </Pressable>
      </View>

      {lastRefresh && (
        <Text style={styles.lastRefreshText}>마지막 새로고침: {formatTime(lastRefresh.toISOString())}</Text>
      )}
    </ScrollView>
  );
}

// ─── 사진 뷰어 ────────────────────────────────────────────────────────────────
function PhotoViewer({ uri, visible, onClose, onDelete, canDelete }: {
  uri: string; visible: boolean; onClose: () => void; onDelete?: () => void; canDelete?: boolean;
}) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerOverlay}>
        <Pressable style={styles.viewerClose} onPress={onClose}>
          <Ionicons name="close-circle" size={36} color={COLORS.white} />
        </Pressable>
        <Image source={{ uri }} style={[styles.viewerImg, { height: height * 0.72 }]} resizeMode="contain" />
        {canDelete && onDelete && (
          <Pressable style={styles.viewerDeleteBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={20} color={COLORS.white} />
            <Text style={styles.viewerDeleteText}>사진 삭제</Text>
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
  const THUMB_SIZE = (width - 52) / 3;

  const loadMessages = useCallback(async () => {
    if (!familyCode) return;
    try { setMessages(await api.getMessages(familyCode)); } catch {}
  }, [familyCode]);

  useEffect(() => {
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("권한 필요", "사진 라이브러리 접근 권한이 필요합니다."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.6, base64: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachedPhoto(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("권한 필요", "카메라 접근 권한이 필요합니다."); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6, base64: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachedPhoto(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
    }
  };

  const handlePickPhoto = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options: ["취소", "카메라로 찍기", "앨범에서 선택"], cancelButtonIndex: 0 }, i => { if (i === 1) pickFromCamera(); if (i === 2) pickFromLibrary(); });
    } else {
      Alert.alert("사진 첨부", "어디서 가져올까요?", [{ text: "취소", style: "cancel" }, { text: "카메라", onPress: pickFromCamera }, { text: "갤러리", onPress: pickFromLibrary }]);
    }
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !attachedPhoto) || !familyCode || !myName || !myRole) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(familyCode, deviceId, myName, myRole, messageText.trim(), attachedPhoto || null);
      setMessages(prev => [msg, ...prev]);
      setMessageText("");
      setAttachedPhoto(null);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch {}
    finally { setSending(false); }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!familyCode) return;
    Alert.alert("메시지 삭제", "이 메시지를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: async () => {
        setDeletingId(msgId);
        try {
          await api.deleteMessage(familyCode, msgId, deviceId);
          setMessages(prev => prev.filter(m => m.id !== msgId));
          if (viewerMsgId === msgId) { setViewerUri(null); setViewerMsgId(null); }
        } catch { Alert.alert("오류", "삭제에 실패했습니다."); }
        finally { setDeletingId(null); }
      }},
    ]);
  };

  const canDeleteMsg = (msg: FamilyMessage) => msg.deviceId === deviceId;

  return (
    <>
      {viewerUri && (
        <PhotoViewer uri={viewerUri} visible={!!viewerUri} onClose={() => { setViewerUri(null); setViewerMsgId(null); }}
          canDelete={viewerMsgId !== null && messages.find(m => m.id === viewerMsgId)?.deviceId === deviceId}
          onDelete={() => { if (viewerMsgId) handleDeleteMessage(viewerMsgId); setViewerUri(null); setViewerMsgId(null); }} />
      )}
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentPad} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!familyCode && (
          <View style={styles.connectPrompt}>
            <Ionicons name="link-outline" size={32} color={COLORS.child.textMuted} />
            <Text style={styles.connectPromptText}>가족을 연결하면 안부를 주고받을 수 있어요</Text>
            <Pressable style={styles.connectBtn} onPress={() => router.push("/setup")}><Text style={styles.connectBtnText}>가족 연결하기</Text></Pressable>
          </View>
        )}
        {/* Sub-view toggle */}
        <View style={styles.subViewToggle}>
          <Pressable onPress={() => setSubView("messages")} style={[styles.subViewBtn, subView === "messages" && styles.subViewBtnActive]}>
            <Ionicons name="chatbubble-ellipses" size={15} color={subView === "messages" ? COLORS.child.accent : COLORS.child.tabInactive} />
            <Text style={[styles.subViewBtnText, subView === "messages" && styles.subViewBtnTextActive]}>메시지</Text>
          </Pressable>
          <Pressable onPress={() => setSubView("gallery")} style={[styles.subViewBtn, subView === "gallery" && styles.subViewBtnActive]}>
            <Ionicons name="images" size={15} color={subView === "gallery" ? COLORS.child.accent : COLORS.child.tabInactive} />
            <Text style={[styles.subViewBtnText, subView === "gallery" && styles.subViewBtnTextActive]}>갤러리 {photoMessages.length > 0 ? `(${photoMessages.length})` : ""}</Text>
          </Pressable>
        </View>

        {subView === "messages" && (
          <>
            {sent && (<View style={styles.sentToast}><Ionicons name="checkmark-circle" size={16} color="#4ade80" /><Text style={styles.sentToastText}>부모님께 전송되었어요</Text></View>)}
            <View style={styles.composeCard}>
              <View style={styles.composeHeader}>
                <View style={styles.composeAvatar}><Ionicons name="heart" size={18} color={COLORS.white} /></View>
                <View><Text style={styles.composeTitle}>안부 보내기</Text><Text style={styles.composeSub}>글과 사진으로 부모님께 전해요</Text></View>
              </View>
              {attachedPhoto && (
                <View style={styles.attachPreviewWrap}>
                  <Image source={{ uri: attachedPhoto }} style={styles.attachPreview} resizeMode="cover" />
                  <Pressable style={styles.attachRemoveBtn} onPress={() => setAttachedPhoto(null)}><Ionicons name="close-circle" size={24} color={COLORS.white} /></Pressable>
                  <View style={styles.attachLabel}><Ionicons name="image" size={12} color={COLORS.white} /><Text style={styles.attachLabelText}>사진 첨부됨</Text></View>
                </View>
              )}
              <TextInput style={styles.composeInput} value={messageText} onChangeText={setMessageText} placeholder="안부 메시지를 입력하세요..." placeholderTextColor={COLORS.child.textMuted} multiline maxLength={200} />
              <View style={styles.composeFooter}>
                <View style={styles.composeFooterLeft}>
                  <Pressable onPress={pickFromCamera} style={({ pressed }) => [styles.attachIconBtn, { opacity: pressed ? 0.7 : 1 }]}><Ionicons name="camera" size={22} color={COLORS.child.accent} /></Pressable>
                  <Pressable onPress={pickFromLibrary} style={({ pressed }) => [styles.attachIconBtn, { opacity: pressed ? 0.7 : 1 }]}><Ionicons name="images" size={22} color={COLORS.child.accent} /></Pressable>
                  <Text style={styles.charCount}>{messageText.length}/200</Text>
                </View>
                <Pressable onPress={handleSend} style={[styles.sendBtn, ((!messageText.trim() && !attachedPhoto) || sending || !familyCode) && styles.sendBtnDisabled]} disabled={(!messageText.trim() && !attachedPhoto) || sending || !familyCode}>
                  {sending ? <ActivityIndicator size="small" color={COLORS.white} /> : <><Ionicons name="send" size={16} color={COLORS.white} /><Text style={styles.sendBtnText}>전송</Text></>}
                </Pressable>
              </View>
            </View>
            <Text style={styles.subSectionLabel}>보낸 메시지</Text>
            {loading && <ActivityIndicator color={COLORS.child.accent} style={{ marginVertical: 16 }} />}
            {!loading && messages.length === 0 && familyCode && (<View style={styles.emptyState}><Ionicons name="mail-outline" size={28} color={COLORS.child.textMuted} /><Text style={styles.emptyStateText}>아직 보낸 메시지가 없어요</Text></View>)}
            {messages.map(msg => (
              <View key={msg.id} style={styles.msgItem}>
                <View style={styles.msgItemAvatarWrap}><Ionicons name="person" size={13} color={COLORS.white} /></View>
                <View style={styles.msgItemBody}>
                  {!!msg.text && <Text style={styles.msgItemText}>{msg.text}</Text>}
                  {msg.photoData && (
                    <Pressable onPress={() => { setViewerUri(msg.photoData!); setViewerMsgId(msg.id); }}>
                      <Image source={{ uri: msg.photoData }} style={styles.msgPhoto} resizeMode="cover" />
                      <View style={styles.msgPhotoHint}><Ionicons name="expand" size={12} color={COLORS.child.textMuted} /><Text style={styles.msgPhotoHintText}>탭하면 크게 볼 수 있어요</Text></View>
                    </Pressable>
                  )}
                  <View style={styles.msgItemMeta}>
                    <Text style={styles.msgItemTime}>{formatTime(msg.createdAt)}</Text>
                    {msg.hearts > 0 && (<View style={styles.likedChip}><Ionicons name="heart" size={10} color={COLORS.coral} /><Text style={styles.likedChipText}>부모님이 {msg.hearts}번 좋아했어요</Text></View>)}
                  </View>
                </View>
                {canDeleteMsg(msg) && (
                  <Pressable onPress={() => handleDeleteMessage(msg.id)} style={styles.msgDeleteBtn} disabled={deletingId === msg.id}>
                    {deletingId === msg.id ? <ActivityIndicator size="small" color="#ef4444" /> : <Ionicons name="trash-outline" size={18} color="#ef4444" />}
                  </Pressable>
                )}
              </View>
            ))}
          </>
        )}

        {subView === "gallery" && (
          <>
            <View style={styles.galleryHeader}><Text style={styles.galleryTitle}>내가 보낸 사진</Text><Text style={styles.galleryCount}>총 {photoMessages.length}장</Text></View>
            {loading && <ActivityIndicator color={COLORS.child.accent} style={{ marginVertical: 24 }} />}
            {!loading && photoMessages.length === 0 && (
              <View style={styles.galleryEmpty}>
                <View style={styles.galleryEmptyIcon}><Ionicons name="images-outline" size={40} color={COLORS.child.textMuted} /></View>
                <Text style={styles.galleryEmptyTitle}>아직 사진이 없어요</Text>
                <Text style={styles.galleryEmptyDesc}>메시지 탭에서 사진을 첨부해서 보내보세요</Text>
                <Pressable style={styles.galleryGoMsgBtn} onPress={() => setSubView("messages")}><Ionicons name="camera" size={16} color={COLORS.white} /><Text style={styles.galleryGoMsgBtnText}>사진 보내기</Text></Pressable>
              </View>
            )}
            {photoMessages.length > 0 && (
              <>
                <Text style={styles.galleryManageHint}>탭하면 크게 볼 수 있어요. 빨간 버튼으로 삭제합니다.</Text>
                <View style={styles.galleryGrid}>
                  {photoMessages.map(msg => (
                    <View key={msg.id} style={[styles.galleryThumbWrap, { width: THUMB_SIZE, height: THUMB_SIZE }]}>
                      <Pressable onPress={() => { setViewerUri(msg.photoData!); setViewerMsgId(msg.id); }} style={({ pressed }) => [styles.galleryThumb, { opacity: pressed ? 0.85 : 1 }]}>
                        <Image source={{ uri: msg.photoData! }} style={{ width: "100%", height: "100%", borderRadius: 12 }} resizeMode="cover" />
                        <View style={styles.thumbTimeOverlay}><Text style={styles.thumbTimeText}>{formatTime(msg.createdAt)}</Text></View>
                        {msg.hearts > 0 && (<View style={styles.thumbHeartChip}><Ionicons name="heart" size={9} color={COLORS.coral} /><Text style={styles.thumbHeartText}>{msg.hearts}</Text></View>)}
                      </Pressable>
                      {canDeleteMsg(msg) && (
                        <Pressable style={styles.thumbDeleteBtn} onPress={() => handleDeleteMessage(msg.id)} disabled={deletingId === msg.id}>
                          {deletingId === msg.id ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="trash" size={13} color={COLORS.white} />}
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}
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
  const categories = ["전체", "식품", "건강", "꽃"];
  const filtered = filter === "전체" ? GIFTS : GIFTS.filter(g => g.category === filter);
  return (
    <>
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentPad} showsVerticalScrollIndicator={false}>
        <View style={styles.giftBanner}>
          <View style={{ flex: 1 }}><Text style={styles.giftBannerTitle}>부모님께 선물 보내기</Text><Text style={styles.giftBannerSub}>마음을 담은 특별한 선물</Text></View>
          <View style={styles.giftBannerIcon}><Ionicons name="gift" size={36} color="rgba(255,255,255,0.8)" /></View>
        </View>
        {purchased && (<View style={styles.purchaseSuccess}><Ionicons name="checkmark-circle" size={20} color="#4ade80" /><Text style={styles.purchaseSuccessText}>{purchased.name} 주문 완료!</Text></View>)}
        <View style={styles.filterRow}>
          {categories.map(cat => (
            <Pressable key={cat} onPress={() => setFilter(cat)} style={[styles.filterChip, filter === cat && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, filter === cat && styles.filterChipTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.giftGrid}>
          {filtered.map(gift => (
            <Pressable key={gift.id} style={({ pressed }) => [styles.giftCard, { opacity: pressed ? 0.9 : 1 }]} onPress={() => setSelected(gift)}>
              {gift.popular && (<View style={styles.popularBadge}><Text style={styles.popularBadgeText}>인기</Text></View>)}
              <View style={styles.giftIconBg}><Ionicons name={gift.icon} size={28} color={COLORS.child.accent} /></View>
              <Text style={styles.giftName}>{gift.name}</Text>
              <Text style={styles.giftPrice}>{gift.price}</Text>
              <View style={styles.giftCatChip}><Text style={styles.giftCatText}>{gift.category}</Text></View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalGiftIcon}><Ionicons name={selected?.icon ?? "gift"} size={40} color={COLORS.child.accent} /></View>
            <Text style={styles.modalTitle}>{selected?.name}</Text>
            <Text style={styles.modalPrice}>{selected?.price}</Text>
            <Text style={styles.modalDesc}>부모님께 따뜻한 마음을 전해보세요. 당일 배송 가능합니다.</Text>
            <View style={styles.modalRecipient}><Ionicons name="heart" size={14} color={COLORS.child.accent} /><Text style={styles.modalRecipientText}>받는 분: 어머니, 아버지</Text></View>
            <Pressable style={({ pressed }) => [styles.purchaseBtn, { opacity: pressed ? 0.9 : 1 }]} onPress={() => { setPurchased(selected); setSelected(null); }}>
              <Ionicons name="gift" size={18} color={COLORS.white} /><Text style={styles.purchaseBtnText}>{selected?.price} · 선물하기</Text>
            </Pressable>
            <Pressable onPress={() => setSelected(null)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>취소</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── 개발용 화면 전환 ─────────────────────────────────────────────────────────
function DevSwitcher() {
  return (
    <View style={devStyles.bar}>
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
  const { familyCode, myName, myRole, deviceId, isConnected } = useFamilyContext();
  const [activeTab, setActiveTab] = useState<Tab>("지도");
  const tabUnderline = useRef(new Animated.Value(0)).current;

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleTabPress = (tab: Tab, index: number) => {
    setActiveTab(tab);
    Animated.spring(tabUnderline, { toValue: index * (width / TABS.length), useNativeDriver: false }).start();
  };

  const TAB_ICONS: Record<Tab, keyof typeof Ionicons.glyphMap> = {
    "지도": "map",
    "안부": "chatbubble-ellipses",
    "선물샵": "gift",
  };

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>DUGO</Text>
          <Text style={styles.headerGreeting}>{myName ? `${myName}님, 안녕하세요` : "부모님의 위치를 확인하세요"}</Text>
        </View>
        <View style={styles.headerRight}>
          {isConnected && familyCode && (
            <View style={styles.connectedChip}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>{familyCode}</Text>
            </View>
          )}
          <Pressable onPress={() => router.replace("/")} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={COLORS.child.textSub} />
            <Text style={styles.backBtnText}>나가기</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab, index) => (
          <Pressable key={tab} style={styles.tabItem} onPress={() => handleTabPress(tab, index)}>
            <Ionicons name={TAB_ICONS[tab]} size={18} color={activeTab === tab ? COLORS.child.tabActive : COLORS.child.tabInactive} />
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{tab}</Text>
          </Pressable>
        ))}
        <Animated.View style={[styles.tabUnderline, { width: width / TABS.length, transform: [{ translateX: tabUnderline }] }]} />
      </View>

      {activeTab === "지도" && <LocationTab familyCode={familyCode} />}
      {activeTab === "안부" && <AnbuTab familyCode={familyCode} myName={myName} myRole={myRole} deviceId={deviceId} />}
      {activeTab === "선물샵" && <GiftTab />}

      <DevSwitcher />
    </View>
  );
}

// ─── 스타일 ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.child.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: COLORS.child.text, letterSpacing: 2, marginBottom: 2 },
  headerGreeting: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 6 },
  connectedChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(74,222,128,0.1)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(74,222,128,0.2)" },
  connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  connectedText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#4ade80", letterSpacing: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(61,43,31,0.08)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  backBtnText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(61,43,31,0.08)", position: "relative", backgroundColor: COLORS.child.bg },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6 },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.child.tabInactive },
  tabLabelActive: { fontFamily: "Inter_600SemiBold", color: COLORS.child.tabActive },
  tabUnderline: { position: "absolute", bottom: 0, height: 2, backgroundColor: COLORS.child.tabActive, borderRadius: 1 },
  tabContent: { flex: 1 },
  tabContentPad: { padding: 16, paddingBottom: 32 },

  // Map tab
  mapScrollContent: { padding: 16, paddingBottom: 32 },
  mapContainer: { marginBottom: 12, borderRadius: 20, overflow: "hidden" },
  mapIframeWrap: { width: "100%", height: 300, borderRadius: 20, overflow: "hidden" },
  mapNative: { width: "100%", height: 260, backgroundColor: "#d4e8c2", borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center", position: "relative" },
  mapGrid: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  mapGridLine: { position: "absolute", backgroundColor: "rgba(100,140,70,0.25)" },
  mapGridLineH: { left: 0, right: 0, height: 1 },
  mapGridLineV: { top: 0, bottom: 0, width: 1 },
  mapPin: { zIndex: 2 },
  openMapBtn: { position: "absolute", bottom: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  openMapBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.white },
  statusBanner: { flexDirection: "row", alignItems: "center", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, gap: 8 },
  statusBannerDot: { width: 8, height: 8, borderRadius: 4 },
  statusBannerText: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  statusRefreshBtn: { padding: 4 },
  parentInfoCard: { backgroundColor: COLORS.child.bgCard, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: COLORS.child.bgCardBorder },
  parentAvatarRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  parentAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.child.accent, alignItems: "center", justifyContent: "center" },
  parentName: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.child.text, marginBottom: 2 },
  parentRole: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.child.textSub },
  onlineBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  infoRows: { gap: 12 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoRowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center" },
  infoRowLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.child.textSub, marginBottom: 2 },
  infoRowValue: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.text },
  quickActions: { flexDirection: "row", gap: 12, marginBottom: 12 },
  quickActionBtn: { flex: 1, alignItems: "center", gap: 8 },
  quickActionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickActionLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.child.textSub },
  lastRefreshText: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.child.textMuted, textAlign: "center", marginTop: 4 },
  mapEmptyCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  mapEmptyIconWrap: { width: 88, height: 88, borderRadius: 24, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  mapWaitingWrap: { width: 88, height: 88, borderRadius: 24, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  mapEmptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: COLORS.child.text, textAlign: "center" },
  mapEmptyDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.textSub, textAlign: "center", lineHeight: 20 },
  mapEmptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.child.accent, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 16, marginTop: 4 },
  mapEmptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.white },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.child.accentSoft, marginTop: 4 },
  refreshBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.child.accent },

  // Connect prompt
  connectPrompt: { alignItems: "center", backgroundColor: "rgba(200,112,74,0.06)", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(200,112,74,0.12)", gap: 8 },
  connectPromptText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub, textAlign: "center" },
  connectBtn: { backgroundColor: COLORS.child.accent, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 12, marginTop: 4 },
  connectBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.white },

  // Sub-view toggle
  subViewToggle: { flexDirection: "row", backgroundColor: "rgba(61,43,31,0.06)", borderRadius: 14, padding: 4, marginBottom: 16 },
  subViewBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 11 },
  subViewBtnActive: { backgroundColor: COLORS.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  subViewBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.tabInactive },
  subViewBtnTextActive: { color: COLORS.child.accent, fontFamily: "Inter_600SemiBold" },

  // Toast / compose
  sentToast: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(74,222,128,0.1)", borderWidth: 1, borderColor: "rgba(74,222,128,0.2)", borderRadius: 12, padding: 12, marginBottom: 14 },
  sentToastText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#4ade80" },
  composeCard: { backgroundColor: COLORS.child.bgCard, borderRadius: 20, padding: 18, marginBottom: 22, borderWidth: 1, borderColor: COLORS.child.bgCardBorder },
  composeHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  composeAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.child.accent, alignItems: "center", justifyContent: "center" },
  composeTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.child.text, marginBottom: 2 },
  composeSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.child.textSub },
  attachPreviewWrap: { borderRadius: 14, overflow: "hidden", marginBottom: 12, position: "relative", height: 160 },
  attachPreview: { width: "100%", height: "100%", borderRadius: 14 },
  attachRemoveBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16 },
  attachLabel: { position: "absolute", bottom: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  attachLabelText: { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.white },
  composeInput: { backgroundColor: "rgba(61,43,31,0.04)", borderRadius: 14, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.child.text, minHeight: 72, textAlignVertical: "top", marginBottom: 12, borderWidth: 1, borderColor: "rgba(61,43,31,0.06)" },
  composeFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  composeFooterLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  attachIconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center" },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.child.textMuted },
  sendBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.child.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, minWidth: 72, justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.white },
  subSectionLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.child.textSub, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  emptyState: { alignItems: "center", padding: 24, gap: 8 },
  emptyStateText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textMuted, textAlign: "center" },
  msgItem: { flexDirection: "row", gap: 12, backgroundColor: COLORS.child.bgCard, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.child.bgCardBorder },
  msgItemAvatarWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.child.accent, alignItems: "center", justifyContent: "center" },
  msgItemBody: { flex: 1 },
  msgItemText: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.text, lineHeight: 20, marginBottom: 6 },
  msgPhoto: { width: "100%", height: 160, borderRadius: 12, marginBottom: 6 },
  msgPhotoHint: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  msgPhotoHintText: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.child.textMuted },
  msgItemMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  msgItemTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.child.textMuted },
  likedChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.child.accentSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  likedChipText: { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.child.accent },
  msgDeleteBtn: { paddingLeft: 4, paddingTop: 2, alignItems: "center", justifyContent: "flex-start" },

  // Gallery
  galleryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  galleryTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: COLORS.child.text },
  galleryCount: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub },
  galleryManageHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.child.textMuted, marginBottom: 14, lineHeight: 18 },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  galleryThumbWrap: { position: "relative", borderRadius: 12, overflow: "visible" },
  galleryThumb: { width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(61,43,31,0.06)" },
  thumbTimeOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.45)", padding: 4, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  thumbTimeText: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.85)", textAlign: "center" },
  thumbHeartChip: { position: "absolute", top: 5, left: 5, flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  thumbHeartText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: COLORS.white },
  thumbDeleteBtn: { position: "absolute", top: -7, right: -7, width: 26, height: 26, borderRadius: 13, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", zIndex: 10 },
  galleryEmpty: { alignItems: "center", paddingVertical: 48, gap: 10 },
  galleryEmptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: "rgba(61,43,31,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  galleryEmptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: COLORS.child.text },
  galleryEmptyDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.textSub, textAlign: "center", lineHeight: 20 },
  galleryGoMsgBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.child.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  galleryGoMsgBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.white },

  // Photo viewer
  viewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  viewerClose: { position: "absolute", top: 54, right: 20, zIndex: 10 },
  viewerImg: { width: "100%", borderRadius: 16 },
  viewerDeleteBtn: { position: "absolute", bottom: 60, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(239,68,68,0.85)", paddingHorizontal: 22, paddingVertical: 13, borderRadius: 20 },
  viewerDeleteText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.white },

  // Gift shop
  giftBanner: { backgroundColor: COLORS.child.accent, borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  giftBannerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: COLORS.white, marginBottom: 4 },
  giftBannerSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)" },
  giftBannerIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  purchaseSuccess: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(74,222,128,0.1)", borderWidth: 1, borderColor: "rgba(74,222,128,0.2)", borderRadius: 12, padding: 12, marginBottom: 14 },
  purchaseSuccessText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#4ade80" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(61,43,31,0.06)", borderWidth: 1, borderColor: "rgba(61,43,31,0.08)" },
  filterChipActive: { backgroundColor: COLORS.child.accent, borderColor: COLORS.child.accent },
  filterChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.textSub },
  filterChipTextActive: { color: COLORS.white },
  giftGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  giftCard: { width: (width - 32 - 12) / 2, backgroundColor: COLORS.child.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: COLORS.child.bgCardBorder, alignItems: "center", position: "relative" },
  popularBadge: { position: "absolute", top: 10, right: 10, backgroundColor: COLORS.coral, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  popularBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: COLORS.white },
  giftIconBg: { width: 60, height: 60, borderRadius: 18, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  giftName: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.text, textAlign: "center", marginBottom: 6, lineHeight: 18 },
  giftPrice: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.child.accent, marginBottom: 8 },
  giftCatChip: { backgroundColor: "rgba(61,43,31,0.06)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  giftCatText: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.child.textSub },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: COLORS.child.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, alignItems: "center", paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(61,43,31,0.15)", marginBottom: 20 },
  modalGiftIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.child.text, textAlign: "center", marginBottom: 6 },
  modalPrice: { fontFamily: "Inter_600SemiBold", fontSize: 22, color: COLORS.child.accent, marginBottom: 12 },
  modalDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.textSub, textAlign: "center", lineHeight: 20, marginBottom: 14 },
  modalRecipient: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.child.accentSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginBottom: 24 },
  modalRecipientText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.accent },
  purchaseBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.child.accent, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 32, width: "100%", justifyContent: "center", marginBottom: 12 },
  purchaseBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.white },
  cancelBtn: { paddingVertical: 12 },
  cancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 15, color: COLORS.child.textMuted },
});

const devStyles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  label: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: 4 },
  labelText: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.35)" },
  btn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  btnHome: { backgroundColor: "rgba(232,133,106,0.18)", borderColor: "rgba(232,133,106,0.25)" },
  btnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.8)" },
});
