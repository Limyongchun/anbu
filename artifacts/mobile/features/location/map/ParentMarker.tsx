import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MotionState, MapStatusText } from "./mapTypes";

interface ParentMarkerOverlayProps {
  parentName: string;
  status: MapStatusText;
  motionState: MotionState;
  isDelayed: boolean;
}

export default function ParentMarkerOverlay({
  parentName,
  status,
  motionState,
  isDelayed,
}: ParentMarkerOverlayProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name} numberOfLines={1}>
          {parentName}
        </Text>
        {status.motion !== "" && (
          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                motionState === "moving" ? styles.dotMoving : styles.dotStationary,
              ]}
            />
            <Text style={styles.motionText}>{status.motion}</Text>
          </View>
        )}
        <Text style={[styles.freshness, isDelayed && styles.freshnessDelayed]}>
          {status.freshness}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 140,
    alignItems: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2D2D2D",
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotMoving: {
    backgroundColor: "#34C759",
  },
  dotStationary: {
    backgroundColor: "#FF9500",
  },
  motionText: {
    fontSize: 13,
    color: "#555",
  },
  freshness: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  freshnessDelayed: {
    color: "#E85D3A",
  },
});
