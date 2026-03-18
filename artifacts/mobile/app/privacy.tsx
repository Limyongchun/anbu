import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import COLORS from "@/constants/colors";
import { useLang } from "@/lib/i18n";

const SUPPORT_EMAIL = "support@anbu.family";

export default function PrivacyScreen() {
  const { t } = useLang();
  const { top, bottom } = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.privacyTitle}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <Ionicons name="shield-checkmark" size={28} color={COLORS.brandPrimary} />
            <Text style={styles.cardTitle}>{t.privacyTitle}</Text>
          </View>

          <Text style={styles.updated}>Last updated: 2026-03-01</Text>

          <Text style={styles.body}>{t.privacyContent}{SUPPORT_EMAIL}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surfaceSoft },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.textPrimary },
  content: { padding: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: COLORS.textPrimary },
  updated: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.textMuted, marginBottom: 16 },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
});
