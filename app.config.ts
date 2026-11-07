import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * The Google iOS URL scheme is the reversed iOS client id. It has to be in the
 * native build, so set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID before `eas build`.
 * A placeholder keeps prebuild from throwing when the id is not in the environment yet.
 * Google sign-in will not return to the app until the real scheme is compiled in.
 */
function googleIosUrlScheme(): string {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';
  const suffix = '.apps.googleusercontent.com';
  if (clientId.endsWith(suffix)) {
    return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
  }
  return 'com.googleusercontent.apps.missing-ios-client-id';
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Xpress DJs',
  slug: config.slug ?? 'xpress-client',
  plugins: [
    ...(config.plugins ?? []),
    ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme() }],
  ],
});
