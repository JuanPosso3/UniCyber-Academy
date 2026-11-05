/**
 * Evaluaciones finales iniciales para los cursos académicos existentes.
 *
 * Cada evaluación contiene exactamente 8 preguntas (4 de selección
 * múltiple con una sola respuesta correcta y 4 de verdadero o falso),
 * escritas a partir del contenido real de las lecciones del curso y
 * con una explicación y una orientación educativa por pregunta.
 *
 * Las opciones verdadero/falso se almacenan en el orden fijo
 * ["Verdadero", "Falso"]; en selección múltiple la posición de la
 * respuesta correcta varía entre preguntas.
 */

export interface FinalAssessmentOption {
  text: string;
  isCorrect: boolean;
}

export interface FinalAssessmentQuestion {
  statement: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
  explanation: string;
  hint: string;
  options: FinalAssessmentOption[];
}

export interface FinalAssessmentSpec {
  courseTitle: string;
  title: string;
  description: string;
  questions: FinalAssessmentQuestion[];
}

function trueOrFalse(
  statement: string,
  correctIsTrue: boolean,
  explanation: string,
  hint: string,
): FinalAssessmentQuestion {
  return {
    statement,
    type: 'TRUE_FALSE',
    explanation,
    hint,
    options: [
      { text: 'Verdadero', isCorrect: correctIsTrue },
      { text: 'Falso', isCorrect: !correctIsTrue },
    ],
  };
}

export const ACADEMIC_FINAL_ASSESSMENTS: FinalAssessmentSpec[] = [
  {
    courseTitle: 'Phishing y simulaciones de ataque',
    title: 'Evaluación final: Phishing y simulaciones de ataque',
    description:
      'Examen final del curso. Responde las 8 preguntas y obtén al menos 80 % para completarlo.',
    questions: [
      {
        statement: '¿Qué es el phishing?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'El phishing es una forma de ingeniería social en la que alguien se hace pasar por una entidad o persona confiable para inducir una acción perjudicial: entregar datos, abrir enlaces, descargar archivos o autorizar operaciones.',
        hint: 'Es un engaño que finge provenir de alguien de confianza para que actúes sin verificar.',
        options: [
          { text: 'Un método para mejorar la velocidad de internet.', isCorrect: false },
          { text: 'Una forma de ingeniería social en la que alguien se hace pasar por una entidad confiable para inducir una acción perjudicial.', isCorrect: true },
          { text: 'Un sistema para proteger contraseñas de accesos no autorizados.', isCorrect: false },
          { text: 'Una herramienta para actualizar programas automáticamente.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'El objetivo del phishing siempre es obtener dinero directamente de la víctima.',
        false,
        'El phishing puede buscar credenciales, códigos de autenticación, datos personales, instalar software malicioso o reutilizar la cuenta comprometida para nuevos ataques; el dinero directo es solo una de las posibles consecuencias.',
        'Recuerda que también puede buscar controlar cuentas o recopilar información.',
      ),
      trueOrFalse(
        'No todo mensaje no deseado es phishing: el spam busca difundir publicidad, mientras que el phishing busca que la persona realice una acción que beneficie al atacante.',
        true,
        'El spam es un envío masivo y no solicitado que no siempre es fraudulento; el phishing suplanta a una entidad o persona confiable para provocar una acción concreta que beneficie al atacante.',
        'La clave está en qué persigue cada uno: difusión masiva frente a manipulación dirigida.',
      ),
      {
        statement: '¿Cuál de las siguientes señales alertas sobre un correo electrónico falso?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Un correo fraudulento puede mostrar un nombre conocido acompañado de una dirección real distinta; por eso debe revisarse la dirección completa y el dominio del remitente, además del contexto y los enlaces.',
        hint: 'Compara el nombre que ves con el dominio desde el que se envió de verdad el mensaje.',
        options: [
          { text: 'El mensaje usa el logotipo de una empresa conocida.', isCorrect: false },
          { text: 'El asunto está redactado en minúsculas.', isCorrect: false },
          { text: 'El correo llegó temprano por la mañana.', isCorrect: false },
          { text: 'La dirección real del remitente no coincide con el nombre visible.', isCorrect: true },
        ],
      },
      trueOrFalse(
        'El candado de HTTPS garantiza que un sitio web es legítimo.',
        false,
        'HTTPS indica que la conexión está cifrada, no que el sitio sea confiable: un atacante también puede obtener un certificado para un dominio falso. Antes de ingresar credenciales debe verificarse el dominio exacto.',
        'Un sitio puede estar cifrado y seguir siendo una trampa.',
      ),
      trueOrFalse(
        'Al recibir un correo sospechoso es recomendable reenviarlo a todos tus contactos para que otros lo verifiquen.',
        false,
        'Reenviar un mensaje sospechoso puede propagar el contenido y confirmar que la dirección está activa. Lo correcto es no interactuar con el mensaje, conservarlo como evidencia y reportarlo por el canal que establece la organización.',
        'Piensa en qué hace el atacante cuando su mensaje empieza a circular.',
      ),
      {
        statement: '¿Qué acción ayuda a reducir el impacto si tu contraseña termina comprometida por un ataque de phishing?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'La autenticación multifactor añade una barrera cuando la contraseña queda comprometida; aun así, la verificación humana sigue siendo necesaria, porque el atacante puede intentar que la persona apruebe una solicitud fraudulenta.',
        hint: 'Piensa en una capa adicional al momento de iniciar sesión, no en la forma de abrir el mensaje.',
        options: [
          { text: 'Activar la autenticación multifactor cuando esté disponible.', isCorrect: true },
          { text: 'Reenviar el mensaje a más personas para advertirles.', isCorrect: false },
          { text: 'Abrir los enlaces desde una ventana de incógnito.', isCorrect: false },
          { text: 'Usar la misma contraseña en todos los servicios.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'La urgencia de un mensaje es una señal para detenerse y verificar por otro canal antes de actuar, aunque el mensaje parezca legítimo.',
        true,
        'La urgencia es una de las técnicas de manipulación más frecuentes del phishing. Un mensaje legítimo también puede ser urgente, por lo que la solicitud debe verificarse por un canal independiente antes de responder.',
        'La prisa es una herramienta del atacante; úsala como recordatorio para frenar.',
      ),
    ],
  },
  {
    courseTitle: 'Gestión de contraseñas y autenticación',
    title: 'Evaluación final: Gestión de contraseñas y autenticación',
    description:
      'Examen final del curso. Responde las 8 preguntas y obtén al menos 80 % para completarlo.',
    questions: [
      {
        statement: 'Una contraseña construida con el nombre de tu mascota, tu año de nacimiento y un signo, ¿por qué resulta riesgosa?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Los patrones que combinan datos personales, fechas y símbolos son fáciles de adivinar: los atacantes prueban variantes conocidas como reemplazar letras por números o añadir el año de nacimiento.',
        hint: 'Piensa en cuánta información de este tipo queda expuesta en redes sociales.',
        options: [
          { text: 'Se pierde cuando el navegador borra su historial.', isCorrect: false },
          { text: 'Solo funciona en cuentas creadas durante ese mismo año.', isCorrect: false },
          { text: 'Requiere un gestor de contraseñas para poder guardarse.', isCorrect: false },
          { text: 'Se basa en datos o patrones personales fáciles de adivinar.', isCorrect: true },
        ],
      },
      trueOrFalse(
        'Una frase de contraseña larga y fácil de recordar puede ser más resistente que una palabra corta con símbolos.',
        true,
        'La longitud es uno de los factores más importantes: una frase formada por varias palabras con un elemento no predecible resiste mejor los ataques que una palabra corta aunque incluya mayúsculas y símbolos.',
        'La fuerza no depende solo de símbolos: la longitud cuenta mucho.',
      ),
      trueOrFalse(
        'El ataque de diccionario consiste en probar millones de combinaciones de caracteres completamente aleatorias.',
        false,
        'El ataque de diccionario usa listas de palabras, variantes y contraseñas filtradas conocidas; el que prueba combinaciones masivas de caracteres es el ataque de fuerza bruta.',
        'Recuerda qué ataque se apoya en una "biblioteca" de palabras comunes.',
      ),
      {
        statement: '¿Cuál es el riesgo directo de usar la misma contraseña en varios servicios?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Al reutilizar una clave, el ataque conocido como credential stuffing permite que el atacante pruebe la contraseña obtenida de una filtración en otras cuentas; una sola filtración puede abrir varias puertas.',
        hint: 'Piensa en cerrar varias puertas con una misma llave y perder esa llave.',
        options: [
          { text: 'La contraseña deja de ser válida en el servicio filtrado.', isCorrect: false },
          { text: 'Una filtración en un servicio puede dar acceso a las demás cuentas.', isCorrect: true },
          { text: 'El sistema califica la cuenta como cerrada por seguridad.', isCorrect: false },
          { text: 'Los correos de recuperación se desactivan automáticamente.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'Usar la misma contraseña con pequeñas variantes, como cambiar un número al final, elimina el riesgo de reutilización.',
        false,
        'Las variantes predecibles son igual de fáciles de adivinar para un atacante automatizado; lo importante es que cada servicio tenga una contraseña distinta, algo que facilita el uso de un gestor de contraseñas.',
        'Los atacantes conocen las variantes "clásicas" y las prueban primero.',
      ),
      {
        statement: '¿Qué protege las credenciales guardadas en un gestor de contraseñas?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Un gestor almacena credenciales de forma cifrada y las protege con una frase maestra única; por eso la frase maestra debe ser especialmente robusta y no compartirse ni reutilizarse.',
        hint: 'Es la llave que abre todo el almacén.',
        options: [
          { text: 'El número de preguntas de seguridad del servicio.', isCorrect: false },
          { text: 'El cifrado del almacén protegido por la frase maestra.', isCorrect: true },
          { text: 'La dirección de correo usada para registrarse en los servicios.', isCorrect: false },
          { text: 'La función de autocompletado del navegador.', isCorrect: false },
        ],
      },
      {
        statement: '¿Cuál de las siguientes combinaciones constituye una autenticación multifactor real?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Los factores deben ser de tipos distintos: algo que sabes (contraseña), algo que tienes (llave física, aplicación autenticadora) y algo que eres (huella). Dos elementos del mismo tipo, como dos contraseñas, no constituyen MFA.',
        hint: 'Los factores no deben repetir la misma categoría, como "algo que sabes" dos veces.',
        options: [
          { text: 'Dos contraseñas distintas.', isCorrect: false },
          { text: 'Una contraseña y una pregunta de seguridad.', isCorrect: false },
          { text: 'Una contraseña y una huella digital.', isCorrect: true },
          { text: 'Un nombre de usuario y un correo electrónico de contacto.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'Si recibes una notificación de aprobación que no iniciaste, debes rechazarla y verificar la seguridad de tu cuenta.',
        true,
        'Las solicitudes de aprobación que no iniciaste pueden ser intentos de acceso a tu cuenta, incluidos ataques de fatiga de MFA. Rechazarlas y revisar la seguridad es la acción correcta.',
        'Nadie más debería estar pidiendo entrar a tu cuenta en ese momento.',
      ),
    ],
  },
  {
    courseTitle: 'Respuesta a incidentes de seguridad',
    title: 'Evaluación final: Respuesta a incidentes de seguridad',
    description:
      'Examen final del curso. Responde las 8 preguntas y obtén al menos 80 % para completarlo.',
    questions: [
      {
        statement: '¿Qué es un incidente de seguridad informática?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Un incidente es un evento o una serie de eventos que comprometen o ponen en riesgo la confidencialidad, la integridad o la disponibilidad de la información y de los sistemas; no todo evento lo es.',
        hint: 'Piensa en eventos que afectan a la información y a los sistemas, no a la operación cotidiana.',
        options: [
          { text: 'Una actualización programada del sistema.', isCorrect: false },
          { text: 'Un evento que compromete o pone en riesgo la confidencialidad, la integridad o la disponibilidad de la información.', isCorrect: true },
          { text: 'El nombre del equipo encargado de la seguridad informática.', isCorrect: false },
          { text: 'Un inicio de sesión normal de un usuario registrado.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'Cualquier evento es un incidente: un inicio de sesión normal también lo es.',
        false,
        'No todo evento es un incidente: un inicio de sesión normal o una actualización programada forman parte de la operación habitual. Lo que define al incidente es que afecta o puede afectar la seguridad.',
        'El detalle está en si el evento daña o amenaza la seguridad.',
      ),
      {
        statement: 'En el contexto de seguridad, ¿qué es una vulnerabilidad?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Una vulnerabilidad es una debilidad que puede ser aprovechada; la amenaza es aquello que puede causar daño y el riesgo es la posibilidad de que la amenaza se materialice sobre la vulnerabilidad.',
        hint: 'No es una persona ni una probabilidad: es una condición que facilita el daño.',
        options: [
          { text: 'La posibilidad de que ocurra un daño.', isCorrect: false },
          { text: 'Aquello que puede causar daño por medios digitales.', isCorrect: false },
          { text: 'El equipo encargado de la seguridad informática.', isCorrect: false },
          { text: 'Una debilidad que puede ser aprovechada.', isCorrect: true },
        ],
      },
      trueOrFalse(
        'Al detectar un posible incidente conviene conservar mensajes, capturas o archivos relacionados y registrar las acciones realizadas.',
        true,
        'La información conservada permite entender qué ocurrió y seguir las indicaciones del equipo responsable; borrar archivos o registros por iniciativa propia puede perjudicar la investigación.',
        'Documenta lo observado y conserva la evidencia.',
      ),
      {
        statement: '¿Qué información debe contener un buen reporte de incidente?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Un reporte claro describe qué se observó, cuándo se detectó, qué cuentas o sistemas involucró y qué acciones se realizaron, sin conclusiones apresuradas; así el equipo responsable puede actuar con rapidez.',
        hint: 'Describe señales y datos ordenados, sin conclusiones apresuradas.',
        options: [
          { text: 'Conclusiones sobre el culpable del incidente.', isCorrect: false },
          { text: 'El nombre del programa afectado, sin más detalles.', isCorrect: false },
          { text: 'Qué se observó, cuándo, qué fue afectado y qué acciones se realizaron.', isCorrect: true },
          { text: 'Las contraseñas y códigos completos del usuario.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'Si otra persona tomó el control de tu cuenta, una de las primeras acciones es cambiar la contraseña desde un dispositivo de confianza y cerrar las sesiones activas.',
        true,
        'La respuesta a la suplantación comienza por recuperar el control: cambiar la contraseña desde un dispositivo confiable, revisar los métodos de recuperación y cerrar sesiones y dispositivos desconocidos.',
        'Primero recupera el control y evita más entradas del atacante.',
      ),
      trueOrFalse(
        'Si no puedes recuperar una cuenta suplantada, conviene intentarlo con métodos improvisados publicados en redes sociales.',
        false,
        'Los métodos improvisados no son confiables: lo correcto es acudir al canal de soporte oficial del servicio y reportar la situación, siguiendo su procedimiento de recuperación.',
        'Piensa en un procedimiento oficial frente a consejos anónimos.',
      ),
      {
        statement: '¿Para qué sirve documentar un incidente después de recuperado?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'La documentación permite identificar fallas, hábitos de riesgo o necesidades de formación y comprobar si las medidas aplicadas funcionaron; no se trata de buscar culpables, sino de mejorar la capacidad de respuesta.',
        hint: 'Cerrar el incidente también quiere decir aprender y prevenir otros.',
        options: [
          { text: 'Para identificar fallas de configuración, hábitos de riesgo y comprobar si las medidas aplicadas funcionaron.', isCorrect: true },
          { text: 'Para avisar a los atacantes que el caso está cerrado.', isCorrect: false },
          { text: 'Para poder reutilizar con confianza las contraseñas comprometidas.', isCorrect: false },
          { text: 'Para subir el límite de almacenamiento de tu correo.', isCorrect: false },
        ],
      },
    ],
  },
  {
    courseTitle: 'Seguridad en redes WiFi',
    title: 'Evaluación final: Seguridad en redes WiFi',
    description:
      'Examen final del curso. Responde las 8 preguntas y obtén al menos 80 % para completarlo.',
    questions: [
      {
        statement: '¿Qué es el SSID en una red inalámbrica?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'El SSID es el nombre visible con el que se identifica la red; puede haber varias redes con el mismo nombre, por lo que un atacante puede imitarlo para engañar a los usuarios.',
        hint: 'Es lo que ves en la lista de redes disponibles.',
        options: [
          { text: 'El cifrado que protege el tráfico inalámbrico.', isCorrect: false },
          { text: 'El nombre visible con el que se identifica la red.', isCorrect: true },
          { text: 'El firmware del punto de acceso.', isCorrect: false },
          { text: 'La clave que solicitan los portales cautivos.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'El cifrado WPA2 o WPA3 protege el tráfico entre tu dispositivo y el punto de acceso, pero el nombre de la red no garantiza su identidad.',
        true,
        'El cifrado protege el tráfico, no la identidad de la red: un punto de acceso falso puede usar un nombre parecido u otro igual, por lo que el SSID por sí solo no es una prueba de confianza.',
        'El candado del tráfico no dice quién controla la red.',
      ),
      {
        statement: '¿Qué es una red falsa o "evil twin"?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Una red falsa es un punto de acceso que imita el nombre de una red legítima; la víctima se conecta creyendo estar en el lugar correcto mientras el atacante observa o redirige su comunicación.',
        hint: 'Piensa en un "lado B" de la red real que controla el atacante.',
        options: [
          { text: 'Un punto de acceso que imita el nombre de una red legítima para engañar.', isCorrect: true },
          { text: 'Un cable que conecta dos routers de la misma oficina.', isCorrect: false },
          { text: 'La red de invitados con ancho de banda limitado.', isCorrect: false },
          { text: 'Una aplicación oficial para medir la velocidad de internet.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'En un ataque de intermediario, el atacante interrumpe la conexión para impedir que la víctima navegue.',
        false,
        'En un ataque de intermediario, el atacante intercepta o modifica la comunicación entre el dispositivo y el destino, con un punto de acceso falso o aprovechando configuraciones débiles; la víctima suele navegar sin notarlo.',
        'El "intermediario" observa o altera el canal de comunicación.',
      ),
      trueOrFalse(
        'Si el navegador advierte un certificado inválido en una red pública, es seguro continuar navegando si actualizas la página.',
        false,
        'Las advertencias de certificado no deben ignorarse: pueden indicar un ataque de intermediario o una página fraudulenta. Lo correcto es detener la navegación y acceder a los servicios por un canal confiable conocido.',
        'Una advertencia del navegador pide revisión antes de continuar.',
      ),
      {
        statement: '¿Qué protege una VPN?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Una VPN crea un túnel cifrado entre el dispositivo y el servidor del proveedor; no sustituye la verificación de los sitios ni corrige páginas fraudulentas, y no garantiza el anonimato completo.',
        hint: 'El túnel protege cierto tramo de la comunicación, no todas las decisiones que tomas después.',
        options: [
          { text: 'La credencial entregada por error en un sitio falso.', isCorrect: false },
          { text: 'El tráfico entre tu dispositivo y el servidor de la VPN.', isCorrect: true },
          { text: 'La página fraudulenta para que parezca legítima.', isCorrect: false },
          { text: 'La contraseña del router del proveedor de internet.', isCorrect: false },
        ],
      },
      {
        statement: 'Necesitas hacer una operación bancaria y solo tienes a mano la WiFi de un café. ¿Qué conviene hacer?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Las redes desconocidas se tratan como entornos de mayor riesgo: las operaciones sensibles deben esperar a una conexión confiable o realizarse con una protección adicional aprobada, como la solución de VPN de la organización.',
        hint: 'Si la operación es sensible, la comodidad no debe prevalecer sobre la seguridad.',
        options: [
          { text: 'Realizar la operación desde el portal que tenga candado de seguridad.', isCorrect: false },
          { text: 'Esperar a contar con una conexión confiable o usar una protección adicional.', isCorrect: true },
          { text: 'Compartir la cuenta con otra persona para que le salga la operación.', isCorrect: false },
          { text: 'Desactivar las actualizaciones del sistema para acelerar la conexión.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'Desactivar la conexión automática a redes abiertas y olvidar las redes que ya no usas reduce el riesgo de reconectarte sin darte cuenta a una red falsa.',
        true,
        'Estas medidas evitan reconexiones automáticas a redes con nombres repetidos o falsas, uno de los engaños más habituales en redes inalámbricas; complementan la verificación del SSID antes de conectarse.',
        'Hazlo para que el dispositivo no elija la red por ti.',
      ),
    ],
  },
  {
    courseTitle: 'Amenazas emergentes',
    title: 'Evaluación final: Amenazas emergentes',
    description:
      'Examen final del curso. Responde las 8 preguntas y obtén al menos 80 % para completarlo.',
    questions: [
      {
        statement: '¿Qué es un deepfake?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Un deepfake es contenido audiovisual generado o manipulado con inteligencia artificial para hacer que una persona parezca decir o hacer algo que no ocurrió; su destino puede ser suplantar, engañar o manipular.',
        hint: 'Es contenido que imita la voz o el rostro de alguien real para hacerle decir o hacer lo que no ocurrió.',
        options: [
          { text: 'Un antivirus con reconocimiento facial incorporado.', isCorrect: false },
          { text: 'Una técnica para mejorar la resolución de fotos antiguas.', isCorrect: false },
          { text: 'Contenido audiovisual generado o manipulado con inteligencia artificial para simular que una persona dijo o hizo algo que no ocurrió.', isCorrect: true },
          { text: 'Un software de traducción simultánea de videos.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'No todo contenido sintético es malicioso: el riesgo aparece cuando se emplea para suplantar, engañar o manipular a personas u organizaciones.',
        true,
        'La misma tecnología también se usa en cine, educación o accesibilidad; lo que define el riesgo es el uso malicioso, no la tecnología por sí misma.',
        'La herramienta no es la amenaza; el uso dañino sí.',
      ),
      {
        statement: '¿Cuál de las siguientes señales puede indicar que un video o audio podría ser un contenido manipulado?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Las inconsistencias en la sincronización entre labios y audio, la iluminación, los bordes o los movimientos naturales pueden insinuar manipulación, aunque ninguna señal por sí sola es prueba definitiva.',
        hint: 'Las señales no son prueba definitiva; verifica la fuente y el contexto por otro canal.',
        options: [
          { text: 'La sincronía entre los labios y el audio no coincide.', isCorrect: true },
          { text: 'El video tiene una portada con título destacado.', isCorrect: false },
          { text: 'El video fue compartido muy temprano por la mañana.', isCorrect: false },
          { text: 'El video dura menos de un minuto.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'Las señales visibles de un deepfake, como errores de iluminación, son prueba suficiente para confirmar que un contenido es falso.',
        false,
        'Las señales visuales ayudan pero no sustituyen la verificación: los modelos mejoran rápidamente y la baja calidad puede producir estas anomalías también en contenido auténtico; la verificación debe centrarse en la fuente y el contexto.',
        'La última palabra no la tiene la imagen, sino la verificación por otro canal.',
      ),
      {
        statement: '¿Por qué la personalización de un mensaje de engaño lo hace más peligroso?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Un pretexto elaborado con detalles reales parece confiable; las señales tradicionales (errores, un destinatario genérico, una urgencia uniforme) son menos evidentes, por lo que verificar por otro canal se vuelve aún más necesario.',
        hint: 'Cuanto más específico es el pretexto, más importante es verificar.',
        options: [
          { text: 'Los mensajes personalizados son más largos y por eso se leen mejor.', isCorrect: false },
          { text: 'Las señales tradicionales de engaño se vuelven menos evidentes.', isCorrect: true },
          { text: 'Los filtros antispam dejan de funcionar por completo.', isCorrect: false },
          { text: 'La personalización exige que el receptor entregue más datos.', isCorrect: false },
        ],
      },
      trueOrFalse(
        'Si recibes solicitudes repetidas de aprobación de MFA que no iniciaste, es seguro aceptarlas una a una mientras revisas qué sucede.',
        false,
        'Aceptar solicitudes repetidas por cansancio es justamente el objetivo del ataque de fatiga de MFA; las solicitudes no iniciadas deben rechazarse y verificarse la seguridad de la cuenta.',
        'El atacante cuenta con tu cansancio para que apruebes.',
      ),
      {
        statement: 'Encuentras una memoria USB abandonada en un pasillo de la universidad. ¿Qué NO debes hacer?',
        type: 'MULTIPLE_CHOICE',
        explanation:
          'Un USB de origen desconocido puede incluir archivos maliciosos o simular dispositivos; la curiosidad es parte del engaño, por lo que es indicado no conectarlo a tu equipo e informar por el canal establecido.',
        hint: 'La tentación de ver su contenido es parte del engaño.',
        options: [
          { text: 'Informar al equipo responsable sobre el dispositivo encontrado.', isCorrect: false },
          { text: 'Dejar la memoria en su lugar sin tocarla.', isCorrect: false },
          { text: 'Analizar los archivos solo con las herramientas autorizadas indicadas por la organización.', isCorrect: false },
          { text: 'Conectarlo a tu computador para comprobar su contenido.', isCorrect: true },
        ],
      },
      trueOrFalse(
        'Conectar tus dispositivos a cargadores o cables de origen desconocido carece de riesgo para su seguridad.',
        false,
        'Los dispositivos y cables desconocidos también exponen a riesgos digitales; la prevención incluye usar cargadores y cables confiables y no conectar dispositivos personales a equipos sensibles sin autorización.',
        'El ataque no siempre necesita un archivo: a veces basta con el cable.',
      ),
    ],
  },
];
