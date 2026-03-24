import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ParentPlace } from "../types";
import { updatePlace, removePlace } from "../store";
import { getPlaceDisplayName } from "../utils";

interface Props {
  visible: boolean;
  places: ParentPlace[];
  lang: "ko" | "en" | "ja";
  onClose: () => void;
  onChanged: () => void;
}

const LABELS = {
  ko: {
    title: "저장된 장소",
    empty: "저장된 장소가 없습니다",
    radius: "반경",
    editName: "이름 수정",
    delete: "삭제",
    deleteConfirm: "이 장소를 삭제할까요?",
    cancel: "취소",
    confirm: "삭제",
    save: "저장",
    namePlaceholder: "장소 이름",
  },
  en: {
    title: "Saved Places",
    empty: "No saved places",
    radius: "Radius",
    editName: "Edit name",
    delete: "Delete",
    deleteConfirm: "Delete this place?",
    cancel: "Cancel",
    confirm: "Delete",
    save: "Save",
    namePlaceholder: "Place name",
  },
  ja: {
    title: "保存した場所",
    empty: "保存した場所がありません",
    radius: "半径",
    editName: "名前を編集",
    delete: "削除",
    deleteConfirm: "この場所を削除しますか？",
    cancel: "キャンセル",
    confirm: "削除",
    save: "保存",
    namePlaceholder: "場所名",
  },
};

export default function PlaceListSheet({ visible, places, lang, onClose, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const l = LABELS[lang];

  const handleEditStart = (place: ParentPlace) => {
    setEditingId(place.id);
    setEditName(getPlaceDisplayName(place, lang));
  };

  const handleEditSave = async () => {
    if (!editingId || !editName.trim()) return;
    await updatePlace(editingId, { name: editName.trim(), preset: null });
    setEditingId(null);
    setEditName("");
    onChanged();
  };

  const handleDelete = (place: ParentPlace) => {
    const name = getPlaceDisplayName(place, lang);
    if (Platform.OS === "web") {
      if (confirm(`${l.deleteConfirm}\n${name}`)) {
        removePlace(place.id).then(onChanged);
      }
    } else {
      Alert.alert(l.deleteConfirm, name, [
        { text: l.cancel, style: "cancel" },
        {
          text: l.confirm,
          style: "destructive",
          onPress: () => removePlace(place.id).then(onChanged),
        },
      ]);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>{l.title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color="#6B5050" />
            </Pressable>
          </View>

          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {places.length === 0 && (
              <Text style={s.empty}>{l.empty}</Text>
            )}
            {places.map((p) => {
              const displayName = getPlaceDisplayName(p, lang);
              const isEditing = editingId === p.id;
              return (
                <View key={p.id} style={s.card}>
                  <View style={s.cardLeft}>
                    <View style={s.iconWrap}>
                      <Ionicons name="location" size={16} color="#7A5454" />
                    </View>
                    <View style={s.cardInfo}>
                      {isEditing ? (
                        <View style={s.editRow}>
                          <TextInput
                            style={s.editInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder={l.namePlaceholder}
                            placeholderTextColor="#9B8080"
                            autoFocus
                            maxLength={30}
                          />
                          <Pressable style={s.editSaveBtn} onPress={handleEditSave}>
                            <Text style={s.editSaveBtnText}>{l.save}</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Text style={s.cardName} numberOfLines={1}>{displayName}</Text>
                      )}
                      <Text style={s.cardMeta}>
                        {l.radius} {p.radius}m
                      </Text>
                    </View>
                  </View>
                  {!isEditing && (
                    <View style={s.cardActions}>
                      <Pressable style={s.actionBtn} onPress={() => handleEditStart(p)} hitSlop={8}>
                        <Ionicons name="pencil" size={16} color="#6B5050" />
                      </Pressable>
                      <Pressable style={s.actionBtn} onPress={() => handleDelete(p)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color="#E53935" />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "60%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1C4C4",
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#2D1F1F",
  },
  list: {
    flexGrow: 0,
  },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#9B8080",
    textAlign: "center",
    paddingVertical: 32,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5EDED",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(122,84,84,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#2D1F1F",
    marginBottom: 2,
  },
  cardMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#9B8080",
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#2D1F1F",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },
  editSaveBtn: {
    backgroundColor: "#7A5454",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editSaveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
});
