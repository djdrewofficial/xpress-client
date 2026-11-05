import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Fonts, Type } from '@/lib/theme';
import { useC } from './useC';

/**
 * Six-digit code row. Boxes are 50×58, radius 12.
 * Empty: `line` stroke. Filled: `accent` stroke. Active empty box shows a caret.
 * Error: every box uses `danger`, and `error` renders underneath in `redInk`.
 * Non-digits are stripped. Disabled is not a separate visual — pass `editable={false}` by ignoring changes if needed.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  error,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string | null;
  autoFocus?: boolean;
}) {
  const c = useC();
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.replace(/\D/g, '').slice(0, length);
  const active = Math.min(digits.length, length - 1);

  return (
    <View>
      <Pressable onPress={() => ref.current?.focus()} style={styles.row} accessibilityRole="none">
        {Array.from({ length }, (_, i) => {
          const char = digits[i] ?? '';
          const isActive = focused && !error && i === digits.length && digits.length < length;
          const border = error ? c.danger : char || (focused && i === active) ? c.accent : c.line;
          return (
            <View key={i} style={[styles.box, { backgroundColor: c.surface, borderColor: border }]}>
              <Text style={[styles.digit, { color: c.ink }]}>{char}</Text>
              {isActive ? <View style={[styles.caret, { backgroundColor: c.accent }]} /> : null}
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={ref}
        value={digits}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        style={styles.hidden}
        accessibilityLabel="Verification code"
      />
      {error ? <Text style={[Type.footnote, { color: c.redInk, marginTop: 8 }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  box: {
    width: 50,
    height: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontFamily: Fonts.semibold, fontSize: 24, lineHeight: 28 },
  caret: { position: 'absolute', width: 2, height: 22, borderRadius: 1 },
  hidden: { position: 'absolute', opacity: 0, height: 58, width: '100%' },
});
