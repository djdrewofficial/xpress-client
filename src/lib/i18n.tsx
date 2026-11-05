import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/lib/auth';
import { readClientLanguage, readInitialLocale, saveLocale } from '@/lib/preferences';

/**
 * Tiny dictionaries for this phase (sign-in, welcome, music, first song).
 * Add a key to `en` and TypeScript will require the same key in `es`.
 * Later phases extend `en` / `es` — call sites keep using `t('some.key')`.
 *
 * Placeholders: `{{name}}` in the string, passed as the second argument.
 * `{{accent}}` is left in place so a screen can paint that word in italic.
 */

const en = {
  'login.kicker': 'The {{accent}}\nWedding\nExperience',
  'login.kickerAccent': 'Ultimate',
  'login.welcome': 'Welcome back',
  'login.subtitle': 'We will text or email you a one-time code. No password to remember.',
  'login.email': 'Email',
  'login.text': 'Text',
  'login.phoneLabel': 'Phone',
  'login.emailLabel': 'Email',
  'login.phonePh': '(555) 555-0123',
  'login.emailPh': 'name@email.com',
  'login.send': 'Send my code',
  'login.sending': 'Sending…',
  'login.invite': 'First time here? Open the invite link we emailed you.',
  'login.phoneInvalid': 'Enter a 10-digit US phone number.',
  'login.emailInvalid': 'Enter the email on your account.',
  'login.missing': "We couldn't find an account for that. Accounts are invite-only — open the invite we emailed you, or try the other option.",
  'login.smsUnavailable': "We couldn't text a code right now. Try Email instead — text codes turn on once your DJ enables them.",
  'login.emailFailed': "We couldn't email a code. Check the address and try again.",
  'login.rateLimited': 'Too many codes. Wait a minute and try again.',
  'login.genericError': 'Something went wrong. Please try again.',
  'login.useEmail': 'Use email instead',

  'code.texts': 'Check your texts',
  'code.email': 'Check your email',
  'code.title': 'Enter your code',
  'code.sent': 'We sent a 6-digit code to {{dest}}.',
  'code.verify': 'Verify code',
  'code.verifying': 'Verifying…',
  'code.resendIn': 'Resend code in {{time}}',
  'code.resend': 'Resend code',
  'code.switch': 'Use a different email or number',
  'code.wrong': 'That code is wrong or expired. Request a new one.',

  'welcome.hello': 'Welcome',
  'welcome.helloNames': 'Welcome, {{names}}',
  'welcome.sub': 'Your day is almost here. Pick a language to continue.',
  'welcome.langPrompt': 'English or Español?',
  'welcome.english': 'English',
  'welcome.spanish': 'Español',
  'welcome.selected': 'Selected',
  'welcome.continue': 'Continue',

  'legal.privacyTitle': 'Privacy Policy',
  'legal.termsTitle': 'Terms',
  'legal.placeholder': 'Placeholder, final text from legal',
  'legal.collectTitle': 'What we collect',
  'legal.collectBody': 'Account, event, and music details you add. Placeholder.',
  'legal.useTitle': 'How we use it',
  'legal.useBody': 'To run your day and send login codes and updates. Placeholder.',
  'legal.shareTitle': 'Sharing',
  'legal.shareBody': 'With your DJ team and HighLevel for texts. Placeholder.',
  'legal.choicesTitle': 'Your choices',
  'legal.choicesBody': 'Language, marketing texts, and account deletion in My Event. Placeholder.',
  'legal.termsServiceTitle': 'The service',
  'legal.termsServiceBody': 'Xpress plans your event with your DJ. Placeholder.',
  'legal.termsAccountTitle': 'Your account',
  'legal.termsAccountBody': 'Invite-only. You sign in with a one-time code. Placeholder.',
  'legal.termsSmsTitle': 'Texts',
  'legal.termsSmsBody': 'Login codes and event updates by text. Msg & data rates may apply. Reply STOP to opt out. Placeholder.',
  'legal.openWeb': 'View on the web',

  'music.skip': 'Skip',
  'music.stepWelcome': 'Welcome',
  'music.stepMusic': 'Music',
  'music.stepTimeline': 'Timeline',
  'music.stepDj': 'Your DJ',
  'music.eyebrow': 'Your music',
  'music.title': 'Bring the songs {{accent}}\nlove',
  'music.titleAccent': 'you',
  'music.body': 'Search any song, or import a playlist from Apple Music or Spotify. You always see a preview first.',
  'music.continue': 'Continue',
  'music.sampleTitle': 'Sample Song Two',
  'music.sampleArtist': 'Sample Band',
  'music.mustPlay': 'Must play',
  'music.sampleNote': 'Start at the chorus as the doors open.',

  'song.eyebrow': 'Your music',
  'song.title': 'Make it {{accent}}',
  'song.titleAccent': 'real',
  'song.body': "Add one song that has to be on your dance floor — the track that’ll pack it out. We’ll drop it on your Dancing Playlist and mark it must-play so your DJ never misses it.",
  'song.add': 'Add your song',
  'song.another': 'Add another song',
  'song.saved': 'Saved to “{{section}}” · marked must-play',
  'song.addedTitle': 'You just added your first song',
  'song.addedBody': '“{{title}}” is on your must-play list. This is going to be YOURS.',
  'song.noSection': 'When your DJ adds a dancing playlist, you can put the first song on it from Home.',
  'song.continue': 'Continue',
  'song.skip': 'Skip',

  'auth.signingIn': 'Signing you in…',
};

const es: Record<keyof typeof en, string> = {
  'login.kicker': 'La {{accent}}\nde Boda\nDefinitiva',
  'login.kickerAccent': 'Experiencia',
  'login.welcome': 'Bienvenido de nuevo',
  'login.subtitle': 'Te enviaremos un código de un solo uso por texto o correo. No hay contraseña que recordar.',
  'login.email': 'Correo',
  'login.text': 'Texto',
  'login.phoneLabel': 'Teléfono',
  'login.emailLabel': 'Correo',
  'login.phonePh': '(555) 555-0123',
  'login.emailPh': 'nombre@correo.com',
  'login.send': 'Enviar mi código',
  'login.sending': 'Enviando…',
  'login.invite': '¿Primera vez? Abre el enlace de invitación que te enviamos.',
  'login.phoneInvalid': 'Ingresa un teléfono de EE. UU. de 10 dígitos.',
  'login.emailInvalid': 'Ingresa el correo de tu cuenta.',
  'login.missing': 'No encontramos una cuenta. El acceso es solo por invitación — abre el enlace que te enviamos, o prueba la otra opción.',
  'login.smsUnavailable': 'No pudimos enviar un texto ahora. Prueba con Correo: los códigos por texto se activan cuando tu DJ los habilita.',
  'login.emailFailed': 'No pudimos enviar el correo. Revisa la dirección e inténtalo de nuevo.',
  'login.rateLimited': 'Demasiados códigos. Espera un minuto e inténtalo de nuevo.',
  'login.genericError': 'Algo salió mal. Inténtalo de nuevo.',
  'login.useEmail': 'Usar correo',

  'code.texts': 'Revisa tus mensajes',
  'code.email': 'Revisa tu correo',
  'code.title': 'Ingresa tu código',
  'code.sent': 'Enviamos un código de 6 dígitos a {{dest}}.',
  'code.verify': 'Verificar código',
  'code.verifying': 'Verificando…',
  'code.resendIn': 'Reenviar código en {{time}}',
  'code.resend': 'Reenviar código',
  'code.switch': 'Usar otro correo o número',
  'code.wrong': 'Ese código es incorrecto o expiró. Pide uno nuevo.',

  'welcome.hello': 'Bienvenidos',
  'welcome.helloNames': 'Bienvenidos, {{names}}',
  'welcome.sub': 'Su día ya casi llega. Elige un idioma para continuar.',
  'welcome.langPrompt': '¿Inglés o Español?',
  'welcome.english': 'Inglés',
  'welcome.spanish': 'Español',
  'welcome.selected': 'Elegido',
  'welcome.continue': 'Continuar',

  'legal.privacyTitle': 'Política de privacidad',
  'legal.termsTitle': 'Términos',
  'legal.placeholder': 'Texto provisional, la versión final viene de legal',
  'legal.collectTitle': 'Qué recopilamos',
  'legal.collectBody': 'Cuenta, evento y la música que agregas. Provisional.',
  'legal.useTitle': 'Cómo lo usamos',
  'legal.useBody': 'Para organizar tu día y enviar códigos de acceso y actualizaciones. Provisional.',
  'legal.shareTitle': 'Con quién se comparte',
  'legal.shareBody': 'Con tu equipo de DJ y HighLevel para los textos. Provisional.',
  'legal.choicesTitle': 'Tus opciones',
  'legal.choicesBody': 'Idioma, textos de marketing y eliminar la cuenta en Mi evento. Provisional.',
  'legal.termsServiceTitle': 'El servicio',
  'legal.termsServiceBody': 'Xpress organiza tu evento con tu DJ. Provisional.',
  'legal.termsAccountTitle': 'Tu cuenta',
  'legal.termsAccountBody': 'Solo por invitación. Entras con un código de un solo uso. Provisional.',
  'legal.termsSmsTitle': 'Mensajes',
  'legal.termsSmsBody': 'Códigos de acceso y actualizaciones del evento por texto. Pueden aplicar cargos. Responde STOP para cancelar. Provisional.',
  'legal.openWeb': 'Ver en la web',

  'music.skip': 'Omitir',
  'music.stepWelcome': 'Bienvenida',
  'music.stepMusic': 'Música',
  'music.stepTimeline': 'Cronograma',
  'music.stepDj': 'Tu DJ',
  'music.eyebrow': 'Tu música',
  'music.title': 'Trae las canciones\nque {{accent}}',
  'music.titleAccent': 'amas',
  'music.body': 'Busca cualquier canción, o importa una lista de Apple Music o Spotify. Siempre ves una vista previa primero.',
  'music.continue': 'Continuar',
  'music.sampleTitle': 'Canción de ejemplo',
  'music.sampleArtist': 'Banda de ejemplo',
  'music.mustPlay': 'Imprescindible',
  'music.sampleNote': 'Empieza en el coro cuando se abran las puertas.',

  'song.eyebrow': 'Tu música',
  'song.title': 'Hazlo {{accent}}',
  'song.titleAccent': 'real',
  'song.body': 'Agrega una canción que tenga que sonar en la pista — el tema que la va a llenar. La ponemos en tu lista de baile y la marcamos como imprescindible para que tu DJ no la pase por alto.',
  'song.add': 'Agrega tu canción',
  'song.another': 'Agregar otra',
  'song.saved': 'Guardada en “{{section}}” · marcada imprescindible',
  'song.addedTitle': 'Acabas de agregar tu primera canción',
  'song.addedBody': '“{{title}}” está en tu lista de imprescindibles. Esta noche va a ser de ustedes.',
  'song.noSection': 'Cuando tu DJ agregue la lista de baile, podrás poner la primera canción desde Inicio.',
  'song.continue': 'Continuar',
  'song.skip': 'Omitir',

  'auth.signingIn': 'Entrando…',
};

export type Locale = 'en' | 'es';
export type TranslationKey = keyof typeof en;

const tables: Record<Locale, Record<TranslationKey, string>> = { en, es };

export function translate(locale: Locale, key: TranslationKey, vars?: Record<string, string | number>): string {
  let str = tables[locale][key] ?? en[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      str = str.split(`{{${name}}}`).join(String(value));
    }
  }
  return str;
}

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleState>({
  locale: 'en',
  setLocale: () => {},
  t: (key, vars) => translate('en', key, vars),
});

export function LocaleProvider({ children }: PropsWithChildren) {
  const { session, profile } = useAuth();
  const [locale, setLocaleState] = useState<Locale>('en');
  const touched = useRef(false);
  const uid = session?.user.id ?? null;
  const clientId = profile?.clientId ?? null;

  useEffect(() => {
    let cancelled = false;
    const metadata = session?.user.user_metadata?.locale;
    readInitialLocale(uid, metadata).then((value) => {
      if (!cancelled && !touched.current) setLocaleState(value);
    });
    return () => {
      cancelled = true;
    };
  }, [uid, session?.user.user_metadata?.locale]);

  useEffect(() => {
    if (!clientId || touched.current) return;
    let cancelled = false;
    readClientLanguage(clientId)
      .then((value) => {
        if (!cancelled && value && !touched.current) setLocaleState(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const setLocale = useCallback(
    (next: Locale) => {
      touched.current = true;
      setLocaleState(next);
      saveLocale(next, { uid, clientId }).catch(() => {});
    },
    [uid, clientId],
  );

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useT() {
  return useContext(LocaleContext);
}
