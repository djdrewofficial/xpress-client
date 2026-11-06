import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { appEn, appEs } from '@/lib/appCopy';
import { useAuth } from '@/lib/auth';
import { readClientLanguage, readInitialLocale, readLanguagePref, saveLocale } from '@/lib/preferences';

/**
 * Tiny dictionaries for this phase (sign-in, welcome, music, first song).
 * Add a key to `en` and TypeScript will require the same key in `es`.
 * Later phases extend `en` / `es` — call sites keep using `t('some.key')`.
 *
 * Placeholders: `{{name}}` in the string, passed as the second argument.
 * `{{accent}}` is left in place so a screen can paint that word in italic.
 */

const phaseEn = {
  'login.kicker': 'The {{accent}}\nWedding\nExperience',
  'login.kickerAccent': 'Ultimate',
  'login.welcome': 'Welcome back',
  'login.subtitle': 'Sign in with your email and password.',
  'login.emailLabel': 'Email',
  'login.emailPh': 'name@email.com',
  'login.passwordLabel': 'Password',
  'login.passwordPh': 'Your password',
  'login.show': 'Show',
  'login.hide': 'Hide',
  'login.submit': 'Sign in',
  'login.submitting': 'Signing in…',
  'login.forgot': 'Forgot password?',
  'login.create': 'Create an account',
  'login.or': 'or',
  'login.apple': 'Sign in with Apple',
  'login.google': 'Sign in with Google',
  'login.pendingLink': "We'll open your event after you sign in.",
  'login.emailInvalid': 'Enter a valid email.',
  'login.passwordRequired': 'Enter your password.',
  'login.badCredentials': 'That email or password is wrong.',
  'login.unconfirmed': 'Confirm your email first. We can send the link again.',
  'login.resend': 'Send the link again',
  'login.resent': 'Confirmation link sent.',
  'login.rateLimited': 'Too many tries. Wait a minute and try again.',
  'login.genericError': 'Something went wrong. Please try again.',
  'login.socialFailed': "That sign-in didn't finish. Please try again.",
  'login.socialUnavailable': 'This sign-in needs the latest app update.',
  'login.socialMissing': "Google sign-in isn't set up in this build yet.",

  'signup.title': 'Create your account',
  'signup.subtitle': "Use your email. You'll confirm it before you join an event.",
  'signup.passwordPh': 'At least 8 characters',
  'signup.confirmLabel': 'Confirm password',
  'signup.submit': 'Create account',
  'signup.submitting': 'Creating…',
  'signup.haveAccount': 'Already have an account? Sign in',
  'signup.mismatch': "Those passwords don't match.",
  'signup.short': 'Use at least 8 characters.',
  'signup.letter': 'Include at least one letter.',
  'signup.number': 'Include at least one number.',
  'signup.sameEmail': "Use a password that isn't your email.",
  'signup.long': 'Use 72 characters or fewer.',
  'signup.exists': 'An account with that email already exists. Sign in, or reset your password.',
  'signup.checkTitle': 'Check your email',
  'signup.checkBody': 'We sent a confirmation link to {{email}}. Open it on this phone.',
  'signup.back': 'Back to sign in',

  'forgot.title': 'Reset your password',
  'forgot.subtitle': "We'll email you a link to choose a new password.",
  'forgot.submit': 'Send reset link',
  'forgot.sending': 'Sending…',
  'forgot.sentTitle': 'Check your email',
  'forgot.sentBody': 'If an account uses {{email}}, we sent a reset link. Open it on this phone.',
  'forgot.back': 'Back to sign in',

  'reset.title': 'Choose a new password',
  'reset.subtitle': 'Use at least 8 characters, with a letter and a number.',
  'reset.submit': 'Save password',
  'reset.saving': 'Saving…',
  'reset.invalid': 'This link is invalid or expired. Request a new one.',
  'reset.request': 'Request a new link',

  'joinEvent.title': 'Join your event',
  'joinEvent.help': 'Paste the link from your host, or type your join code.',
  'joinEvent.ph': 'Link or code',
  'joinEvent.submit': 'Join',
  'joinEvent.joining': 'Joining…',
  'joinEvent.clipboard': 'Use the join link copied from the page?',
  'joinEvent.use': 'Use it',
  'joinEvent.notNow': 'Not now',
  'joinEvent.badLink': "That link didn't work. Check it and try again.",
  'joinEvent.badCode': "That code didn't work. Check it and try again.",
  'joinEvent.rate': 'Too many tries. Wait a minute and try again.',
  'joinEvent.setup': "Joining isn't available yet. Ask your DJ if this keeps up.",
  'joinEvent.forbidden': 'Staff accounts open events from the events list.',
  'joinEvent.generic': 'Something went wrong. Please try again.',
  'joinEvent.opening': 'Opening your event…',
  'joinEvent.emptyClipboard': 'No join link was copied.',

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
  'legal.useBody': 'To run your day and send account and event updates. Placeholder.',
  'legal.shareTitle': 'Sharing',
  'legal.shareBody': 'With your DJ team and HighLevel for texts. Placeholder.',
  'legal.choicesTitle': 'Your choices',
  'legal.choicesBody': 'Language, marketing texts, and account deletion in My Event. Placeholder.',
  'legal.termsServiceTitle': 'The service',
  'legal.termsServiceBody': 'Xpress plans your event with your DJ. Placeholder.',
  'legal.termsAccountTitle': 'Your account',
  'legal.termsAccountBody': 'You create an account with your email, Apple, or Google. Placeholder.',
  'legal.termsSmsTitle': 'Texts',
  'legal.termsSmsBody': 'Event updates by text, if you opt in. Msg and data rates may apply. Reply STOP to opt out. Placeholder.',
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

const phaseEs: Record<keyof typeof phaseEn, string> = {
  'login.kicker': 'La {{accent}}\nde Boda\nDefinitiva',
  'login.kickerAccent': 'Experiencia',
  'login.welcome': 'Bienvenido de nuevo',
  'login.subtitle': 'Entra con tu correo y contraseña.',
  'login.emailLabel': 'Correo',
  'login.emailPh': 'nombre@correo.com',
  'login.passwordLabel': 'Contraseña',
  'login.passwordPh': 'Tu contraseña',
  'login.show': 'Ver',
  'login.hide': 'Ocultar',
  'login.submit': 'Entrar',
  'login.submitting': 'Entrando…',
  'login.forgot': '¿Olvidaste tu contraseña?',
  'login.create': 'Crear una cuenta',
  'login.or': 'o',
  'login.apple': 'Iniciar sesión con Apple',
  'login.google': 'Iniciar sesión con Google',
  'login.pendingLink': 'Abriremos tu evento después de que entres.',
  'login.emailInvalid': 'Ingresa un correo válido.',
  'login.passwordRequired': 'Ingresa tu contraseña.',
  'login.badCredentials': 'Ese correo o contraseña no coincide.',
  'login.unconfirmed': 'Primero confirma tu correo. Podemos enviar el enlace otra vez.',
  'login.resend': 'Enviar el enlace otra vez',
  'login.resent': 'Enlace de confirmación enviado.',
  'login.rateLimited': 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
  'login.genericError': 'Algo salió mal. Inténtalo de nuevo.',
  'login.socialFailed': 'Ese inicio de sesión no terminó. Inténtalo de nuevo.',
  'login.socialUnavailable': 'Este inicio de sesión necesita la última versión de la app.',
  'login.socialMissing': 'El inicio de sesión con Google aún no está configurado en esta versión.',

  'signup.title': 'Crea tu cuenta',
  'signup.subtitle': 'Usa tu correo. Lo confirmas antes de unirte a un evento.',
  'signup.passwordPh': 'Al menos 8 caracteres',
  'signup.confirmLabel': 'Confirma la contraseña',
  'signup.submit': 'Crear cuenta',
  'signup.submitting': 'Creando…',
  'signup.haveAccount': '¿Ya tienes cuenta? Entra',
  'signup.mismatch': 'Las contraseñas no coinciden.',
  'signup.short': 'Usa al menos 8 caracteres.',
  'signup.letter': 'Incluye al menos una letra.',
  'signup.number': 'Incluye al menos un número.',
  'signup.sameEmail': 'Usa una contraseña distinta a tu correo.',
  'signup.long': 'Usa 72 caracteres o menos.',
  'signup.exists': 'Ya existe una cuenta con ese correo. Entra, o restablece tu contraseña.',
  'signup.checkTitle': 'Revisa tu correo',
  'signup.checkBody': 'Enviamos un enlace de confirmación a {{email}}. Ábrelo en este teléfono.',
  'signup.back': 'Volver a entrar',

  'forgot.title': 'Restablece tu contraseña',
  'forgot.subtitle': 'Te enviaremos un enlace para elegir una contraseña nueva.',
  'forgot.submit': 'Enviar enlace',
  'forgot.sending': 'Enviando…',
  'forgot.sentTitle': 'Revisa tu correo',
  'forgot.sentBody': 'Si hay una cuenta con {{email}}, enviamos un enlace. Ábrelo en este teléfono.',
  'forgot.back': 'Volver a entrar',

  'reset.title': 'Elige una contraseña nueva',
  'reset.subtitle': 'Usa al menos 8 caracteres, con una letra y un número.',
  'reset.submit': 'Guardar contraseña',
  'reset.saving': 'Guardando…',
  'reset.invalid': 'Este enlace no es válido o expiró. Pide uno nuevo.',
  'reset.request': 'Pedir un enlace nuevo',

  'joinEvent.title': 'Únete a tu evento',
  'joinEvent.help': 'Pega el enlace de tu anfitrión, o escribe tu código.',
  'joinEvent.ph': 'Enlace o código',
  'joinEvent.submit': 'Unirme',
  'joinEvent.joining': 'Uniéndote…',
  'joinEvent.clipboard': '¿Usar el enlace de unión copiado de la página?',
  'joinEvent.use': 'Usarlo',
  'joinEvent.notNow': 'Ahora no',
  'joinEvent.badLink': 'Ese enlace no funcionó. Revísalo e inténtalo de nuevo.',
  'joinEvent.badCode': 'Ese código no funcionó. Revísalo e inténtalo de nuevo.',
  'joinEvent.rate': 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
  'joinEvent.setup': 'Unirse aún no está disponible. Pregúntale a tu DJ si esto sigue.',
  'joinEvent.forbidden': 'Las cuentas de staff abren los eventos desde la lista.',
  'joinEvent.generic': 'Algo salió mal. Inténtalo de nuevo.',
  'joinEvent.opening': 'Abriendo tu evento…',
  'joinEvent.emptyClipboard': 'No hay un enlace de unión copiado.',

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
  'legal.useBody': 'Para organizar tu día y enviar actualizaciones de la cuenta y del evento. Provisional.',
  'legal.shareTitle': 'Con quién se comparte',
  'legal.shareBody': 'Con tu equipo de DJ y HighLevel para los textos. Provisional.',
  'legal.choicesTitle': 'Tus opciones',
  'legal.choicesBody': 'Idioma, textos de marketing y eliminar la cuenta en Mi evento. Provisional.',
  'legal.termsServiceTitle': 'El servicio',
  'legal.termsServiceBody': 'Xpress organiza tu evento con tu DJ. Provisional.',
  'legal.termsAccountTitle': 'Tu cuenta',
  'legal.termsAccountBody': 'Creas una cuenta con tu correo, Apple o Google. Provisional.',
  'legal.termsSmsTitle': 'Mensajes',
  'legal.termsSmsBody': 'Actualizaciones del evento por texto, si lo aceptas. Pueden aplicar cargos. Responde STOP para cancelar. Provisional.',
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

const en = { ...phaseEn, ...appEn };
const es: Record<keyof typeof en, string> = { ...phaseEs, ...appEs };

export type Locale = 'en' | 'es';
export type TranslationKey = keyof typeof en;

/** BCP 47 tag for dates and times. Spanish follows Latin American usage. */
export function localeTag(locale: Locale): string {
  return locale === 'es' ? 'es-419' : 'en-US';
}

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
    // The device key wins once Welcome or Settings has written it. The client
    // column only fills in when that key is still empty.
    readLanguagePref()
      .then(async (stored) => {
        if (stored || cancelled || touched.current) return null;
        return readClientLanguage(clientId);
      })
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
