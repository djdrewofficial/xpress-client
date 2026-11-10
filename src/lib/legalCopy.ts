import type { Locale } from '@/lib/i18n';

/** In-app Privacy, Terms, and deletion notices. Website routes are not linked until they publish the same text. */
export type LegalDoc = 'privacy' | 'terms' | 'deletion';

export type LegalListItem = string | { lead: string; text: string };

export type LegalBlock =
  | { type: 'p'; text: string; lead?: string }
  | { type: 'ul'; items: LegalListItem[] }
  | { type: 'table'; columns: [string, string]; rows: [string, string][] };

export type LegalSection = {
  heading: string;
  /** Simple single-paragraph sections (Terms, deletion). */
  body?: string;
  /** Structured Privacy blocks: paragraphs, lists, and tables. */
  blocks?: LegalBlock[];
};

export type LegalDocument = {
  title: string;
  preamble?: string[];
  sections: LegalSection[];
};

const privacyEn: LegalDocument = {
  title: 'Privacy Policy',
  preamble: [
    'Xpress Entertainment Corp, 11280 Pines Blvd, Pembroke Pines FL 33026',
    'Effective date: September 1, 2026',
  ],
  sections: [
    {
      heading: '1. Who we are',
      blocks: [
        {
          type: 'p',
          text: 'Xpress Entertainment Corp ("Xpress", "we", "us") makes the Xpress DJs app. Couples and their invited guests use it to plan the music and timeline for an event we are booked to perform. This policy explains what information the app and our related staff tools handle, why, who helps us handle it, how long we keep it, and the choices you have.',
        },
        {
          type: 'p',
          text: 'Our booking agreement, our websites and any payment services outside the app may have their own notices.',
        },
      ],
    },
    {
      heading: '2. Information we collect',
      blocks: [
        {
          type: 'p',
          lead: 'Your account.',
          text: 'Your email address, your password (stored by our sign-in provider in protected form, never visible to us), account and sign-in identifiers, your event and your role on it (host, guest or staff), and your name if you give it or your sign-in provider shares it. If you use Sign in with Apple, Apple may give us a private relay email instead of your real one.',
        },
        {
          type: 'p',
          lead: 'Booking records.',
          text: 'For booked events we already hold records such as names, phone number, email, mailing address, event date and venue, package, add-ons, fees, discounts, payments, payment schedule, notes, and your text message choices. The app can show some of these to the event host. Payment details are shown read-only and only when they are turned on for that event. Guests never see them.',
        },
        {
          type: 'p',
          lead: 'What you add while planning.',
          text: 'Answers to planning questions, songs you add or suggest, must-play and do-not-play choices, likes, notes, song ideas, timeline choices, photo booth choices, and who added each item.',
        },
        {
          type: 'p',
          lead: 'Photos and files.',
          text: 'If a host or staff member sets an event cover photo, the app asks for access to your photo library to let you pick it. Planner PDFs and images can be uploaded for staff and hosts.',
        },
        {
          type: 'p',
          lead: 'Invitations.',
          text: "When a host invites someone, we use that person's name, email and relationship to the event to send the invitation.",
        },
        {
          type: 'p',
          lead: 'Optional social handles.',
          text: 'If you choose to give them, your Instagram and TikTok handles. You can skip this.',
        },
        {
          type: 'p',
          lead: 'Call recordings.',
          text: 'We record and transcribe phone calls and meetings with clients so we can keep the details accurate for wedding and event days. We tell you at the start of the call. If you would rather we not record a call, or you want us to delete a recording, email events@xpressdjs.com and we will review your request.',
        },
        {
          type: 'p',
          lead: 'Clipboard.',
          text: 'When you open the app, it checks your clipboard once for an event join link so it can offer to join for you. Nothing happens unless you tap to join.',
        },
        {
          type: 'p',
          lead: 'Technical and security information.',
          text: 'Our servers and providers keep standard request logs. Failed join attempts are logged with IP address, user ID and a scrambled (hashed) copy of the code tried, so we can stop abuse.',
        },
        {
          type: 'p',
          text: 'We do not use advertising or cross-app tracking tools, and we do not sell your personal information.',
        },
      ],
    },
    {
      heading: '3. How we use it',
      blocks: [
        { type: 'p', text: 'We use your information to:' },
        {
          type: 'ul',
          items: [
            'sign you in and connect you to the right event',
            'save and share planning details with the people on your event and our staff',
            'prepare for and perform the services you booked',
            'record and transcribe phone calls and meetings with clients so we can keep the details accurate for wedding and event days',
            'show booking details to the event host when that is turned on',
            'send invitations, sign-in codes, password reset emails and messages about your booking',
            'send marketing texts, only if you turn on Promotional texts in the app (see section 6)',
            'answer support requests and reports, and keep the app secure',
          ],
        },
        {
          type: 'p',
          text: 'We only use your information for the purpose we collected it for, unless we ask you first or the law allows it.',
        },
      ],
    },
    {
      heading: '4. Who can see your information',
      blocks: [
        {
          type: 'p',
          lead: 'People on your event.',
          text: "Planning is shared. Hosts and our staff can see the event's planning content. Guests can see and add to the sections the host opens to them. Payment details, host-only notes and planner files are limited to hosts and staff.",
        },
        {
          type: 'p',
          lead: 'Cover photos.',
          text: "Cover photos are stored at a web address that anyone with the link can open. Please don't use a cover photo for anything private.",
        },
        {
          type: 'p',
          lead: 'Service providers.',
          text: 'We use the companies below to run the app and our services. They get only what they need to do their job.',
        },
        {
          type: 'table',
          columns: ['What they do', 'Provider'],
          rows: [
            ['Accounts, sign-in, database and file storage', 'Supabase'],
            ['Sign in with Apple and Google Sign-In', 'Apple, Google'],
            ['Invitation, sign-in code and password reset emails', 'Mailgun'],
            ['Text messages and contact records', 'HighLevel'],
            ['Music search, song art, previews and playlist links', 'Apple Music and iTunes Search (Apple), Spotify, YouTube (Google)'],
            ['Photo booth design catalog', 'TemplatesBooth'],
            ['App updates', 'Expo'],
            ['Website and server hosting', 'Netlify'],
            ['Staff AI tools (section 7)', 'OpenAI'],
            ['Recordings and transcripts of client calls and meetings', 'Fireflies'],
          ],
        },
        {
          type: 'p',
          text: 'For music search, the app sends only your search words, or the public playlist or video link you paste. It does not connect to your personal music account.',
        },
        {
          type: 'p',
          lead: 'Equal protection.',
          text: 'Every provider that receives personal information from us is bound by its terms or a data processing agreement to protect that information at least as well as this policy does, and to use it only to provide its service to us.',
        },
        {
          type: 'p',
          lead: 'Legal reasons.',
          text: 'We may share information if the law requires it, to answer a valid legal request, or to protect people from fraud, abuse or harm.',
        },
      ],
    },
    {
      heading: '5. How long we keep it',
      blocks: [
        {
          type: 'ul',
          items: [
            {
              lead: 'Your login and account:',
              text: 'kept while your account is open. When you delete your account, your login is removed right away. Related sign-in records are removed within 30 days.',
            },
            {
              lead: 'Event records, including booking agreement and payment records:',
              text: 'kept for the life of the business.',
            },
            {
              lead: 'Event planning content',
              text: '(answers, songs, notes, song ideas, timeline, cover photo, planner files): kept for 7 years after the event date, then deleted.',
            },
            {
              lead: 'Guest records and invitation records:',
              text: 'kept for 7 years after the event date, then deleted. If a guest or invitation record is part of the event record, it is kept with that record.',
            },
            {
              lead: 'Marketing text consent records',
              text: '(your choice, the date and the wording you saw): kept while texts are on and for 5 years after you turn them off, as proof of consent.',
            },
            {
              lead: 'Content reports and blocks:',
              text: 'kept for 2 years after the report is closed.',
            },
            {
              lead: 'Security and request logs, including failed join attempts:',
              text: 'kept for up to 90 days.',
            },
            {
              lead: 'Backups:',
              text: 'deleted information can stay in encrypted backups for up to 30 days before it is overwritten.',
            },
          ],
        },
        {
          type: 'p',
          text: 'We may keep information longer if the law requires it or to resolve a dispute.',
        },
      ],
    },
    {
      heading: '6. Marketing texts',
      blocks: [
        {
          type: 'p',
          text: 'Marketing texts are sent only if you turn on Promotional texts in the app. They go to the US mobile number already on your booking. Turning this on is not required to book with us or to use the app.',
        },
        {
          type: 'p',
          text: 'If you turn them on, you agree to get recurring automated marketing texts from Xpress Entertainment about offers and extras. Message frequency varies. Message and data rates may apply. You can turn them off at any time in the app, or by replying STOP. Reply HELP for help.',
        },
        {
          type: 'p',
          text: 'Texts about your booking or event are separate from marketing texts.',
        },
      ],
    },
    {
      heading: '7. AI tools used by our staff',
      blocks: [
        {
          type: 'p',
          text: 'The app does not have AI features for couples or guests. Xpress uses AI tools such as OpenAI to help plan and run events. These tools can use event and planning details, such as names, venue, planning answers, songs, notes and call transcripts.',
        },
        {
          type: 'p',
          text: 'By booking with Xpress, you accept that we use these AI tools to process information about your event.',
        },
        {
          type: 'p',
          text: 'Our AI provider does not use this information to train its models.',
        },
      ],
    },
    {
      heading: '8. Deleting your account',
      blocks: [
        {
          type: 'p',
          text: 'You can delete your account in the app: open the My Event tab and tap Delete account. You can also email events@xpressdjs.com.',
        },
        {
          type: 'p',
          lead: 'What is deleted:',
          text: "your login, your app account record, your event memberships, and your device records. If you used Sign in with Apple, we also ask Apple to revoke the app's access.",
        },
        {
          type: 'p',
          lead: 'What stays with the booking:',
          text: "the event's planning details, the guest list, and booking agreement and payment records. Your DJ needs them to perform the event, and some are required by law. These are kept for the periods in section 5.",
        },
        {
          type: 'p',
          text: 'Deleting your account does not cancel your event or change what you owe under your booking agreement. To ask us to remove other information we still hold, email drew@xpressdjs.com.',
        },
      ],
    },
    {
      heading: '9. Your choices and rights',
      blocks: [
        { type: 'p', text: 'You can:' },
        {
          type: 'ul',
          items: [
            'skip optional information, like social handles',
            'turn Promotional texts on or off at any time',
            'delete your account in the app',
            'ask us for a copy of your information, or ask us to correct or delete it',
            'ask us not to record a call, or to delete a recording, by emailing events@xpressdjs.com',
            'withdraw any consent you gave, such as for marketing texts',
          ],
        },
        {
          type: 'p',
          text: 'Email drew@xpressdjs.com to make a privacy request. We may need to confirm who you are and how you are connected to the event first. Depending on where you live, you may have other rights under local law, and we will honor them. Withdrawing consent stops future use. It does not undo what already happened.',
        },
      ],
    },
    {
      heading: '10. Children',
      blocks: [
        {
          type: 'p',
          text: 'The app is for people 18 and older. It is not meant for children, and we do not knowingly collect information from anyone under 18. If you think a child has given us information, email drew@xpressdjs.com and we will delete it.',
        },
      ],
    },
    {
      heading: '11. Security',
      blocks: [
        {
          type: 'p',
          text: "We use encrypted connections, access controls by role, and private storage for planner files. No system is perfectly secure, so please don't put passwords, card numbers, ID numbers or other sensitive details in planning fields or uploads.",
        },
      ],
    },
    {
      heading: '12. Where your information is processed',
      blocks: [
        {
          type: 'p',
          text: 'We are based in the United States, and our providers process information in the United States.',
        },
      ],
    },
    {
      heading: '13. Changes to this policy',
      blocks: [
        {
          type: 'p',
          text: 'If we change this policy, we will update the effective date at the top and show the new version in the app. If a change means using your information in a new way that needs your permission, we will ask first.',
        },
      ],
    },
    {
      heading: '14. Contact us',
      blocks: [
        {
          type: 'ul',
          items: [
            'Privacy questions and requests: drew@xpressdjs.com',
            'App help, event access, content reports and recording deletion requests: events@xpressdjs.com',
            'Mail: Xpress Entertainment Corp, 11280 Pines Blvd, Pembroke Pines FL 33026',
          ],
        },
      ],
    },
  ],
};

const privacyEs: LegalDocument = {
  title: 'Política de privacidad',
  preamble: [
    'Xpress Entertainment Corp, 11280 Pines Blvd, Pembroke Pines FL 33026',
    'Fecha de entrada en vigor: 1 de septiembre de 2026',
  ],
  sections: [
    {
      heading: '1. Quiénes somos',
      blocks: [
        {
          type: 'p',
          text: 'Xpress Entertainment Corp ("Xpress", "nosotros") ofrece la aplicación Xpress DJs. Las parejas y sus invitados la usan para planificar la música y el programa de un evento en el que estamos contratados. Esta política explica qué información manejan la aplicación y nuestras herramientas internas, para qué la usamos, quién nos ayuda a manejarla, cuánto tiempo la conservamos y qué opciones tiene usted.',
        },
        {
          type: 'p',
          text: 'Nuestro acuerdo de reserva, nuestros sitios web y cualquier servicio de pago fuera de la aplicación pueden tener sus propios avisos.',
        },
      ],
    },
    {
      heading: '2. Información que recopilamos',
      blocks: [
        {
          type: 'p',
          lead: 'Su cuenta.',
          text: 'Su correo electrónico, su contraseña (la guarda nuestro proveedor de inicio de sesión de forma protegida y nosotros nunca la vemos), los identificadores de cuenta y de inicio de sesión, su evento y su rol en él (anfitrión, invitado o personal), y su nombre si usted lo indica o si su proveedor de inicio de sesión lo comparte. Si usa Iniciar sesión con Apple, Apple puede darnos una dirección de correo privada en lugar de la suya.',
        },
        {
          type: 'p',
          lead: 'Registros de la reserva.',
          text: 'Para los eventos contratados ya tenemos registros como nombres, teléfono, correo, dirección postal, fecha y lugar del evento, paquete, extras, cargos, descuentos, pagos, calendario de pagos, notas y sus preferencias sobre mensajes de texto. La aplicación puede mostrar parte de esto al anfitrión del evento. Los datos de pago solo se muestran en modo de lectura y solo cuando están activados para ese evento. Los invitados nunca los ven.',
        },
        {
          type: 'p',
          lead: 'Lo que usted agrega al planificar.',
          text: 'Respuestas a las preguntas de planificación, canciones que agrega o sugiere, canciones imprescindibles y canciones que no se deben tocar, "me gusta", notas, ideas de canciones, decisiones del programa, elecciones de la cabina de fotos y quién agregó cada elemento.',
        },
        {
          type: 'p',
          lead: 'Fotos y archivos.',
          text: 'Si un anfitrión o alguien de nuestro equipo elige una foto de portada para el evento, la aplicación pide acceso a su fototeca para que usted pueda escogerla. Se pueden subir archivos PDF e imágenes del organizador para el personal y los anfitriones.',
        },
        {
          type: 'p',
          lead: 'Invitaciones.',
          text: 'Cuando un anfitrión invita a alguien, usamos el nombre, el correo y la relación de esa persona con el evento para enviar la invitación.',
        },
        {
          type: 'p',
          lead: 'Redes sociales opcionales.',
          text: 'Si usted decide darlos, sus usuarios de Instagram y TikTok. Puede omitir este paso.',
        },
        {
          type: 'p',
          lead: 'Grabaciones de llamadas.',
          text: 'Grabamos y transcribimos las llamadas telefónicas y las reuniones con los clientes para mantener la exactitud de los detalles en los días de bodas y eventos. Se lo indicamos a usted al inicio de la llamada. Si usted prefiere que no grabemos una llamada, o si desea que borremos una grabación, escriba a events@xpressdjs.com y revisaremos su solicitud.',
        },
        {
          type: 'p',
          lead: 'Portapapeles.',
          text: 'Al abrir la aplicación, esta revisa una vez su portapapeles para ver si hay un enlace para unirse a un evento y ofrecerle unirse. No pasa nada a menos que usted toque para unirse.',
        },
        {
          type: 'p',
          lead: 'Información técnica y de seguridad.',
          text: 'Nuestros servidores y proveedores guardan registros normales de solicitudes. Los intentos fallidos de unirse a un evento se registran con la dirección IP, el identificador de usuario y una copia cifrada (hash) del código usado, para poder frenar abusos.',
        },
        {
          type: 'p',
          text: 'No usamos herramientas de publicidad ni de seguimiento entre aplicaciones, y no vendemos su información personal.',
        },
      ],
    },
    {
      heading: '3. Cómo la usamos',
      blocks: [
        { type: 'p', text: 'Usamos su información para:' },
        {
          type: 'ul',
          items: [
            'iniciar su sesión y conectarle con el evento correcto',
            'guardar y compartir los detalles de planificación con las personas de su evento y nuestro equipo',
            'preparar y prestar los servicios contratados',
            'grabar y transcribir las llamadas telefónicas y las reuniones con los clientes para mantener la exactitud de los detalles en los días de bodas y eventos',
            'mostrar los datos de la reserva al anfitrión cuando esa opción está activada',
            'enviar invitaciones, códigos de inicio de sesión, correos para restablecer la contraseña y mensajes sobre su reserva',
            'enviar mensajes de texto de marketing, solo si usted activa Mensajes promocionales en la aplicación (vea la sección 6)',
            'responder solicitudes de ayuda y reportes, y mantener la aplicación segura',
          ],
        },
        {
          type: 'p',
          text: 'Solo usamos su información para el fin con el que la recopilamos, salvo que le pidamos permiso antes o que la ley lo permita.',
        },
      ],
    },
    {
      heading: '4. Quién puede ver su información',
      blocks: [
        {
          type: 'p',
          lead: 'Las personas de su evento.',
          text: 'La planificación es compartida. Los anfitriones y nuestro equipo pueden ver el contenido de planificación del evento. Los invitados pueden ver y aportar en las secciones que el anfitrión les abra. Los datos de pago, las notas solo para anfitriones y los archivos del organizador están limitados a los anfitriones y al personal.',
        },
        {
          type: 'p',
          lead: 'Fotos de portada.',
          text: 'Las fotos de portada se guardan en una dirección web que cualquier persona con el enlace puede abrir. Por favor, no use una foto de portada para nada privado.',
        },
        {
          type: 'p',
          lead: 'Proveedores de servicios.',
          text: 'Usamos las siguientes empresas para operar la aplicación y nuestros servicios. Cada una recibe solo lo que necesita para hacer su trabajo.',
        },
        {
          type: 'table',
          columns: ['Qué hacen', 'Proveedor'],
          rows: [
            ['Cuentas, inicio de sesión, base de datos y almacenamiento de archivos', 'Supabase'],
            ['Iniciar sesión con Apple e inicio de sesión con Google', 'Apple, Google'],
            ['Correos de invitación, códigos de inicio de sesión y restablecimiento de contraseña', 'Mailgun'],
            ['Mensajes de texto y registros de contacto', 'HighLevel'],
            ['Búsqueda de música, portadas, muestras y enlaces de listas', 'Apple Music e iTunes Search (Apple), Spotify, YouTube (Google)'],
            ['Catálogo de diseños de la cabina de fotos', 'TemplatesBooth'],
            ['Actualizaciones de la aplicación', 'Expo'],
            ['Alojamiento del sitio web y del servidor', 'Netlify'],
            ['Herramientas de IA del personal (sección 7)', 'OpenAI'],
            ['Grabaciones y transcripciones de llamadas y reuniones con clientes', 'Fireflies'],
          ],
        },
        {
          type: 'p',
          text: 'Para buscar música, la aplicación envía solo las palabras que usted busca, o el enlace público de la lista o del video que pegue. No se conecta a su cuenta personal de música.',
        },
        {
          type: 'p',
          lead: 'Protección equivalente.',
          text: 'Todo proveedor que recibe información personal de nosotros está obligado, por sus condiciones o por un acuerdo de tratamiento de datos, a protegerla al menos tanto como lo hace esta política y a usarla solo para prestarnos su servicio.',
        },
        {
          type: 'p',
          lead: 'Motivos legales.',
          text: 'Podemos compartir información si la ley lo exige, para responder a una solicitud legal válida o para proteger a las personas contra fraudes, abusos o daños.',
        },
      ],
    },
    {
      heading: '5. Cuánto tiempo la conservamos',
      blocks: [
        {
          type: 'ul',
          items: [
            {
              lead: 'Su inicio de sesión y su cuenta:',
              text: 'se conservan mientras su cuenta esté abierta. Cuando usted elimina su cuenta, su acceso se borra de inmediato. Los registros relacionados con el inicio de sesión se borran en un plazo de 30 días.',
            },
            {
              lead: 'Registros del evento, incluidos los registros del acuerdo de reserva y de los pagos:',
              text: 'se conservan durante la vida del negocio.',
            },
            {
              lead: 'Contenido de planificación del evento',
              text: '(respuestas, canciones, notas, ideas de canciones, programa, foto de portada, archivos del organizador): se conserva durante 7 años después de la fecha del evento y luego se borra.',
            },
            {
              lead: 'Registros de invitados y de invitaciones:',
              text: 'se conservan durante 7 años después de la fecha del evento y luego se borran. Si un registro de invitado o de invitación forma parte del registro del evento, se conserva junto con ese registro.',
            },
            {
              lead: 'Registros del consentimiento para mensajes de marketing',
              text: '(su elección, la fecha y el texto que usted vio): se conservan mientras los mensajes estén activados y durante 5 años después de desactivarlos, como prueba del consentimiento.',
            },
            {
              lead: 'Reportes de contenido y bloqueos:',
              text: 'se conservan durante 2 años después de cerrar el reporte.',
            },
            {
              lead: 'Registros de seguridad y de solicitudes, incluidos los intentos fallidos de unirse:',
              text: 'se conservan hasta 90 días.',
            },
            {
              lead: 'Copias de seguridad:',
              text: 'la información borrada puede permanecer en copias de seguridad cifradas hasta 30 días antes de sobrescribirse.',
            },
          ],
        },
        {
          type: 'p',
          text: 'Podemos conservar información por más tiempo si la ley lo exige o para resolver un conflicto.',
        },
      ],
    },
    {
      heading: '6. Mensajes de texto de marketing',
      blocks: [
        {
          type: 'p',
          text: 'Los mensajes de texto de marketing se envían solo si usted activa Mensajes promocionales en la aplicación. Se envían al celular de EE. UU. que ya figura en su reserva. Activarlos no es necesario para contratarnos ni para usar la aplicación.',
        },
        {
          type: 'p',
          text: 'Si los activa, acepta recibir mensajes de texto automatizados y recurrentes de marketing de Xpress Entertainment sobre ofertas y extras. La frecuencia de los mensajes varía. Pueden aplicar tarifas de mensajes y datos. Puede desactivarlos en cualquier momento en la aplicación, o respondiendo STOP. Responda HELP para recibir ayuda.',
        },
        {
          type: 'p',
          text: 'Los mensajes sobre su reserva o su evento son distintos de los mensajes de marketing.',
        },
      ],
    },
    {
      heading: '7. Herramientas de IA que usa nuestro equipo',
      blocks: [
        {
          type: 'p',
          text: 'La aplicación no tiene funciones de IA para parejas ni invitados. Xpress usa herramientas de IA, como OpenAI, para ayudar a planificar y realizar los eventos. Estas herramientas pueden usar datos del evento y de la planificación, como nombres, lugar, respuestas, canciones, notas y transcripciones de llamadas.',
        },
        {
          type: 'p',
          text: 'Al contratarnos, usted acepta que usemos estas herramientas de IA para tratar la información de su evento.',
        },
        {
          type: 'p',
          text: 'Nuestro proveedor de IA no usa esta información para entrenar sus modelos.',
        },
      ],
    },
    {
      heading: '8. Eliminar su cuenta',
      blocks: [
        {
          type: 'p',
          text: 'Puede eliminar su cuenta en la aplicación: abra la pestaña Mi evento y toque Eliminar cuenta. También puede escribir a events@xpressdjs.com.',
        },
        {
          type: 'p',
          lead: 'Lo que se elimina:',
          text: 'su acceso, el registro de su cuenta en la aplicación, su pertenencia a eventos y los registros de su dispositivo. Si usó Iniciar sesión con Apple, también le pedimos a Apple que revoque el acceso de la aplicación.',
        },
        {
          type: 'p',
          lead: 'Lo que se queda con la reserva:',
          text: 'los detalles de planificación del evento, la lista de invitados y los registros del acuerdo de reserva y de los pagos. Su DJ los necesita para realizar el evento, y algunos los exige la ley. Se conservan durante los plazos de la sección 5.',
        },
        {
          type: 'p',
          text: 'Eliminar su cuenta no cancela su evento ni cambia lo que usted debe según su acuerdo de reserva. Para pedirnos que borremos otra información que todavía tengamos, escriba a drew@xpressdjs.com.',
        },
      ],
    },
    {
      heading: '9. Sus opciones y derechos',
      blocks: [
        { type: 'p', text: 'Usted puede:' },
        {
          type: 'ul',
          items: [
            'omitir información opcional, como sus redes sociales',
            'activar o desactivar Mensajes promocionales en cualquier momento',
            'eliminar su cuenta en la aplicación',
            'pedirnos una copia de su información, o pedirnos que la corrijamos o la borremos',
            'pedirnos que no grabemos una llamada, o que borremos una grabación, escribiendo a events@xpressdjs.com',
            'retirar cualquier consentimiento que haya dado, por ejemplo para mensajes de marketing',
          ],
        },
        {
          type: 'p',
          text: 'Escriba a drew@xpressdjs.com para hacer una solicitud de privacidad. Puede que primero necesitemos confirmar su identidad y su relación con el evento. Según el lugar donde viva, puede tener otros derechos según la ley local, y los respetaremos. Retirar un consentimiento detiene el uso futuro. No deshace lo que ya ocurrió.',
        },
      ],
    },
    {
      heading: '10. Menores de edad',
      blocks: [
        {
          type: 'p',
          text: 'La aplicación es para personas de 18 años o más. No está pensada para menores, y no recopilamos a sabiendas información de menores de 18 años. Si cree que un menor nos ha dado información, escriba a drew@xpressdjs.com y la borraremos.',
        },
      ],
    },
    {
      heading: '11. Seguridad',
      blocks: [
        {
          type: 'p',
          text: 'Usamos conexiones cifradas, controles de acceso según el rol y almacenamiento privado para los archivos del organizador. Ningún sistema es totalmente seguro, así que le pedimos que no ponga contraseñas, números de tarjeta, números de identificación ni otros datos delicados en los campos de planificación ni en los archivos que suba.',
        },
      ],
    },
    {
      heading: '12. Dónde se trata su información',
      blocks: [
        {
          type: 'p',
          text: 'Estamos en los Estados Unidos, y nuestros proveedores tratan la información en los Estados Unidos.',
        },
      ],
    },
    {
      heading: '13. Cambios en esta política',
      blocks: [
        {
          type: 'p',
          text: 'Si cambiamos esta política, actualizaremos la fecha de entrada en vigor al principio y mostraremos la nueva versión en la aplicación. Si un cambio implica usar su información de una forma nueva que requiera su permiso, se lo pediremos antes.',
        },
      ],
    },
    {
      heading: '14. Contacto',
      blocks: [
        {
          type: 'ul',
          items: [
            'Preguntas y solicitudes de privacidad: drew@xpressdjs.com',
            'Ayuda con la aplicación, acceso a eventos, reportes de contenido y solicitudes para borrar grabaciones: events@xpressdjs.com',
            'Correo postal: Xpress Entertainment Corp, 11280 Pines Blvd, Pembroke Pines FL 33026',
          ],
        },
      ],
    },
  ],
};

const termsEn: LegalDocument = {
  title: 'Terms of Use',
  sections: [
    {
      heading: '1. Agreement and operator',
      body: 'These Terms govern use of the Xpress client event-planning app provided by Xpress Entertainment Corp, 11280 Pines Blvd, Pembroke Pines FL 33026. They cover app access and planning features, not a new contract for DJ or event services. Your existing booking agreement controls service pricing, payment obligations, refunds, cancellation, rescheduling and the scope of the booked services. These Terms do not replace that agreement or create new cancellation fees.',
    },
    {
      heading: '2. Eligibility and access',
      body: 'The app is intended for people 18 or older who are authorized to participate in an event. Use your own account and accurate information. Keep email/password credentials secure and do not share another person’s login. Email/password, Google and Apple are sign-in options. Event membership and the host’s section settings determine available features. An invitation is permission to participate in the relevant event, not ownership of its records or permission to access another event. Tell events@xpressdjs.com if you believe an account or invitation is being misused.',
    },
    {
      heading: '3. Planning and booking records',
      body: 'Use the app to coordinate answers, song requests, preferences, notes and supported attachments. Shared sections are visible to other authorized participants and staff. Hosts may see read-only booking and financial records when enabled; guests are not offered those host financial views. Song suggestions, notes and app displays do not by themselves change a signed booking agreement or guarantee a particular song, sequence or service. Confirm important contractual changes directly with the event team. The app does not sell an app subscription, accept card checkout or provide in-app purchases.',
    },
    {
      heading: '4. Your content and limited permission',
      body: 'You keep any rights you have in the content you contribute. You give Xpress permission to store, reproduce, display and share that content only as reasonably needed to operate the planning service, collaborate with authorized participants and prepare or provide your event services, subject to the Privacy Policy. This is not a general license to sell your content, use it in public advertising, or train AI models. Only upload materials you have the right to provide and share. Obtain appropriate permission before providing other people’s information, photographs or documents.',
    },
    {
      heading: '5. Appropriate use and reports',
      body: 'Do not post unlawful, threatening, harassing, hateful, exploitative, sexually abusive or infringing content; impersonate someone; spam invitations; upload malicious files; probe accounts or storage without authorization; or try to bypass event roles or security. Do not expose another person’s confidential information. Send content or access concerns to events@xpressdjs.com with the event and enough detail to identify the issue, without forwarding unnecessary sensitive material. Xpress may review reports and restrict access or remove content to address misuse, safety, rights or legal requirements. You may not post anything unlawful, hateful, harassing, or spam. Anyone on the event can report content or a person. Hosts can remove guest content and remove guests. Xpress can remove content that breaks these terms.',
    },
    {
      heading: '6. Photos, documents and music',
      body: 'Cover photos use public URLs and must not contain confidential material. Planner PDFs and images use separate private storage and are intended for authorized hosts and staff. Supported planner uploads are limited to 25 MB per file. Music search and public-link features rely on external catalogs and do not connect your personal music-service account. This app is for planning, not full-song streaming or transferring music ownership or performance rights. Third-party content, availability and links can change, and the providers’ terms apply to their services.',
    },
    {
      heading: '7. Communications and privacy',
      body: 'We use account, event and planning information as described in the Privacy Policy. Invitations and booking or account communications are distinct from optional marketing. Marketing SMS permission must be separate and optional, not a condition of using planning or accepting these Terms. Optional social handles can be skipped. Staff AI tools used to plan and run events are described in the Privacy Policy.',
    },
    {
      heading: '8. Availability and responsible reliance',
      body: 'The app and external services may have interruptions, errors or changes. Keep your own copies of important documents and confirm event-critical details with our team. Nothing here promises uninterrupted availability or that every displayed record is error-free. Nothing in these Terms excludes a responsibility or consumer right that cannot lawfully be excluded.',
    },
    {
      heading: '9. Ending access and deletion',
      body: 'You may stop using the app and initiate account deletion within it. Login deletion removes access but currently leaves separate booking and event data as explained in the deletion notice. It does not cancel your event, extinguish payment obligations or cancel a booking agreement. You can separately request review or removal of retained personal information. Applicable statutory rights continue to apply. Access may be restricted to address misuse or security needs, but doing so does not determine rights under the booking agreement.',
    },
    {
      heading: '10. Updates and contact',
      body: 'Approved changes to these Terms will be identified by their effective date when published and made available in the app. Additional permissions for optional marketing will be requested when required; continued use is not a substitute for that optional consent. App and content support: events@xpressdjs.com. Privacy: drew@xpressdjs.com. Postal contact: Xpress Entertainment Corp, 11280 Pines Blvd, Pembroke Pines FL 33026.',
    },
  ],
};

const termsEs: LegalDocument = {
  title: 'Condiciones de uso',
  sections: [
    {
      heading: '1. Acuerdo y entidad responsable',
      body: 'Estas Condiciones regulan el uso de la aplicación de planificación de eventos para clientes ofrecida por Xpress Entertainment Corp, 11280 Pines Blvd, Pembroke Pines FL 33026. Se refieren al acceso y a las funciones de planificación, no a un nuevo contrato de servicios de DJ o eventos. Su contrato de reserva existente regula precios, obligaciones de pago, reembolsos, cancelación, cambios de fecha y alcance de los servicios contratados. Estas Condiciones no lo sustituyen ni crean nuevas penalizaciones por cancelación.',
    },
    {
      heading: '2. Requisitos y acceso',
      body: 'La aplicación está destinada a personas de al menos 18 años autorizadas a participar en un evento. Utilice su propia cuenta y datos correctos. Proteja sus credenciales de correo y contraseña y no comparta el acceso de otra persona. Puede iniciar sesión con correo y contraseña, Google o Apple. La pertenencia al evento y la configuración de secciones del anfitrión determinan las funciones disponibles. Una invitación permite participar en ese evento, pero no otorga propiedad sobre sus registros ni acceso a otros eventos. Avise a events@xpressdjs.com si cree que se está utilizando indebidamente una cuenta o invitación.',
    },
    {
      heading: '3. Planificación y registros de reserva',
      body: 'Utilice la aplicación para coordinar respuestas, solicitudes de canciones, preferencias, notas y archivos admitidos. Las secciones compartidas son visibles para los demás participantes autorizados y el personal. Los anfitriones pueden consultar registros de reserva y financieros de solo lectura cuando estén habilitados; esas vistas financieras del anfitrión no se ofrecen a invitados. Las canciones sugeridas, notas y pantallas no modifican por sí mismas un contrato firmado ni garantizan una canción, secuencia o servicio concreto. Confirme directamente con el equipo los cambios contractuales importantes. La aplicación no vende una suscripción propia, no admite pagos con tarjeta ni ofrece compras dentro de la aplicación.',
    },
    {
      heading: '4. Su contenido y autorización limitada',
      body: 'Usted conserva los derechos que tenga sobre el contenido que aporta. Autoriza a Xpress a almacenar, reproducir, mostrar y compartir ese contenido únicamente en la medida razonablemente necesaria para operar la planificación, colaborar con participantes autorizados y preparar o prestar los servicios del evento, con sujeción a la Política de privacidad. No es una licencia general para vender su contenido, usarlo en publicidad pública o entrenar modelos de IA. Suba solo materiales que tenga derecho a facilitar y compartir. Obtenga los permisos adecuados antes de aportar datos, fotos o documentos de otras personas.',
    },
    {
      heading: '5. Uso adecuado y avisos',
      body: 'No publique contenido ilícito, amenazante, de acoso, de odio, de explotación, de abuso sexual o que infrinja derechos; no suplante identidades; no envíe invitaciones masivas no deseadas; no suba archivos maliciosos; no explore cuentas o almacenamiento sin autorización; ni intente eludir roles o seguridad. No exponga información confidencial ajena. Informe de problemas de contenido o acceso a events@xpressdjs.com, indicando el evento y detalles suficientes para identificar el problema, sin reenviar material sensible innecesario. Xpress podrá revisar avisos y restringir accesos o retirar contenido para abordar usos indebidos, seguridad, derechos u obligaciones legales. No publiques nada ilegal, de odio, acosador o spam. Cualquier persona en el evento puede reportar contenido o a una persona. Los anfitriones pueden quitar el contenido de los invitados y quitar invitados. Xpress puede quitar el contenido que incumpla estos términos.',
    },
    {
      heading: '6. Fotos, documentos y música',
      body: 'Las portadas utilizan URL públicas y no deben contener material confidencial. Los PDF y las imágenes del planificador usan almacenamiento privado separado y están destinados a anfitriones autorizados y personal. Los archivos del planificador admitidos tienen un máximo de 25 MB cada uno. Las búsquedas de música y los enlaces públicos dependen de catálogos externos y no conectan su cuenta personal de música. La aplicación sirve para planificar, no para reproducir canciones completas ni transferir derechos de propiedad o ejecución musical. El contenido, la disponibilidad y los enlaces de terceros pueden cambiar, y a sus servicios se aplican sus propias condiciones.',
    },
    {
      heading: '7. Comunicaciones y privacidad',
      body: 'Utilizamos los datos de cuenta, evento y planificación según la Política de privacidad. Las invitaciones y comunicaciones de reserva o cuenta son distintas del marketing opcional. La autorización de SMS de marketing debe ser separada y opcional, no una condición para planificar o aceptar estas Condiciones. Puede omitir las redes sociales opcionales. Las herramientas de IA del personal usadas para planificar y realizar eventos se describen en la Política de privacidad.',
    },
    {
      heading: '8. Disponibilidad y uso responsable',
      body: 'La aplicación y los servicios externos pueden sufrir interrupciones, errores o cambios. Conserve sus propias copias de documentos importantes y confirme con nuestro equipo los detalles esenciales del evento. Estas Condiciones no prometen disponibilidad ininterrumpida ni ausencia de errores en todos los registros mostrados. No excluyen ninguna responsabilidad ni derecho del consumidor que no pueda excluirse legalmente.',
    },
    {
      heading: '9. Fin del acceso y eliminación',
      body: 'Puede dejar de usar la aplicación e iniciar la eliminación de su cuenta dentro de ella. Eliminar el acceso impide entrar, pero actualmente deja datos separados de reserva y evento según el aviso de eliminación. No cancela su evento, extingue obligaciones de pago ni cancela el contrato de reserva. Puede solicitar por separado la revisión o eliminación de datos personales conservados. Sus derechos legales siguen vigentes. El acceso puede restringirse por uso indebido o seguridad, pero esto no determina los derechos derivados del contrato de reserva.',
    },
    {
      heading: '10. Cambios y contacto',
      body: 'Los cambios aprobados se identificarán mediante su fecha de entrada en vigor al publicarse y ponerse a disposición en la aplicación. Se solicitará el permiso adicional para el marketing opcional cuando proceda; seguir usando la aplicación no sustituye ese consentimiento opcional. Soporte y avisos de contenido: events@xpressdjs.com. Privacidad: drew@xpressdjs.com. Dirección postal: Xpress Entertainment Corp, 11280 Pines Blvd, Pembroke Pines FL 33026.',
    },
  ],
};

const deletionEn: LegalDocument = {
  title: 'Account deletion',
  sections: [
    {
      heading: 'Deleting your account',
      body: 'Deleting your account removes your login and access to the app. Your event\'s planning details, guest information, contract and payment records stay with your booking so your DJ can perform the event and as required by law. Guest records, names, and authorship stay as they are. Staff accounts are not deleted from this app.',
    },
  ],
};

const deletionEs: LegalDocument = {
  title: 'Eliminación de cuenta',
  sections: [
    {
      heading: 'Eliminar su cuenta',
      body: 'Eliminar su cuenta quita su acceso y el uso de la aplicación. Los detalles de planificación de su evento, la información de los invitados y los registros del contrato y de los pagos permanecen con su reserva para que su DJ pueda realizar el evento y según exige la ley. Los registros de invitados, los nombres y la autoría permanecen como están. Las cuentas del personal no se eliminan desde esta aplicación.',
    },
  ],
};

const docs: Record<Locale, Record<LegalDoc, LegalDocument>> = {
  en: { privacy: privacyEn, terms: termsEn, deletion: deletionEn },
  es: { privacy: privacyEs, terms: termsEs, deletion: deletionEs },
};

export function legalDocument(doc: LegalDoc, locale: Locale): LegalDocument {
  return docs[locale][doc];
}

function listItemText(item: LegalListItem): string {
  return typeof item === 'string' ? item : `${item.lead} ${item.text}`.replace(/\s+/g, ' ').trim();
}

/** Flatten a document for tests and plain-text checks. */
export function legalPlainText(doc: LegalDocument): string {
  const parts: string[] = [...(doc.preamble ?? [])];
  for (const section of doc.sections) {
    parts.push(section.heading);
    if (section.body) parts.push(section.body);
    for (const block of section.blocks ?? []) {
      if (block.type === 'p') {
        parts.push(block.lead ? `${block.lead} ${block.text}` : block.text);
      } else if (block.type === 'ul') {
        for (const item of block.items) parts.push(listItemText(item));
      } else {
        parts.push(block.columns.join(' | '));
        for (const row of block.rows) parts.push(row.join(' | '));
      }
    }
  }
  return parts.join('\n');
}
