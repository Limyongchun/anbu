import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "@/constants/colors";
import { FamilyRole, useFamilyContext } from "@/context/FamilyContext";
import { useLang } from "@/context/LanguageContext";
import { Lang } from "@/lib/i18n";
import { api } from "@/lib/api";

type ChildMember = {
  deviceId: string;
  memberName: string;
  role: string;
  childRole: string | null;
  joinedAt: string;
};

const APP_VERSION = "1.0.0";
const SUPPORT_EMAIL = "support@dugo.app";


function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>;
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
  danger,
  rightIcon = "chevron-forward",
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rightIcon?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.row, onPress && pressed && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[s.rowIcon, danger && { backgroundColor: "rgba(255,80,80,0.1)" }]}>
        <Ionicons name={icon as any} size={18} color={danger ? "#ff5050" : "#888"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, danger && { color: "#ff5050" }]}>{label}</Text>
        {!!value && <Text style={s.rowValue}>{value}</Text>}
      </View>
      {onPress && (
        <Ionicons name={rightIcon as any} size={16} color={danger ? "#ff5050" : "rgba(0,0,0,0.2)"} />
      )}
    </Pressable>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

const LANG_MAP: Record<Lang, { label: string; code: string }> = {
  ko: { label: "\uD55C\uAD6D\uC5B4", code: "KO" },
  en: { label: "English", code: "EN" },
  ja: { label: "\u65E5\u672C\u8A9E", code: "JA" },
};

function ProfileLangDropdown({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const current = LANG_MAP[lang];
  const others = (Object.keys(LANG_MAP) as Lang[]).filter((id) => id !== lang);

  return (
    <View>
      <Pressable
        style={({ pressed }) => [s.row, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => setOpen(!open)}
      >
        <View style={s.rowIcon}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#E0E0E0", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 10, color: "#555" }}>{current.code}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowLabel}>{current.label}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="rgba(0,0,0,0.2)" />
      </Pressable>
      {open && others.map((id) => {
        const opt = LANG_MAP[id];
        return (
          <React.Fragment key={id}>
            <Divider />
            <Pressable
              style={({ pressed }) => [s.row, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => { setLang(id); setOpen(false); }}
            >
              <View style={s.rowIcon}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 10, color: "#999" }}>{opt.code}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{opt.label}</Text>
              </View>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { familyCode, allFamilyCodes, myName, myRole, childRole, isMasterChild, deviceId, isConnected, connect, updateName, disconnect, addExtraFamily, removeExtraFamily } = useFamilyContext();
  const { lang, setLang, t } = useLang();

  const [familyChildren, setFamilyChildren] = useState<ChildMember[]>([]);
  const [childCodeCopied, setChildCodeCopied] = useState(false);
  type ParentEntry = { name: string; deviceId: string; code: string; photoData?: string | null };
  const [parentEntries, setParentEntries] = useState<ParentEntry[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);

  const PHOTO_KEY = deviceId ? `profile_photo_${deviceId}` : "";
  const PRIVACY_KEY = deviceId ? `privacy_mode_${deviceId}` : "";

  useEffect(() => {
    if (!PHOTO_KEY) { setProfilePhoto(null); return; }
    let cancelled = false;

    (async () => {
      const local = await AsyncStorage.getItem(PHOTO_KEY).catch(() => null);
      if (local && local.startsWith("data:")) {
        if (!cancelled) setProfilePhoto(local);
        return;
      }

      if (local && !local.startsWith("data:")) {
        await AsyncStorage.removeItem(PHOTO_KEY).catch(() => {});
      }

      if (familyCode && deviceId) {
        try {
          const data = await api.getFamily(familyCode);
          const me = (data.members ?? []).find(
            (m: { deviceId: string }) => m.deviceId === deviceId
          );
          if (me?.photoData && !cancelled) {
            setProfilePhoto(me.photoData);
            await AsyncStorage.setItem(PHOTO_KEY, me.photoData).catch(() => {});
          }
        } catch {}
      }
    })();

    return () => { cancelled = true; };
  }, [deviceId, familyCode]);

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t.permissionNeeded, t.photoPermissionMsg);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const { base64 } = result.assets[0];
      if (base64) {
        const photoData = `data:image/jpeg;base64,${base64}`;
        setProfilePhoto(photoData);
        if (PHOTO_KEY) {
          await AsyncStorage.setItem(PHOTO_KEY, photoData).catch(() => {});
        }
        if (familyCode && deviceId) {
          api.updateMemberPhoto(familyCode, deviceId, photoData).catch(() => {});
          if (allFamilyCodes.length > 1) {
            allFamilyCodes.forEach(code => {
              if (code !== familyCode) {
                api.updateMemberPhoto(code, deviceId, photoData).catch(() => {});
              }
            });
          }
        }
      }
    }
  };

  const reloadChildren = () => {
    if (myRole !== "child" || !familyCode) return;
    api.getFamily(familyCode).then(data => {
      setFamilyChildren((data.members as ChildMember[]).filter(m => m.role === "child"));
    }).catch(() => {});
  };

  const loadParentNames = () => {
    if (myRole !== "child" || allFamilyCodes.length === 0) return;
    Promise.all(
      allFamilyCodes.map(code =>
        api.getFamily(code)
          .then(data => {
            const parents = (data.members ?? []).filter((m: { role: string }) => m.role === "parent");
            return parents.map((p: { memberName: string; deviceId?: string; photoData?: string | null }) => ({
              name: p.memberName,
              deviceId: p.deviceId ?? "",
              code,
              photoData: p.photoData || null,
            }));
          })
          .catch(() => [] as ParentEntry[])
      )
    ).then(results => {
      const all: ParentEntry[] = results.flat();
      const seen = new Set<string>();
      const unique = all.filter(p => {
        const key = `${p.code}_${p.deviceId || p.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setParentEntries(unique);
    });
  };

  useEffect(() => { reloadChildren(); loadParentNames(); }, [myRole, familyCode, allFamilyCodes.length]);

  useEffect(() => {
    if (myRole !== "parent" || !deviceId) return;
    let cancelled = false;
    (async () => {
      if (familyCode) {
        try {
          const data = await api.getFamily(familyCode);
          const me = (data.members ?? []).find((m: { deviceId: string }) => m.deviceId === deviceId);
          if (me && !cancelled) {
            setPrivacyMode(!!me.privacyMode);
            if (PRIVACY_KEY) await AsyncStorage.setItem(PRIVACY_KEY, String(!!me.privacyMode)).catch(() => {});
            return;
          }
        } catch {}
      }
      if (PRIVACY_KEY) {
        const val = await AsyncStorage.getItem(PRIVACY_KEY).catch(() => null);
        if (!cancelled) setPrivacyMode(val === "true");
      }
    })();
    return () => { cancelled = true; };
  }, [myRole, deviceId, familyCode]);

  const togglePrivacyMode = async () => {
    const prev = privacyMode;
    const newVal = !prev;
    setPrivacyMode(newVal);
    if (PRIVACY_KEY) await AsyncStorage.setItem(PRIVACY_KEY, String(newVal)).catch(() => {});
    if (familyCode && deviceId) {
      try {
        await api.setPrivacyMode(familyCode, deviceId, newVal);
        if (allFamilyCodes.length > 1) {
          await Promise.all(allFamilyCodes.filter(c => c !== familyCode).map(c => api.setPrivacyMode(c, deviceId, newVal)));
        }
      } catch {
        setPrivacyMode(prev);
        if (PRIVACY_KEY) await AsyncStorage.setItem(PRIVACY_KEY, String(prev)).catch(() => {});
      }
    }
  };

  const handleRemoveChild = (child: ChildMember) => {
    if (!familyCode || !deviceId) return;
    setConfirmModal({
      title: t.removeSubChildTitle,
      message: t.removeSubChildMsg.replace("{name}", child.memberName),
      onConfirm: async () => {
        await api.removeFamilyMember(familyCode, child.deviceId, deviceId);
        reloadChildren();
      },
    });
  };

  const copyChildCode = async () => {
    if (!familyCode) return;
    await Clipboard.setStringAsync(familyCode);
    setChildCodeCopied(true);
    setTimeout(() => setChildCodeCopied(false), 2500);
  };

  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState(myName ?? "");
  const [nameSaving, setNameSaving] = useState(false);

  const [showFaq, setShowFaq] = useState<number | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [masterJoinCode, setMasterJoinCode] = useState("");
  const [masterJoining, setMasterJoining] = useState(false);
  const [masterJoinError, setMasterJoinError] = useState("");

  const handleJoinMasterRoom = async () => {
    const code = masterJoinCode.trim().toUpperCase();
    if (!code || !myName || !deviceId) return;
    if (allFamilyCodes.includes(code)) {
      setMasterJoinError(t.alreadyLinkedCode as string);
      return;
    }
    setMasterJoining(true);
    setMasterJoinError("");
    try {
      await api.joinFamily(code, deviceId, myName, "child");
      await connect(code, myName, "child");
      setMasterJoinCode("");
      router.replace("/child");
    } catch {
      setMasterJoinError(t.homeJoinError as string);
    } finally {
      setMasterJoining(false);
    }
  };

  // ── 이미 연결된 자녀가 부모님 추가 ──
  const [showAddParentSheet, setShowAddParentSheet] = useState(false);
  const [addParentCode, setAddParentCode] = useState("");
  const [addingParent, setAddingParent] = useState(false);
  const [addParentError, setAddParentError] = useState("");

  const handleAddParent = async () => {
    const code = addParentCode.trim().toUpperCase();
    if (!code || !myName || !myRole) return;
    if (allFamilyCodes.includes(code)) {
      setAddParentError(t.alreadyLinkedCode);
      return;
    }
    setAddingParent(true); setAddParentError("");
    try {
      await api.joinFamily(code, deviceId, myName, myRole);
      await addExtraFamily(code);
      setShowAddParentSheet(false);
      setAddParentCode("");
    } catch {
      setAddParentError(t.errorCodeCheck);
    } finally {
      setAddingParent(false);
    }
  };

  const handleRemoveParent = (entry: ParentEntry) => {
    setConfirmModal({
      title: t.removeParent,
      message: t.removeParentMsg as string,
      onConfirm: async () => {
        if (entry.deviceId && deviceId) {
          try {
            await api.removeFamilyMember(entry.code, entry.deviceId, deviceId);
          } catch {}
        }
        const entryKey = entry.deviceId || entry.name;
        const remainingInCode = parentEntries.filter(p => p.code === entry.code && (p.deviceId || p.name) !== entryKey);
        if (remainingInCode.length > 0) {
          loadParentNames();
          return;
        }
        if (entry.code === familyCode) {
          if (allFamilyCodes.length > 1) {
            const nextCode = allFamilyCodes.find(c => c !== entry.code);
            if (nextCode && deviceId) {
              await api.leaveFamily(entry.code, deviceId).catch(() => {});
              await disconnect();
              const familyData = await api.getFamily(nextCode).catch(() => null);
              const me = familyData?.members?.find((m: { deviceId: string }) => m.deviceId === deviceId);
              if (me) {
                await connect(nextCode, me.memberName, me.role as "parent" | "child");
                for (const extra of allFamilyCodes.filter(c => c !== entry.code && c !== nextCode)) {
                  await addExtraFamily(extra);
                }
              }
            }
          } else {
            if (deviceId) await api.leaveFamily(entry.code, deviceId).catch(() => {});
            await disconnect();
            router.replace("/");
            return;
          }
        } else {
          const anyLeftInCode = parentEntries.some(p => p.code === entry.code && (p.deviceId || p.name) !== entryKey);
          if (!anyLeftInCode) {
            if (deviceId) await api.leaveFamily(entry.code, deviceId).catch(() => {});
            await removeExtraFamily(entry.code);
          }
        }
        loadParentNames();
      },
    });
  };

  // ── 코드 연결 (참가) ──
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinRole, setJoinRole] = useState<FamilyRole | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    const name = joinName.trim();
    if (!code || !name || !joinRole) return;
    setJoining(true); setJoinError("");
    try {
      await api.joinFamily(code, deviceId, name, joinRole);
      await connect(code, name, joinRole);
      setShowJoinSheet(false);
      router.replace(joinRole === "parent" ? "/parent" : "/child");
    } catch {
      setJoinError(t.errorCodeCheck);
    } finally {
      setJoining(false);
    }
  };

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const roleLabel = myRole === "parent"
    ? t.roleParentLabel
    : myRole === "child"
      ? (isMasterChild ? t.masterChild : t.subChild)
      : "-";
  const roleColor = myRole === "parent" ? "#6c63ff" : myRole === "child" ? "#E0E0E0" : "#aaa";
  const roleTextColor = myRole === "parent" ? "#fff" : myRole === "child" ? "#555" : "#fff";

  const shortId = deviceId ? deviceId.slice(-8).toUpperCase() : "--------";

  const copyCode = async () => {
    if (!familyCode) return;
    await Clipboard.setStringAsync(familyCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setNameSaving(true);
    try {
      await updateName(trimmed);
      setShowNameModal(false);
    } finally {
      setNameSaving(false);
    }
  };

  const handleDisconnect = () => {
    setConfirmModal({
      title: t.disconnectTitle,
      message: t.disconnectMsg,
      onConfirm: async () => {
        if (deviceId) {
          await Promise.all(
            allFamilyCodes.map(code => api.leaveFamily(code, deviceId).catch(() => {}))
          );
        }
        await disconnect();
        router.replace("/");
      },
    });
  };

  const openEmail = () => {
    const body = t.emailBody.replace("{deviceId}", shortId).replace("{version}", APP_VERSION);
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t.emailSubject)}&body=${encodeURIComponent(body)}`
    );
  };

  return (
    <LinearGradient colors={["#D4843A", "#C4692E", "#A85528"]} style={[s.container, { paddingTop: topInset }]}>
      {/* ── 헤더 ── */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </Pressable>
        <Text style={s.headerTitle}>{t.profileTitle}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: bottomInset + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 프로필 카드 ── */}
        <View style={s.profileCard}>
          <Pressable style={s.avatarCircle} onPress={pickProfilePhoto}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={s.avatarPhoto} />
            ) : (
              <Ionicons name="camera" size={26} color="#888" />
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{myName ?? t.noName}</Text>
            <View style={[s.roleBadge, { backgroundColor: roleColor }]}>
              <Text style={[s.roleText, { color: roleTextColor }]}>{roleLabel}</Text>
            </View>
          </View>
          <Pressable style={s.editBtn} onPress={() => { setNameInput(myName ?? ""); setShowNameModal(true); }}>
            <Ionicons name="pencil" size={15} color="#888" />
            <Text style={s.editBtnText}>{t.edit}</Text>
          </Pressable>
        </View>

        {/* ── 마스터 코드 (모든 연결된 자녀) ── */}
        {myRole === "child" && isConnected && familyCode && (
          <>
            <SectionHeader title={isMasterChild ? t.masterCode : t.connectedCode} />
            <View style={[s.card, { borderWidth: 2, borderColor: "#FFD700" }]}>
              <View style={{ padding: 16, paddingBottom: 12 }}>
                <View style={s.childCodeDisplay}>
                  {familyCode.split("").map((ch, i) => (
                    <View key={i} style={s.childCodeCell}>
                      <Text style={s.childCodeCellText}>{ch.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
                <Pressable style={[s.copyBtn, childCodeCopied && s.copyBtnDone]} onPress={copyChildCode}>
                  <Ionicons name={childCodeCopied ? "checkmark" : "copy-outline"} size={14} color={childCodeCopied ? "#333" : "#888"} />
                  <Text style={[s.copyBtnText, childCodeCopied && { color: "#333" }]}>
                    {childCodeCopied ? t.copied : t.copy}
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {/* ── 마스터 방 참여 (자녀, 연결된 상태) ── */}
        {myRole === "child" && isConnected && (
          <>
            <SectionHeader title={t.profileJoinMaster} />
            <View style={s.card}>
              <View style={{ padding: 16 }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#888", marginBottom: 12 }}>{t.profileJoinMasterDesc}</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={{ flex: 1, backgroundColor: "#F5F5F5", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 3, textAlign: "center", color: "#333", borderWidth: 1, borderColor: "#E8E8E8" }}
                    placeholder={t.profileMasterCodeInput as string}
                    placeholderTextColor="#bbb"
                    value={masterJoinCode}
                    onChangeText={v => { setMasterJoinCode(v.toUpperCase()); setMasterJoinError(""); }}
                    autoCapitalize="characters"
                    maxLength={6}
                  />
                  <Pressable
                    style={({ pressed }) => [{ backgroundColor: "#FFD700", borderRadius: 12, paddingHorizontal: 20, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.8 : 1 }]}
                    onPress={handleJoinMasterRoom}
                    disabled={masterJoining || masterJoinCode.trim().length < 4}
                  >
                    {masterJoining ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: "#000" }}>{t.profileJoinMasterBtn}</Text>
                    )}
                  </Pressable>
                </View>
                {masterJoinError ? <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: "#E53935", marginTop: 6 }}>{masterJoinError}</Text> : null}
              </View>
            </View>
          </>
        )}

        {/* ── 접속 코드 ── */}
        <SectionHeader title={t.sectionFamily} />
        <View style={s.card}>
          {isConnected && familyCode ? (
            myRole === "child" ? (
              /* ── 자녀: 연결된 부모님 목록 (코드당 복수 부모 지원) ── */
              <View>
                {parentEntries.length > 0 ? parentEntries.map((entry, idx) => {
                  const isFirst = entry.code === familyCode;
                  return (
                    <View key={`${entry.code}_${entry.deviceId}`} style={[s.parentRow, idx > 0 && { borderTopWidth: 1, borderTopColor: "#E8E8E8" }]}>
                      <View style={s.parentAvatar}>
                        {entry.photoData ? (
                          <Image source={{ uri: entry.photoData }} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="cover" />
                        ) : (
                          <Text style={s.parentAvatarText}>{entry.name[0]?.toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.parentRowLabel}>{entry.name}</Text>
                        <Text style={s.parentRowSub}>{isFirst ? t.basicLink : t.extraLink}</Text>
                      </View>
                      {isMasterChild && (
                        <Pressable style={s.parentRemoveBtn} onPress={() => handleRemoveParent(entry)}>
                          <Ionicons name="close-circle-outline" size={20} color="rgba(0,0,0,0.25)" />
                        </Pressable>
                      )}
                    </View>
                  );
                }) : allFamilyCodes.map((code, idx) => (
                  <View key={code} style={[s.parentRow, idx > 0 && { borderTopWidth: 1, borderTopColor: "#E8E8E8" }]}>
                    <View style={s.parentAvatar}>
                      <Text style={s.parentAvatarText}>?</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.parentRowLabel}>{`${t.parentN} ${idx + 1}`}</Text>
                      <Text style={s.parentRowSub}>{idx === 0 ? t.basicLink : t.extraLink}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              /* ── 부모님: 단일 코드 표시 + 복사 ── */
              <>
                <View style={s.codeDisplay}>
                  {familyCode.split("").map((ch, i) => (
                    <View key={i} style={s.codeCell}>
                      <Text style={s.codeCellText}>{ch.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
                <Text style={s.codeHint}>{t.codeShareHint}</Text>
                <Pressable style={[s.copyBtn, codeCopied && s.copyBtnDone]} onPress={copyCode}>
                  <Ionicons name={codeCopied ? "checkmark" : "copy-outline"} size={14} color={codeCopied ? "#333" : "#888"} />
                  <Text style={[s.copyBtnText, codeCopied && { color: "#333" }]}>
                    {codeCopied ? t.copied : t.copy}
                  </Text>
                </Pressable>
              </>
            )
          ) : (
            <View style={s.connectSection}>
              <Text style={s.connectSectionTitle}>{t.joinFamily}</Text>

              {/* 코드로 참가 */}
              <Pressable
                style={s.connectBigBtn}
                onPress={() => { setJoinCode(""); setJoinName(""); setJoinRole(null); setJoinError(""); setShowJoinSheet(true); }}
              >
                <View style={[s.connectBigIcon, { backgroundColor: "rgba(0,0,0,0.05)" }]}>
                  <Ionicons name="enter-outline" size={24} color="#888" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.connectBigLabel}>{t.joinByCode}</Text>
                  <Text style={s.connectBigDesc}>{t.joinByCodeDesc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(0,0,0,0.2)" />
              </Pressable>

            </View>
          )}
        </View>

        {/* ── 자녀 관리 (자녀 전체 표시, 마스터/서브 공통) ── */}
        {myRole === "child" && isConnected && (
          <>
            <SectionHeader title={t.childMgmt} />
            <View style={s.card}>
              <View style={s.childMgmtShareBlock}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Ionicons name="people-outline" size={18} color="#888" />
                  <Text style={s.childMgmtTitle}>{t.inviteSubChild}</Text>
                </View>
                <Text style={s.childMgmtHint}>{t.inviteSubChildHint}</Text>
              </View>

              {/* 자녀 목록 — 마스터/서브 모두 동일하게 표시 */}
              {familyChildren.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: "#E8E8E8" }}>
                  {familyChildren.map((child, idx) => (
                    <View key={child.deviceId} style={[s.childRow, idx > 0 && { borderTopWidth: 1, borderTopColor: "#E8E8E8" }]}>
                      <View style={[s.childAvatar, { backgroundColor: child.childRole === "master" ? "#888" : "#6366f1" }]}>
                        <Text style={s.childAvatarText}>{child.memberName[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.childRowName}>{child.memberName}</Text>
                        <Text style={s.childRowSub}>{child.childRole === "master" ? t.masterChild : t.subChild}</Text>
                      </View>
                      {child.childRole === "master" && (
                        <View style={s.masterBadge}><Text style={s.masterBadgeText}>{t.masterBadge}</Text></View>
                      )}
                      {child.childRole === "sub" && (
                        <View style={s.subBadge}><Text style={s.subBadgeText}>{t.subBadge}</Text></View>
                      )}
                      {isMasterChild && child.childRole === "sub" && (
                        <Pressable
                          onPress={() => handleRemoveChild(child)}
                          style={s.removeChildBtn}
                          hitSlop={8}
                        >
                          <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {/* ── 프라이버시 모드 (부모만) ── */}
        {myRole === "parent" && isConnected && (
          <>
            <SectionHeader title={t.privacyModeLabel} />
            <View style={s.card}>
              <View style={s.privacyRow}>
                <View style={s.privacyIconWrap}>
                  <Ionicons name="eye-off" size={18} color="#888" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.privacyTitle}>{t.privacyModeLabel}</Text>
                  <Text style={s.privacyDesc}>{t.privacyModeDesc}</Text>
                </View>
                <Switch
                  value={privacyMode}
                  onValueChange={togglePrivacyMode}
                  trackColor={{ false: "#e2e8f0", true: "#888" }}
                  thumbColor={privacyMode ? "#fff" : "#fff"}
                />
              </View>
            </View>
          </>
        )}

        {/* ── 계정 정보 ── */}
        <SectionHeader title={t.sectionAccount} />
        <View style={s.card}>
          <InfoRow icon="person-outline" label={t.labelName} value={myName ?? "-"} onPress={() => { setNameInput(myName ?? ""); setShowNameModal(true); }} />
          <Divider />
          <InfoRow icon="finger-print-outline" label={t.labelDeviceId} value={shortId} />
          <Divider />
          <InfoRow
            icon="shield-checkmark-outline"
            label={t.labelPassword}
            value={t.labelPasswordVal}
          />
        </View>

        {/* ── 언어 설정 ── */}
        <SectionHeader title={t.langLabel} />
        <View style={s.card}>
          <ProfileLangDropdown lang={lang} setLang={setLang} />
        </View>

        {/* ── 고객센터 ── */}
        <SectionHeader title={t.sectionSupport} />
        <View style={s.card}>
          <InfoRow
            icon="mail-outline"
            label={t.labelEmail}
            value={SUPPORT_EMAIL}
            onPress={openEmail}
          />
          <Divider />
          <InfoRow
            icon="chatbubble-ellipses-outline"
            label={t.labelGuide}
            value={t.labelGuideVal}
            onPress={() => Alert.alert(t.appGuideTitle, t.appGuideContent)}
          />
        </View>

        {/* ── 자주 묻는 질문 ── */}
        <SectionHeader title={t.sectionFaq} />
        <View style={s.card}>
          {t.faq.map((faq, i) => (
            <View key={i}>
              {i > 0 && <Divider />}
              <Pressable style={s.faqQ} onPress={() => setShowFaq(showFaq === i ? null : i)}>
                <Ionicons name="help-circle-outline" size={17} color="#888" style={{ marginRight: 10 }} />
                <Text style={s.faqQText}>{faq.q}</Text>
                <Ionicons
                  name={showFaq === i ? "chevron-up" : "chevron-down"}
                  size={15}
                  color="rgba(0,0,0,0.25)"
                />
              </Pressable>
              {showFaq === i && (
                <View style={s.faqA}>
                  <Text style={s.faqAText}>{faq.a}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── 앱 정보 ── */}
        <SectionHeader title={t.sectionAppInfo} />
        <View style={s.card}>
          <InfoRow icon="information-circle-outline" label={t.labelVersion} value={APP_VERSION} />
          <Divider />
          <InfoRow
            icon="document-text-outline"
            label={t.labelPrivacy}
            onPress={() => router.push("/privacy")}
          />
          <Divider />
          <InfoRow
            icon="star-outline"
            label={t.rateApp}
            onPress={() => Alert.alert(t.rateAppThanks, t.rateAppMsg)}
          />
        </View>

        {/* ── 연결 해제 (모든 접속자) ── */}
        {isConnected && (
          <View style={[s.card, { marginTop: 8 }]}>
            <InfoRow
              icon="log-out-outline"
              label={t.disconnectLabel}
              onPress={handleDisconnect}
              danger
              rightIcon="chevron-forward"
            />
          </View>
        )}


        <Text style={s.bottomNote}>{t.bottomNote}</Text>
      </ScrollView>

      {/* ── 이름 수정 모달 ── */}
      <Modal visible={showNameModal} transparent animationType="slide" onRequestClose={() => setShowNameModal(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowNameModal(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
          </Pressable>
          <Pressable onPress={() => {}} style={s.nameSheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>{t.nameSave}</Text>
            <TextInput
              style={s.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={t.namePlaceholder}
              placeholderTextColor={"#999"}
              maxLength={20}
              autoFocus={false}
            />
            <Pressable
              style={[s.saveBtn, !nameInput.trim() && { opacity: 0.4 }]}
              onPress={saveName}
              disabled={!nameInput.trim() || nameSaving}
            >
              <Text style={s.saveBtnText}>{nameSaving ? `${t.save}...` : t.save}</Text>
            </Pressable>
          </Pressable>
        </View>
      </Modal>

      {/* ── 부모님 추가 모달 (자녀가 이미 연결된 상태에서 추가) ── */}
      <Modal visible={showAddParentSheet} transparent animationType="slide" onRequestClose={() => setShowAddParentSheet(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowAddParentSheet(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
          </Pressable>
          <Pressable onPress={() => {}} style={s.bigSheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>{t.addParentTitle}</Text>
            <Text style={s.sheetSub}>{t.addParentSub}</Text>
            <Text style={s.fieldLabel}>{t.familyCodeLabel}</Text>
            <TextInput
              style={[s.sheetInput, s.codeInputStyle]}
              value={addParentCode}
              onChangeText={(t) => setAddParentCode(t.toUpperCase())}
              placeholder="AB1234"
              placeholderTextColor={"#999"}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus={false}
            />
            {!!addParentError && <Text style={s.errorText}>{addParentError}</Text>}
            <Pressable
              style={[s.saveBtn, (!addParentCode.trim() || addingParent) && { opacity: 0.4 }]}
              disabled={!addParentCode.trim() || addingParent}
              onPress={handleAddParent}
            >
              {addingParent
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <Text style={s.saveBtnText}>{t.addParentBtn}</Text>}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 코드로 참가 모달 ── */}
      <Modal visible={showJoinSheet} transparent animationType="slide" onRequestClose={() => setShowJoinSheet(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowJoinSheet(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
          </Pressable>
          <Pressable onPress={() => {}} style={s.bigSheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>{t.joinConnectTitle}</Text>
            <Text style={s.sheetSub}>{t.joinConnectSub}</Text>

            <Text style={s.fieldLabel}>{t.iAm}</Text>
            <View style={s.roleRow}>
              {([["parent", t.roleParent], ["child", t.roleChild]] as [FamilyRole, string][]).map(([r, label]) => (
                <Pressable
                  key={r}
                  style={[s.roleChip, joinRole === r && s.roleChipActive]}
                  onPress={() => setJoinRole(r)}
                >
                  <Text style={[s.roleChipText, joinRole === r && s.roleChipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.fieldLabel}>{t.nameLabel}</Text>
            <TextInput
              style={s.sheetInput}
              value={joinName}
              onChangeText={setJoinName}
              placeholder={t.nameDisplayPlaceholder}
              placeholderTextColor={"#999"}
              maxLength={20}
              autoFocus={false}
            />

            <Text style={s.fieldLabel}>{t.familyCodeLabel}</Text>
            <TextInput
              style={[s.sheetInput, s.codeInputStyle]}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="AB1234"
              placeholderTextColor={"#999"}
              maxLength={6}
              autoCapitalize="characters"
            />

            {!!joinError && <Text style={s.errorText}>{joinError}</Text>}

            <Pressable
              style={[s.saveBtn, (!joinCode.trim() || !joinName.trim() || !joinRole || joining) && { opacity: 0.4 }]}
              disabled={!joinCode.trim() || !joinName.trim() || !joinRole || joining}
              onPress={handleJoin}
            >
              {joining ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={s.saveBtnText}>{t.connectBtn}</Text>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 연결 해제 확인 모달 ── */}
      {confirmModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => !confirming && setConfirmModal(null)}>
          <View style={s.confirmOverlay}>
            <View style={s.confirmBox}>
              <View style={s.confirmIconWrap}>
                <Ionicons name="warning" size={32} color="#E53935" />
              </View>
              <Text style={s.confirmTitle}>{confirmModal.title}</Text>
              <Text style={s.confirmMessage}>{confirmModal.message}</Text>
              <Text style={s.confirmSub}>{t.disconnectSub}</Text>
              <View style={s.confirmBtns}>
                <Pressable
                  style={[s.confirmCancel, confirming && { opacity: 0.4 }]}
                  disabled={confirming}
                  onPress={() => setConfirmModal(null)}
                >
                  <Text style={s.confirmCancelText}>{t.cancel}</Text>
                </Pressable>
                <Pressable
                  style={[s.confirmDanger, confirming && { opacity: 0.6 }]}
                  disabled={confirming}
                  onPress={async () => {
                    setConfirming(true);
                    try { await confirmModal.onConfirm(); }
                    finally { setConfirming(false); setConfirmModal(null); }
                  }}
                >
                  {confirming ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.confirmDangerText}>{t.disconnectConfirmBtn}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },

  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "transparent", paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle:  { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.white, letterSpacing: 0.5 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },

  profileCard:  { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 20, padding: 18, marginTop: 20, marginBottom: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#E8E8E8" },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#E0E0E0", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText:   { fontFamily: "Inter_700Bold", fontSize: 22, color: "#666" },
  avatarPhoto:  { width: 56, height: 56, borderRadius: 28 },
  profileName:  { fontFamily: "Inter_700Bold", fontSize: 18, color: "#333", marginBottom: 6 },
  roleBadge:    { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  roleText:     { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  editBtn:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.06)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  editBtnText:  { fontFamily: "Inter_500Medium", fontSize: 13, color: "#666" },

  sectionHeader:{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#FFFFFF", letterSpacing: 0.8, marginTop: 22, marginBottom: 8, marginLeft: 4 },
  privacyRow:   { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  privacyIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(139,92,246,0.1)", alignItems: "center", justifyContent: "center" },
  privacyTitle: { fontFamily: "Inter_500Medium", fontSize: 15, color: "#333", marginBottom: 2 },
  privacyDesc:  { fontFamily: "Inter_400Regular", fontSize: 12, color: "#999", lineHeight: 16 },

  card:         { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: "#E8E8E8" },

  row:          { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  rowIcon:      { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.04)", alignItems: "center", justifyContent: "center" },
  rowLabel:     { fontFamily: "Inter_500Medium", fontSize: 15, color: "#333", marginBottom: 1 },
  rowValue:     { fontFamily: "Inter_400Regular", fontSize: 12, color: "#999" },

  divider:      { height: 1, backgroundColor: "#E8E8E8", marginLeft: 64 },

  codeDisplay:  { flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 20 },
  codeCell:     { flex: 1, maxWidth: 44, height: 48, borderRadius: 12, backgroundColor: "#E8E8E8", alignItems: "center", justifyContent: "center" },
  codeCellText: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#555" },
  codeHint:     { fontFamily: "Inter_400Regular", fontSize: 12, color: "#999", textAlign: "center", marginBottom: 14 },
  copyBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginHorizontal: 40, marginBottom: 12, paddingVertical: 8, borderRadius: 50, backgroundColor: "rgba(0,0,0,0.06)" },
  copyBtnDone:  { backgroundColor: "#888" },
  copyBtnText:  { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#666" },

  connectNowBtn:{ marginTop: 12, backgroundColor: "#888", paddingHorizontal: 24, paddingVertical: 11, borderRadius: 50 },
  connectNowText:{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFFFFF" },

  // ── 자녀 다중 부모님 섹션 ──
  parentRow:        { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  parentCodeBadge:  { backgroundColor: "#E8E8E8", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 72, alignItems: "center" },
  parentAvatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E0E0E0", alignItems: "center", justifyContent: "center" },
  parentAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#666" },
  parentCodeText:   { fontFamily: "Inter_700Bold", fontSize: 13, color: "#555", letterSpacing: 2 },
  parentRowLabel:   { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#333" },
  parentRowSub:     { fontFamily: "Inter_400Regular", fontSize: 11, color: "#999", marginTop: 1 },
  parentRemoveBtn:  { padding: 4 },
  addParentBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginVertical: 12, paddingVertical: 12, borderRadius: 50, borderWidth: 1.5, borderColor: "#ccc" },
  addParentBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#666" },

  // ── 미연결 연결 섹션 ──
  connectSection:   { paddingTop: 4, paddingBottom: 8 },
  connectSectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#999", textAlign: "center", marginBottom: 14 },
  connectBigBtn:    { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E8E8E8", marginBottom: 4 },
  connectBigIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  connectBigLabel:  { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#333", marginBottom: 2 },
  connectBigDesc:   { fontFamily: "Inter_400Regular", fontSize: 12, color: "#999" },

  // ── 참가 / 만들기 시트 ──
  bigSheet:         { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
  sheetSub:         { fontFamily: "Inter_400Regular", fontSize: 13, color: "#999", textAlign: "center", marginTop: -10, marginBottom: 20 },
  fieldLabel:       { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#999", letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  roleRow:          { flexDirection: "row", gap: 10, marginBottom: 16 },
  roleChip:         { flex: 1, paddingVertical: 10, borderRadius: 50, borderWidth: 1.5, borderColor: "#E8E8E8", alignItems: "center" },
  roleChipActive:   { backgroundColor: "#888", borderColor: "#888" },
  roleChipText:     { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#999" },
  roleChipTextActive:{ color: "#fff" },
  sheetInput:       { backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, fontFamily: "Inter_400Regular", color: "#333", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", marginBottom: 14 },
  codeInputStyle:   { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 8, textAlign: "center" },
  errorText:        { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.danger, textAlign: "center", marginBottom: 12 },

  // ── 코드 발급 완료 ──

  faqQ:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  faqQText:     { fontFamily: "Inter_500Medium", fontSize: 14, color: "#333", flex: 1, lineHeight: 20 },
  faqA:         { backgroundColor: "rgba(0,0,0,0.03)", paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 8, marginBottom: 10, borderRadius: 12 },
  faqAText:     { fontFamily: "Inter_400Regular", fontSize: 13, color: "#777", lineHeight: 20 },

  bottomNote:   { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(0,0,0,0.2)", textAlign: "center", marginTop: 28 },

  nameSheet:    { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  sheetHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.12)", alignSelf: "center", marginBottom: 18 },
  sheetTitle:   { fontFamily: "Inter_700Bold", fontSize: 17, color: "#333", marginBottom: 16, textAlign: "center" },
  nameInput:    { backgroundColor: "#fff", borderRadius: 16, padding: 14, fontSize: 16, fontFamily: "Inter_400Regular", color: "#333", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", marginBottom: 14 },
  saveBtn:      { backgroundColor: "#888", paddingVertical: 14, borderRadius: 50, alignItems: "center" },
  saveBtnText:  { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },


  confirmOverlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 28 },
  confirmBox:        { backgroundColor: "#fff", borderRadius: 28, paddingTop: 28, paddingBottom: 22, paddingHorizontal: 24, width: "100%", alignItems: "center", gap: 8 },
  confirmIconWrap:   { width: 60, height: 60, borderRadius: 30, backgroundColor: "#FDECEA", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  confirmTitle:      { fontFamily: "Inter_700Bold", fontSize: 18, color: "#333", textAlign: "center" },
  confirmMessage:    { fontFamily: "Inter_400Regular", fontSize: 14, color: "#777", textAlign: "center", lineHeight: 22 },
  confirmSub:        { fontFamily: "Inter_500Medium", fontSize: 12, color: "#aaa", textAlign: "center", marginBottom: 4 },
  confirmBtns:       { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  confirmCancel:     { flex: 1, paddingVertical: 15, borderRadius: 16, backgroundColor: "#F0F0F0", alignItems: "center" },
  confirmCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#777" },
  confirmDanger:     { flex: 1, paddingVertical: 15, borderRadius: 16, backgroundColor: COLORS.danger, alignItems: "center", justifyContent: "center" },
  confirmDangerText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },

  // ── 자녀 관리 섹션 ──
  childMgmtShareBlock: { padding: 16, paddingBottom: 8 },
  childMgmtTitle:  { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#333" },
  childMgmtHint:   { fontFamily: "Inter_400Regular", fontSize: 12, color: "#999", lineHeight: 18, marginBottom: 14 },
  childCodeDisplay:{ flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 12 },
  childCodeCell:   { width: 38, height: 44, borderRadius: 10, backgroundColor: "#E8E8E8", alignItems: "center", justifyContent: "center" },
  childCodeCellText:{ fontFamily: "Inter_700Bold", fontSize: 18, color: "#555", letterSpacing: 1 },

  childRow:        { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  removeChildBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(229,57,53,0.10)", alignItems: "center", justifyContent: "center" },
  childAvatar:     { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  childAvatarText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  childRowName:    { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#333", marginBottom: 2 },
  childRowSub:     { fontFamily: "Inter_400Regular", fontSize: 11, color: "#999" },

  masterBadge:     { backgroundColor: "rgba(0,0,0,0.06)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  masterBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#666" },
  subBadge:        { backgroundColor: "rgba(0,0,0,0.04)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  subBadgeText:    { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#888" },

  subChildNotice:      { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  subChildNoticeTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#666", marginBottom: 2 },
  subChildNoticeText:  { fontFamily: "Inter_400Regular", fontSize: 12, color: "#999" },
});
