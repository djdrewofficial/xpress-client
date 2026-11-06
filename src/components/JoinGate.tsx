import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/lib/auth';
import { clearPendingLink, onPendingLink, peekPendingLink, redeemEventLink } from '@/lib/eventLinks';
import { useEvent } from '@/lib/events';
import type { TranslationKey } from '@/lib/i18n';
import { rememberMembership } from '@/lib/membership';

function failureKey(status: number): TranslationKey {
  if (status === 429) return 'joinEvent.rate';
  if (status === 503 || status === 501 || status === 0) return 'joinEvent.setup';
  if (status === 403) return 'joinEvent.forbidden';
  if (status === 400 || status === 404) return 'joinEvent.badLink';
  return 'joinEvent.generic';
}

const LinkErrorContext = createContext<TranslationKey | null>(null);

export function useJoinLinkError() {
  return useContext(LinkErrorContext);
}

/**
 * Redeems a stashed host or guest link as soon as a session exists, including
 * one that was opened before sign-in. The join screen itself is shown by
 * OnboardingGate after Welcome, when the account still has no event.
 */
export function JoinGate({ children }: PropsWithChildren) {
  const { session, reloadProfile } = useAuth();
  const { focusEvent, reload } = useEvent();
  const [linkError, setLinkError] = useState<TranslationKey | null>(null);
  const chain = useRef(Promise.resolve());
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const consume = useCallback(() => {
    chain.current = chain.current.then(async () => {
      const current = sessionRef.current;
      const token = await peekPendingLink();
      if (!token || !current?.user.id) return;
      const result = await redeemEventLink(token);
      if (result.ok) {
        await rememberMembership(current.user.id, result.data.eventId, result.data.role);
        focusEvent(result.data.eventId);
        await clearPendingLink();
        setLinkError(null);
        await reloadProfile();
        await reload();
      } else {
        if (result.status === 400 || result.status === 404) await clearPendingLink();
        setLinkError(failureKey(result.status));
      }
    });
  }, [focusEvent, reload, reloadProfile]);

  useEffect(() => {
    consume();
    const unsubscribe = onPendingLink(() => {
      peekPendingLink().then((token) => {
        if (token) consume();
      });
    });
    return () => {
      unsubscribe();
    };
  }, [consume]);

  return <LinkErrorContext.Provider value={linkError}>{children}</LinkErrorContext.Provider>;
}
