import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import COLORS from "@/constants/colors";
import { useFamilyContext } from "@/context/FamilyContext";

export default function IndexRedirect() {
  const { isConnected, myRole, loading } = useFamilyContext();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.mapBg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.neon} size="large" />
      </View>
    );
  }

  if (isConnected && myRole === "parent") return <Redirect href="/parent" />;
  if (isConnected && myRole === "child") return <Redirect href="/child" />;
  return <Redirect href="/setup" />;
}
