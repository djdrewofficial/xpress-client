import assert from 'node:assert/strict';
import test from 'node:test';

import { passwordChangeAllowed } from './recoveryLink.ts';
import {
  applyLocalSignOutHold,
  authLoading,
  navigatorRoutes,
  recoveryUserIdForAuthEvent,
  resetExitAction,
  resetNavigationAction,
  resetReplaceAllowed,
  rootAuthDestination,
  type RootAuthDestination,
} from './recoveryGate.ts';

const USER = 'user-fixture';

type Sim = {
  sessionReady: boolean;
  sessionUserId: string | null;
  recoveryUserId: string | null;
  readyForUserId: string | null;
};

function signedOut(): Sim {
  return { sessionReady: true, sessionUserId: null, recoveryUserId: null, readyForUserId: null };
}

/** The auth listener, applied when verifyOtp notifies, before the screen continues. */
function applyEvent(sim: Sim, event: string, userId: string | null): Sim {
  const marked = recoveryUserIdForAuthEvent(event, userId);
  return {
    ...sim,
    sessionReady: true,
    recoveryUserId: marked ?? sim.recoveryUserId,
    sessionUserId: event === 'SIGNED_OUT' ? null : userId ? userId : sim.sessionUserId,
  };
}

function destination(sim: Sim): RootAuthDestination {
  const loading = authLoading(sim.sessionReady, sim.sessionUserId, sim.readyForUserId);
  return rootAuthDestination({
    loading,
    hasSession: sim.sessionUserId != null,
    pendingPasswordReset: passwordChangeAllowed(sim.recoveryUserId, sim.sessionUserId),
  });
}

test('a recovery verify does not open home before the password is saved', () => {
  let sim = signedOut();
  // Inside await verifyOtp({ type: 'recovery' }): PASSWORD_RECOVERY, then the promise returns.
  // markPasswordReset has not run. The profile read has not run.
  sim = applyEvent(sim, 'PASSWORD_RECOVERY', USER);
  assert.equal(recoveryUserIdForAuthEvent('PASSWORD_RECOVERY', USER), USER);
  assert.equal(destination(sim), 'reset');
  assert.notEqual(destination(sim), 'home');
  assert.notEqual(destination(sim), 'splash');
  assert.equal(resetReplaceAllowed(destination(sim)), true);
  assert.equal(navigatorRoutes(destination(sim))?.includes('(app)'), false);
  assert.equal(resetNavigationAction({
    destination: destination(sim),
    currentPath: 'auth/forgot-password',
    queued: false,
  }), 'replace');

  // Worst case: the profile read finishes before the screen calls markPasswordReset.
  // The notification already stored this user, so home stays closed.
  sim = { ...sim, readyForUserId: USER };
  assert.equal(passwordChangeAllowed(sim.recoveryUserId, sim.sessionUserId), true);
  assert.equal(destination(sim), 'reset');
  assert.equal(resetExitAction({
    hasSession: true,
    pendingPasswordReset: true,
    loading: false,
    adopting: false,
  }), 'form');

  // Saving the password clears the gate. That is the first time home can open.
  sim = { ...sim, recoveryUserId: null };
  assert.equal(destination(sim), 'home');
});

test('a sign-in event is not treated as password recovery', () => {
  let sim = applyEvent(signedOut(), 'SIGNED_IN', USER);
  assert.equal(recoveryUserIdForAuthEvent('SIGNED_IN', USER), null);
  assert.equal(destination(sim), 'splash');
  sim = { ...sim, readyForUserId: USER };
  assert.equal(destination(sim), 'home');
});

test('cancel during recovery signs out and does not open home', () => {
  let sim: Sim = {
    sessionReady: true,
    sessionUserId: USER,
    recoveryUserId: USER,
    readyForUserId: USER,
  };
  assert.equal(destination(sim), 'reset');

  const held = applyLocalSignOutHold();
  sim = {
    ...sim,
    recoveryUserId: held.recoveryUserId,
    readyForUserId: held.readyForUserId,
  };
  assert.equal(sim.sessionUserId, USER);
  assert.equal(destination(sim), 'splash');
  assert.notEqual(destination(sim), 'home');

  sim = applyEvent(sim, 'SIGNED_OUT', null);
  assert.equal(destination(sim), 'signed-out');
  assert.notEqual(destination(sim), 'home');
});

test('an invalid reset with a normal session can leave, and a recovery session cannot', () => {
  assert.equal(resetExitAction({
    hasSession: true,
    pendingPasswordReset: false,
    loading: false,
    adopting: false,
  }), 'invalid-home');
  assert.equal(resetExitAction({
    hasSession: false,
    pendingPasswordReset: false,
    loading: false,
    adopting: false,
  }), 'invalid-request');
  assert.equal(resetExitAction({
    hasSession: false,
    pendingPasswordReset: false,
    loading: true,
    adopting: false,
  }), 'wait');
});

test('the splash holds home until the session and the profile agree', () => {
  assert.equal(authLoading(false, null, null), true);
  assert.equal(authLoading(true, USER, null), true);
  assert.equal(authLoading(true, USER, USER), false);
  assert.equal(rootAuthDestination({ loading: true, hasSession: true, pendingPasswordReset: false }), 'splash');
  assert.equal(resetReplaceAllowed('splash'), false);
  assert.equal(resetNavigationAction({ destination: 'splash', currentPath: 'auth/forgot-password', queued: false }), 'none');
});

test('a successful code opens the new-password route and does not dispatch during splash', () => {
  let sim = applyEvent(signedOut(), 'PASSWORD_RECOVERY', USER);
  assert.equal(resetNavigationAction({
    destination: destination(sim),
    currentPath: 'auth/forgot-password',
    queued: false,
  }), 'replace');
  assert.equal(navigatorRoutes('reset')?.includes('auth/reset'), true);
  assert.equal(navigatorRoutes('reset')?.includes('(app)'), false);
  sim = { ...sim, readyForUserId: USER };
  assert.equal(destination(sim), 'reset');
  assert.equal(resetNavigationAction({
    destination: destination(sim),
    currentPath: 'auth/reset',
    queued: false,
  }), 'none');
});

test('sign-out, a normal sign-in, and an old link keep their routes', () => {
  const signedIn = { ...applyEvent(signedOut(), 'SIGNED_IN', USER), readyForUserId: USER };
  assert.equal(destination(signedIn), 'home');
  assert.equal(navigatorRoutes('home')?.includes('(app)'), true);
  assert.equal(navigatorRoutes('home')?.includes('auth/reset'), true);
  assert.equal(resetNavigationAction({ destination: 'home', currentPath: '(app)', queued: false }), 'none');

  assert.equal(resetNavigationAction({ destination: 'signed-out', currentPath: 'auth/forgot-password', queued: true }), 'replace');
  assert.equal(resetNavigationAction({ destination: 'splash', currentPath: '', queued: true }), 'none');

  let sim: Sim = {
    sessionReady: true,
    sessionUserId: USER,
    recoveryUserId: USER,
    readyForUserId: USER,
  };
  const held = applyLocalSignOutHold();
  sim = { ...sim, recoveryUserId: held.recoveryUserId, readyForUserId: held.readyForUserId };
  assert.equal(destination(sim), 'splash');
  assert.equal(resetNavigationAction({ destination: destination(sim), currentPath: 'auth/reset', queued: false }), 'none');
  sim = applyEvent(sim, 'SIGNED_OUT', null);
  assert.equal(destination(sim), 'signed-out');
  assert.equal(navigatorRoutes('signed-out')?.includes('auth/reset'), true);
  assert.equal(navigatorRoutes('signed-out')?.includes('(app)'), false);
});
