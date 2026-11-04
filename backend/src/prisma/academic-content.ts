import type {
  CalloutVariant,
  LabActivity,
  LabContent,
  TheoryBlock,
  TheoryContent,
} from '../domain/lesson-content.js';
import type { LessonType } from '../domain/lesson.js';

/**
 * Contenido académico inicial de UniCyber Academy.
 *
 * Se mantiene separado del script de carga para que el material pueda
 * revisarse y editarse sin tocar la lógica de persistencia. Las lecciones se
 * crean como DRAFT y nunca se publican automáticamente.
 */

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

type TheoryBlockInput = DistributiveOmit<TheoryBlock, 'id'>;

function theory(...blocks: TheoryBlockInput[]): TheoryContent {
  return {
    schemaVersion: 1,
    blocks: blocks.map((block, index) => ({
      ...block,
      id: `b${index + 1}`,
    })) as TheoryBlock[],
  };
}

export interface AcademicLesson {
  title: string;
  type: LessonType;
  content: TheoryContent | LabContent;
}

export interface AcademicModule {
  title: string;
  description: string;
  lessons: AcademicLesson[];
}

export interface AcademicCourse {
  title: string;
  description: string;
  modules: AcademicModule[];
}

interface TheoryLessonOptions {
  variant?: CalloutVariant;
  listStyle?: 'ordered' | 'unordered';
  table?: {
    headers: string[];
    rows: string[][];
    caption?: string;
  };
}

function theoryLesson(
  title: string,
  heading: string,
  paragraphs: string[],
  items: string[],
  callout: string,
  options: TheoryLessonOptions = {},
): AcademicLesson {
  const blocks: TheoryBlockInput[] = [
    { type: 'heading', content: heading, level: 2 },
    ...paragraphs.map((paragraph) => ({
      type: 'paragraph' as const,
      content: paragraph,
    })),
    {
      type: 'list',
      style: options.listStyle ?? 'unordered',
      items,
    },
    ...(options.table
      ? [
          {
            type: 'table' as const,
            headers: options.table.headers,
            rows: options.table.rows,
            caption: options.table.caption,
          },
        ]
      : []),
    {
      type: 'callout',
      variant: options.variant ?? 'IMPORTANT',
      content: callout,
    },
  ];

  return { title, type: 'THEORY', content: theory(...blocks) };
}

function laboratoryLesson(
  title: string,
  introduction: string,
  objective: string,
  scenario: string,
  activities: LabActivity[],
): AcademicLesson {
  return {
    title,
    type: 'LABORATORY',
    content: {
      schemaVersion: 1,
      introduction,
      objective,
      scenario,
      activities,
    },
  };
}

const courseOne: AcademicCourse = {
  title: 'Phishing y simulaciones de ataque',
  description:
    'Identificar intentos de phishing, reconocer correos y sitios fraudulentos y comprender las técnicas de engaño utilizadas para obtener información confidencial.',
  modules: [
    {
      title: 'Fundamentos del phishing',
      description:
        'Comprende qué es el phishing, cuáles son sus objetivos y cómo se combinan distintos canales y técnicas de manipulación.',
      lessons: [
        theoryLesson(
          '¿Qué es el phishing y cómo funciona?',
          'Un engaño que busca que la persona actúe sin verificar',
          [
            'El **phishing** es una forma de ingeniería social en la que una persona o un grupo se hace pasar por una entidad confiable para inducir a otra a realizar una acción perjudicial. Esa acción puede ser abrir un enlace, descargar un archivo, entregar una contraseña, confirmar un código de verificación o autorizar una operación.',
            'Un ataque suele combinar un pretexto creíble con una sensación de urgencia. El atacante puede imitar a un banco, a un servicio de mensajería, a una plataforma de trabajo o a una persona conocida. El mensaje no necesita ser perfecto: basta con que la víctima lo considere suficientemente real en el momento adecuado.',
            'El objetivo inmediato no siempre es obtener dinero. También puede ser conseguir acceso a una cuenta, instalar un programa malicioso, recopilar información para un ataque posterior o utilizar la cuenta comprometida para engañar a otras personas.',
          ],
          [
            'Obtener credenciales de acceso y códigos de autenticación.',
            'Conseguir datos personales, financieros o laborales.',
            'Inducir la descarga de archivos o programas maliciosos.',
            'Lograr que la víctima autorice una operación o un cambio de configuración.',
            'Usar una cuenta comprometida como punto de partida para nuevos ataques.',
          ],
          'No todo mensaje no deseado es phishing. El spam busca difundir publicidad o contenido masivo; el phishing busca que la persona realice una acción que beneficie al atacante.',
          {
            table: {
              headers: ['Concepto', 'Rasgo principal', 'Objetivo habitual'],
              rows: [
                [
                  'Phishing',
                  'Suplanta una entidad o una persona para generar confianza.',
                  'Obtener información, acceso o una acción de la víctima.',
                ],
                [
                  'Spam',
                  'Envío masivo y no solicitado.',
                  'Publicidad, difusión o contacto masivo; no siempre es fraudulento.',
                ],
                [
                  'Fraude digital',
                  'Engaño con ánimo de lucro.',
                  'Obtener dinero o beneficios mediante medios digitales.',
                ],
              ],
              caption:
                'Los conceptos pueden solaparse: un mismo mensaje puede ser spam y phishing a la vez.',
            },
          },
        ),
        theoryLesson(
          'Tipos de phishing y técnicas de engaño',
          'El canal cambia, pero la manipulación se mantiene',
          [
            'El phishing puede llegar por correo electrónico, mensajes de texto, llamadas, redes sociales o aplicaciones de mensajería. Cada canal ofrece al atacante diferentes formas de construir confianza y de ocultar su identidad.',
            'El **spear phishing** es un ataque dirigido. El atacante investiga previamente a la persona o a la organización y utiliza detalles concretos para que el mensaje parezca legítimo. Cuanto más específico es el pretexto, mayor es la probabilidad de que la víctima baje la guardia.',
            'Las técnicas psicológicas más frecuentes son la urgencia, la autoridad, el miedo, la curiosidad, la recompensa y la reciprocidad. Un mensaje puede combinar varias: por ejemplo, una supuesta autoridad exige una respuesta inmediata para evitar una pérdida.',
          ],
          [
            '**Phishing por correo:** enlaces, adjuntos o solicitudes de respuesta con datos confidenciales.',
            '**Smishing:** mensajes de texto con enlaces, paquetes falsos, alertas bancarias o códigos de verificación.',
            '**Vishing:** llamadas telefónicas que suplantan a una entidad o a una persona de confianza.',
            '**Spear phishing:** mensaje personalizado para una persona o un grupo reducido.',
            '**Suplantación de identidad:** uso del nombre, el logotipo o el tono de una organización o persona real.',
            '**Phishing en redes sociales:** perfiles falsos, mensajes directos y ofertas o amenazas que buscan una reacción.',
          ],
          'La urgencia es una señal de alerta, no una prueba definitiva. Un mensaje legítimo también puede ser urgente; lo importante es verificar por un canal independiente antes de actuar.',
          {
            table: {
              headers: ['Tipo', 'Canal habitual', 'Señal que suele aparecer'],
              rows: [
                ['Phishing', 'Correo electrónico', 'Remitente extraño, enlace o adjunto inesperado.'],
                ['Smishing', 'Mensajes de texto', 'Enlace corto, paquete falso o alerta bancaria.'],
                ['Vishing', 'Llamada telefónica', 'Presión para hablar, confirmar datos o instalar algo.'],
                ['Spear phishing', 'Correo o mensajería', 'Detalles personales y un pretexto muy específico.'],
              ],
            },
          },
        ),
      ],
    },
    {
      title: 'Identificación de correos y sitios fraudulentos',
      description:
        'Aprende a revisar remitentes, enlaces, dominios y señales de contexto antes de interactuar con un mensaje o una página web.',
      lessons: [
        theoryLesson(
          'Cómo identificar un correo electrónico falso',
          'Revisa el remitente real, no solo el nombre visible',
          [
            'Un correo fraudulento puede mostrar un nombre conocido y, al mismo tiempo, una dirección distinta. Por eso conviene revisar la dirección completa, el dominio y la relación entre el remitente y el contenido del mensaje.',
            'Los enlaces también deben examinarse antes de abrirlos. El texto visible puede indicar un sitio legítimo mientras la dirección real conduce a otro dominio. Los atacantes usan dominios parecidos, subdominios engañosos, errores tipográficos y cadenas que imitan a una organización conocida.',
            'El contexto es tan importante como los detalles técnicos. Un correo inesperado que exige una acción inmediata, que pide datos que la organización no suele solicitar por ese canal o que intenta evitar que la persona verifique, merece una revisión adicional.',
          ],
          [
            'La dirección del remitente no coincide con el nombre visible o con el dominio esperado.',
            'El asunto o el saludo son genéricos, o el mensaje está dirigido a una persona equivocada.',
            'El enlace real no coincide con el texto que se muestra.',
            'El mensaje solicita contraseñas, códigos de verificación o datos financieros.',
            'El archivo adjunto es inesperado o tiene un formato que no se corresponde con el contexto.',
            'Se utilizan amenazas, premios o plazos muy cortos para forzar una reacción.',
          ],
          'No abras enlaces ni adjuntos de un mensaje sospechoso. Si necesitas comprobar su legitimidad, accede al servicio desde una dirección conocida o comunícate por un canal independiente.',
          {
            variant: 'WARNING',
            table: {
              headers: ['Elemento', 'Qué revisar', 'Señal de alerta'],
              rows: [
                [
                  'Remitente',
                  'Dirección completa y dominio.',
                  'Dominio distinto, errores sutiles o dirección gratuita.',
                ],
                [
                  'Enlace',
                  'Dirección real antes de abrirla.',
                  'Dominio parecido, acortador o parámetros extraños.',
                ],
                [
                  'Adjunto',
                  'Tipo de archivo y contexto.',
                  'Archivo inesperado, comprimido o ejecutable.',
                ],
                [
                  'Contenido',
                  'Tono, urgencia y solicitud.',
                  'Presión, amenaza o petición de datos confidenciales.',
                ],
              ],
            },
          },
        ),
        theoryLesson(
          'Identificación de páginas web fraudulentas',
          'La dirección, el certificado y el contenido deben tener sentido juntos',
          [
            'Una página fraudulenta puede copiar el diseño, los colores y el logotipo de un sitio legítimo. La diferencia suele estar en la dirección, en el comportamiento de la página o en los datos que solicita.',
            'El candado de HTTPS indica que la conexión está cifrada, pero no demuestra que el sitio sea legítimo. Un atacante también puede obtener un certificado para un dominio falso. Por eso es necesario comprobar el dominio exacto y no solo la presencia del candado.',
            'Antes de introducir credenciales, revisa si llegaste al sitio por un enlace inesperado, si el dominio coincide con el oficial y si la página muestra errores, redirecciones extrañas o formularios que piden más información de la necesaria.',
          ],
          [
            'Comprueba el dominio principal y no solo el texto que aparece antes de la primera barra.',
            'Desconfía de dominios con letras cambiadas, guiones añadidos o palabras que imitan a una marca.',
            'Revisa si el sitio redirige a otro dominio justo antes de pedir credenciales.',
            'No interpretes el candado como una garantía de legitimidad.',
            'Evita introducir datos en páginas que se abren desde enlaces acortados o mensajes no solicitados.',
            'Si tienes dudas, cierra la página y accede desde un marcador o una dirección verificada.',
          ],
          'HTTPS protege la conexión, pero no certifica la intención de quien está al otro lado. Un sitio puede ser cifrado y, aun así, fraudulento.',
          {
            variant: 'WARNING',
            table: {
              headers: ['Indicador', 'Qué significa', 'Cómo interpretarlo'],
              rows: [
                ['HTTPS', 'Conexión cifrada.', 'No confirma por sí solo que el sitio sea legítimo.'],
                [
                  'Dominio',
                  'Dirección real del sitio.',
                  'Debe coincidir con el dominio oficial, no solo con el nombre visible.',
                ],
                [
                  'Redirección',
                  'Cambio de dirección.',
                  'Puede ser normal, pero es sospechosa si ocurre antes de pedir credenciales.',
                ],
                [
                  'Formulario',
                  'Datos solicitados.',
                  'Solicitudes excesivas o fuera de contexto son una señal de alerta.',
                ],
              ],
            },
          },
        ),
      ],
    },
    {
      title: 'Prevención y actuación frente al phishing',
      description:
        'Aplica hábitos de verificación, reconoce el valor de la autenticación multifactor y actúa de forma responsable cuando recibes un mensaje sospechoso.',
      lessons: [
        theoryLesson(
          'Buenas prácticas para prevenir ataques de phishing',
          'La prevención se basa en verificar antes de actuar',
          [
            'La mejor defensa contra el phishing no es memorizar una lista de señales, sino adoptar un hábito: detenerse, verificar y actuar por un canal conocido. Los atacantes cuentan con la prisa y con la confianza automática.',
            'La autenticación multifactor reduce el impacto de una contraseña comprometida, pero no elimina el riesgo. Si un atacante convence a la víctima de aprobar una solicitud o de entregar un código, el factor adicional puede perder eficacia. Por eso la verificación humana sigue siendo necesaria.',
          ],
          [
            'Accede a los servicios desde marcadores o aplicaciones oficiales, no desde enlaces de mensajes.',
            'Verifica las solicitudes inesperadas por un canal independiente.',
            'Activa la autenticación multifactor cuando esté disponible.',
            'Mantén actualizados el sistema operativo, el navegador y las aplicaciones.',
            'Utiliza un gestor de contraseñas para no reutilizar credenciales.',
            'Reporta los mensajes sospechosos por el canal establecido por la organización.',
            'Desconfía de la urgencia, de los premios inesperados y de las amenazas que exigen una respuesta inmediata.',
          ],
          'Si un mensaje te obliga a actuar con prisa, considera esa prisa como una señal para detenerte y verificar. La urgencia es una herramienta de manipulación frecuente.',
          {
            variant: 'TIP',
            table: {
              headers: ['Práctica', 'Por qué ayuda'],
              rows: [
                ['Verificar por otro canal', 'Rompe el pretexto del atacante y confirma la solicitud.'],
                ['Usar marcadores', 'Evita depender de enlaces que pueden conducir a un sitio falso.'],
                ['Activar MFA', 'Añade una barrera si la contraseña se ve comprometida.'],
                ['Reportar', 'Permite que otras personas reciban una advertencia y se investigue el caso.'],
              ],
            },
          },
        ),
        theoryLesson(
          'Qué hacer cuando recibimos un correo sospechoso',
          'Detén la interacción, conserva la evidencia y reporta',
          [
            'Cuando un correo parece sospechoso, lo primero es no interactuar con sus enlaces, archivos o solicitudes. Responder al mensaje o reenviarlo a otras personas puede confirmar la dirección, propagar el contenido o aumentar la exposición.',
            'Después conviene verificar la solicitud por un canal independiente. Si el mensaje dice provenir de una entidad o de una persona conocida, comunícate con ella usando un número, una dirección o una aplicación que ya conozcas, no los datos que aparecen en el mensaje.',
            'Reportar temprano permite que el equipo correspondiente advierta a otras personas y tome medidas. Si ya se hizo clic en un enlace o se introdujeron credenciales, hay que actuar con rapidez: cambiar la contraseña, revisar las sesiones activas y reportar lo ocurrido.',
          ],
          [
            'No hagas clic en enlaces ni abras archivos adjuntos.',
            'No respondas al mensaje ni reenvíes su contenido a otras personas.',
            'Conserva el mensaje y los datos que permitan identificarlo.',
            'Verifica la solicitud por un canal independiente y conocido.',
            'Reporta el caso por el canal establecido por la organización.',
            'Si introdujiste credenciales, cambia la contraseña y revisa la actividad de la cuenta.',
            'Si el mensaje afecta a varias personas, informa para que puedan estar alerta.',
          ],
          'Reportar un mensaje sospechoso no es una exageración. Es una acción preventiva que puede evitar que otra persona caiga en el mismo engaño.',
          {
            variant: 'IMPORTANT',
            listStyle: 'ordered',
          },
        ),
      ],
    },
    {
      title: 'Laboratorio práctico del curso',
      description:
        'Aplica lo aprendido en un escenario simulado de análisis y respuesta ante un correo de phishing.',
      lessons: [
        laboratoryLesson(
          'Detectives del phishing',
          'Recibes un correo que afirma ser de una empresa de mensajería. El mensaje asegura que un paquete está retenido y solicita confirmar tus datos para programar la entrega.',
          'Identificar los elementos sospechosos de un correo, decidir cómo actuar y ordenar los pasos de respuesta ante un posible phishing.',
          'Trabajas en un equipo de apoyo y acabas de recibir el mensaje. Debes analizarlo sin abrir sus enlaces ni descargar sus archivos.',
          [
            {
              id: 'elementos',
              type: 'IDENTIFY_SUSPICIOUS',
              title: '¿Qué elementos deben encender las alarmas?',
              instructions:
                'Selecciona todos los elementos del correo que justifican una revisión adicional.',
              required: true,
              hints: [
                'Compara el dominio del remitente con el de la empresa real.',
                'El texto visible de un enlace no siempre coincide con su destino.',
              ],
              elements: [
                {
                  id: 'remitente',
                  text: 'El remitente usa un dominio parecido al de la empresa, pero con una letra adicional.',
                },
                {
                  id: 'asunto',
                  text: 'El asunto indica que el paquete será devuelto en las próximas horas.',
                },
                {
                  id: 'enlace',
                  text: 'El enlace muestra el nombre de la empresa, pero apunta a un dominio desconocido.',
                },
                {
                  id: 'logo',
                  text: 'El correo incluye el logotipo de la empresa.',
                },
                {
                  id: 'datos',
                  text: 'El formulario solicita nombre completo, dirección y datos de pago.',
                },
                {
                  id: 'firma',
                  text: 'La firma incluye un nombre genérico y un número de contacto que no aparece en el sitio oficial.',
                },
              ],
              solution: {
                elementIds: ['remitente', 'asunto', 'enlace', 'datos', 'firma'],
              },
            },
            {
              id: 'decision',
              type: 'SINGLE_CHOICE',
              title: '¿Cuál es la acción más segura?',
              instructions:
                'Elige la opción que reduzca mejor el riesgo sin interactuar con el mensaje.',
              required: true,
              hints: [
                'Verificar por un canal independiente es más seguro que responder al correo.',
              ],
              options: [
                {
                  id: 'responder',
                  text: 'Responder al remitente para preguntar si el mensaje es legítimo.',
                },
                {
                  id: 'abrir',
                  text: 'Abrir el enlace en una ventana privada para comprobar si funciona.',
                },
                {
                  id: 'reportar',
                  text: 'No interactuar, conservar el mensaje y reportarlo por el canal establecido.',
                },
                {
                  id: 'reenviar',
                  text: 'Reenviarlo a los compañeros para que ellos decidan qué hacer.',
                },
              ],
              solution: { optionId: 'reportar' },
            },
            {
              id: 'procedimiento',
              type: 'ORDER_PROCEDURE',
              title: 'Ordena la respuesta ante el correo sospechoso',
              instructions:
                'Coloca los pasos en un orden razonable, desde la primera acción hasta el seguimiento.',
              required: true,
              hints: [
                'Primero evita interactuar; al final, comprueba que la situación quedó comunicada.',
              ],
              items: [
                {
                  id: 'detener',
                  text: 'Detener cualquier interacción con enlaces, archivos o formularios.',
                },
                {
                  id: 'conservar',
                  text: 'Conservar el mensaje y los datos necesarios para identificarlo.',
                },
                {
                  id: 'verificar',
                  text: 'Verificar la solicitud por un canal independiente y conocido.',
                },
                {
                  id: 'reportar',
                  text: 'Reportar el caso por el canal establecido.',
                },
                {
                  id: 'seguimiento',
                  text: 'Si hubo interacción, cambiar credenciales y revisar la actividad de la cuenta.',
                },
              ],
              solution: {
                order: ['detener', 'conservar', 'verificar', 'reportar', 'seguimiento'],
              },
            },
            {
              id: 'correo-sospechoso',
              type: 'EMAIL_ANALYSIS',
              title: 'Analiza el correo sospechoso',
              instructions:
                'Lee el correo de principio a fin y selecciona directamente los elementos que consideres sospechosos. Recuerda que también hay partes legítimas: no las marques. Puedes desmarcar cualquier elemento antes de comprobar.',
              required: true,
              hints: [
                'Presta atención al dominio utilizado por quien envía el mensaje.',
                'Analiza si el lenguaje del correo busca generar miedo o urgencia.',
                'Piensa si una institución debería solicitar tus credenciales mediante un enlace recibido por correo.',
                'Observa si el mensaje permite verificar la identidad de quien lo envía.',
              ],
              email: {
                fromName: 'Soporte Institucional',
                fromAddress:
                  'soporte.seguridad@institucion-verificacion.example.com',
                fromElementId: 'remitente',
                toAddress: 'estudiante@institucion.example.com',
                toElementId: 'destinatario',
                subject: 'URGENTE: Su cuenta institucional será suspendida',
                subjectElementId: 'asunto',
                datetime: 'lunes, 26 de octubre de 2026, 9:14 a. m.',
                datetimeElementId: 'fecha',
                greeting: 'Estimado estudiante:',
                greetingElementId: 'saludo',
                body: [
                  {
                    text: 'Hemos detectado una actividad inusual en su cuenta institucional.',
                  },
                  {
                    text: 'Por motivos de seguridad, necesitamos que realice una verificación inmediata de sus credenciales.',
                    elementId: 'credenciales',
                  },
                  {
                    text: 'Si no completa este procedimiento durante las próximas 24 horas, su cuenta será bloqueada temporalmente y podría perder el acceso a los servicios académicos.',
                    elementId: 'suspension',
                  },
                  {
                    text: 'Para evitar la suspensión, ingrese al siguiente enlace y confirme sus datos:',
                  },
                ],
                linkLabel: 'VERIFICAR MI CUENTA AHORA',
                linkUrl:
                  'http://institucion-verificacion.example.com/verificar-cuenta',
                linkElementId: 'enlace',
                closingLines: ['Gracias por su colaboración.'],
                closingElementId: 'despedida',
                signatureLines: ['Departamento de Seguridad Informática'],
                signatureElementId: 'firma',
                confidentialityNote: 'Aviso de confidencialidad institucional',
                disclaimer:
                  'Este escenario es ficticio y se utiliza exclusivamente con fines educativos. Ningún enlace es real y no se envía ningún correo.',
              },
              elements: [
                {
                  id: 'remitente',
                  text: 'Datos del remitente (nombre y dirección de correo)',
                },
                {
                  id: 'destinatario',
                  text: 'Destinatario del mensaje',
                },
                {
                  id: 'asunto',
                  text: 'Línea de asunto',
                },
                {
                  id: 'fecha',
                  text: 'Fecha y hora de envío',
                },
                {
                  id: 'saludo',
                  text: 'Saludo inicial',
                },
                {
                  id: 'credenciales',
                  text: 'Solicitud de verificación de credenciales',
                },
                {
                  id: 'suspension',
                  text: 'Advertencia de suspensión de la cuenta',
                },
                {
                  id: 'enlace',
                  text: 'Enlace de verificación',
                },
                {
                  id: 'despedida',
                  text: 'Cierre del mensaje',
                },
                {
                  id: 'firma',
                  text: 'Firma institucional',
                },
              ],
              solution: {
                elementIds: [
                  'remitente',
                  'asunto',
                  'credenciales',
                  'suspension',
                  'enlace',
                  'firma',
                ],
              },
            },
          ],
        ),
      ],
    },
  ],
};

const courseTwo: AcademicCourse = {
  title: 'Gestión de contraseñas y autenticación',
  description:
    'Gestionar credenciales de forma segura, crear contraseñas robustas, evitar la reutilización y utilizar factores adicionales de autenticación.',
  modules: [
    {
      title: 'Fundamentos de las contraseñas seguras',
      description:
        'Comprende la función de las credenciales, los riesgos de las contraseñas débiles y las características que hacen fuerte a una contraseña.',
      lessons: [
        theoryLesson(
          'Importancia de las contraseñas en la seguridad digital',
          'Las credenciales son la llave de acceso a la identidad digital',
          [
            'Una credencial de acceso combina, como mínimo, un identificador de usuario y una prueba de identidad. La contraseña es la prueba más extendida, aunque puede complementarse con otros factores. Si una contraseña se compromete, el atacante puede actuar en nombre de la persona.',
            'Las contraseñas débiles facilitan los ataques de fuerza bruta y de diccionario. En el primero se prueban muchas combinaciones; en el segundo se utilizan listas de palabras, variantes y contraseñas filtradas. Cuando una persona reutiliza la misma clave en varios servicios, una filtración puede afectar a todas esas cuentas.',
          ],
          [
            'Acceso no autorizado al correo, a las redes sociales o a los servicios de trabajo.',
            'Suplantación de identidad y envío de mensajes desde la cuenta comprometida.',
            'Acceso a información personal, financiera o académica.',
            'Uso de la cuenta como punto de entrada para otros sistemas.',
            'Dificultad para recuperar la cuenta si el atacante cambia los datos de recuperación.',
          ],
          'Una contraseña fuerte no protege por sí sola: también importan la unicidad, la protección del dispositivo y la autenticación multifactor.',
          {
            table: {
              headers: ['Riesgo', 'Cómo se aprovecha', 'Medida de protección'],
              rows: [
                ['Fuerza bruta', 'Prueba masiva de combinaciones.', 'Contraseñas largas y únicas.'],
                ['Diccionario', 'Uso de palabras y variantes conocidas.', 'Frases largas y no predecibles.'],
                [
                  'Reutilización',
                  'Una filtración afecta a varios servicios.',
                  'Una contraseña distinta por cuenta y un gestor.',
                ],
              ],
            },
          },
        ),
        theoryLesson(
          'Características de una contraseña segura',
          'Longitud, unicidad y resistencia a la predicción',
          [
            'La longitud es uno de los factores más importantes. Una frase de contraseña larga y fácil de recordar puede ser más resistente que una palabra corta con símbolos. La clave debe ser única para cada servicio y no debe basarse en datos personales, fechas, nombres o patrones evidentes.',
            'Los símbolos y las mayúsculas pueden aumentar la complejidad, pero no sustituyen la longitud ni la unicidad. Los atacantes conocen las reglas habituales y prueban variantes predecibles, como cambiar una letra por un número o añadir un signo al final.',
            'Un gestor de contraseñas permite generar y almacenar claves diferentes sin depender de la memoria. La frase maestra del gestor debe ser especialmente robusta y no debe reutilizarse en otros servicios.',
          ],
          [
            'Prefiere frases largas formadas por varias palabras y algún elemento no predecible.',
            'Evita nombres, fechas, equipos, mascotas o combinaciones personales.',
            'No uses la misma contraseña en servicios distintos.',
            'No adoptes patrones como palabra + año + signo.',
            'Genera claves aleatorias cuando no necesites recordarlas.',
            'Protege la frase maestra del gestor y actívala con MFA.',
          ],
          'Una contraseña difícil de adivinar no tiene que ser difícil de recordar. Las frases de contraseña bien construidas pueden ser largas y memorables.',
          {
            variant: 'TIP',
            table: {
              headers: ['Ejemplo débil', 'Por qué es débil', 'Alternativa más segura'],
              rows: [
                ['Verano2024!', 'Patrón predecible y estacional.', 'Una frase larga y única para ese servicio.'],
                ['MiNombre1990', 'Datos personales y año.', 'Una combinación aleatoria o una frase no personal.'],
                ['12345678', 'Secuencia trivial.', 'Una clave generada y almacenada en un gestor.'],
              ],
              caption:
                'Los ejemplos son ficticios y no deben utilizarse como contraseñas reales.',
            },
          },
        ),
      ],
    },
    {
      title: 'Administración y protección de credenciales',
      description:
        'Analiza por qué la reutilización es peligrosa y cómo almacenar y administrar credenciales de forma más segura.',
      lessons: [
        theoryLesson(
          'Riesgos de reutilizar contraseñas',
          'Una sola filtración puede abrir varias puertas',
          [
            'Cuando una contraseña se reutiliza, el atacante que la obtiene puede probarla en otros servicios. Este ataque se conoce como **credential stuffing** y aprovecha que muchas personas mantienen la misma clave o variantes muy parecidas en varias cuentas.',
            'La reutilización también dificulta identificar el origen de un compromiso. Si varias cuentas comparten la misma contraseña, no es fácil saber cuál fue la primera afectada ni qué servicios deben revisarse. Además, un cambio aislado puede no ser suficiente si el atacante ya tiene acceso a otros recursos.',
          ],
          [
            'Un servicio comprometido puede permitir el acceso a cuentas de correo, redes sociales o trabajo.',
            'El atacante puede probar la misma clave en otros sitios automáticamente.',
            'Las variantes predecibles, como cambiar un número al final, son fáciles de adivinar.',
            'La recuperación se complica si el correo de recuperación también está comprometido.',
            'La exposición puede pasar desapercibida durante mucho tiempo.',
          ],
          'Usar contraseñas distintas no significa memorizar decenas de claves. Un gestor de contraseñas permite mantener la unicidad sin sacrificar la practicidad.',
          { variant: 'WARNING' },
        ),
        theoryLesson(
          'Gestores de contraseñas y almacenamiento seguro',
          'Centraliza las credenciales sin exponerlas en papel o en notas',
          [
            'Un gestor de contraseñas es una aplicación que almacena credenciales de forma cifrada y las protege con una frase maestra. Puede generar claves aleatorias, autocompletar formularios y sincronizar el acceso entre dispositivos, según el producto y la configuración elegida.',
            'Guardar contraseñas en hojas de cálculo, notas sin protección o mensajes personales aumenta el riesgo. También es riesgoso compartirlas por canales informales. El gestor no elimina todos los riesgos, pero reduce la tentación de reutilizar claves y facilita el uso de contraseñas únicas.',
            'Al elegir un gestor, conviene revisar su modelo de cifrado, la posibilidad de activar MFA, la reputación del proveedor, las opciones de exportación y la claridad de sus políticas de privacidad. No es necesario adoptar un producto específico: lo importante es que la herramienta sea confiable y esté bien configurada.',
          ],
          [
            'Protege la frase maestra con una contraseña larga y única.',
            'Activa la autenticación multifactor para acceder al gestor.',
            'Mantén actualizada la aplicación y el sistema operativo.',
            'Evita compartir credenciales por correo, chat o notas sin protección.',
            'Revisa periódicamente las credenciales antiguas y las cuentas que ya no utilizas.',
            'Configura copias de seguridad o mecanismos de recuperación confiables.',
          ],
          'La frase maestra es una llave crítica: si se compromete, el resto del almacén puede quedar expuesto. No la reutilices ni la compartas.',
          { variant: 'IMPORTANT' },
        ),
      ],
    },
    {
      title: 'Autenticación multifactor (MFA)',
      description:
        'Comprende los factores de autenticación, sus limitaciones y las buenas prácticas para proteger las cuentas con MFA.',
      lessons: [
        theoryLesson(
          '¿Qué es la autenticación multifactor?',
          'Un segundo factor reduce el impacto de una contraseña comprometida',
          [
            'La autenticación multifactor combina dos o más factores de distinto tipo para verificar la identidad. Los factores suelen clasificarse en algo que sabes, algo que tienes y algo que eres. La contraseña representa el primer tipo; un código temporal o una llave física representan el segundo.',
            'MFA no es lo mismo que 2FA, aunque en la práctica se usan como términos cercanos. 2FA se refiere específicamente a dos factores. MFA puede incluir más de dos. Lo importante es que los factores no sean del mismo tipo: dos contraseñas no constituyen una autenticación multifactor real.',
            'MFA reduce el riesgo, pero no es infalible. Los atacantes pueden intentar engañar a la persona para que apruebe una solicitud, robar un código temporal o simular una página de inicio de sesión. Por eso la verificación del contexto y la educación siguen siendo necesarias.',
          ],
          [
            '**Algo que sabes:** contraseña, PIN o respuesta a una pregunta.',
            '**Algo que tienes:** aplicación autenticadora, llave física o dispositivo registrado.',
            '**Algo que eres:** huella digital, reconocimiento facial u otra característica biométrica.',
            'La combinación de factores debe ser de tipos distintos.',
            'La MFA debe complementarse con buenas prácticas de contraseñas y verificación.',
          ],
          'Si recibes una solicitud de aprobación que no iniciaste, no la aceptes. Podría ser un intento de acceso a tu cuenta.',
          {
            table: {
              headers: ['Factor', 'Ejemplo', 'Consideración'],
              rows: [
                ['Conocimiento', 'Contraseña o PIN.', 'Puede ser reutilizado o adivinado.'],
                ['Posesión', 'Aplicación autenticadora o llave física.', 'Debe protegerse y registrarse correctamente.'],
                ['Inherencia', 'Huella o rostro.', 'No siempre disponible y no debe usarse como único factor.'],
              ],
            },
          },
        ),
        theoryLesson(
          'Métodos de autenticación y buenas prácticas',
          'Elige factores resistentes y administra la recuperación',
          [
            'Las aplicaciones autenticadoras generan códigos temporales y suelen ser más resistentes que los mensajes de texto, que pueden verse afectados por el intercambio de SIM o por la interceptación. Las llaves físicas ofrecen una protección adicional frente a la suplantación de sitios, aunque requieren configuración y respaldo.',
            'Las notificaciones push son cómodas, pero pueden facilitar ataques de fatiga de MFA: el atacante envía solicitudes repetidas hasta que la persona acepta por cansancio. Los códigos por SMS son mejores que no tener MFA, pero no deben considerarse la opción más robusta cuando existen alternativas.',
            'La recuperación es parte de la seguridad. Guarda los códigos de respaldo en un lugar seguro, registra más de un método cuando el servicio lo permita y revisa que el correo o el teléfono de recuperación sigan siendo tuyos.',
          ],
          [
            'Prefiere aplicaciones autenticadoras o llaves físicas cuando estén disponibles.',
            'No apruebes solicitudes push que no hayas iniciado.',
            'Guarda los códigos de recuperación en un lugar seguro y separado.',
            'Registra métodos alternativos para no quedar bloqueado.',
            'Revisa periódicamente los dispositivos y sesiones activas.',
            'Si pierdes un dispositivo, revoca su acceso y actualiza los métodos.',
          ],
          'La MFA más fuerte falla si la persona aprueba una solicitud fraudulenta. Verifica siempre el contexto antes de aceptar.',
          { variant: 'WARNING' },
        ),
      ],
    },
    {
      title: 'Laboratorio práctico del curso',
      description:
        'Practica la elección de contraseñas, la identificación de riesgos y la respuesta ante una solicitud de autenticación inesperada.',
      lessons: [
        laboratoryLesson(
          'Protege tus credenciales',
          'Debes ayudar a una persona a mejorar la protección de sus cuentas después de recibir una solicitud de autenticación que no inició.',
          'Elegir alternativas más seguras, reconocer los riesgos de la reutilización y ordenar una respuesta adecuada ante una posible compromiso de credenciales.',
          'La persona utiliza la misma contraseña en varios servicios y acaba de recibir una notificación de inicio de sesión que no reconoce. No sabes si la cuenta ya fue comprometida.',
          [
            {
              id: 'password',
              type: 'SINGLE_CHOICE',
              title: 'Elige la alternativa más segura',
              instructions:
                'Selecciona la opción que represente una práctica más segura para una cuenta importante.',
              required: true,
              hints: [
                'La longitud y la unicidad importan más que una sustitución predecible de caracteres.',
              ],
              options: [
                { id: 'corta', text: 'Una palabra corta con un signo al final.' },
                { id: 'personal', text: 'El nombre de la persona seguido del año de nacimiento.' },
                { id: 'frase', text: 'Una frase larga, única y no basada en datos personales.' },
                { id: 'repetida', text: 'La misma contraseña que ya usa en otro servicio.' },
              ],
              solution: { optionId: 'frase' },
            },
            {
              id: 'reutilizacion',
              type: 'MULTIPLE_SELECT',
              title: 'Riesgos de reutilizar contraseñas',
              instructions:
                'Selecciona todos los riesgos que se relacionan con reutilizar la misma contraseña.',
              required: true,
              hints: [
                'Una filtración en un servicio puede afectar a otros.',
              ],
              options: [
                {
                  id: 'credential-stuffing',
                  text: 'Un atacante puede probar la contraseña filtrada en otros servicios.',
                },
                {
                  id: 'multiple',
                  text: 'Varias cuentas pueden quedar comprometidas con una sola filtración.',
                },
                {
                  id: 'origen',
                  text: 'Puede ser más difícil identificar cuál fue la cuenta afectada primero.',
                },
                {
                  id: 'memoria',
                  text: 'Mejora la memorización y elimina la necesidad de un gestor.',
                },
              ],
              solution: {
                optionIds: ['credential-stuffing', 'multiple', 'origen'],
              },
            },
            {
              id: 'procedimiento',
              type: 'ORDER_PROCEDURE',
              title: 'Responde ante una solicitud de MFA no reconocida',
              instructions:
                'Ordena los pasos desde la primera acción hasta el seguimiento.',
              required: true,
              hints: [
                'No apruebes la solicitud; primero verifica y después actúa sobre la cuenta.',
              ],
              items: [
                { id: 'no-aprobar', text: 'No aprobar la solicitud de autenticación.' },
                { id: 'verificar', text: 'Comprobar si otra persona autorizada inició el acceso.' },
                { id: 'cambiar', text: 'Cambiar la contraseña si existe sospecha de compromiso.' },
                { id: 'revisar', text: 'Revisar las sesiones y los métodos de recuperación.' },
                { id: 'reportar', text: 'Reportar el incidente por el canal establecido.' },
              ],
              solution: {
                order: ['no-aprobar', 'verificar', 'cambiar', 'revisar', 'reportar'],
              },
            },
            {
              id: 'decision',
              type: 'DECISION_STEPS',
              title: 'Toma decisiones durante la revisión',
              instructions:
                'Elige la respuesta más adecuada en cada momento del escenario.',
              required: true,
              hints: [
                'Protege primero la cuenta y evita reutilizar la contraseña anterior.',
              ],
              steps: [
                {
                  id: 'paso-1',
                  prompt:
                    'Recibes una notificación de inicio de sesión que no reconoces. ¿Qué haces primero?',
                  options: [
                    { id: 'aprobar', text: 'Aprobarla para ver si el acceso continúa.' },
                    { id: 'rechazar', text: 'Rechazarla y verificar la actividad de la cuenta.' },
                    { id: 'ignorar', text: 'Ignorarla y esperar a que se resuelva sola.' },
                  ],
                },
                {
                  id: 'paso-2',
                  prompt:
                    'Al revisar la cuenta observas una sesión desconocida activa. ¿Qué haces?',
                  options: [
                    { id: 'cerrar', text: 'Cerrar la sesión, cambiar la contraseña y revisar la recuperación.' },
                    { id: 'esperar', text: 'Esperar a que la sesión se cierre por inactividad.' },
                    { id: 'compartir', text: 'Compartir la contraseña con un compañero para que revise.' },
                  ],
                },
                {
                  id: 'paso-3',
                  prompt:
                    'Después de cambiar la contraseña, ¿qué haces con la clave anterior?',
                  options: [
                    { id: 'reutilizar', text: 'Usarla en otro servicio para no olvidarla.' },
                    { id: 'eliminar', text: 'Dejar de usarla y mantener claves únicas por servicio.' },
                    { id: 'guardar', text: 'Guardarla en una nota sin protección.' },
                  ],
                },
              ],
              solution: {
                answers: [
                  { stepId: 'paso-1', optionId: 'rechazar' },
                  { stepId: 'paso-2', optionId: 'cerrar' },
                  { stepId: 'paso-3', optionId: 'eliminar' },
                ],
              },
            },
          ],
        ),
      ],
    },
  ],
};

const courseThree: AcademicCourse = {
  title: 'Respuesta a incidentes de seguridad',
  description:
    'Reconocer incidentes de seguridad, actuar de forma responsable ante situaciones de riesgo y comprender los procedimientos de reporte y comunicación.',
  modules: [
    {
      title: 'Identificación y comprensión de incidentes',
      description:
        'Distingue eventos, amenazas, vulnerabilidades y riesgos, y reconoce las señales que pueden indicar un incidente.',
      lessons: [
        theoryLesson(
          '¿Qué es un incidente de seguridad informática?',
          'Un incidente es un evento que afecta o puede afectar la seguridad',
          [
            'Un **incidente de seguridad** es un evento o una serie de eventos que comprometen o ponen en riesgo la confidencialidad, la integridad o la disponibilidad de la información y de los sistemas. No todo evento es un incidente: un inicio de sesión normal o una actualización programada forman parte de la operación habitual.',
            'Para comprender el riesgo conviene distinguir tres conceptos. Una **amenaza** es aquello que puede causar daño; una **vulnerabilidad** es una debilidad que puede ser aprovechada; y el **riesgo** es la posibilidad de que una amenaza se materialice sobre una vulnerabilidad y produzca consecuencias.',
            'Los incidentes pueden afectar cuentas, dispositivos, redes, aplicaciones o información. Algunos son evidentes, como el bloqueo de una cuenta o la pérdida de un dispositivo; otros son silenciosos, como un acceso no autorizado que no genera alertas visibles.',
          ],
          [
            'Acceso no autorizado a una cuenta o a un sistema.',
            'Pérdida, robo o exposición de información.',
            'Modificación no autorizada de datos o configuraciones.',
            'Interrupción de un servicio o de la disponibilidad de un recurso.',
            'Instalación o ejecución de código malicioso.',
            'Uso indebido de credenciales o de dispositivos.',
          ],
          'No es necesario determinar por cuenta propia si un evento es un incidente grave. Ante una anomalía, comunícala por el canal establecido para que pueda evaluarse.',
          {
            table: {
              headers: ['Concepto', 'Definición', 'Ejemplo'],
              rows: [
                ['Amenaza', 'Aquello que puede causar daño.', 'Un atacante que busca credenciales.'],
                ['Vulnerabilidad', 'Debilidad que puede ser aprovechada.', 'Una contraseña débil o un sistema sin actualizar.'],
                ['Riesgo', 'Posibilidad de que el daño ocurra.', 'Acceso no autorizado por una credencial comprometida.'],
                ['Incidente', 'Evento que afecta o puede afectar la seguridad.', 'Inicio de sesión desconocido en una cuenta.'],
              ],
            },
          },
        ),
        theoryLesson(
          'Señales de alerta y detección de incidentes',
          'Las anomalías importan aunque no sean concluyentes',
          [
            'Las señales de un incidente pueden ser técnicas o de comportamiento. Una alerta del sistema, un mensaje de un contacto que recibió algo extraño o una actividad que no coincide con lo habitual son motivos suficientes para revisar.',
            'No todas las señales confirman un incidente. Un cambio de configuración puede ser legítimo y una lentitud puede deberse a una actualización. Sin embargo, ignorar una anomalía porque no se entiende puede retrasar la respuesta. Lo recomendable es comunicarla y permitir que se evalúe.',
          ],
          [
            'Inicios de sesión desde ubicaciones, horarios o dispositivos no reconocidos.',
            'Cambios de contraseña, correo de recuperación o teléfono que no realizaste.',
            'Mensajes enviados desde tu cuenta sin autorización.',
            'Solicitudes de autenticación que no iniciaste.',
            'Aparición de archivos, programas o permisos que no recuerdas haber creado.',
            'Alertas de seguridad del sistema o de un servicio.',
            'Contactos que reciben mensajes extraños en tu nombre.',
          ],
          'Una señal aislada no siempre es un incidente, pero una combinación de señales o una actividad claramente ajena a tu uso habitual merece atención inmediata.',
          { variant: 'WARNING' },
        ),
      ],
    },
    {
      title: 'Procedimientos de actuación y reporte',
      description:
        'Aprende a priorizar la seguridad, conservar la información útil y comunicar un incidente por los canales establecidos.',
      lessons: [
        theoryLesson(
          'Primeras acciones ante un incidente',
          'Protege, documenta y comunica sin improvisar',
          [
            'Ante un posible incidente, la primera prioridad es evitar que el daño aumente. Eso puede implicar dejar de interactuar con un enlace, cerrar una sesión, desconectar un dispositivo de la red si así lo indica el procedimiento o cambiar una contraseña comprometida. No todas las situaciones requieren las mismas acciones.',
            'También es importante conservar la información que permita entender qué ocurrió. Anota la hora, el mensaje o la alerta, las cuentas afectadas y las acciones realizadas. No borres archivos ni registros por iniciativa propia, porque pueden ser necesarios para la investigación.',
            'El reporte debe hacerse por el canal establecido por la organización o el proveedor del servicio. Evita difundir detalles innecesarios y no intentes investigar por tu cuenta si no tienes esa responsabilidad.',
          ],
          [
            'Detener la interacción con el contenido o el sistema afectado.',
            'Registrar la hora, las señales observadas y las acciones realizadas.',
            'Conservar mensajes, capturas o archivos relacionados.',
            'Cambiar credenciales si existe sospecha de compromiso.',
            'Revisar sesiones y métodos de recuperación cuando sea posible.',
            'Reportar el incidente por el canal establecido.',
            'Seguir las indicaciones del equipo responsable.',
          ],
          'No intentes ocultar un incidente por vergüenza o por miedo a una consecuencia. La comunicación temprana suele reducir el impacto.',
          { variant: 'IMPORTANT', listStyle: 'ordered' },
        ),
        theoryLesson(
          'Cómo reportar un incidente de seguridad',
          'Un reporte claro permite actuar con rapidez',
          [
            'Un buen reporte responde qué ocurrió, cuándo se detectó, qué sistemas o cuentas están involucrados y qué acciones se realizaron. No necesita incluir una investigación completa; debe aportar la información disponible de forma ordenada.',
            'Es útil describir las señales observadas sin sacar conclusiones apresuradas. Por ejemplo, es mejor indicar “recibí una alerta de inicio de sesión desde una ubicación que no reconozco” que afirmar “me hackearon” sin más datos. La precisión ayuda a priorizar.',
            'No incluyas contraseñas, códigos de verificación ni información sensible que no sea necesaria para el reporte. Si el canal lo permite, adjunta capturas o mensajes originales. Mantente disponible para responder preguntas y sigue las instrucciones del equipo responsable.',
          ],
          [
            'Qué se observó y cómo se detectó.',
            'Fecha y hora aproximadas del evento.',
            'Cuentas, dispositivos o servicios afectados.',
            'Acciones realizadas hasta el momento.',
            'Evidencia disponible, como mensajes o capturas.',
            'Datos de contacto para el seguimiento.',
          ],
          'Reportar no es lo mismo que acusar. El objetivo es facilitar una respuesta coordinada y proteger a otras personas.',
          {
            table: {
              headers: ['Dato', 'Por qué ayuda'],
              rows: [
                ['Hora y fecha', 'Permite reconstruir la secuencia de eventos.'],
                ['Sistemas afectados', 'Ayuda a delimitar el alcance y priorizar la respuesta.'],
                ['Acciones realizadas', 'Evita duplicar pasos o interferir con la investigación.'],
                ['Evidencia', 'Facilita el análisis y la comunicación del caso.'],
              ],
            },
          },
        ),
      ],
    },
    {
      title: 'Suplantación de identidad y recuperación de cuentas',
      description:
        'Actúa ante el uso no autorizado de una cuenta y aplica medidas de recuperación y protección posterior.',
      lessons: [
        theoryLesson(
          'Cómo actuar ante la suplantación de una cuenta',
          'Recupera el control y advierte a las personas afectadas',
          [
            'La suplantación de una cuenta ocurre cuando otra persona accede a ella y actúa en nombre del titular. Puede manifestarse porque los contactos reciben mensajes extraños, porque la contraseña cambió sin autorización o porque aparecen sesiones y dispositivos desconocidos.',
            'La respuesta debe empezar por recuperar el control y evitar que el atacante vuelva a entrar. Si es posible, inicia sesión desde un dispositivo de confianza, cambia la contraseña, revisa los métodos de recuperación y cierra las sesiones activas. Si no puedes acceder, utiliza el procedimiento de recuperación del servicio.',
            'Después conviene avisar a las personas que podrían recibir mensajes fraudulentos y reportar el caso. Revisa también los permisos de aplicaciones conectadas, las reglas de reenvío y cualquier cambio que el atacante haya podido realizar.',
          ],
          [
            'Cambia la contraseña desde un dispositivo y una conexión de confianza.',
            'Revisa y actualiza el correo y el teléfono de recuperación.',
            'Cierra las sesiones activas y revoca dispositivos desconocidos.',
            'Activa o revisa la autenticación multifactor.',
            'Revisa reglas de reenvío, firmas y configuraciones modificadas.',
            'Avisa a contactos y reporta el incidente.',
            'Conserva la evidencia de los mensajes o accesos no autorizados.',
          ],
          'Si no puedes recuperar la cuenta, no sigas intentando métodos improvisados. Acude al canal de soporte oficial del servicio y reporta la situación.',
          { variant: 'WARNING' },
        ),
        theoryLesson(
          'Recuperación y protección posterior al incidente',
          'Cerrar el incidente también implica aprender y prevenir',
          [
            'Una vez recuperado el acceso, la tarea no termina. Es necesario revisar qué ocurrió, qué información pudo quedar expuesta y qué medidas deben mantenerse para evitar una repetición. La recuperación debe incluir la revisión de permisos, dispositivos y métodos de autenticación.',
            'La documentación del incidente ayuda a identificar fallas de configuración, hábitos de riesgo o necesidades de formación. También permite comprobar si las medidas aplicadas funcionaron. No se trata de buscar culpables, sino de mejorar la capacidad de respuesta.',
            'Si el incidente afectó a otras personas o a la organización, mantén una comunicación clara y sigue las indicaciones del equipo responsable. Evita prometer resultados que no puedes garantizar y no compartas información confidencial innecesaria.',
          ],
          [
            'Confirma que las sesiones y dispositivos desconocidos fueron revocados.',
            'Revisa permisos, aplicaciones conectadas y configuraciones de recuperación.',
            'Actualiza las credenciales que pudieron quedar expuestas.',
            'Comprueba si hubo cambios en el correo, la firma o las reglas de reenvío.',
            'Documenta las acciones y las lecciones aprendidas.',
            'Refuerza la autenticación y la verificación de solicitudes.',
            'Mantén la vigilancia durante un tiempo prudencial.',
          ],
          'La recuperación no consiste solo en volver a entrar. Consiste en asegurar que la cuenta y las personas relacionadas quedaron protegidas.',
          { variant: 'IMPORTANT' },
        ),
      ],
    },
    {
      title: 'Laboratorio práctico del curso',
      description:
        'Practica la detección, el reporte y la respuesta ante un incidente de seguridad simulado.',
      lessons: [
        laboratoryLesson(
          'Centro de respuesta a incidentes',
          'Una cuenta de correo empieza a enviar mensajes extraños y se detectan inicios de sesión desde ubicaciones desconocidas. Debes coordinar las primeras acciones.',
          'Identificar señales de incidente, ordenar la respuesta inicial, reportar la información necesaria y utilizar una terminal simulada para revisar y revocar sesiones.',
          'Formas parte del equipo de apoyo. Tienes acceso a una consola simulada con comandos limitados y debes actuar sin borrar evidencia ni improvisar procedimientos.',
          [
            {
              id: 'senales',
              type: 'IDENTIFY_SUSPICIOUS',
              title: 'Señales de un posible incidente',
              instructions:
                'Selecciona las señales que justifican iniciar una revisión del incidente.',
              required: true,
              hints: [
                'Un solo evento puede ser casual; varias señales relacionadas son más relevantes.',
              ],
              elements: [
                { id: 'sesion', text: 'Inicio de sesión desde una ubicación que no reconoces.' },
                { id: 'envios', text: 'Contactos reciben mensajes que tú no enviaste.' },
                { id: 'mfa', text: 'Recibes solicitudes de autenticación que no iniciaste.' },
                { id: 'firma', text: 'La firma del correo no tiene un diseño moderno.' },
                { id: 'recuperacion', text: 'El correo de recuperación cambió sin tu autorización.' },
                { id: 'lentitud', text: 'El equipo tarda unos segundos más en abrir una aplicación.' },
              ],
              solution: {
                elementIds: ['sesion', 'envios', 'mfa', 'recuperacion'],
              },
            },
            {
              id: 'orden',
              type: 'ORDER_PROCEDURE',
              title: 'Ordena la respuesta inicial',
              instructions:
                'Ordena las acciones desde la detección hasta el seguimiento.',
              required: true,
              hints: [
                'Conserva la evidencia antes de hacer cambios que puedan eliminarla.',
              ],
              items: [
                { id: 'detectar', text: 'Registrar las señales observadas y la hora de detección.' },
                { id: 'contener', text: 'Evitar que el incidente siga avanzando con acciones indicadas.' },
                { id: 'evidencia', text: 'Conservar mensajes, alertas y datos relevantes.' },
                { id: 'reportar', text: 'Reportar el incidente por el canal establecido.' },
                { id: 'seguimiento', text: 'Revisar la cuenta y confirmar que las sesiones fueron controladas.' },
              ],
              solution: {
                order: ['detectar', 'contener', 'evidencia', 'reportar', 'seguimiento'],
              },
            },
            {
              id: 'reporte',
              type: 'MULTIPLE_SELECT',
              title: 'Información útil para el reporte',
              instructions:
                'Selecciona los datos que ayudan a investigar el incidente.',
              required: true,
              hints: [
                'No necesitas enviar contraseñas ni códigos de verificación.',
              ],
              options: [
                { id: 'hora', text: 'Hora aproximada en que se detectó la anomalía.' },
                { id: 'cuentas', text: 'Cuentas y servicios posiblemente afectados.' },
                { id: 'acciones', text: 'Acciones realizadas hasta el momento.' },
                { id: 'password', text: 'La contraseña actual de la cuenta afectada.' },
                { id: 'evidencia', text: 'Mensajes o capturas que permitan identificar el evento.' },
                { id: 'codigo', text: 'El último código de autenticación recibido.' },
              ],
              solution: { optionIds: ['hora', 'cuentas', 'acciones', 'evidencia'] },
            },
            {
              id: 'decision',
              type: 'DECISION_STEPS',
              title: 'Decisiones durante la contención',
              instructions:
                'Elige la acción más adecuada en cada momento del escenario.',
              required: true,
              hints: [
                'Primero protege la cuenta; después revisa y documenta.',
              ],
              steps: [
                {
                  id: 'paso-1',
                  prompt:
                    'Confirmas que hay una sesión desconocida activa. ¿Qué haces?',
                  options: [
                    { id: 'cerrar', text: 'Cerrar la sesión y cambiar la contraseña desde un dispositivo de confianza.' },
                    { id: 'esperar', text: 'Esperar a que el atacante cierre la sesión.' },
                    { id: 'borrar', text: 'Borrar todos los mensajes de la cuenta para ocultar el problema.' },
                  ],
                },
                {
                  id: 'paso-2',
                  prompt:
                    'El atacante cambió el correo de recuperación. ¿Qué haces?',
                  options: [
                    { id: 'recuperar', text: 'Usar el procedimiento oficial de recuperación y reportar el cambio.' },
                    { id: 'ignorar', text: 'Ignorarlo porque la contraseña todavía funciona.' },
                    { id: 'compartir', text: 'Pedir a un contacto que intente recuperar la cuenta por ti.' },
                  ],
                },
                {
                  id: 'paso-3',
                  prompt:
                    'Después de recuperar el acceso, ¿qué revisas primero?',
                  options: [
                    { id: 'sesiones', text: 'Sesiones activas, permisos y métodos de recuperación.' },
                    { id: 'firma', text: 'Solo el diseño de la firma del correo.' },
                    { id: 'nada', text: 'Nada más; el incidente ya terminó.' },
                  ],
                },
              ],
              solution: {
                answers: [
                  { stepId: 'paso-1', optionId: 'cerrar' },
                  { stepId: 'paso-2', optionId: 'recuperar' },
                  { stepId: 'paso-3', optionId: 'sesiones' },
                ],
              },
            },
            {
              id: 'terminal',
              type: 'TERMINAL',
              title: 'Consola de respuesta simulada',
              instructions:
                'Ejecuta los comandos necesarios para revisar las sesiones, revocarlas y registrar el reporte. La consola es simulada y no afecta sistemas reales.',
              required: true,
              hints: [
                'Puedes consultar los comandos disponibles con el comando ayuda.',
              ],
              welcome:
                'Consola de práctica aislada. Los comandos se ejecutan únicamente en el escenario simulado.',
              prompt:
                'Revisa las sesiones, revoca el acceso desconocido y registra el reporte.',
              commands: [
                {
                  command: 'ayuda',
                  output: 'Comandos disponibles: estado, sesiones, revocar, reportar',
                  description: 'Muestra la ayuda de la consola simulada.',
                },
                {
                  command: 'estado',
                  output: 'Estado: cuenta con una sesión desconocida detectada.',
                  description: 'Consulta el estado del escenario.',
                },
                {
                  command: 'sesiones',
                  output: 'Sesión 1: dispositivo conocido. Sesión 2: ubicación desconocida.',
                  description: 'Lista las sesiones activas simuladas.',
                },
                {
                  command: 'revocar',
                  output: 'Sesión desconocida revocada en el escenario simulado.',
                  description: 'Revoca la sesión desconocida.',
                },
                {
                  command: 'reportar',
                  output: 'Reporte registrado en el canal simulado.',
                  description: 'Registra el reporte del incidente.',
                },
              ],
              solution: {
                requiredCommands: ['sesiones', 'revocar', 'reportar'],
              },
            },
          ],
        ),
      ],
    },
  ],
};

const courseFour: AcademicCourse = {
  title: 'Seguridad en redes WiFi',
  description:
    'Comprender los riesgos de las redes inalámbricas, identificar conexiones inseguras y aplicar medidas de protección al conectarse a redes públicas o privadas.',
  modules: [
    {
      title: 'Fundamentos de las redes inalámbricas',
      description:
        'Comprende cómo funciona una red WiFi, qué elementos intervienen y por qué las redes públicas requieren precauciones adicionales.',
      lessons: [
        theoryLesson(
          '¿Cómo funcionan las redes WiFi?',
          'Comunicación inalámbrica, puntos de acceso e identificación de red',
          [
            'Una red WiFi permite que dispositivos se conecten a una red local mediante ondas de radio. El punto de acceso o router emite la señal y coordina la comunicación. El dispositivo del usuario se asocia a la red y recibe los parámetros necesarios para intercambiar datos.',
            'El **SSID** es el nombre visible de la red. Puede haber varias redes con el mismo nombre, por lo que no basta con confiar en el texto que aparece en la lista. El cifrado inalámbrico, como WPA2 o WPA3, protege el tráfico entre el dispositivo y el punto de acceso, pero no sustituye otras medidas de seguridad.',
            'Las redes privadas suelen estar bajo el control de una persona u organización, mientras que las redes públicas están abiertas a muchos usuarios y pueden no tener una configuración confiable. Esa diferencia es clave para decidir qué actividades realizar en cada red.',
          ],
          [
            '**Punto de acceso:** equipo que emite y coordina la red inalámbrica.',
            '**SSID:** nombre con el que se identifica la red.',
            '**Cifrado:** protección del tráfico entre el dispositivo y el punto de acceso.',
            '**Red pública:** red accesible para muchas personas, a menudo sin control directo del usuario.',
            '**Red privada:** red administrada por una persona u organización con criterios definidos.',
          ],
          'El nombre de una red no es una prueba de identidad. Un atacante puede crear una red con un nombre parecido al de un lugar legítimo.',
          {
            table: {
              headers: ['Elemento', 'Función', 'Riesgo asociado'],
              rows: [
                ['SSID', 'Identifica la red.', 'Puede ser imitado por un punto de acceso falso.'],
                ['Punto de acceso', 'Conecta dispositivos a la red.', 'Puede ser controlado por un atacante.'],
                ['Cifrado', 'Protege el tráfico inalámbrico.', 'No protege frente a un punto de acceso malicioso.'],
              ],
            },
          },
        ),
        theoryLesson(
          'Riesgos de las redes WiFi públicas',
          'Comodidad y exposición suelen ir juntas',
          [
            'Las redes públicas pueden ser convenientes, pero no siempre ofrecen un entorno confiable. Una red abierta permite que otros usuarios compartan el mismo medio, y un punto de acceso puede ser falso o estar mal configurado. Esto aumenta la posibilidad de interceptación o de engaño.',
            'Los portales cautivos, las redes sin contraseña y los nombres repetidos son situaciones habituales. Un atacante puede aprovechar la necesidad de conectarse para ofrecer una red con un nombre atractivo y capturar información o redirigir a páginas fraudulentas.',
            'No todas las redes públicas son inseguras, pero conviene tratar las conexiones desconocidas como un entorno de mayor riesgo. Evita operaciones sensibles y utiliza protecciones adicionales cuando sea necesario.',
          ],
          [
            'Interceptación del tráfico no cifrado.',
            'Puntos de acceso falsos con nombres parecidos a los legítimos.',
            'Páginas de inicio de sesión fraudulentas presentadas como portales cautivos.',
            'Exposición de dispositivos que comparten archivos o servicios en la red.',
            'Redirecciones a sitios maliciosos o a formularios de captura de credenciales.',
            'Falta de control sobre la configuración y la permanencia de la red.',
          ],
          'Si necesitas realizar una operación sensible, espera a estar en una red confiable o utiliza una conexión protegida. La comodidad no debe prevalecer sobre la seguridad de tus credenciales.',
          { variant: 'WARNING' },
        ),
      ],
    },
    {
      title: 'Amenazas y ataques en redes inalámbricas',
      description:
        'Reconoce ataques de intermediario, redes falsas y otras técnicas que aprovechan la confianza en una conexión inalámbrica.',
      lessons: [
        theoryLesson(
          'Ataques de intermediario (MITM)',
          'El atacante se coloca entre el dispositivo y el destino',
          [
            'En un ataque de **intermediario** o MITM, el atacante intercepta o modifica la comunicación entre dos partes. En una red inalámbrica puede lograrlo con un punto de acceso falso, con técnicas de suplantación o aprovechando configuraciones débiles.',
            'El objetivo puede ser observar información, redirigir a una página falsa o alterar el contenido que recibe la víctima. Si el tráfico no está protegido de extremo a extremo, el atacante puede leer datos sensibles. Incluso con HTTPS, una página fraudulenta puede intentar engañar a la persona para que entregue sus credenciales.',
            'Las señales no siempre son visibles. Un certificado inválido, una redirección inesperada o una advertencia del navegador son motivos para detenerse. La verificación del dominio y el uso de conexiones confiables reducen el riesgo.',
          ],
          [
            'Punto de acceso falso que imita el nombre de una red legítima.',
            'Redirección del tráfico hacia un portal o una página fraudulenta.',
            'Interceptación de datos transmitidos sin cifrado.',
            'Manipulación de DNS para llevar a un sitio falso.',
            'Advertencias de certificado ignoradas por la persona.',
          ],
          'No ignores las advertencias de certificado. Si el navegador indica que la conexión no es segura, detente y verifica antes de continuar.',
          {
            table: {
              headers: ['Señal', 'Qué puede indicar', 'Acción recomendada'],
              rows: [
                ['Certificado inválido', 'Suplantación o configuración incorrecta.', 'No continuar y verificar el sitio.'],
                ['Redirección inesperada', 'Intercepción o página fraudulenta.', 'Cerrar y acceder desde una dirección conocida.'],
                ['Red con nombre repetido', 'Punto de acceso falso.', 'No conectarse sin verificar con el establecimiento.'],
              ],
            },
          },
        ),
        theoryLesson(
          'Redes falsas y otros ataques WiFi',
          'La confianza en el nombre de la red puede ser explotada',
          [
            'Una **red falsa** o *evil twin* es un punto de acceso que imita el nombre de una red legítima. La víctima se conecta pensando que está en el lugar correcto y el atacante puede observar o redirigir parte de la comunicación. El engaño puede incluir un portal cautivo que solicita credenciales.',
            'Otros ataques buscan interrumpir la conexión o forzar la reconexión a un punto de acceso controlado. También pueden aprovechar configuraciones débiles del router, contraseñas predeterminadas o servicios de administración expuestos. La prevención incluye verificar la red, proteger el router y mantener los dispositivos actualizados.',
            'Los ataques de denegación de servicio o las desconexiones inalámbricas no siempre buscan robar datos de inmediato. Pueden ser parte de un intento mayor para que la persona se reconecte a una red falsa o pierda confianza en la red legítima.',
          ],
          [
            'Verifica el nombre exacto de la red con el establecimiento o la persona responsable.',
            'Desconfía de redes abiertas con nombres genéricos o demasiado atractivos.',
            'No introduzcas credenciales en portales cautivos que no esperabas.',
            'Cambia las contraseñas predeterminadas del router y protege su administración.',
            'Mantén actualizado el firmware del router y de los dispositivos.',
            'Desactiva la conexión automática a redes abiertas.',
          ],
          'Una red con el mismo nombre que la oficial puede ser falsa. Si hay dudas, pregunta al establecimiento antes de conectarte.',
          { variant: 'WARNING' },
        ),
      ],
    },
    {
      title: 'Protección y navegación segura',
      description:
        'Aplica VPN, HTTPS y buenos hábitos de conexión para reducir la exposición en redes inalámbricas.',
      lessons: [
        theoryLesson(
          'Uso de VPN y protección de conexiones',
          'Una VPN protege el túnel, no toda la seguridad',
          [
            'Una **VPN** crea un túnel cifrado entre el dispositivo y el servidor del proveedor. Esto reduce la exposición del tráfico en la red local, especialmente en redes públicas. Sin embargo, la VPN no convierte una conexión en completamente segura ni hace que una página fraudulenta sea legítima.',
            'La VPN protege el tramo entre el dispositivo y el servidor VPN. A partir de ese servidor, el tráfico sigue su curso y depende de otras protecciones, como HTTPS. Tampoco impide que un atacante engañe a la persona para que entregue credenciales en un sitio falso.',
            'Al elegir una VPN, considera quién la administra, qué políticas de privacidad aplica y si el servicio es confiable. Una VPN gratuita o desconocida puede introducir nuevos riesgos. En el ámbito laboral, utiliza la solución aprobada por la organización.',
          ],
          [
            'La VPN cifra el tráfico entre el dispositivo y el servidor VPN.',
            'No sustituye HTTPS ni la verificación del dominio.',
            'No garantiza el anonimato ni la legitimidad de los sitios.',
            'Debe provenir de un proveedor o una organización confiable.',
            'Puede ser útil en redes públicas, pero no elimina todos los riesgos.',
            'Configura el bloqueo de conexión si la VPN se interrumpe, cuando esté disponible.',
          ],
          'Una VPN no corrige un sitio fraudulento ni una credencial entregada por error. Úsala como una capa adicional, no como la única protección.',
          { variant: 'COMMON_MISTAKE' },
        ),
        theoryLesson(
          'Buenas prácticas al conectarse a redes WiFi',
          'Verifica, protege y evita operaciones sensibles en entornos desconocidos',
          [
            'Antes de conectarte, comprueba que el nombre de la red coincide con el que esperas. Si estás en un establecimiento, pregunta al personal. Evita las redes abiertas que no puedas identificar y desconfía de los nombres que imitan a los oficiales.',
            'Durante la conexión, utiliza HTTPS y evita introducir credenciales en páginas que no hayas verificado. Si necesitas realizar una operación sensible, espera a estar en una red confiable o utiliza una conexión protegida. Mantén el dispositivo actualizado y revisa qué servicios comparte en la red.',
            'Al terminar, olvida la red si no la vas a usar de nuevo y desactiva la conexión automática. Estas medidas reducen la posibilidad de reconectarte sin darte cuenta a una red falsa en el futuro.',
          ],
          [
            'Confirma el SSID exacto antes de conectarte.',
            'Prefiere redes conocidas y protegidas.',
            'Desactiva la conexión automática a redes abiertas.',
            'Utiliza HTTPS y verifica el dominio antes de introducir datos.',
            'Evita operaciones bancarias o accesos sensibles en redes desconocidas.',
            'Mantén actualizados el sistema, el navegador y las aplicaciones.',
            'Olvida las redes que ya no utilizas.',
          ],
          'La mejor protección en una red desconocida es reducir lo que haces en ella. Si la operación es sensible, espera a tener una conexión confiable.',
          { variant: 'TIP' },
        ),
      ],
    },
    {
      title: 'Laboratorio práctico del curso',
      description:
        'Enfrenta un escenario simulado de conexión a una red pública y aplica decisiones de protección.',
      lessons: [
        laboratoryLesson(
          'Conexión segura bajo presión',
          'Estás en un lugar público y necesitas revisar una cuenta. La red WiFi disponible tiene un nombre parecido al del establecimiento, pero no coincide exactamente.',
          'Identificar señales de una red sospechosa, elegir protecciones adecuadas y ordenar las acciones para reducir el riesgo antes de realizar una operación sensible.',
          'El establecimiento ofrece una red oficial, pero aparecen varias redes con nombres similares. No tienes acceso al router ni puedes confirmar la configuración de la red.',
          [
            {
              id: 'red',
              type: 'SINGLE_CHOICE',
              title: 'Elige la red antes de conectarte',
              instructions:
                'Selecciona la opción más segura con la información disponible.',
              required: true,
              hints: [
                'El nombre parecido no es suficiente para confiar en una red.',
              ],
              options: [
                { id: 'abierta', text: 'La red abierta con el nombre más parecido al establecimiento.' },
                { id: 'oficial', text: 'La red oficial confirmada con el personal del establecimiento.' },
                { id: 'gratis', text: 'Una red llamada WiFi gratis que no requiere contraseña.' },
                { id: 'vecina', text: 'La red de un local cercano que tiene una señal más fuerte.' },
              ],
              solution: { optionId: 'oficial' },
            },
            {
              id: 'senales',
              type: 'IDENTIFY_SUSPICIOUS',
              title: 'Señales de una red sospechosa',
              instructions:
                'Selecciona las señales que aumentan la sospecha sobre una red inalámbrica.',
              required: true,
              hints: [
                'Una red abierta no es automáticamente maliciosa, pero sí aumenta la exposición.',
              ],
              elements: [
                { id: 'nombre', text: 'El nombre imita al oficial con una palabra añadida.' },
                { id: 'abierta', text: 'La red no requiere contraseña y no se sabe quién la administra.' },
                { id: 'portal', text: 'El portal solicita credenciales del correo para acceder a Internet.' },
                { id: 'senal', text: 'La señal es fuerte.' },
                { id: 'certificado', text: 'El navegador muestra una advertencia de certificado al abrir un sitio.' },
                { id: 'password', text: 'La red utiliza una contraseña compartida por el establecimiento.' },
              ],
              solution: {
                elementIds: ['nombre', 'abierta', 'portal', 'certificado'],
              },
            },
            {
              id: 'protecciones',
              type: 'MULTIPLE_SELECT',
              title: 'Medidas de protección',
              instructions:
                'Selecciona las medidas que reducen el riesgo en una red desconocida.',
              required: true,
              hints: [
                'La VPN y HTTPS protegen aspectos distintos de la conexión.',
              ],
              options: [
                { id: 'vpn', text: 'Utilizar una VPN confiable cuando sea necesario.' },
                { id: 'https', text: 'Comprobar que el sitio utiliza HTTPS y verificar el dominio.' },
                { id: 'sensible', text: 'Evitar operaciones sensibles hasta estar en una red confiable.' },
                { id: 'certificado', text: 'Ignorar las advertencias de certificado para continuar.' },
                { id: 'auto', text: 'Mantener la conexión automática a todas las redes abiertas.' },
              ],
              solution: { optionIds: ['vpn', 'https', 'sensible'] },
            },
            {
              id: 'decision',
              type: 'DECISION_STEPS',
              title: 'Decide durante la conexión',
              instructions:
                'Elige la respuesta más adecuada en cada momento.',
              required: true,
              hints: [
                'Si el navegador advierte sobre un certificado, no continúes.',
              ],
              steps: [
                {
                  id: 'paso-1',
                  prompt:
                    'El portal de la red solicita tu contraseña de correo para permitir el acceso. ¿Qué haces?',
                  options: [
                    { id: 'escribir', text: 'Escribir la contraseña porque el portal parece oficial.' },
                    { id: 'cerrar', text: 'Cerrar el portal y no introducir credenciales.' },
                    { id: 'compartir', text: 'Usar una contraseña de otro servicio para probar.' },
                  ],
                },
                {
                  id: 'paso-2',
                  prompt:
                    'El navegador muestra una advertencia de certificado al abrir el sitio que necesitas. ¿Qué haces?',
                  options: [
                    { id: 'ignorar', text: 'Ignorar la advertencia y continuar.' },
                    { id: 'detener', text: 'Detenerte y verificar la dirección antes de continuar.' },
                    { id: 'desactivar', text: 'Desactivar la comprobación de seguridad del navegador.' },
                  ],
                },
                {
                  id: 'paso-3',
                  prompt:
                    'Necesitas realizar una operación sensible y la red no es confiable. ¿Qué haces?',
                  options: [
                    { id: 'esperar', text: 'Esperar a estar en una red confiable o utilizar una conexión protegida.' },
                    { id: 'hacer', text: 'Realizarla igualmente porque la VPN está activa.' },
                    { id: 'pedir', text: 'Pedir a otra persona que introduzca sus credenciales.' },
                  ],
                },
              ],
              solution: {
                answers: [
                  { stepId: 'paso-1', optionId: 'cerrar' },
                  { stepId: 'paso-2', optionId: 'detener' },
                  { stepId: 'paso-3', optionId: 'esperar' },
                ],
              },
            },
          ],
        ),
      ],
    },
  ],
};

const courseFive: AcademicCourse = {
  title: 'Amenazas emergentes',
  description:
    'Reconocer amenazas digitales actuales y emergentes, comprender nuevas técnicas de manipulación y aplicar medidas de prevención ante riesgos asociados a inteligencia artificial, ingeniería social y dispositivos externos.',
  modules: [
    {
      title: 'Deepfakes e inteligencia artificial en la ciberseguridad',
      description:
        'Comprende qué es un deepfake, cómo se genera contenido sintético y qué señales pueden ayudar a identificar una manipulación.',
      lessons: [
        theoryLesson(
          '¿Qué son los deepfakes y cómo funcionan?',
          'Contenido sintético que puede imitar voces, rostros y situaciones',
          [
            'Un **deepfake** es un contenido audiovisual generado o manipulado con técnicas de inteligencia artificial para hacer que una persona parezca decir o hacer algo que no ocurrió. Puede afectar imágenes, videos o audio, y su calidad depende de los datos y los modelos utilizados.',
            'No todo contenido sintético es malicioso. La tecnología también se usa en cine, educación o accesibilidad. El riesgo aparece cuando se emplea para suplantar, engañar o manipular a una persona u organización. La voz y el rostro son especialmente sensibles porque se utilizan como señales de confianza.',
            'La disponibilidad de herramientas y la facilidad para compartir contenido aumentan la posibilidad de que un deepfake llegue a una víctima. Por eso conviene verificar la fuente y el contexto antes de tomar decisiones basadas en un audio o un video.',
          ],
          [
            'Manipulación de rostros en videos o videollamadas.',
            'Clonación de voz para simular llamadas o mensajes.',
            'Creación de imágenes o situaciones que nunca ocurrieron.',
            'Suplantación de personas conocidas o de figuras de autoridad.',
            'Uso de contenido falso para obtener dinero, acceso o información.',
          ],
          'La existencia de un video o un audio no es una prueba suficiente de autenticidad. Verifica por un canal independiente cuando la solicitud sea importante.',
          { variant: 'IMPORTANT' },
        ),
        theoryLesson(
          'Identificación de contenido manipulado',
          'Las señales visuales ayudan, pero no sustituyen la verificación',
          [
            'Un contenido manipulado puede presentar inconsistencias en la iluminación, los bordes, la sincronización entre audio y labios, los dientes, los ojos o el movimiento del cabello. En el audio, pueden aparecer pausas extrañas, respiración artificial o una entonación poco natural.',
            'Estas señales no son concluyentes. Los modelos mejoran con rapidez y un contenido falso puede no mostrar errores evidentes. Además, la compresión, la baja calidad o las condiciones de grabación pueden producir anomalías similares en un contenido auténtico.',
            'La verificación debe centrarse en la fuente y en el contexto. ¿Quién envió el contenido? ¿Se puede confirmar por otro canal? ¿La solicitud es coherente con lo que esa persona u organización haría? Las herramientas de detección pueden ayudar, pero no deben considerarse infalibles.',
          ],
          [
            'Inconsistencias entre el movimiento de los labios y el audio.',
            'Iluminación, sombras o bordes que no coinciden.',
            'Parpadeo, respiración o movimientos faciales poco naturales.',
            'Cambios bruscos de calidad o de tono en el audio.',
            'Solicitudes urgentes que solo se apoyan en el contenido audiovisual.',
            'Falta de una fuente verificable o de un canal alternativo.',
          ],
          'No bases una decisión importante únicamente en una impresión visual. Confirma la identidad y la solicitud por un canal que ya conozcas.',
          { variant: 'WARNING' },
        ),
      ],
    },
    {
      title: 'Ingeniería social avanzada',
      description:
        'Analiza cómo la personalización y la inteligencia artificial transforman las técnicas de manipulación.',
      lessons: [
        theoryLesson(
          'Evolución de la ingeniería social',
          'Del engaño masivo al pretexto personalizado',
          [
            'La ingeniería social busca influir en las personas para que realicen una acción o revelen información. Tradicionalmente se asociaba con correos masivos, pero hoy puede combinar mensajes personalizados, llamadas, redes sociales y contenido generado con inteligencia artificial.',
            'Los atacantes investigan contextos, relaciones y hábitos para construir un pretexto creíble. Pueden hacerse pasar por un compañero, un proveedor, una autoridad o un servicio de soporte. La personalización hace que las señales tradicionales sean menos evidentes.',
            'La defensa no consiste en desconfiar de todo, sino en verificar las solicitudes importantes por canales independientes y en mantener procedimientos claros para cambios sensibles, pagos o accesos.',
          ],
          [
            'Mensajes masivos con pretextos genéricos.',
            'Ataques dirigidos con información obtenida de redes sociales o filtraciones.',
            'Suplantación de personas con las que existe una relación de confianza.',
            'Uso de voz o video sintético para reforzar el engaño.',
            'Combinación de varios canales para aumentar la credibilidad.',
            'Aprovechamiento de momentos de presión, cambio o crisis.',
          ],
          'Cuanto más específico es el pretexto, más necesario es verificar. La personalización no convierte un mensaje en legítimo.',
          { variant: 'IMPORTANT' },
        ),
        theoryLesson(
          'Nuevas técnicas de manipulación y engaño',
          'La tecnología amplía los recursos del atacante',
          [
            'La inteligencia artificial permite generar textos, voces e imágenes con mayor rapidez y coherencia. Un atacante puede utilizarla para redactar mensajes convincentes, clonar una voz o preparar un video falso. También puede automatizar la búsqueda de información y la creación de pretextos.',
            'Otras técnicas incluyen la fatiga de MFA, el phishing mediante códigos QR, la suplantación en videollamadas y la creación de perfiles falsos. El objetivo sigue siendo el mismo: conseguir que la persona actúe sin verificar.',
            'La mejor respuesta es establecer puntos de control. Las solicitudes de pago, cambios de credenciales o accesos excepcionales deben verificarse por un canal conocido. La urgencia y la autoridad son señales para detenerse, no para acelerar.',
          ],
          [
            'Mensajes generados con inteligencia artificial y adaptados al contexto.',
            'Clonación de voz en llamadas o mensajes de audio.',
            'Videollamadas con rostros o voces manipuladas.',
            'Solicitudes repetidas de aprobación de MFA hasta provocar cansancio.',
            'Códigos QR que dirigen a páginas fraudulentas.',
            'Perfiles falsos en redes sociales y aplicaciones de mensajería.',
          ],
          'Si una solicitud implica dinero, credenciales o acceso excepcional, verifica por un canal independiente aunque el mensaje parezca provenir de una persona conocida.',
          { variant: 'WARNING' },
        ),
      ],
    },
    {
      title: 'Dispositivos USB y amenazas físicas digitales',
      description:
        'Comprende los riesgos de los dispositivos USB y aplica medidas de prevención frente a amenazas físicas y emergentes.',
      lessons: [
        theoryLesson(
          'Los dispositivos USB como vector de ataque',
          'Un dispositivo aparentemente inofensivo puede introducir código o extraer datos',
          [
            'Los dispositivos USB pueden transportar archivos maliciosos, ejecutar instrucciones automáticas o simular otros dispositivos, como un teclado. También pueden utilizarse para extraer información de un equipo. El riesgo no depende solo del contenido visible: el firmware o el comportamiento del dispositivo también importan.',
            'Los atacantes pueden dejar dispositivos USB en lugares estratégicos para despertar curiosidad. Una vez conectados, el equipo puede ejecutar código, instalar programas o exponer datos. Las técnicas de autorun están limitadas en muchos sistemas, pero eso no elimina todos los riesgos.',
            'La prevención incluye no conectar dispositivos desconocidos, desactivar la ejecución automática, utilizar equipos y cargadores confiables y reportar los dispositivos encontrados. En entornos organizacionales, deben seguirse los procedimientos establecidos.',
          ],
          [
            'No conectes dispositivos USB encontrados o de origen desconocido.',
            'Desactiva la ejecución automática cuando sea posible.',
            'Utiliza cargadores y cables confiables.',
            'Evita conectar dispositivos personales a equipos sensibles sin autorización.',
            'Analiza los archivos con las herramientas disponibles antes de abrirlos.',
            'Reporta los dispositivos sospechosos por el canal establecido.',
          ],
          'La curiosidad es parte del engaño. Un USB abandonado puede ser una trampa diseñada para que alguien lo conecte.',
          { variant: 'WARNING' },
        ),
        theoryLesson(
          'Prevención y protección frente a amenazas emergentes',
          'Verificación, actualización y hábitos sostenidos',
          [
            'Las amenazas emergentes cambian, pero muchas defensas siguen siendo válidas: verificar la identidad, mantener los sistemas actualizados, usar autenticación multifactor, aplicar el mínimo privilegio y conservar copias de seguridad. La novedad de una técnica no elimina la utilidad de estos controles.',
            'También es importante reducir la superficie de exposición. No compartas información sensible innecesariamente, revisa los permisos de las aplicaciones y desconfía de las solicitudes que intentan saltarse los procedimientos. La formación y la comunicación ayudan a que las señales lleguen antes.',
            'Frente a contenido generado por inteligencia artificial, la verificación por canales alternativos es clave. Frente a dispositivos físicos, la prevención empieza por no conectarlos. Frente a la ingeniería social, la respuesta es detenerse y confirmar.',
          ],
          [
            'Verifica las solicitudes importantes por un canal independiente.',
            'Mantén actualizados los sistemas y las aplicaciones.',
            'Utiliza MFA y protege los métodos de recuperación.',
            'Aplica el mínimo privilegio y revisa permisos.',
            'No conectes dispositivos desconocidos.',
            'Conserva copias de seguridad y prueba su recuperación.',
            'Reporta anomalías y comparte aprendizajes sin exponer datos sensibles.',
          ],
          'La seguridad no depende de reconocer una única técnica, sino de mantener hábitos de verificación y respuesta.',
          { variant: 'TIP' },
        ),
      ],
    },
    {
      title: 'Laboratorio práctico del curso',
      description:
        'Analiza un escenario con contenido sintético, una solicitud urgente y un dispositivo USB sospechoso.',
      lessons: [
        laboratoryLesson(
          'Identifica la amenaza emergente',
          'Recibes un video de una persona conocida que solicita una transferencia urgente. Al mismo tiempo, aparece un USB abandonado cerca de tu equipo.',
          'Identificar señales de manipulación, verificar solicitudes por canales independientes y decidir cómo actuar ante dispositivos desconocidos.',
          'El video parece auténtico, pero la solicitud es inusual y llega en un momento de presión. No tienes una forma inmediata de confirmar la identidad por el mismo canal.',
          [
            {
              id: 'senales',
              type: 'IDENTIFY_SUSPICIOUS',
              title: 'Señales en el video',
              instructions:
                'Selecciona los elementos que justifican una verificación adicional.',
              required: true,
              hints: [
                'La calidad del video no confirma la autenticidad de la solicitud.',
              ],
              elements: [
                { id: 'labios', text: 'El movimiento de los labios no coincide con el audio.' },
                { id: 'urgencia', text: 'La persona exige una transferencia inmediata y evita preguntas.' },
                { id: 'iluminacion', text: 'La iluminación del rostro cambia de forma extraña entre cuadros.' },
                { id: 'saludo', text: 'La persona utiliza un saludo habitual.' },
                { id: 'canal', text: 'La solicitud llega por un canal distinto al habitual y no se puede confirmar.' },
                { id: 'fondo', text: 'El fondo tiene una oficina.' },
              ],
              solution: {
                elementIds: ['labios', 'urgencia', 'iluminacion', 'canal'],
              },
            },
            {
              id: 'decision',
              type: 'SINGLE_CHOICE',
              title: 'Decide antes de transferir',
              instructions:
                'Selecciona la acción más segura ante la solicitud del video.',
              required: true,
              hints: [
                'Verifica por un canal que ya conozcas, no por el mismo video.',
              ],
              options: [
                { id: 'transferir', text: 'Realizar la transferencia porque el video parece auténtico.' },
                { id: 'responder', text: 'Responder al mismo mensaje para pedir más datos.' },
                { id: 'verificar', text: 'Detenerte y verificar la solicitud por un canal independiente.' },
                { id: 'reenviar', text: 'Reenviar el video a otras personas para que opinen.' },
              ],
              solution: { optionId: 'verificar' },
            },
            {
              id: 'usb',
              type: 'MULTIPLE_SELECT',
              title: 'Qué hacer con el USB encontrado',
              instructions:
                'Selecciona las acciones adecuadas ante un dispositivo USB desconocido.',
              required: true,
              hints: [
                'No lo conectes para ver qué contiene.',
              ],
              options: [
                { id: 'no-conectar', text: 'No conectarlo al equipo.' },
                { id: 'reportar', text: 'Reportarlo por el canal establecido.' },
                { id: 'probar', text: 'Conectarlo en un equipo personal para ver los archivos.' },
                { id: 'entregar', text: 'Entregarlo a otra persona para que lo revise sin procedimiento.' },
              ],
              solution: { optionIds: ['no-conectar', 'reportar'] },
            },
            {
              id: 'pasos',
              type: 'DECISION_STEPS',
              title: 'Verifica y responde',
              instructions:
                'Elige la respuesta más adecuada en cada momento del escenario.',
              required: true,
              hints: [
                'La verificación debe ser independiente y la respuesta debe seguir el canal establecido.',
              ],
              steps: [
                {
                  id: 'paso-1',
                  prompt:
                    'Necesitas confirmar si la persona envió el video. ¿Cómo lo haces?',
                  options: [
                    { id: 'mismo', text: 'Responder al mismo chat y preguntar si es real.' },
                    { id: 'independiente', text: 'Contactar a la persona por un canal conocido y diferente.' },
                    { id: 'redes', text: 'Buscar el video en redes sociales para ver si es viral.' },
                  ],
                },
                {
                  id: 'paso-2',
                  prompt:
                    'La persona confirma que no envió el video. ¿Qué haces?',
                  options: [
                    { id: 'ignorar', text: 'Ignorar el caso porque no hubo transferencia.' },
                    { id: 'reportar', text: 'Reportar el intento de fraude y advertir a posibles contactos.' },
                    { id: 'responder', text: 'Responder al atacante para pedir explicaciones.' },
                  ],
                },
                {
                  id: 'paso-3',
                  prompt:
                    'Encuentras un USB cerca de tu equipo. ¿Qué haces?',
                  options: [
                    { id: 'conectar', text: 'Conectarlo para identificar a su dueño.' },
                    { id: 'aislar', text: 'No conectarlo y reportarlo por el canal establecido.' },
                    { id: 'guardar', text: 'Guardarlo para revisarlo después en otro equipo.' },
                  ],
                },
              ],
              solution: {
                answers: [
                  { stepId: 'paso-1', optionId: 'independiente' },
                  { stepId: 'paso-2', optionId: 'reportar' },
                  { stepId: 'paso-3', optionId: 'aislar' },
                ],
              },
            },
            {
              id: 'terminal',
              type: 'TERMINAL',
              title: 'Consola de verificación simulada',
              instructions:
                'Utiliza la consola simulada para verificar el escenario y registrar el reporte. No se ejecutan comandos reales.',
              required: true,
              hints: [
                'Consulta la ayuda si necesitas recordar los comandos disponibles.',
              ],
              welcome:
                'Consola de práctica aislada para el análisis de amenazas emergentes.',
              prompt:
                'Verifica el contenido, aísla el dispositivo y registra el reporte.',
              commands: [
                {
                  command: 'ayuda',
                  output: 'Comandos disponibles: verificar, aislar, reportar',
                  description: 'Muestra la ayuda de la consola simulada.',
                },
                {
                  command: 'verificar',
                  output: 'Verificación simulada: la solicitud no coincide con el canal habitual.',
                  description: 'Comprueba el contexto de la solicitud.',
                },
                {
                  command: 'aislar',
                  output: 'Dispositivo USB marcado como no conectado en el escenario simulado.',
                  description: 'Aísla el dispositivo desconocido.',
                },
                {
                  command: 'reportar',
                  output: 'Reporte registrado en el canal simulado.',
                  description: 'Registra el intento de fraude.',
                },
              ],
              solution: {
                requiredCommands: ['verificar', 'aislar', 'reportar'],
              },
            },
          ],
        ),
      ],
    },
  ],
};

export const ACADEMIC_COURSES: AcademicCourse[] = [
  courseOne,
  courseTwo,
  courseThree,
  courseFour,
  courseFive,
];
