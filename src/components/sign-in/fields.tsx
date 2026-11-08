import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, useC, type IconName } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { normalizeRecoveryCode } from '@/lib/recoveryCode';
import { Fonts, Radius, Type } from '@/lib/theme';

export function TextField({
  label,
  icon,
  error,
  ...input
}: {
  label: string;
  icon: IconName;
  error?: boolean;
} & TextInputProps) {
  const c = useC();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[Type.label, { color: c.accent }]}>{label}</Text>
      <View style={[styles.field, { backgroundColor: c.surface, borderColor: error ? c.red : focused ? c.red : c.line }]}>
        <Icon name={icon} size={22} color={c.ink3} />
        <TextInput
          placeholderTextColor={c.ink3}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: c.ink }]}
          {...input}
        />
      </View>
    </View>
  );
}

export function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  textContentType,
  autoComplete,
  onSubmitEditing,
  returnKeyType = 'go',
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  textContentType: 'password' | 'newPassword';
  autoComplete: 'password' | 'password-new';
  onSubmitEditing?: () => void;
  returnKeyType?: 'go' | 'next' | 'done';
  error?: boolean;
}) {
  const c = useC();
  const { t } = useT();
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[Type.label, { color: c.accent }]}>{label}</Text>
      <View style={[styles.field, { backgroundColor: c.surface, borderColor: error ? c.red : focused ? c.red : c.line }]}>
        <Icon name="lock" size={22} color={c.ink3} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.ink3}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: c.ink }]}
        />
        <Pressable onPress={() => setShown((next) => !next)} hitSlop={8} accessibilityRole="button">
          <Text style={[Type.footnote, { color: c.accent }]}>{shown ? t('login.hide') : t('login.show')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function OneTimeCodeField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  editable = true,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
}) {
  const c = useC();
  const [focused, setFocused] = useState(false);
  const digits = normalizeRecoveryCode(value);
  return (
    <View style={{ gap: 6 }}>
      <Text style={[Type.label, { color: c.accent }]}>{label}</Text>
      <View style={[styles.field, { backgroundColor: c.surface, borderColor: error ? c.red : focused ? c.red : c.line }]}>
        <Icon name="shield" size={22} color={c.ink3} />
        <TextInput
          value={digits}
          onChangeText={(next) => onChangeText(normalizeRecoveryCode(next))}
          placeholder={placeholder}
          placeholderTextColor={c.ink3}
          keyboardType="number-pad"
          inputMode="numeric"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          importantForAutofill="yes"
          maxLength={32}
          editable={editable}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          style={[styles.input, digits ? styles.codeDigits : null, { color: c.ink }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  input: { flex: 1, fontFamily: Fonts.body, fontSize: 16, paddingVertical: 0 },
  codeDigits: { fontFamily: Fonts.semibold, fontSize: 20, letterSpacing: 2 },
});
