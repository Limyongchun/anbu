import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PlacePreset } from "../types";
import { addPlace } from "../store";
import PlaceQuickButtons from "./PlaceQuickButtons";

const RADIUS_OPTIONS = [50, 80, 100] as const;

interface Props {
  visible: boolean;
  parentId: string;
  latitude: number;
  longitude: number;
  lang: "ko" | "en" | "ja";
  onClose: () => void;
  onSaved: () => void;
}

const LABELS = {
  ko: {
    title: "현재 위치를 기억할까요?",
    customPlaceholder: "장소 이름 직접 입력",
    radiusLabel: "반경",
    save: "저장",
    saved: "장소가 저장되었어요",
  },
  en: {
    title: "Remember this location?",
    customPlaceholder: "Enter place name",
    radiusLabel: "Radius",
    save: "Save",
    saved: "Place saved",
  },
  ja: {
    title: "この場所を覚えますか？",
    customPlaceholder: "場所名を入力",
    radiusLabel: "半径",
    save: "保存",
    saved: "場所を保存しました",
  },
};

export default function SavePlaceSheet({
  visible,
  parentId,
  latitude,
  longitude,
  lang,
  onClose,
  onSaved,
}: Props) {
  const [preset, setPreset] = useState<PlacePreset | null>(null);
  const [customName, setCustomName] = useState("");
  const [radius, setRadius] = useState<number>(80);
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const l = LABELS[lang];

  const effectiveName = preset
    ? (preset === "other" ? customName : "")
    : customName;

  const canSave = preset
    ? (preset === "other" ? customName.trim().length > 0 : true)
    : customName.trim().length > 0;

  const handlePreset = (p: PlacePreset) => {
    setPreset(preset === p ? null : p);
    if (p !== "other") setCustomName("");
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const name = preset && preset !== "other"
        ? ""
        : customName.trim();
      await addPlace({
        parentId,
        name,
        preset: preset ?? null,
        latitude,
        longitude,
        radius,
      });
      setToastVisible(true);
      setTimeout(() => {
        setToastVisible(false);
        resetAndClose();
        onSaved();
      }, 1200);
    } catch {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setPreset(null);
    setCustomName("");
    setRadius(80);
    setSaving(false);
    setToastVisible(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      <Pressable style={s.overlay} onPress={resetAndClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.keyboardWrap}
        >
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.handle} />

            <Text style={s.title}>{l.title}</Text>

            <View style={s.coordRow}>
              <Ionicons name="location" size={14} color="#7A5454" />
              <Text style={s.coordText}>
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </Text>
            </View>

            <View style={s.section}>
              <PlaceQuickButtons
                lang={lang}
                selected={preset}
                onSelect={handlePreset}
              />
            </View>

            {(preset === "other" || !preset) && (
              <View style={s.section}>
                <TextInput
                  style={s.input}
                  placeholder={l.customPlaceholder}
                  placeholderTextColor="#9B8080"
                  value={customName}
                  onChangeText={setCustomName}
                  maxLength={30}
                />
              </View>
            )}

            <View style={s.section}>
              <Text style={s.sectionLabel}>{l.radiusLabel}</Text>
              <View style={s.radiusRow}>
                {RADIUS_OPTIONS.map((r) => (
                  <Pressable
                    key={r}
                    style={[s.radiusBtn, radius === r && s.radiusBtnActive]}
                    onPress={() => setRadius(r)}
                  >
                    <Text
                      style={[
                        s.radiusText,
                        radius === r && s.radiusTextActive,
                      ]}
                    >
                      {r}m
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              <Text style={s.saveBtnText}>
                {saving ? "..." : l.save}
              </Text>
            </Pressable>

            {toastVisible && (
              <View style={s.toast}>
                <Ionicons name="checkmark-circle" size={18} color="#34A853" />
                <Text style={s.toastText}>{l.saved}</Text>
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
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
  keyboardWrap: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1C4C4",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#2D1F1F",
    marginBottom: 8,
  },
  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 16,
  },
  coordText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#9B8080",
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#6B5050",
    marginBottom: 8,
  },
  input: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#2D1F1F",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F5EDED",
  },
  radiusRow: {
    flexDirection: "row",
    gap: 10,
  },
  radiusBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F5EDED",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  radiusBtnActive: {
    backgroundColor: "rgba(122,84,84,0.12)",
    borderColor: "#7A5454",
  },
  radiusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#6B5050",
  },
  radiusTextActive: {
    color: "#7A5454",
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    backgroundColor: "#7A5454",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  toast: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 50 : 34,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  toastText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#2D1F1F",
  },
});
