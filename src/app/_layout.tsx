import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';

import { AuthProvider, useAuth } from '@/lib/auth';
import { patchTextFonts } from '@/lib/fontPatch';

// Route every <Text> through Montserrat (weight-aware); DM Serif headlines opt in
// via an explicit fontFamily.
patchTextFonts();

// Surfaces any startup/render error instead of a silent white screen.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: '#160f2b', padding: 24, paddingTop: 72 }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10 }}>Something went wrong</Text>
      <ScrollView style={{ flex: 1, marginBottom: 12 }}>
        <Text selectable style={{ color: '#f6b8b8', fontSize: 13, lineHeight: 19 }}>
          {String(error?.message ?? error)}
          {'\n\n'}
          {String(error?.stack ?? '')}
        </Text>
      </ScrollView>
      <Pressable onPress={retry} style={{ backgroundColor: '#4b328e', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Try again</Text>
      </Pressable>
    </View>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      {/* Always reachable — invite/reset deep links land here (xpressclient://auth/set-password). */}
      <Stack.Screen name="auth/set-password" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSerifDisplay_400Regular,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });
  // Don't block forever if a font fails to load in a release build — render anyway.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </AuthProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
