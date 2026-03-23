import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFamilyContext } from "@/context/FamilyContext";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";

export default function InquiryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { myName, deviceId } = useFamilyContext();

  const [name, setName] = useState(myName || "");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid = name.trim() && email.trim().includes("@") && title.trim() && content.trim();

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await api.submitInquiry({
        userId: deviceId || undefined,
        userName: name.trim(),
        userEmail: email.trim(),
        title: title.trim(),
        content: content.trim(),
      });
      setSubmitted(true);
    } catch {
      Alert.alert("", t.inquiryError as string);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient colors={["#D4843A", "#C4692E", "#A85528"]} style={[s.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>{t.inquiryTitle}</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={s.successWrap}>
          <View style={s.successIconWrap}>
            <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
          </View>
          <Text style={s.successTitle}>{t.inquirySuccess}</Text>
          <Text style={s.successSub}>{t.inquirySuccessSub}</Text>
          <Pressable style={s.successBtn} onPress={() => router.back()}>
            <Text style={s.successBtnText}>{t.confirm}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F2ED" }}>
      <LinearGradient colors={["#D4843A", "#C4692E", "#A85528"]} style={[s.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>{t.inquiryTitle}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">

          <View style={s.hintBox}>
            <Ionicons name="mail-outline" size={18} color="#A85528" />
            <Text style={s.hintText}>{t.inquiryEmailHint}</Text>
          </View>

          <View style={s.card}>
            <Text style={s.label}>{t.inquiryNameLabel}</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder={t.inquiryNameLabel as string}
              placeholderTextColor="#bbb"
            />

            <Text style={s.label}>{t.inquiryEmailLabel} *</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t.inquiryEmailPlaceholder as string}
              placeholderTextColor="#bbb"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={s.label}>{t.inquirySubjectLabel}</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t.inquirySubjectPlaceholder as string}
              placeholderTextColor="#bbb"
            />

            <Text style={s.label}>{t.inquiryContentLabel}</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={content}
              onChangeText={setContent}
              placeholder={t.inquiryContentPlaceholder as string}
              placeholderTextColor="#bbb"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={[s.submitBtn, !isValid && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={s.submitBtnText}>{t.inquirySubmit}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    height: "auto",
    minHeight: 56,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18, fontWeight: "700", color: "#fff",
  },
  scrollContent: {
    padding: 20,
  },
  hintBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(168,85,40,0.08)",
    borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(168,85,40,0.15)",
  },
  hintText: {
    fontSize: 13, color: "#A85528", flex: 1, lineHeight: 18,
  },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20,
  },
  label: {
    fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 14,
  },
  input: {
    backgroundColor: "#F8F6F3", borderRadius: 12, padding: 14,
    fontSize: 15, color: "#222", borderWidth: 1, borderColor: "#E8E4DF",
  },
  textArea: {
    minHeight: 140,
  },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#F5F2ED", paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "#E8E4DF",
  },
  submitBtn: {
    backgroundColor: "#FFD700", borderRadius: 14, padding: 16,
    alignItems: "center", justifyContent: "center",
  },
  submitBtnDisabled: {
    backgroundColor: "#E8E4DF",
  },
  submitBtnText: {
    fontSize: 16, fontWeight: "700", color: "#000",
  },
  successWrap: {
    flex: 1, alignItems: "center", justifyContent: "center", padding: 40,
    backgroundColor: "#F5F2ED",
  },
  successIconWrap: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20, fontWeight: "700", color: "#222", marginBottom: 8,
  },
  successSub: {
    fontSize: 14, color: "#888", textAlign: "center", lineHeight: 20,
    marginBottom: 32,
  },
  successBtn: {
    backgroundColor: "#FFD700", borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14,
  },
  successBtnText: {
    fontSize: 16, fontWeight: "700", color: "#000",
  },
});