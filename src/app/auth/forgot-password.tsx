import { Redirect } from 'expo-router';

/** Legacy route. Password reset is gone; old links land on the one-time-code screen. */
export default function ForgotPasswordScreen() {
  return <Redirect href="/login" />;
}
