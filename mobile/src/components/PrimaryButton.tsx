import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

export function PrimaryButton({
  children,
  disabled,
  loading,
  onPress,
  variant = "primary",
}: {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" ? styles.secondary : styles.primary,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? "#f7b23b" : "#102000"} />
      ) : (
        <Text style={[styles.text, variant === "secondary" ? styles.secondaryText : styles.primaryText]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 12,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primary: {
    backgroundColor: "#8ee620",
  },
  secondary: {
    backgroundColor: "transparent",
    borderColor: "rgba(247, 178, 59, 0.6)",
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  text: {
    fontSize: 15,
    fontWeight: "800",
  },
  primaryText: {
    color: "#102000",
  },
  secondaryText: {
    color: "#f7b23b",
  },
});
