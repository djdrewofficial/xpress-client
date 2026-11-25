/** Pure parsers / constants for the XOS notifications contract — safe for node:test. */

/** Tabs named in the XOS deep-link contract. */
export const APP_NOTIF_TABS = [
  'home',
  'planning',
  'timeline',
  'payments',
  'documents',
  'music',
  'guests',
  'settings',
] as const;

export type AppNotifTab = (typeof APP_NOTIF_TABS)[number];

export type AppNotifTapAction = 'tab' | 'screen' | 'none';

export type AppNotificationMessage = {
  id: string;
  title: string;
  body: string;
  deep_link: string;
  tap_action: AppNotifTapAction;
  tap_tab: string | null;
  screen_id: string | null;
  show_as_popup: boolean;
  status: string;
  queued_at: string;
  sent_at: string | null;
};

export type AppNotificationPopup = {
  id: string;
  title: string;
  body: string;
  deep_link: string;
  screen_id: string | null;
};

export type AppScreenButton = {
  label: string;
  action: 'tab' | 'url' | 'dismiss';
  tab?: string;
  url?: string;
};

export type AppNotificationScreen = {
  id: string;
  name: string;
  heading: string;
  body_html: string;
  buttons: AppScreenButton[];
  embed_html: string | null;
  dj: { name: string; booking_url: string };
  render: {
    mode: 'webview_sandbox';
    allowed_origins: string[];
    open_links: 'external';
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function parseMessagesPayload(data: unknown): {
  messages: AppNotificationMessage[];
  popups: AppNotificationPopup[];
} {
  const row = asRecord(data);
  const messages = Array.isArray(row.messages)
    ? row.messages.map(parseMessage).filter((m): m is AppNotificationMessage => !!m)
    : [];
  const popups = Array.isArray(row.popups)
    ? row.popups.map(parsePopup).filter((p): p is AppNotificationPopup => !!p)
    : [];
  return { messages, popups };
}

export function parseMessage(value: unknown): AppNotificationMessage | null {
  const row = asRecord(value);
  const id = typeof row.id === 'string' ? row.id : '';
  if (!id) return null;
  const tap = row.tap_action;
  const tapAction: AppNotifTapAction =
    tap === 'tab' || tap === 'screen' || tap === 'none' ? tap : 'none';
  return {
    id,
    title: typeof row.title === 'string' ? row.title : '',
    body: typeof row.body === 'string' ? row.body : '',
    deep_link: typeof row.deep_link === 'string' ? row.deep_link : '',
    tap_action: tapAction,
    tap_tab: typeof row.tap_tab === 'string' ? row.tap_tab : null,
    screen_id: typeof row.screen_id === 'string' ? row.screen_id : null,
    show_as_popup: row.show_as_popup === true,
    status: typeof row.status === 'string' ? row.status : '',
    queued_at: typeof row.queued_at === 'string' ? row.queued_at : '',
    sent_at: typeof row.sent_at === 'string' ? row.sent_at : null,
  };
}

export function parsePopup(value: unknown): AppNotificationPopup | null {
  const row = asRecord(value);
  const id = typeof row.id === 'string' ? row.id : '';
  if (!id) return null;
  return {
    id,
    title: typeof row.title === 'string' ? row.title : '',
    body: typeof row.body === 'string' ? row.body : '',
    deep_link: typeof row.deep_link === 'string' ? row.deep_link : '',
    screen_id: typeof row.screen_id === 'string' ? row.screen_id : null,
  };
}

export function parseScreen(value: unknown): AppNotificationScreen | null {
  const row = asRecord(value);
  const id = typeof row.id === 'string' ? row.id : '';
  if (!id) return null;
  const dj = asRecord(row.dj);
  const render = asRecord(row.render);
  const buttons = Array.isArray(row.buttons)
    ? row.buttons.map(parseButton).filter((b): b is AppScreenButton => !!b)
    : [];
  const origins = Array.isArray(render.allowed_origins)
    ? render.allowed_origins.filter((o): o is string => typeof o === 'string')
    : [];
  return {
    id,
    name: typeof row.name === 'string' ? row.name : '',
    heading: typeof row.heading === 'string' ? row.heading : '',
    body_html: typeof row.body_html === 'string' ? row.body_html : '',
    buttons,
    embed_html: typeof row.embed_html === 'string' ? row.embed_html : null,
    dj: {
      name: typeof dj.name === 'string' ? dj.name : '',
      booking_url: typeof dj.booking_url === 'string' ? dj.booking_url : '',
    },
    render: {
      mode: 'webview_sandbox',
      allowed_origins: origins,
      open_links: 'external',
    },
  };
}

function parseButton(value: unknown): AppScreenButton | null {
  const row = asRecord(value);
  const label = typeof row.label === 'string' ? row.label : '';
  const action = row.action;
  if (!label || (action !== 'tab' && action !== 'url' && action !== 'dismiss')) return null;
  return {
    label,
    action,
    tab: typeof row.tab === 'string' ? row.tab : undefined,
    url: typeof row.url === 'string' ? row.url : undefined,
  };
}
