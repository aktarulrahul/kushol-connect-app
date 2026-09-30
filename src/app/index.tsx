import { StyleSheet, Text, View } from "react-native";

// Placeholder until 03-identity-access builds onboarding. The brand name is not translated, so
// it needs no catalog entry; layout values move to src/theme tokens in 02.
export default function Index() {
  return (
    <View style={styles.root}>
      <Text accessibilityRole="header">কুশল CONNECT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
});
