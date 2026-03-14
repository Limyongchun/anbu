import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";
import { api, FamilyMessage } from "@/lib/api";

const { width, height } = Dimensions.get("window");
const TABS = ["안부", "위치", "선물샵"] as const;
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

// ─── 사진 뷰어 모달 ────────────────────────────────────────────────────────────
function PhotoViewer({
  uri,
  visible,
  onClose,
  onDelete,
  canDelete,
}: {
  uri: string;
  visible: boolean;
  onClose: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.viewerOverlay, { opacity }]}>
        <Pressable style={styles.viewerClose} onPress={onClose}>
          <Ionicons name="close-circle" size={36} color={COLORS.white} />
        </Pressable>
        <View style={styles.viewerImgWrap}>
          <Image source={{ uri }} style={styles.viewerImg} resizeMode="contain" />
        </View>
        {canDelete && onDelete && (
          <Pressable style={styles.viewerDeleteBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={20} color={COLORS.white} />
            <Text style={styles.viewerDeleteText}>사진 삭제</Text>
          </Pressable>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── 안부 탭 ──────────────────────────────────────────────────────────────────
function AnbuTab({
  familyCode,
  myName,
  myRole,
  deviceId,
}: {
  familyCode: string | null;
  myName: string | null;
  myRole: string | null;
  deviceId: string;
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

  const photoMessages = messages.filter((m) => !!m.photoData);
  const THUMB_SIZE = (width - 52) / 3;

  const loadMessages = useCallback(async () => {
    if (!familyCode) return;
    try {
      const msgs = await api.getMessages(familyCode);
      setMessages(msgs);
    } catch {}
  }, [familyCode]);

  useEffect(() => {
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "사진 라이브러리 접근 권한이 필요합니다.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setAttachedPhoto(`data:image/jpeg;base64,${asset.base64}`);
      } else if (asset.uri) {
        setAttachedPhoto(asset.uri);
      }
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "카메라 접근 권한이 필요합니다.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setAttachedPhoto(`data:image/jpeg;base64,${asset.base64}`);
      } else if (asset.uri) {
        setAttachedPhoto(asset.uri);
      }
    }
  };

  const handlePickPhoto = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["취소", "카메라로 찍기", "앨범에서 선택"],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) pickFromCamera();
          if (index === 2) pickFromLibrary();
        }
      );
    } else {
      // Android / Web: show simple alert
      Alert.alert("사진 첨부", "어디서 가져올까요?", [
        { text: "취소", style: "cancel" },
        { text: "카메라", onPress: pickFromCamera },
        { text: "갤러리", onPress: pickFromLibrary },
      ]);
    }
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !attachedPhoto) || !familyCode || !myName || !myRole) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(
        familyCode,
        deviceId,
        myName,
        myRole,
        messageText.trim(),
        attachedPhoto || null
      );
      setMessages((prev) => [msg, ...prev]);
      setMessageText("");
      setAttachedPhoto(null);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch (e) {
      console.error("Send failed", e);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!familyCode) return;
    Alert.alert(
      "메시지 삭제",
      "이 메시지를 삭제할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            setDeletingId(msgId);
            try {
              await api.deleteMessage(familyCode, msgId, deviceId);
              setMessages((prev) => prev.filter((m) => m.id !== msgId));
              if (viewerMsgId === msgId) {
                setViewerUri(null);
                setViewerMsgId(null);
              }
            } catch {
              Alert.alert("오류", "삭제에 실패했습니다.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const openPhotoViewer = (uri: string, msgId: number) => {
    setViewerUri(uri);
    setViewerMsgId(msgId);
  };

  const canDeleteMsg = (msg: FamilyMessage) => msg.deviceId === deviceId;

  return (
    <>
      {/* Photo viewer */}
      {viewerUri && (
        <PhotoViewer
          uri={viewerUri}
          visible={!!viewerUri}
          onClose={() => { setViewerUri(null); setViewerMsgId(null); }}
          canDelete={viewerMsgId !== null && messages.find(m => m.id === viewerMsgId)?.deviceId === deviceId}
          onDelete={() => { if (viewerMsgId) handleDeleteMessage(viewerMsgId); setViewerUri(null); setViewerMsgId(null); }}
        />
      )}

      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentPad}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Family connect prompt */}
        {!familyCode && (
          <View style={styles.connectPrompt}>
            <Ionicons name="link-outline" size={32} color={COLORS.child.textMuted} />
            <Text style={styles.connectPromptText}>가족을 연결하면 안부를 주고받을 수 있어요</Text>
            <Pressable style={styles.connectBtn} onPress={() => router.push("/setup")}>
              <Text style={styles.connectBtnText}>가족 연결하기</Text>
            </Pressable>
          </View>
        )}

        {/* Sub-view toggle: 메시지 / 갤러리 */}
        <View style={styles.subViewToggle}>
          <Pressable
            onPress={() => setSubView("messages")}
            style={[styles.subViewBtn, subView === "messages" && styles.subViewBtnActive]}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={15}
              color={subView === "messages" ? COLORS.child.accent : COLORS.child.tabInactive}
            />
            <Text style={[styles.subViewBtnText, subView === "messages" && styles.subViewBtnTextActive]}>
              메시지
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSubView("gallery")}
            style={[styles.subViewBtn, subView === "gallery" && styles.subViewBtnActive]}
          >
            <Ionicons
              name="images"
              size={15}
              color={subView === "gallery" ? COLORS.child.accent : COLORS.child.tabInactive}
            />
            <Text style={[styles.subViewBtnText, subView === "gallery" && styles.subViewBtnTextActive]}>
              갤러리 {photoMessages.length > 0 ? `(${photoMessages.length})` : ""}
            </Text>
          </Pressable>
        </View>

        {/* ── 메시지 뷰 ── */}
        {subView === "messages" && (
          <>
            {sent && (
              <View style={styles.sentToast}>
                <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                <Text style={styles.sentToastText}>부모님께 전송되었어요</Text>
              </View>
            )}

            {/* Compose card */}
            <View style={styles.composeCard}>
              <View style={styles.composeHeader}>
                <View style={styles.composeAvatar}>
                  <Ionicons name="heart" size={18} color={COLORS.white} />
                </View>
                <View>
                  <Text style={styles.composeTitle}>안부 보내기</Text>
                  <Text style={styles.composeSub}>글과 사진으로 부모님께 전해요</Text>
                </View>
              </View>

              {/* Attached photo preview */}
              {attachedPhoto && (
                <View style={styles.attachPreviewWrap}>
                  <Image source={{ uri: attachedPhoto }} style={styles.attachPreview} resizeMode="cover" />
                  <Pressable style={styles.attachRemoveBtn} onPress={() => setAttachedPhoto(null)}>
                    <Ionicons name="close-circle" size={24} color={COLORS.white} />
                  </Pressable>
                  <View style={styles.attachLabel}>
                    <Ionicons name="image" size={12} color={COLORS.white} />
                    <Text style={styles.attachLabelText}>사진 첨부됨</Text>
                  </View>
                </View>
              )}

              <TextInput
                style={styles.composeInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="안부 메시지를 입력하세요..."
                placeholderTextColor={COLORS.child.textMuted}
                multiline
                maxLength={200}
              />
              <View style={styles.composeFooter}>
                <View style={styles.composeFooterLeft}>
                  {/* Camera button */}
                  <Pressable
                    onPress={pickFromCamera}
                    style={({ pressed }) => [styles.attachIconBtn, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons name="camera" size={22} color={COLORS.child.accent} />
                  </Pressable>
                  {/* Gallery button */}
                  <Pressable
                    onPress={pickFromLibrary}
                    style={({ pressed }) => [styles.attachIconBtn, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons name="images" size={22} color={COLORS.child.accent} />
                  </Pressable>
                  <Text style={styles.charCount}>{messageText.length}/200</Text>
                </View>
                <Pressable
                  onPress={handleSend}
                  style={[
                    styles.sendBtn,
                    ((!messageText.trim() && !attachedPhoto) || sending || !familyCode) && styles.sendBtnDisabled,
                  ]}
                  disabled={(!messageText.trim() && !attachedPhoto) || sending || !familyCode}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color={COLORS.white} />
                      <Text style={styles.sendBtnText}>전송</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            <Text style={styles.subSectionLabel}>보낸 메시지</Text>

            {loading && <ActivityIndicator color={COLORS.child.accent} style={{ marginVertical: 16 }} />}

            {!loading && messages.length === 0 && familyCode && (
              <View style={styles.emptyState}>
                <Ionicons name="mail-outline" size={28} color={COLORS.child.textMuted} />
                <Text style={styles.emptyStateText}>아직 보낸 메시지가 없어요</Text>
              </View>
            )}

            {messages.map((msg) => (
              <View key={msg.id} style={styles.msgItem}>
                <View style={styles.msgItemAvatarWrap}>
                  <Ionicons name="person" size={13} color={COLORS.white} />
                </View>
                <View style={styles.msgItemBody}>
                  {!!msg.text && (
                    <Text style={styles.msgItemText}>{msg.text}</Text>
                  )}
                  {msg.photoData && (
                    <Pressable onPress={() => openPhotoViewer(msg.photoData!, msg.id)}>
                      <Image
                        source={{ uri: msg.photoData }}
                        style={styles.msgPhoto}
                        resizeMode="cover"
                      />
                      <View style={styles.msgPhotoHint}>
                        <Ionicons name="expand" size={12} color={COLORS.white} />
                        <Text style={styles.msgPhotoHintText}>탭하면 크게 볼 수 있어요</Text>
                      </View>
                    </Pressable>
                  )}
                  <View style={styles.msgItemMeta}>
                    <Text style={styles.msgItemTime}>{formatTime(msg.createdAt)}</Text>
                    {msg.hearts > 0 && (
                      <View style={styles.likedChip}>
                        <Ionicons name="heart" size={10} color={COLORS.coral} />
                        <Text style={styles.likedChipText}>부모님이 {msg.hearts}번 좋아했어요</Text>
                      </View>
                    )}
                  </View>
                </View>
                {canDeleteMsg(msg) && (
                  <Pressable
                    onPress={() => handleDeleteMessage(msg.id)}
                    style={styles.msgDeleteBtn}
                    disabled={deletingId === msg.id}
                  >
                    {deletingId === msg.id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    )}
                  </Pressable>
                )}
              </View>
            ))}
          </>
        )}

        {/* ── 갤러리 뷰 ── */}
        {subView === "gallery" && (
          <>
            <View style={styles.galleryHeader}>
              <Text style={styles.galleryTitle}>내가 보낸 사진</Text>
              <Text style={styles.galleryCount}>총 {photoMessages.length}장</Text>
            </View>

            {loading && <ActivityIndicator color={COLORS.child.accent} style={{ marginVertical: 24 }} />}

            {!loading && photoMessages.length === 0 && (
              <View style={styles.galleryEmpty}>
                <View style={styles.galleryEmptyIcon}>
                  <Ionicons name="images-outline" size={40} color={COLORS.child.textMuted} />
                </View>
                <Text style={styles.galleryEmptyTitle}>아직 사진이 없어요</Text>
                <Text style={styles.galleryEmptyDesc}>메시지 탭에서 사진을 첨부해서 보내보세요</Text>
                <Pressable style={styles.galleryGoMsgBtn} onPress={() => setSubView("messages")}>
                  <Ionicons name="camera" size={16} color={COLORS.white} />
                  <Text style={styles.galleryGoMsgBtnText}>사진 보내기</Text>
                </Pressable>
              </View>
            )}

            {photoMessages.length > 0 && (
              <>
                <Text style={styles.galleryManageHint}>
                  <Ionicons name="information-circle-outline" size={13} color={COLORS.child.textMuted} /> 사진을 탭하면 크게 볼 수 있어요. 삭제 버튼으로 관리하세요.
                </Text>
                <View style={styles.galleryGrid}>
                  {photoMessages.map((msg) => (
                    <View key={msg.id} style={[styles.galleryThumbWrap, { width: THUMB_SIZE, height: THUMB_SIZE }]}>
                      <Pressable
                        onPress={() => openPhotoViewer(msg.photoData!, msg.id)}
                        style={({ pressed }) => [styles.galleryThumb, { opacity: pressed ? 0.85 : 1 }]}
                      >
                        <Image
                          source={{ uri: msg.photoData! }}
                          style={{ width: "100%", height: "100%", borderRadius: 12 }}
                          resizeMode="cover"
                        />
                        {/* Time overlay */}
                        <View style={styles.thumbTimeOverlay}>
                          <Text style={styles.thumbTimeText}>{formatTime(msg.createdAt)}</Text>
                        </View>
                        {/* Hearts overlay */}
                        {msg.hearts > 0 && (
                          <View style={styles.thumbHeartChip}>
                            <Ionicons name="heart" size={9} color={COLORS.coral} />
                            <Text style={styles.thumbHeartText}>{msg.hearts}</Text>
                          </View>
                        )}
                      </Pressable>
                      {/* Delete button */}
                      {canDeleteMsg(msg) && (
                        <Pressable
                          style={styles.thumbDeleteBtn}
                          onPress={() => handleDeleteMessage(msg.id)}
                          disabled={deletingId === msg.id}
                        >
                          {deletingId === msg.id ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                          ) : (
                            <Ionicons name="trash" size={13} color={COLORS.white} />
                          )}
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

// ─── 위치 탭 ──────────────────────────────────────────────────────────────────
function LocationTab({ familyCode, myName, deviceId }: { familyCode: string | null; myName: string | null; deviceId: string }) {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [isSharing, setIsSharing] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const uploadLocation = useCallback(async (loc: Location.LocationObject, sharing: boolean) => {
    if (!familyCode || !myName) return;
    setUploading(true);
    try {
      let addr = "";
      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geocoded.length > 0) {
          const g = geocoded[0];
          addr = [g.city || g.district, g.street].filter(Boolean).join(" ") || "";
        }
      } catch {}
      setAddress(addr);
      await api.updateLocation(familyCode, {
        deviceId, memberName: myName, latitude: loc.coords.latitude, longitude: loc.coords.longitude,
        address: addr, accuracy: loc.coords.accuracy ?? undefined, isSharing: sharing,
      });
      setLastSynced(new Date());
    } catch {}
    finally { setUploading(false); }
  }, [familyCode, myName, deviceId]);

  const startWatching = useCallback(async () => {
    if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    try {
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 50 },
        (loc) => { setCurrentLocation(loc); uploadLocation(loc, isSharing); }
      );
      watchRef.current = sub;
    } catch {}
  }, [isSharing, uploadLocation]);

  useEffect(() => {
    if (permission?.granted && isSharing) {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((loc) => { setCurrentLocation(loc); uploadLocation(loc, true); }).catch(() => {});
      startWatching();
    } else if (!isSharing && watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    return () => { if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; } };
  }, [permission?.granted, isSharing]);

  const toggleSharing = async () => {
    const next = !isSharing;
    setIsSharing(next);
    if (currentLocation) await uploadLocation(currentLocation, next);
  };

  if (!permission) return <View style={styles.permissionCenter}><ActivityIndicator color={COLORS.child.accent} /></View>;

  if (!permission.granted) {
    return (
      <View style={styles.permissionCenter}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}><Ionicons name="location" size={36} color={COLORS.child.accent} /></View>
          <Text style={styles.permissionTitle}>위치 권한이 필요해요</Text>
          <Text style={styles.permissionDesc}>부모님께 내 위치를 안전하게 공유하려면 위치 접근 권한을 허용해주세요</Text>
          {!permission.canAskAgain && Platform.OS !== "web" ? (
            <Pressable style={styles.permissionBtn} onPress={() => { try { Linking.openSettings(); } catch {} }}>
              <Text style={styles.permissionBtnText}>설정에서 허용하기</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.permissionBtn} onPress={requestPermission}>
              <Ionicons name="location" size={18} color={COLORS.white} />
              <Text style={styles.permissionBtnText}>위치 권한 허용</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentPad} showsVerticalScrollIndicator={false}>
      {!familyCode && (
        <View style={styles.connectPrompt}>
          <Ionicons name="link-outline" size={32} color={COLORS.child.textMuted} />
          <Text style={styles.connectPromptText}>가족을 연결하면 위치를 공유할 수 있어요</Text>
          <Pressable style={styles.connectBtn} onPress={() => router.push("/setup")}>
            <Text style={styles.connectBtnText}>가족 연결하기</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.locationMainCard}>
        <View style={styles.locationMapVisual}>
          <View style={styles.locationMapBg} />
          <View style={styles.locationPinWrap}>
            <View style={[styles.locationPinDot, { backgroundColor: isSharing ? COLORS.child.accent : "#9ca3af" }]}>
              <Ionicons name="location" size={20} color={COLORS.white} />
            </View>
            <View style={[styles.locationPinRing, { borderColor: isSharing ? "rgba(200,112,74,0.3)" : "rgba(156,163,175,0.3)" }]} />
          </View>
          <View style={styles.locationStatusOverlay}>
            <View style={[styles.statusPill, { backgroundColor: isSharing ? "rgba(74,222,128,0.15)" : "rgba(156,163,175,0.15)" }]}>
              <View style={[styles.statusDot, { backgroundColor: isSharing ? "#4ade80" : "#9ca3af" }]} />
              <Text style={[styles.statusPillText, { color: isSharing ? "#4ade80" : "#9ca3af" }]}>
                {isSharing ? "공유 중" : "공유 중지"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.locationDetails}>
          {currentLocation ? (
            <>
              <View style={styles.locationRow}>
                <View style={styles.locationRowIcon}><Ionicons name="location" size={14} color={COLORS.child.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationRowLabel}>현재 위치</Text>
                  <Text style={styles.locationRowValue} numberOfLines={2}>
                    {address || `위도 ${currentLocation.coords.latitude.toFixed(5)}\n경도 ${currentLocation.coords.longitude.toFixed(5)}`}
                  </Text>
                </View>
              </View>
              <View style={styles.locationRow}>
                <View style={styles.locationRowIcon}><Ionicons name="radio" size={14} color={COLORS.child.accent} /></View>
                <View>
                  <Text style={styles.locationRowLabel}>정확도</Text>
                  <Text style={styles.locationRowValue}>{currentLocation.coords.accuracy ? `±${Math.round(currentLocation.coords.accuracy)}m` : "측정 중"}</Text>
                </View>
              </View>
              {lastSynced && (
                <View style={styles.locationRow}>
                  <View style={styles.locationRowIcon}><Ionicons name="sync" size={14} color={COLORS.child.accent} /></View>
                  <View>
                    <Text style={styles.locationRowLabel}>마지막 동기화</Text>
                    <Text style={styles.locationRowValue}>{formatTime(lastSynced.toISOString())}</Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.locatingRow}>
              <ActivityIndicator size="small" color={COLORS.child.accent} />
              <Text style={styles.locatingText}>위치를 확인하는 중...</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.sharingCard}>
        <View style={styles.sharingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sharingTitle}>위치 공유</Text>
            <Text style={styles.sharingSub}>{isSharing ? "부모님이 내 위치를 볼 수 있어요" : "현재 위치 공유가 중지됐어요"}</Text>
          </View>
          {uploading && <ActivityIndicator size="small" color={COLORS.child.accent} style={{ marginRight: 12 }} />}
          <Pressable onPress={toggleSharing} style={[styles.toggleBtn, { backgroundColor: isSharing ? COLORS.child.accent : "#d1d1d1" }]}>
            <Animated.View style={[styles.toggleKnob, { transform: [{ translateX: isSharing ? 22 : 2 }] }]} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.subSectionLabel}>안전 구역</Text>
      {["자택", "직장", "병원"].map((zone, i) => (
        <View key={i} style={styles.safeZoneItem}>
          <View style={styles.safeZoneIcon}>
            <Ionicons name={i === 0 ? "home" : i === 1 ? "business" : "medical"} size={16} color={COLORS.child.accent} />
          </View>
          <Text style={styles.safeZoneName}>{zone}</Text>
          <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
        </View>
      ))}
    </ScrollView>
  );
}

// ─── 선물샵 탭 ────────────────────────────────────────────────────────────────
function GiftTab() {
  const [selected, setSelected] = useState<typeof GIFTS[0] | null>(null);
  const [purchased, setPurchased] = useState<typeof GIFTS[0] | null>(null);
  const [filter, setFilter] = useState("전체");
  const categories = ["전체", "식품", "건강", "꽃"];
  const filtered = filter === "전체" ? GIFTS : GIFTS.filter((g) => g.category === filter);

  const handlePurchase = () => {
    if (!selected) return;
    setPurchased(selected);
    setSelected(null);
  };

  return (
    <>
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentPad} showsVerticalScrollIndicator={false}>
        <View style={styles.giftBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.giftBannerTitle}>부모님께 선물 보내기</Text>
            <Text style={styles.giftBannerSub}>마음을 담은 특별한 선물</Text>
          </View>
          <View style={styles.giftBannerIcon}><Ionicons name="gift" size={36} color="rgba(255,255,255,0.8)" /></View>
        </View>
        {purchased && (
          <View style={styles.purchaseSuccess}>
            <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
            <Text style={styles.purchaseSuccessText}>{purchased.name} 주문 완료!</Text>
          </View>
        )}
        <View style={styles.filterRow}>
          {categories.map((cat) => (
            <Pressable key={cat} onPress={() => setFilter(cat)} style={[styles.filterChip, filter === cat && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, filter === cat && styles.filterChipTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.giftGrid}>
          {filtered.map((gift) => (
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
            <View style={styles.modalRecipient}>
              <Ionicons name="heart" size={14} color={COLORS.child.accent} />
              <Text style={styles.modalRecipientText}>받는 분: 어머니, 아버지</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.purchaseBtn, { opacity: pressed ? 0.9 : 1 }]} onPress={handlePurchase}>
              <Ionicons name="gift" size={18} color={COLORS.white} />
              <Text style={styles.purchaseBtnText}>{selected?.price} · 선물하기</Text>
            </Pressable>
            <Pressable onPress={() => setSelected(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
export default function ChildScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, myName, myRole, deviceId, isConnected } = useFamilyContext();
  const [activeTab, setActiveTab] = useState<Tab>("안부");
  const tabUnderline = useRef(new Animated.Value(0)).current;

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleTabPress = (tab: Tab, index: number) => {
    setActiveTab(tab);
    Animated.spring(tabUnderline, { toValue: index * (width / TABS.length), useNativeDriver: false }).start();
  };

  const TAB_ICONS: Record<Tab, keyof typeof Ionicons.glyphMap> = {
    "안부": "chatbubble-ellipses",
    "위치": "location",
    "선물샵": "gift",
  };

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>마음잇기</Text>
          <Text style={styles.headerGreeting}>{myName ? `${myName}님, 안녕하세요` : "오늘도 안부를 전해보세요"}</Text>
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

      {activeTab === "안부" && (
        <AnbuTab familyCode={familyCode} myName={myName} myRole={myRole} deviceId={deviceId} />
      )}
      {activeTab === "위치" && (
        <LocationTab familyCode={familyCode} myName={myName} deviceId={deviceId} />
      )}
      {activeTab === "선물샵" && <GiftTab />}
    </View>
  );
}

// ─── 스타일 ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.child.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 24, color: COLORS.child.text, letterSpacing: 2, marginBottom: 2 },
  headerGreeting: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 6 },
  connectedChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(74,222,128,0.1)", paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: "rgba(74,222,128,0.2)",
  },
  connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  connectedText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#4ade80", letterSpacing: 1 },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: "rgba(61,43,31,0.08)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  backBtnText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub },
  tabBar: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(61,43,31,0.08)",
    position: "relative", backgroundColor: COLORS.child.bg,
  },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6 },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.child.tabInactive },
  tabLabelActive: { fontFamily: "Inter_600SemiBold", color: COLORS.child.tabActive },
  tabUnderline: { position: "absolute", bottom: 0, height: 2, backgroundColor: COLORS.child.tabActive, borderRadius: 1 },
  tabContent: { flex: 1 },
  tabContentPad: { padding: 16, paddingBottom: 32 },

  // Connect prompt
  connectPrompt: {
    alignItems: "center", backgroundColor: "rgba(200,112,74,0.06)", borderRadius: 16,
    padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(200,112,74,0.12)", gap: 8,
  },
  connectPromptText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textSub, textAlign: "center" },
  connectBtn: { backgroundColor: COLORS.child.accent, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 12, marginTop: 4 },
  connectBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.white },

  // Sub-view toggle
  subViewToggle: {
    flexDirection: "row", backgroundColor: "rgba(61,43,31,0.06)",
    borderRadius: 14, padding: 4, marginBottom: 16,
  },
  subViewBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 11,
  },
  subViewBtnActive: { backgroundColor: COLORS.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  subViewBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.tabInactive },
  subViewBtnTextActive: { color: COLORS.child.accent, fontFamily: "Inter_600SemiBold" },

  // Toast
  sentToast: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(74,222,128,0.1)", borderWidth: 1, borderColor: "rgba(74,222,128,0.2)",
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  sentToastText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#4ade80" },

  // Compose
  composeCard: {
    backgroundColor: COLORS.child.bgCard, borderRadius: 20, padding: 18, marginBottom: 22,
    borderWidth: 1, borderColor: COLORS.child.bgCardBorder,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  composeHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  composeAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.child.accent, alignItems: "center", justifyContent: "center" },
  composeTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.child.text, marginBottom: 2 },
  composeSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.child.textSub },
  attachPreviewWrap: {
    borderRadius: 14, overflow: "hidden", marginBottom: 12,
    position: "relative", height: 160,
  },
  attachPreview: { width: "100%", height: "100%", borderRadius: 14 },
  attachRemoveBtn: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16,
  },
  attachLabel: {
    position: "absolute", bottom: 8, left: 8,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  attachLabelText: { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.white },
  composeInput: {
    backgroundColor: "rgba(61,43,31,0.04)", borderRadius: 14, padding: 14,
    fontSize: 15, fontFamily: "Inter_400Regular", color: COLORS.child.text,
    minHeight: 72, textAlignVertical: "top", marginBottom: 12,
    borderWidth: 1, borderColor: "rgba(61,43,31,0.06)",
  },
  composeFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  composeFooterLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  attachIconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.child.accentSoft,
    alignItems: "center", justifyContent: "center",
  },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.child.textMuted },
  sendBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.child.accent, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 14, minWidth: 72, justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.white },
  subSectionLabel: {
    fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.child.textSub,
    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12,
  },
  emptyState: { alignItems: "center", padding: 24, gap: 8 },
  emptyStateText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.child.textMuted, textAlign: "center" },
  msgItem: {
    flexDirection: "row", gap: 12, backgroundColor: COLORS.child.bgCard,
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.child.bgCardBorder,
  },
  msgItemAvatarWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.child.accent, alignItems: "center", justifyContent: "center" },
  msgItemBody: { flex: 1 },
  msgItemText: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.text, lineHeight: 20, marginBottom: 6 },
  msgPhoto: { width: "100%", height: 160, borderRadius: 12, marginBottom: 6 },
  msgPhotoHint: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  msgPhotoHintText: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.child.textMuted },
  msgItemMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  msgItemTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.child.textMuted },
  likedChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: COLORS.child.accentSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
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
  thumbTimeOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.45)", padding: 4, borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  thumbTimeText: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.85)", textAlign: "center" },
  thumbHeartChip: {
    position: "absolute", top: 5, left: 5,
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6,
  },
  thumbHeartText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: COLORS.white },
  thumbDeleteBtn: {
    position: "absolute", top: -7, right: -7,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#ef4444",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
    zIndex: 10,
  },
  galleryEmpty: {
    alignItems: "center", paddingVertical: 48, gap: 10,
  },
  galleryEmptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "rgba(61,43,31,0.06)",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  galleryEmptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: COLORS.child.text },
  galleryEmptyDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.textSub, textAlign: "center", lineHeight: 20 },
  galleryGoMsgBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.child.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8,
  },
  galleryGoMsgBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.white },

  // Photo viewer
  viewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  viewerClose: { position: "absolute", top: 54, right: 20, zIndex: 10 },
  viewerImgWrap: { width: "100%", height: height * 0.72, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  viewerImg: { width: "100%", height: "100%", borderRadius: 16 },
  viewerDeleteBtn: {
    position: "absolute", bottom: 60,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(239,68,68,0.85)", paddingHorizontal: 22, paddingVertical: 13, borderRadius: 20,
  },
  viewerDeleteText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.white },

  // Location
  permissionCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  permissionCard: {
    backgroundColor: COLORS.child.bgCard, borderRadius: 24, padding: 28,
    alignItems: "center", borderWidth: 1, borderColor: COLORS.child.bgCardBorder, gap: 12, width: "100%", maxWidth: 340,
  },
  permissionIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  permissionTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: COLORS.child.text, textAlign: "center" },
  permissionDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.textSub, textAlign: "center", lineHeight: 20 },
  permissionBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.child.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, marginTop: 8 },
  permissionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.white },
  locationMainCard: { backgroundColor: COLORS.child.bgCard, borderRadius: 20, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: COLORS.child.bgCardBorder },
  locationMapVisual: { height: 160, backgroundColor: "#c8d8b0", alignItems: "center", justifyContent: "center", position: "relative" },
  locationMapBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(100,140,70,0.2)" },
  locationPinWrap: { alignItems: "center", justifyContent: "center" },
  locationPinDot: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", zIndex: 2 },
  locationPinRing: { position: "absolute", width: 64, height: 64, borderRadius: 32, borderWidth: 2 },
  locationStatusOverlay: { position: "absolute", top: 12, right: 12 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  locationDetails: { padding: 16, gap: 12 },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  locationRowIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center", marginTop: 1 },
  locationRowLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.child.textSub, marginBottom: 2 },
  locationRowValue: { fontFamily: "Inter_500Medium", fontSize: 13, color: COLORS.child.text },
  locatingRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8 },
  locatingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.child.textSub },
  sharingCard: { backgroundColor: COLORS.child.bgCard, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.child.bgCardBorder },
  sharingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sharingTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.child.text, marginBottom: 3 },
  sharingSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.child.textSub },
  toggleBtn: { width: 50, height: 28, borderRadius: 14, justifyContent: "center", paddingHorizontal: 2 },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.white },
  safeZoneItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.child.bgCard, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.child.bgCardBorder },
  safeZoneIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.child.accentSoft, alignItems: "center", justifyContent: "center" },
  safeZoneName: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.child.text, flex: 1 },

  // Gifts
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
