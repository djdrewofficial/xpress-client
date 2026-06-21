import React from 'react';
import { StyleSheet, Text as RNText, type TextStyle } from 'react-native';

/* Make every <Text> render in Montserrat (our secondary/UI typeface) at the
   right weight, app-wide, without touching each call site. RN's Text is a
   forwardRef object, so its `.render` is patchable: we map the style's
   fontWeight to the matching Montserrat face. An explicit `fontFamily` (e.g.
   DM Serif Display on headlines) is left untouched. */

const MONTSERRAT: Record<string, string> = {
  '100': 'Montserrat_400Regular',
  '200': 'Montserrat_400Regular',
  '300': 'Montserrat_400Regular',
  '400': 'Montserrat_400Regular',
  normal: 'Montserrat_400Regular',
  '500': 'Montserrat_500Medium',
  '600': 'Montserrat_600SemiBold',
  '700': 'Montserrat_700Bold',
  bold: 'Montserrat_700Bold',
  '800': 'Montserrat_800ExtraBold',
  '900': 'Montserrat_800ExtraBold',
};

let done = false;

export function patchTextFonts() {
  if (done) return;
  const Any = RNText as unknown as { render?: (...args: unknown[]) => React.ReactElement<{ style?: unknown }> };
  const orig = Any.render;
  if (typeof orig !== 'function') return;
  done = true;

  Any.render = function patchedRender(...args: unknown[]) {
    const el = orig.apply(this, args);
    const flat = (StyleSheet.flatten(el.props.style) ?? {}) as TextStyle;
    if (flat.fontFamily) return el; // explicit family wins (DM Serif headlines)
    const weight = flat.fontWeight != null ? String(flat.fontWeight) : '400';
    const fontFamily = MONTSERRAT[weight] ?? MONTSERRAT['400'];
    return React.cloneElement(el, { style: [el.props.style, { fontFamily }] });
  };
}
