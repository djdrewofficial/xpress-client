/**
 * Proposal v2 UI kit.
 *
 * Later phases:
 *   import { Button, Icon, NavBar, useC } from '@/components/ui';
 *   import { Type, Space, Radius, Shadow, Gradients } from '@/lib/theme';
 *
 * `useC()` returns legacy names (`text`, `bg`, `card`, …) aliased onto the v2
 * palette, plus the v2 names (`ink`, `surface`, `accent`, `red`, …).
 * Icons: `<Icon name="music" size={24} color={c.ink} />`. Stored emoji strings
 * go through `<EmojiIcon glyph={section.icon} />` so the glyph is never drawn.
 */

export { useC, useScheme, ThemeSchemeOverride } from './useC';
export { Bar, Ring, GradientButton } from './primitives';
export { Icon, PlayPauseIcon } from './Icon';
export type { IconName } from './iconData';
export { ICON_NAMES } from './iconData';
export { EmojiIcon, resolveIcon } from './iconForEmoji';
export { Button } from './Button';
export { SegmentedControl } from './SegmentedControl';
export { NavBar } from './NavBar';
export { TabBar, V2_TABS } from './TabBar';
export type { TabItem } from './TabBar';
export { CountdownHero } from './CountdownHero';
export { MomentRow } from './MomentRow';
export { TrackRow } from './TrackRow';
export { ListCell } from './ListCell';
export { Sheet } from './Sheet';
export { CoachMark } from './CoachMark';
export { CodeInput } from './CodeInput';
export { LanguageCard } from './LanguageCard';
export { LegalLine, PolicyLinks } from './LegalLine';
