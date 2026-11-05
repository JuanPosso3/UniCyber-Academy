/**
 * Catálogo inicial de logros del sistema de gamificación de UniCyber Academy.
 *
 * Contiene los 13 logros definidos en la especificación funcional:
 * 5 medallas de curso individuales, 3 rangos de aprendizaje acumulativos y
 * 5 logros complementarios.
 *
 * Los nombres, descripciones y todo el texto visible al usuario están en
 * español. Los códigos son identificadores estables en inglés.
 *
 * El campo `condition` guarda una representación estructurada del requisito
 * de desbloqueo para referencia del catálogo. La lógica de elegibilidad real
 * vive en `src/domain/gamification.ts` y es la fuente de verdad.
 */

export type AchievementCategory =
  | 'COURSE_MEDAL'
  | 'LEARNING_RANK'
  | 'COMPLEMENTARY';

export interface AchievementSpec {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  condition: string | null;
  order: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
}

/** Títulos exactos de los cinco cursos académicos con medalla individual. */
export const COURSE_TITLES_WITH_MEDAL = [
  'Phishing y simulaciones de ataque',
  'Gestión de contraseñas y autenticación',
  'Respuesta a incidentes de seguridad',
  'Seguridad en redes WiFi',
  'Amenazas emergentes',
] as const;

export const ACADEMIC_ACHIEVEMENTS: AchievementSpec[] = [
  // ------------------------------------------------------------------
  // Medallas de curso individuales (una por curso académico).
  // ------------------------------------------------------------------
  {
    code: 'PHISHING_COURSE_COMPLETED',
    name: 'Detector de engaños',
    description:
      'Reconoce los intentos de phishing y aprende a identificar correos electrónicos fraudulentos.',
    category: 'COURSE_MEDAL',
    icon: 'medal-phishing',
    condition: JSON.stringify({
      type: 'COURSE_COMPLETION',
      courseTitle: 'Phishing y simulaciones de ataque',
    }),
    order: 1,
    status: 'ACTIVE',
  },
  {
    code: 'PASSWORDS_COURSE_COMPLETED',
    name: 'Guardián de credenciales',
    description:
      'Domina las buenas prácticas para proteger contraseñas y fortalecer la autenticación de tus cuentas.',
    category: 'COURSE_MEDAL',
    icon: 'medal-passwords',
    condition: JSON.stringify({
      type: 'COURSE_COMPLETION',
      courseTitle: 'Gestión de contraseñas y autenticación',
    }),
    order: 2,
    status: 'ACTIVE',
  },
  {
    code: 'INCIDENT_RESPONSE_COURSE_COMPLETED',
    name: 'Respondedor digital',
    description:
      'Reconoce incidentes de seguridad y conoce los procedimientos adecuados para actuar y reportarlos.',
    category: 'COURSE_MEDAL',
    icon: 'medal-incident',
    condition: JSON.stringify({
      type: 'COURSE_COMPLETION',
      courseTitle: 'Respuesta a incidentes de seguridad',
    }),
    order: 3,
    status: 'ACTIVE',
  },
  {
    code: 'WIFI_SECURITY_COURSE_COMPLETED',
    name: 'Explorador de redes',
    description:
      'Identifica riesgos en redes inalámbricas y aplica medidas para proteger tus conexiones.',
    category: 'COURSE_MEDAL',
    icon: 'medal-wifi',
    condition: JSON.stringify({
      type: 'COURSE_COMPLETION',
      courseTitle: 'Seguridad en redes WiFi',
    }),
    order: 4,
    status: 'ACTIVE',
  },
  {
    code: 'EMERGING_THREATS_COURSE_COMPLETED',
    name: 'Vigilante de nuevas amenazas',
    description:
      'Reconoce amenazas digitales emergentes y aprende a prevenir nuevas formas de engaño y ataque.',
    category: 'COURSE_MEDAL',
    icon: 'medal-threats',
    condition: JSON.stringify({
      type: 'COURSE_COMPLETION',
      courseTitle: 'Amenazas emergentes',
    }),
    order: 5,
    status: 'ACTIVE',
  },
  // ------------------------------------------------------------------
  // Rangos de aprendizaje acumulativos (por cursos completados).
  // ------------------------------------------------------------------
  {
    code: 'BASIC_LEARNER',
    name: 'Aprendiz básico',
    description: 'Completa 2 de los 5 cursos iniciales.',
    category: 'LEARNING_RANK',
    icon: 'rank-bronze',
    condition: JSON.stringify({ type: 'LEARNING_RANK', threshold: 2 }),
    order: 6,
    status: 'ACTIVE',
  },
  {
    code: 'INTERMEDIATE_LEARNER',
    name: 'Aprendiz intermedio',
    description: 'Completa 3 de los 5 cursos iniciales.',
    category: 'LEARNING_RANK',
    icon: 'rank-silver',
    condition: JSON.stringify({ type: 'LEARNING_RANK', threshold: 3 }),
    order: 7,
    status: 'ACTIVE',
  },
  {
    code: 'ADVANCED_LEARNER',
    name: 'Aprendiz avanzado',
    description: 'Completa los 5 cursos iniciales.',
    category: 'LEARNING_RANK',
    icon: 'rank-gold',
    condition: JSON.stringify({ type: 'LEARNING_RANK', threshold: 5 }),
    order: 8,
    status: 'ACTIVE',
  },
  // ------------------------------------------------------------------
  // Logros complementarios.
  // ------------------------------------------------------------------
  {
    code: 'FIRST_STEPS',
    name: 'Primeros pasos',
    description: 'Has completado tu primera lección en UniCyber Academy.',
    category: 'COMPLEMENTARY',
    icon: 'achievement-first-steps',
    condition: JSON.stringify({ type: 'LESSON_COMPLETION' }),
    order: 9,
    status: 'ACTIVE',
  },
  {
    code: 'FIRST_MODULE_COMPLETED',
    name: 'Módulo superado',
    description: 'Has completado tu primer módulo de aprendizaje.',
    category: 'COMPLEMENTARY',
    icon: 'achievement-module',
    condition: JSON.stringify({ type: 'MODULE_COMPLETION' }),
    order: 10,
    status: 'ACTIVE',
  },
  {
    code: 'FIRST_LAB_COMPLETED',
    name: 'Manos a la obra',
    description: 'Has completado tu primer laboratorio práctico.',
    category: 'COMPLEMENTARY',
    icon: 'achievement-lab',
    condition: JSON.stringify({ type: 'LAB_COMPLETION' }),
    order: 11,
    status: 'ACTIVE',
  },
  {
    code: 'COURSE_MEDAL_COLLECTOR',
    name: 'Coleccionista',
    description:
      'Has conseguido todas las medallas individuales de los cinco cursos de UniCyber Academy.',
    category: 'COMPLEMENTARY',
    icon: 'achievement-collector',
    condition: JSON.stringify({ type: 'ALL_COURSE_MEDALS', count: 5 }),
    order: 12,
    status: 'ACTIVE',
  },
  {
    code: 'UNICYBER_EXPERT',
    name: 'Experto UniCyber',
    description:
      'Has alcanzado todos los principales reconocimientos de UniCyber Academy.',
    category: 'COMPLEMENTARY',
    icon: 'achievement-expert',
    condition: JSON.stringify({
      type: 'MASTER_ACHIEVEMENT',
      required: [
        'PHISHING_COURSE_COMPLETED',
        'PASSWORDS_COURSE_COMPLETED',
        'INCIDENT_RESPONSE_COURSE_COMPLETED',
        'WIFI_SECURITY_COURSE_COMPLETED',
        'EMERGING_THREATS_COURSE_COMPLETED',
        'BASIC_LEARNER',
        'INTERMEDIATE_LEARNER',
        'ADVANCED_LEARNER',
        'FIRST_STEPS',
        'FIRST_MODULE_COMPLETED',
        'FIRST_LAB_COMPLETED',
      ],
    }),
    order: 13,
    status: 'ACTIVE',
  },
];

/** Códigos de las medallas de curso, en el mismo orden que los cursos. */
export const COURSE_MEDAL_CODES: Record<string, string> = {
  'Phishing y simulaciones de ataque': 'PHISHING_COURSE_COMPLETED',
  'Gestión de contraseñas y autenticación': 'PASSWORDS_COURSE_COMPLETED',
  'Respuesta a incidentes de seguridad': 'INCIDENT_RESPONSE_COURSE_COMPLETED',
  'Seguridad en redes WiFi': 'WIFI_SECURITY_COURSE_COMPLETED',
  'Amenazas emergentes': 'EMERGING_THREATS_COURSE_COMPLETED',
};

/** Umbrales de los rangos de aprendizaje (número de cursos completados). */
export const LEARNING_RANK_THRESHOLDS: Record<string, number> = {
  BASIC_LEARNER: 2,
  INTERMEDIATE_LEARNER: 3,
  ADVANCED_LEARNER: 5,
};

/** Códigos de logros complementarios requeridos por Experto UniCyber. */
export const EXPERT_REQUIRED_COMPLEMENTARY = [
  'FIRST_STEPS',
  'FIRST_MODULE_COMPLETED',
  'FIRST_LAB_COMPLETED',
];
