import { ICON_NAMES, type IconName } from './iconData';
import { Icon } from './Icon';
import { useC } from './useC';

const ICON_SET = new Set<string>(ICON_NAMES);

/** Obvious emoji → v2 icon. Unknown glyphs fall back in `EmojiIcon` so the UI never prints the emoji. */
const EMOJI_TO_ICON: Record<string, IconName> = {
  '📸': 'camera',
  '📷': 'camera',
  '🎥': 'camera',
  '📹': 'camera',
  '🎬': 'camera',
  '🖼': 'camera',
  '✨': 'sparkles',
  '🌟': 'sparkles',
  '💫': 'sparkle',
  '⚡': 'sparkle',
  '💡': 'sparkle',
  '⭐': 'star',
  '★': 'star',
  '🎉': 'party',
  '🎊': 'party',
  '🎈': 'party',
  '🎁': 'party',
  '🎵': 'music',
  '🎶': 'music',
  '🎼': 'music',
  '🎹': 'music',
  '🎻': 'music',
  '🎸': 'music',
  '🥁': 'music',
  '🎷': 'music',
  '🎺': 'music',
  '🎤': 'mic',
  '🎙': 'mic',
  '🎧': 'headphones',
  '💍': 'rings',
  '💒': 'rings',
  '👰': 'rings',
  '💃': 'first-dance',
  '🕺': 'party',
  '🪩': 'disco',
  '🎂': 'cake',
  '🍰': 'cake',
  '🧁': 'cake',
  '🥂': 'toast',
  '🍾': 'toast',
  '👋': 'users',
  '🗂': 'tracks',
  '📁': 'tracks',
  '📂': 'tracks',
  '📋': 'tracks',
  '📚': 'tracks',
  '✅': 'check',
  '☑': 'check',
  '✔': 'check',
  '✓': 'check',
  '↕': 'grip',
  '🗑': 'trash',
  '📝': 'note',
  '✏': 'edit',
  '🚫': 'ban',
  '⛔': 'ban',
  '📅': 'calendar',
  '📆': 'calendar',
  '🗓': 'calendar',
  '🕐': 'clock',
  '⏰': 'clock',
  '⌛': 'clock',
  '⏳': 'clock',
  '👤': 'user',
  '👥': 'users',
  '🏠': 'home',
  '🏡': 'home',
  '🔒': 'lock',
  '🔐': 'lock',
  '❤': 'heart',
  '🧡': 'heart',
  '💛': 'heart',
  '💚': 'heart',
  '💙': 'heart',
  '💜': 'heart',
  '🖤': 'heart',
  '🤍': 'heart',
  '💕': 'heart',
  '💖': 'heart',
  '💗': 'heart',
  '💘': 'heart',
  '💝': 'heart',
  '📌': 'pin',
  '📍': 'pin',
  '🔍': 'search',
  '🔎': 'search',
  '➕': 'plus',
  '✉': 'mail',
  '📧': 'mail',
  '📩': 'mail',
  '📞': 'phone',
  '☎': 'phone',
  '📱': 'phone',
  '💬': 'message',
  'ℹ': 'info',
  '⚠': 'info',
  '❓': 'help',
  '❔': 'help',
  '❌': 'close',
  '❎': 'close',
  '✕': 'close',
  '✖': 'close',
  '×': 'close',
  '💎': 'gem',
  '👑': 'gem',
  '💰': 'wallet',
  '💵': 'wallet',
  '🧾': 'receipt',
  '🔗': 'link',
  '⬆': 'upload',
  '📤': 'upload',
  '📥': 'import',
  '▶': 'play',
  '🔀': 'shuffle',
  '👁': 'eye',
  '🛡': 'shield',
  '💿': 'vinyl',
  '💽': 'vinyl',
  '🔊': 'waveform',
  '🔥': 'sparkles',
  '🌹': 'heart',
  '💐': 'sparkles',
  '🌸': 'sparkles',
  '🌺': 'sparkles',
  '🌷': 'sparkles',
  '🌙': 'sparkle',
  '☀': 'sparkle',
  '🌈': 'sparkles',
};

const EMOJI_ENTRIES = Object.entries(EMOJI_TO_ICON).sort((a, b) => b[0].length - a[0].length);

/** Map a stored emoji (or an icon name) to a v2 icon. Returns null when nothing matches. */
export function resolveIcon(value?: string | null): IconName | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\uFE0F/g, '');
  if (!trimmed) return null;
  if (ICON_SET.has(trimmed)) return trimmed as IconName;
  const exact = EMOJI_TO_ICON[trimmed];
  if (exact) return exact;
  for (const [emoji, name] of EMOJI_ENTRIES) {
    if (trimmed.includes(emoji)) return name;
  }
  return null;
}

/**
 * Renders a v2 icon for a value that used to be an emoji (section icons from
 * the planner, etc.). Unknown glyphs use `fallback` — the emoji is never drawn.
 */
export function EmojiIcon({
  glyph,
  size = 22,
  color,
  fallback = 'sparkles',
}: {
  glyph?: string | null;
  size?: number;
  color?: string;
  fallback?: IconName;
}) {
  const c = useC();
  const name = resolveIcon(glyph) ?? fallback;
  return <Icon name={name} size={size} color={color ?? c.ink} />;
}
