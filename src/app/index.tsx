import { StyleSheet, Text, View } from "react-native";

import { DevStatus } from "@/dev/dev-status";

// Holding screen until 03-identity-access builds onboarding. It shows only the brand name, which is
// not translated and so needs no catalog entry. Deep teal (#095777) and paper (#fafbfc) come from
// docs/design-reference §2 until 02-design-system ships the tokens and Hind Siliguri.
export default function Index() {
  return (
    <View style={styles.root}>
      <Text accessibilityRole="header" style={styles.brand}>
        <Text style={styles.wordmark}>কুশল</Text>
        {"\n"}
        <Text style={styles.connect}>CONNECT</Text>
      </Text>
      {__DEV__ && <DevStatus />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
    paddingHorizontal: 24,
    backgroundColor: "#fafbfc",
  },
  brand: { textAlign: "center", color: "#095777" },
  wordmark: { fontSize: 64, fontWeight: "700" },
  connect: { fontSize: 20, fontWeight: "600", letterSpacing: 8 },
});
