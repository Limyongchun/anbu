import React from "react";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#D4843A" }}>
      <Text style={{ marginTop: 100, fontSize: 30, color: "#fff", fontWeight: "bold" }}>
        ANBU TEST
      </Text>
      <Text style={{ marginTop: 20, fontSize: 16, color: "rgba(255,255,255,0.8)" }}>
        서버 정상 작동 중
      </Text>
    </View>
  );
}
