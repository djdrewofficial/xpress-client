import {
  APP_NOTIF_TABS,
  type AppNotifTab,
  type AppNotifTapAction,
  type AppNotificationMessage,
  type AppNotificationPopup,
} from '@/lib/appNotificationsParse';

export type AppNotificationTarget =
  | { kind: 'tab'; tab: AppNotifTab; href: string }
  | { kind: 'screen'; screenId: string; href: string }
  | { kind: 'message'; messageId: string }
  | { kind: 'none' };

const SCHEME = 'xpressclient';

/** Map a contract tab name to an in-app href. Unbuilt tabs land on My Event. */
export function hrefForTab(tab: string): string {
  switch (tab) {
    case 'home':
    case 'planning':
      return '/';
    case 'timeline':
      return '/timeline';
    case 'music':
      return '/music';
    case 'payments':
    case 'documents':
    case 'guests':
    case 'settings':
      return '/you';
    default:
      return '/';
  }
}

export function isAppNotifTab(value: string): value is AppNotifTab {
  return (APP_NOTIF_TABS as readonly string[]).includes(value);
}

/**
 * Parse `xpressclient://message|screen|tab/...` (and https host paths if ever used).
 * Returns null when the URL is not a notification deep link.
 */
export function parseAppNotificationUrl(url: string): AppNotificationTarget | null {
  const raw = (url ?? '').trim();
  if (!raw) return null;

  let path = '';
  try {
    if (raw.startsWith(`${SCHEME}://`)) {
      path = raw.slice(`${SCHEME}://`.length);
    } else if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      if (!u.hostname.includes('xpressdjs.com') && u.hostname !== 'xpressclient') return null;
      path = u.pathname.replace(/^\//, '');
    } else if (raw.startsWith('/')) {
      path = raw.replace(/^\//, '');
    } else {
      return null;
    }
  } catch {
    return null;
  }

  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [kind, id] = parts;
  if (!id) return null;

  if (kind === 'message') return { kind: 'message', messageId: id };
  if (kind === 'screen') {
    return { kind: 'screen', screenId: id, href: `/notification-screen/${id}` };
  }
  if (kind === 'tab') {
    const tab = isAppNotifTab(id) ? id : 'home';
    return { kind: 'tab', tab, href: hrefForTab(tab) };
  }
  return null;
}

/** Resolve where a push/popup tap should go from the message fields + deep link. */
export function resolveNotificationTap(input: {
  deepLink?: string | null;
  tapAction?: AppNotifTapAction | string | null;
  tapTab?: string | null;
  screenId?: string | null;
  messageId?: string | null;
}): AppNotificationTarget {
  const fromLink = input.deepLink ? parseAppNotificationUrl(input.deepLink) : null;
  if (fromLink && fromLink.kind !== 'message') return fromLink;

  if (input.tapAction === 'screen' && input.screenId) {
    return {
      kind: 'screen',
      screenId: input.screenId,
      href: `/notification-screen/${input.screenId}`,
    };
  }
  if (input.tapAction === 'tab' && input.tapTab) {
    const tab = isAppNotifTab(input.tapTab) ? input.tapTab : 'home';
    return { kind: 'tab', tab, href: hrefForTab(tab) };
  }
  if (fromLink?.kind === 'message') return fromLink;
  if (input.messageId) return { kind: 'message', messageId: input.messageId };
  return { kind: 'none' };
}

export function targetFromMessage(message: AppNotificationMessage): AppNotificationTarget {
  return resolveNotificationTap({
    deepLink: message.deep_link,
    tapAction: message.tap_action,
    tapTab: message.tap_tab,
    screenId: message.screen_id,
    messageId: message.id,
  });
}

export function targetFromPopup(popup: AppNotificationPopup): AppNotificationTarget {
  return resolveNotificationTap({
    deepLink: popup.deep_link,
    screenId: popup.screen_id,
    messageId: popup.id,
    tapAction: popup.screen_id ? 'screen' : null,
  });
}

/** Expo push `data` payload helpers. */
export function targetFromPushData(data: Record<string, unknown> | null | undefined): AppNotificationTarget {
  if (!data) return { kind: 'none' };
  const deepLink = typeof data.deepLink === 'string' ? data.deepLink : null;
  const messageId = typeof data.messageId === 'string' ? data.messageId : null;
  return resolveNotificationTap({ deepLink, messageId });
}

/** Build the sandboxed HTML document for staff-authored body + embed. */
export function buildScreenDocument(opts: {
  bodyHtml: string;
  embedHtml: string | null;
  background: string;
  ink: string;
  ink2: string;
}): string {
  const body = opts.bodyHtml || '';
  const embed = opts.embedHtml
    ? `<div class="embed">${opts.embedHtml}</div>`
    : '';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html, body { margin: 0; padding: 0; background: ${opts.background}; color: ${opts.ink};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrap { padding: 14px; box-sizing: border-box; }
  .body { font-size: 16px; line-height: 1.45; color: ${opts.ink}; margin: 0 0 12px; }
  .body p { margin: 0 0 10px; }
  .body a { color: #4b328e; }
  .embed { width: 100%; overflow: auto; -webkit-overflow-scrolling: touch; }
  .embed iframe { width: 100% !important; min-height: 520px; border: 0; display: block; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="body">${body}</div>
    ${embed}
  </div>
</body>
</html>`;
}

/** Whether a navigation URL is allowed inside the sandboxed WebView. */
export function allowWebViewNavigation(
  url: string,
  allowedOrigins: string[],
): 'allow' | 'external' | 'block' {
  const trimmed = (url ?? '').trim();
  if (!trimmed || trimmed === 'about:blank') return 'allow';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return 'allow';
  if (/^file:/i.test(trimmed) || /^javascript:/i.test(trimmed)) return 'block';

  let origin: string;
  try {
    origin = new URL(trimmed).origin;
  } catch {
    return 'block';
  }

  if (allowedOrigins.some((o) => o === origin)) return 'allow';
  if (/^https:/i.test(trimmed)) return 'external';
  if (/^http:/i.test(trimmed)) return 'external';
  return 'block';
}
