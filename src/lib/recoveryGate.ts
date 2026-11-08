/**
 * Where the root navigator sends a session.
 * A recovery session stays on the new-password screen until the password is saved.
 * Home is mounted only when the destination is `home`.
 *
 * `verifyOtp({ type: 'recovery' })` in @supabase/auth-js notifies
 * `PASSWORD_RECOVERY` before that call returns. The listener records the user
 * id in that same notification. The screen's later `markPasswordReset` is a
 * second write of the same id, not the gate.
 *
 * Sign-out leaves the session in place until `SIGNED_OUT`. This hold clears
 * profile readiness in that same update, so the gap cannot mount home.
 */

export type RootAuthDestination = 'splash' | 'home' | 'signed-out' | 'reset';

export function recoveryUserIdForAuthEvent(event: string, sessionUserId: string | null): string | null {
  if (event === 'PASSWORD_RECOVERY' && sessionUserId) return sessionUserId;
  return null;
}

export function authLoading(
  sessionReady: boolean,
  sessionUserId: string | null,
  readyForUserId: string | null,
): boolean {
  return !sessionReady || (sessionUserId != null && readyForUserId !== sessionUserId);
}

export function rootAuthDestination(input: {
  loading: boolean;
  hasSession: boolean;
  pendingPasswordReset: boolean;
}): RootAuthDestination {
  if (input.loading) return 'splash';
  if (input.hasSession && input.pendingPasswordReset) return 'reset';
  if (input.hasSession) return 'home';
  return 'signed-out';
}

/** Recovery cancel. Does not clear the session; `SIGNED_OUT` does that. */
export function applyLocalSignOutHold(): { recoveryUserId: null; readyForUserId: null } {
  return { recoveryUserId: null, readyForUserId: null };
}

export type ResetExit = 'form' | 'wait' | 'invalid-home' | 'invalid-request';

/** The new-password screen. A recovery session shows the form, whose exit is sign-out. */
export function resetExitAction(input: {
  hasSession: boolean;
  pendingPasswordReset: boolean;
  loading: boolean;
  adopting: boolean;
}): ResetExit {
  if (input.hasSession && input.pendingPasswordReset) return 'form';
  if (input.loading || input.adopting) return 'wait';
  if (input.hasSession) return 'invalid-home';
  return 'invalid-request';
}
