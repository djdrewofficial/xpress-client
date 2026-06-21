import { Stack } from 'expo-router';

/* The Plan tab is a stack so detail screens (group) push *within* the tab and
   keep the bottom tab bar visible. */
export default function PlanStackLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />;
}
