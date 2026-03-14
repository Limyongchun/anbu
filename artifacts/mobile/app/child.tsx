import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
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

const { width } = Dimensions.get("window");

const TABS = ["안부", "위치", "선물샵"] as const;
type Tab = typeof TABS[number];

const recentMessages = [
  { id: 1, text: "엄마 오늘 날씨 좋죠? 산책 다녀오셨어요?", time: "오전 10:23", from: "나", liked: true },
  { id: 2, text: "아버지 건강하게 계세요! 다음 주에 갈게요", time: "어제", from: "나", liked: false },
];

const gifts = [
  { id: 1, name: "제철 과일 선물세트", price: 39000, priceStr: "39,000원", icon: "nutrition", category: "식품", popular: true },
  { id: 2, name: "한우 정육 세트", price: 89000, priceStr: "89,000원", icon: "restaurant", category: "식품", popular: false },
  { id: 3, name: "홍삼 건강세트", price: 59000, priceStr: "59,000원", icon: "leaf", category: "건강", popular: true },
  { id: 4, name: "꽃바구니 선물", price: 45000, priceStr: "45,000원", icon: "flower", category: "꽃", popular: false },
  { id: 5, name: "전통 한과 세트", price: 32000, priceStr: "32,000원", icon: "cafe", category: "식품", popular: false },
  { id: 6, name: "건강기능식품", price: 75000, priceStr: "75,000원", icon: "fitness", category: "건강", popular: true },
];

const locationData = {
  name: "어머니",
  status: "안전",
  location: "서울 강남구 자택",
  lastSeen: "방금 전",
  battery: 78,
};

function StatusBullet({ status }: { status: string }) {
  const isGood = status === "안전";
  return (
    <View style={[styles.statusPill, { backgroundColor: isGood ? "rgba(74,222,128,0.15)" : "rgba(251,191,36,0.15)" }]}>
      <View style={[styles.statusDot, { backgroundColor: isGood ? "#4ade80" : "#fbbf24" }]} />
      <Text style={[styles.statusPillText, { color: isGood ? "#4ade80" : "#fbbf24" }]}>{status}</Text>
    </View>
  );
}

function AnbuTab() {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [msgList, setMsgList] = useState(recentMessages);
  const sendAnim = useRef(new Animated.Value(1)).current;

  const handleSend = () => {
    if (!message.trim()) return;
    Animated.sequence([
      Animated.timing(sendAnim, { toValue: 0.85, duration: 100, useNativeDriver: false }),
      Animated.spring(sendAnim, { toValue: 1, useNativeDriver: false }),
    ]).start();
    const newMsg = { id: Date.now(), text: message, time: "방금 전", from: "나", liked: false };
    setMsgList((prev) => [newMsg, ...prev]);
    setMessage("");
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentPad} showsVerticalScrollIndicator={false}>
      {sent && (
        <View style={styles.sentToast}>
          <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
          <Text style={styles.sentToastText}>부모님께 전송되었어요</Text>
        </View>
      )}

      <View style={styles.composeCard}>
        <View style={styles.composeHeader}>
          <View style={styles.composeAvatar}>
            <Ionicons name="heart" size={18} color={COLORS.white} />
          </View>
          <View>
            <Text style={styles.composeTitle}>안부 메시지 보내기</Text>
            <Text style={styles.composeSub}>부모님께 따뜻한 말 한마디</Text>
          </View>
        </View>
        <TextInput
          style={styles.composeInput}
          value={message}
          onChangeText={setMessage}
          placeholder="안부 메시지를 입력하세요..."
          placeholderTextColor={COLORS.child.textMuted}
          multiline
          maxLength={200}
        />
        <View style={styles.composeFooter}>
          <Text style={styles.charCount}>{message.length}/200</Text>
          <Animated.View style={{ transform: [{ scale: sendAnim }] }}>
            <Pressable
              onPress={handleSend}
              style={[styles.sendBtn, { opacity: message.trim() ? 1 : 0.5 }]}
            >
              <Ionicons name="send" size={16} color={COLORS.white} />
              <Text style={styles.sendBtnText}>전송</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <Text style={styles.subSectionLabel}>최근 보낸 메시지</Text>

      {msgList.map((msg) => (
        <View key={msg.id} style={styles.msgItem}>
          <View style={styles.msgItemLeft}>
            <View style={styles.msgItemAvatarWrap}>
              <Ionicons name="person" size={14} color={COLORS.white} />
            </View>
          </View>
          <View style={styles.msgItemBody}>
            <Text style={styles.msgItemText}>{msg.text}</Text>
            <View style={styles.msgItemMeta}>
              <Text style={styles.msgItemTime}>{msg.time}</Text>
              {msg.liked && (
                <View style={styles.likedChip}>
                  <Ionicons name="heart" size={10} color={COLORS.coral} />
                  <Text style={styles.likedChipText}>부모님이 좋아했어요</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function LocationTab() {
  const [isSharing, setIsSharing] = useState(true);

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentPad} showsVerticalScrollIndicator={false}>
      <View style={styles.locationCard}>
        <View style={styles.locationMapPlaceholder}>
          <View style={styles.locationMapOverlay}>
            <Ionicons name="map" size={48} color="rgba(255,255,255,0.3)" />
          </View>
          <View style={styles.locationPin}>
            <View style={styles.locationPinDot}>
              <Ionicons name="location" size={20} color={COLORS.white} />
            </View>
            <View style={styles.locationPinRing} />
          </View>
          <View style={styles.locationCardChip}>
            <StatusBullet status={locationData.status} />
          </View>
        </View>

        <View style={styles.locationInfo}>
          <View style={styles.locationInfoRow}>
            <View style={styles.locationInfoIcon}>
              <Ionicons name="location" size={16} color={COLORS.child.accent} />
            </View>
            <View style={styles.locationInfoText}>
              <Text style={styles.locationInfoLabel}>현재 위치</Text>
              <Text style={styles.locationInfoValue}>{locationData.location}</Text>
            </View>
          </View>
          <View style={styles.locationInfoRow}>
            <View style={styles.locationInfoIcon}>
              <Ionicons name="time" size={16} color={COLORS.child.accent} />
            </View>
            <View style={styles.locationInfoText}>
              <Text style={styles.locationInfoLabel}>마지막 확인</Text>
              <Text style={styles.locationInfoValue}>{locationData.lastSeen}</Text>
            </View>
          </View>
          <View style={styles.locationInfoRow}>
            <View style={styles.locationInfoIcon}>
              <Ionicons name="battery-half" size={16} color={COLORS.child.accent} />
            </View>
            <View style={styles.locationInfoText}>
              <Text style={styles.locationInfoLabel}>배터리</Text>
              <Text style={styles.locationInfoValue}>{locationData.battery}%</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sharingCard}>
        <View style={styles.sharingRow}>
          <View>
            <Text style={styles.sharingTitle}>내 위치 공유 중</Text>
            <Text style={styles.sharingSub}>부모님이 내 위치를 볼 수 있어요</Text>
          </View>
          <Pressable
            onPress={() => setIsSharing(!isSharing)}
            style={[styles.toggleBtn, { backgroundColor: isSharing ? COLORS.child.accent : "#d1d1d1" }]}
          >
            <View style={[styles.toggleKnob, { transform: [{ translateX: isSharing ? 22 : 2 }] }]} />
          </Pressable>
        </View>
      </View>

      <View style={styles.safeZonesHeader}>
        <Text style={styles.subSectionLabel}>안전 구역</Text>
        <Pressable style={styles.addZoneBtn}>
          <Ionicons name="add" size={16} color={COLORS.child.accent} />
          <Text style={styles.addZoneBtnText}>추가</Text>
        </Pressable>
      </View>

      {["자택", "회사", "병원"].map((zone, i) => (
        <View key={i} style={styles.safeZoneItem}>
          <View style={styles.safeZoneIcon}>
            <Ionicons
              name={i === 0 ? "home" : i === 1 ? "business" : "medical"}
              size={16}
              color={COLORS.child.accent}
            />
          </View>
          <Text style={styles.safeZoneName}>{zone}</Text>
          <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
        </View>
      ))}
    </ScrollView>
  );
}

function GiftTab() {
  const [selected, setSelected] = useState<typeof gifts[0] | null>(null);
  const [purchased, setPurchased] = useState<typeof gifts[0] | null>(null);
  const [filter, setFilter] = useState("전체");
  const categories = ["전체", "식품", "건강", "꽃"];

  const filteredGifts = filter === "전체" ? gifts : gifts.filter((g) => g.category === filter);

  const handlePurchase = () => {
    if (!selected) return;
    setPurchased(selected);
    setSelected(null);
  };

  return (
    <>
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentPad} showsVerticalScrollIndicator={false}>
        <View style={styles.giftBanner}>
          <View style={styles.giftBannerContent}>
            <Text style={styles.giftBannerTitle}>부모님께 선물 보내기</Text>
            <Text style={styles.giftBannerSub}>마음을 담은 특별한 선물</Text>
          </View>
          <View style={styles.giftBannerIcon}>
            <Ionicons name="gift" size={36} color="rgba(255,255,255,0.8)" />
          </View>
        </View>

        {purchased && (
          <View style={styles.purchaseSuccess}>
            <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
            <Text style={styles.purchaseSuccessText}>{purchased.name} 주문 완료!</Text>
          </View>
        )}

        <View style={styles.filterRow}>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setFilter(cat)}
              style={[styles.filterChip, filter === cat && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === cat && styles.filterChipTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.giftGrid}>
          {filteredGifts.map((gift) => (
            <Pressable
              key={gift.id}
              style={({ pressed }) => [styles.giftCard, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
              onPress={() => setSelected(gift)}
            >
              {gift.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>인기</Text>
                </View>
              )}
              <View style={styles.giftIconBg}>
                <Ionicons name={gift.icon as any} size={28} color={COLORS.child.accent} />
              </View>
              <Text style={styles.giftName}>{gift.name}</Text>
              <Text style={styles.giftPrice}>{gift.priceStr}</Text>
              <View style={styles.giftCategoryChip}>
                <Text style={styles.giftCategoryText}>{gift.category}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={styles.modalGiftIcon}>
              <Ionicons name={(selected?.icon as any) ?? "gift"} size={40} color={COLORS.child.accent} />
            </View>
            <Text style={styles.modalTitle}>{selected?.name}</Text>
            <Text style={styles.modalPrice}>{selected?.priceStr}</Text>
            <Text style={styles.modalDesc}>부모님께 따뜻한 마음을 전해보세요. 당일 배송 가능합니다.</Text>
            <View style={styles.modalRecipient}>
              <Ionicons name="heart" size={14} color={COLORS.child.accent} />
              <Text style={styles.modalRecipientText}>받는 분: 어머니, 아버지</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.purchaseBtn, { opacity: pressed ? 0.9 : 1 }]}
              onPress={handlePurchase}
            >
              <Ionicons name="gift" size={18} color={COLORS.white} />
              <Text style={styles.purchaseBtnText}>{selected?.priceStr} · 선물하기</Text>
            </Pressable>
            <Pressable onPress={() => setSelected(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function ChildScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("안부");
  const tabUnderline = useRef(new Animated.Value(0)).current;

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleTabPress = (tab: Tab, index: number) => {
    setActiveTab(tab);
    Animated.spring(tabUnderline, {
      toValue: index * (width / TABS.length),
      useNativeDriver: false,
    }).start();
  };

  const TAB_ICONS: Record<Tab, string> = {
    "안부": "mail",
    "위치": "location",
    "선물샵": "gift",
  };

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>마음잇기</Text>
          <Text style={styles.headerGreeting}>오늘도 안부를 전해보세요</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={18} color={COLORS.child.textSub} />
          <Text style={styles.backBtnText}>나가기</Text>
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab, index) => (
          <Pressable
            key={tab}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab, index)}
          >
            <Ionicons
              name={TAB_ICONS[tab] as any}
              size={18}
              color={activeTab === tab ? COLORS.child.tabActive : COLORS.child.tabInactive}
            />
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
        <Animated.View
          style={[
            styles.tabUnderline,
            { width: width / TABS.length, transform: [{ translateX: tabUnderline }] },
          ]}
        />
      </View>

      {activeTab === "안부" && <AnbuTab />}
      {activeTab === "위치" && <LocationTab />}
      {activeTab === "선물샵" && <GiftTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.child.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: COLORS.child.text,
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerGreeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.child.textSub,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(61,43,31,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  backBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.child.textSub,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(61,43,31,0.08)",
    position: "relative",
    backgroundColor: COLORS.child.bg,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  tabLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.child.tabInactive,
  },
  tabLabelActive: {
    fontFamily: "Inter_600SemiBold",
    color: COLORS.child.tabActive,
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    height: 2,
    backgroundColor: COLORS.child.tabActive,
    borderRadius: 1,
  },
  tabContent: {
    flex: 1,
  },
  tabContentPad: {
    padding: 16,
    paddingBottom: 32,
  },
  // Anbu tab
  sentToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  sentToastText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#4ade80",
  },
  composeCard: {
    backgroundColor: COLORS.child.bgCard,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.child.bgCardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  composeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  composeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.child.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  composeTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: COLORS.child.text,
    marginBottom: 2,
  },
  composeSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.child.textSub,
  },
  composeInput: {
    backgroundColor: "rgba(61,43,31,0.04)",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: COLORS.child.text,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(61,43,31,0.06)",
  },
  composeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.child.textMuted,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.child.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  sendBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: COLORS.white,
  },
  subSectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: COLORS.child.textSub,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  msgItem: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: COLORS.child.bgCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.child.bgCardBorder,
  },
  msgItemLeft: {},
  msgItemAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.child.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  msgItemBody: { flex: 1 },
  msgItemText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.child.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  msgItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  msgItemTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: COLORS.child.textMuted,
  },
  likedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.child.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  likedChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: COLORS.child.accent,
  },
  // Location tab
  locationCard: {
    backgroundColor: COLORS.child.bgCard,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.child.bgCardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  locationMapPlaceholder: {
    height: 180,
    backgroundColor: "#c8d8b8",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  locationMapOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(100,130,80,0.3)",
  },
  locationPin: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  locationPinDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.child.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.child.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  locationPinRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(200,112,74,0.3)",
  },
  locationCardChip: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  locationInfo: {
    padding: 16,
    gap: 12,
  },
  locationInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationInfoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.child.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  locationInfoText: { flex: 1 },
  locationInfoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: COLORS.child.textSub,
    marginBottom: 2,
  },
  locationInfoValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.child.text,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  sharingCard: {
    backgroundColor: COLORS.child.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.child.bgCardBorder,
  },
  sharingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sharingTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: COLORS.child.text,
    marginBottom: 3,
  },
  sharingSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.child.textSub,
  },
  toggleBtn: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  safeZonesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addZoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addZoneBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.child.accent,
  },
  safeZoneItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.child.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.child.bgCardBorder,
  },
  safeZoneIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.child.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  safeZoneName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.child.text,
    flex: 1,
  },
  // Gift tab
  giftBanner: {
    backgroundColor: COLORS.child.accent,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  giftBannerContent: { flex: 1 },
  giftBannerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: COLORS.white,
    marginBottom: 4,
  },
  giftBannerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  giftBannerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  purchaseSuccessText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#4ade80",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(61,43,31,0.06)",
    borderWidth: 1,
    borderColor: "rgba(61,43,31,0.08)",
  },
  filterChipActive: {
    backgroundColor: COLORS.child.accent,
    borderColor: COLORS.child.accent,
  },
  filterChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.child.textSub,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  giftGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  giftCard: {
    width: (width - 32 - 12) / 2,
    backgroundColor: COLORS.child.bgCard,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.child.bgCardBorder,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  popularBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: COLORS.coral,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: COLORS.white,
  },
  giftIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: COLORS.child.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  giftName: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.child.text,
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 18,
  },
  giftPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: COLORS.child.accent,
    marginBottom: 8,
  },
  giftCategoryChip: {
    backgroundColor: "rgba(61,43,31,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  giftCategoryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: COLORS.child.textSub,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.child.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    alignItems: "center",
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(61,43,31,0.15)",
    marginBottom: 20,
  },
  modalGiftIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.child.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: COLORS.child.text,
    textAlign: "center",
    marginBottom: 6,
  },
  modalPrice: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
    color: COLORS.child.accent,
    marginBottom: 12,
  },
  modalDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.child.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
  modalRecipient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.child.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 24,
  },
  modalRecipientText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.child.accent,
  },
  purchaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.child.accent,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: "100%",
    justifyContent: "center",
    marginBottom: 12,
  },
  purchaseBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: COLORS.white,
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: COLORS.child.textMuted,
  },
});
