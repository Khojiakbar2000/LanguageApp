import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ReactNode } from 'react';
import type { TextInputProps, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export const colors = {
  paper: '#F9FCFF',
  ink: '#081F5C',
  muted: '#4E6593',
  primary: '#334EAC',
  ice: '#E7F1FF',
  sky: '#7096D1',
  border: '#D0E3FF',
  card: '#F9FCFF',
  sage: '#E8EFE7',
  green: '#42644D',
  danger: '#A23D4B',
};
export function Screen({
  children,
  refreshing,
  onRefresh,
  bottom = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  bottom?: boolean;
}) {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={bottom ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.screen}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Heading({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return <Text style={small ? styles.h2 : styles.h1}>{children}</Text>;
}
export function Body({
  children,
  muted = false,
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: object;
}) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}
export function Button({
  title,
  onPress,
  secondary,
  loading,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.985 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.primary : colors.paper} />
      ) : icon ? (
        <Ionicons name={icon} size={20} color={secondary ? colors.primary : colors.paper} />
      ) : null}
      <Text style={[styles.buttonText, secondary && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  if (!onPress)
    return (
      <View style={styles.chip}>
        <Text style={styles.chipText}>{label}</Text>
      </View>
    );
  return (
    <Pressable
      accessibilityRole="button"
      aria-pressed={!!selected}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { minHeight: 44, justifyContent: 'center' },
        selected && { backgroundColor: colors.primary },
      ]}
    >
      <Text style={[styles.chipText, selected && { color: colors.paper }]}>{label}</Text>
    </Pressable>
  );
}
export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry?: () => void;
}) {
  if (!message) return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.error}>
      <Text style={{ color: colors.danger, lineHeight: 22 }}>{message}</Text>
      {onRetry && (
        <Pressable accessibilityRole="button" onPress={onRetry} style={{ paddingVertical: 12 }}>
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

export function CatalogNotice({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry?: () => void;
}) {
  if (!message) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ gap: 10, padding: 16, borderRadius: 20, backgroundColor: colors.ice }}
    >
      <Text style={{ color: colors.ink, lineHeight: 22 }}>{message}</Text>
      {onRetry && <Button title="Retry catalog" secondary icon="refresh" onPress={onRetry} />}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}
export function Back({ title = 'Back' }: { title?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      style={styles.back}
    >
      <Ionicons name="arrow-back" size={22} color={colors.ink} />
      <Text style={{ color: colors.ink, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}
export function Row({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  screen: {
    boxSizing: 'border-box',
    padding: 24,
    paddingBottom: 40,
    gap: 24,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    flexGrow: 1,
  },
  h1: { fontSize: 32, lineHeight: 39, fontWeight: '700', letterSpacing: -1.1, color: colors.ink },
  h2: { fontSize: 23, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5, color: colors.ink },
  body: { fontSize: 16, lineHeight: 25, color: colors.ink },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  button: {
    minHeight: 56,
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  secondary: { backgroundColor: colors.ice },
  buttonText: { fontSize: 16, lineHeight: 23, color: colors.paper, fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 22,
    gap: 14,
  },
  chip: {
    backgroundColor: colors.ice,
    borderRadius: 100,
    paddingHorizontal: 13,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  error: { padding: 16, borderRadius: 16, backgroundColor: '#FAECEA' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    minHeight: 54,
    color: colors.ink,
    backgroundColor: colors.card,
    fontSize: 16,
  },
  back: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
});
