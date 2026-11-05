/**
 * Reglas de dominio del sistema de gamificación de UniCyber Academy.
 *
 * Determina qué logros son elegibles para una persona estudiante a partir
 * de su estado académico actual. Es independiente de HTTP, del frontend y
 * de detalles de acceso a datos: recibe un contexto ya calculado y devuelve
 * los códigos de los logros que se deben otorgar.
 */

export type AchievementCategory =
  | 'COURSE_MEDAL'
  | 'LEARNING_RANK'
  | 'COMPLEMENTARY';

export interface AchievementRule {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  order: number;
  /**
   * Evalúa si el logro es elegible para el contexto dado.
   * Nunca debe otorgar un logro ya obtenido: el llamador filtra los
   * códigos ya ganados antes de persistir.
   */
  isEligible(context: GamificationContext): boolean;
}

/**
 * Contexto académico de una persona, calculado por la capa de aplicación
 * a partir de datos de confianza de la base de datos.
 */
export interface GamificationContext {
  /** IDs de cursos completamente completados (todas las lecciones + evaluación final aprobada). */
  completedCourseIds: number[];
  /** Asociación ID de curso → código de medalla de ese curso. */
  courseIdToMedalCode: Map<number, string>;
  /** Códigos de logros ya obtenidos por la persona. */
  earnedAchievementCodes: Set<string>;
  /** Si al menos una lección tiene progreso registrado. */
  hasCompletedLesson: boolean;
  /** Si al menos un módulo está completamente completado. */
  hasCompletedModule: boolean;
  /** Si al menos un laboratorio tiene progreso registrado. */
  hasCompletedLaboratory: boolean;
}

/** Códigos de las medallas de curso asociados a cada título de curso. */
export const COURSE_MEDAL_CODES: Record<string, string> = {
  'Phishing y simulaciones de ataque': 'PHISHING_COURSE_COMPLETED',
  'Gestión de contraseñas y autenticación': 'PASSWORDS_COURSE_COMPLETED',
  'Respuesta a incidentes de seguridad': 'INCIDENT_RESPONSE_COURSE_COMPLETED',
  'Seguridad en redes WiFi': 'WIFI_SECURITY_COURSE_COMPLETED',
  'Amenazas emergentes': 'EMERGING_THREATS_COURSE_COMPLETED',
};

/** Cantidad de cursos completados requerida por cada rango de aprendizaje. */
export const LEARNING_RANK_THRESHOLDS: Record<string, number> = {
  BASIC_LEARNER: 2,
  INTERMEDIATE_LEARNER: 3,
  ADVANCED_LEARNER: 5,
};

/** Logros complementarios requeridos para Experto UniCyber (además de medallas y rangos). */
export const EXPERT_REQUIRED_COMPLEMENTARY = [
  'FIRST_STEPS',
  'FIRST_MODULE_COMPLETED',
  'FIRST_LAB_COMPLETED',
];

function isCourseMedalCode(code: string): boolean {
  return Object.values(COURSE_MEDAL_CODES).includes(code);
}

function isLearningRankCode(code: string): boolean {
  return code in LEARNING_RANK_THRESHOLDS;
}

/**
 * Reglas de elegibilidad de los 13 logros del catálogo inicial.
 */
export const ACHIEVEMENT_RULES: AchievementRule[] = [
  // ------------------------------------------------------------------
  // Medallas de curso individuales: se otorgan al completar el curso.
  // ------------------------------------------------------------------
  {
    code: 'PHISHING_COURSE_COMPLETED',
    name: 'Detector de engaños',
    description:
      'Reconoce los intentos de phishing y aprende a identificar correos electrónicos fraudulentos.',
    category: 'COURSE_MEDAL',
    icon: 'medal-phishing',
    order: 1,
    isEligible: (context) => {
      const courseId = findCourseIdByMedalCode(
        context.courseIdToMedalCode,
        'PHISHING_COURSE_COMPLETED',
      );
      return courseId !== null && context.completedCourseIds.includes(courseId);
    },
  },
  {
    code: 'PASSWORDS_COURSE_COMPLETED',
    name: 'Guardián de credenciales',
    description:
      'Domina las buenas prácticas para proteger contraseñas y fortalecer la autenticación de tus cuentas.',
    category: 'COURSE_MEDAL',
    icon: 'medal-passwords',
    order: 2,
    isEligible: (context) => {
      const courseId = findCourseIdByMedalCode(
        context.courseIdToMedalCode,
        'PASSWORDS_COURSE_COMPLETED',
      );
      return courseId !== null && context.completedCourseIds.includes(courseId);
    },
  },
  {
    code: 'INCIDENT_RESPONSE_COURSE_COMPLETED',
    name: 'Respondedor digital',
    description:
      'Reconoce incidentes de seguridad y conoce los procedimientos adecuados para actuar y reportarlos.',
    category: 'COURSE_MEDAL',
    icon: 'medal-incident',
    order: 3,
    isEligible: (context) => {
      const courseId = findCourseIdByMedalCode(
        context.courseIdToMedalCode,
        'INCIDENT_RESPONSE_COURSE_COMPLETED',
      );
      return courseId !== null && context.completedCourseIds.includes(courseId);
    },
  },
  {
    code: 'WIFI_SECURITY_COURSE_COMPLETED',
    name: 'Explorador de redes',
    description:
      'Identifica riesgos en redes inalámbricas y aplica medidas para proteger tus conexiones.',
    category: 'COURSE_MEDAL',
    icon: 'medal-wifi',
    order: 4,
    isEligible: (context) => {
      const courseId = findCourseIdByMedalCode(
        context.courseIdToMedalCode,
        'WIFI_SECURITY_COURSE_COMPLETED',
      );
      return courseId !== null && context.completedCourseIds.includes(courseId);
    },
  },
  {
    code: 'EMERGING_THREATS_COURSE_COMPLETED',
    name: 'Vigilante de nuevas amenazas',
    description:
      'Reconoce amenazas digitales emergentes y aprende a prevenir nuevas formas de engaño y ataque.',
    category: 'COURSE_MEDAL',
    icon: 'medal-threats',
    order: 5,
    isEligible: (context) => {
      const courseId = findCourseIdByMedalCode(
        context.courseIdToMedalCode,
        'EMERGING_THREATS_COURSE_COMPLETED',
      );
      return courseId !== null && context.completedCourseIds.includes(courseId);
    },
  },
  // ------------------------------------------------------------------
  // Rangos de aprendizaje acumulativos por cursos completados.
  // ------------------------------------------------------------------
  {
    code: 'BASIC_LEARNER',
    name: 'Aprendiz básico',
    description: 'Completa 2 de los 5 cursos iniciales.',
    category: 'LEARNING_RANK',
    icon: 'rank-bronze',
    order: 6,
    isEligible: (context) =>
      context.completedCourseIds.length >=
      LEARNING_RANK_THRESHOLDS.BASIC_LEARNER,
  },
  {
    code: 'INTERMEDIATE_LEARNER',
    name: 'Aprendiz intermedio',
    description: 'Completa 3 de los 5 cursos iniciales.',
    category: 'LEARNING_RANK',
    icon: 'rank-silver',
    order: 7,
    isEligible: (context) =>
      context.completedCourseIds.length >=
      LEARNING_RANK_THRESHOLDS.INTERMEDIATE_LEARNER,
  },
  {
    code: 'ADVANCED_LEARNER',
    name: 'Aprendiz avanzado',
    description: 'Completa los 5 cursos iniciales.',
    category: 'LEARNING_RANK',
    icon: 'rank-gold',
    order: 8,
    isEligible: (context) =>
      context.completedCourseIds.length >=
      LEARNING_RANK_THRESHOLDS.ADVANCED_LEARNER,
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
    order: 9,
    isEligible: (context) => context.hasCompletedLesson,
  },
  {
    code: 'FIRST_MODULE_COMPLETED',
    name: 'Módulo superado',
    description: 'Has completado tu primer módulo de aprendizaje.',
    category: 'COMPLEMENTARY',
    icon: 'achievement-module',
    order: 10,
    isEligible: (context) => context.hasCompletedModule,
  },
  {
    code: 'FIRST_LAB_COMPLETED',
    name: 'Manos a la obra',
    description: 'Has completado tu primer laboratorio práctico.',
    category: 'COMPLEMENTARY',
    icon: 'achievement-lab',
    order: 11,
    isEligible: (context) => context.hasCompletedLaboratory,
  },
  {
    code: 'COURSE_MEDAL_COLLECTOR',
    name: 'Coleccionista',
    description:
      'Has conseguido todas las medallas individuales de los cinco cursos de UniCyber Academy.',
    category: 'COMPLEMENTARY',
    icon: 'achievement-collector',
    order: 12,
    isEligible: (context) => {
      const earnedMedals = Object.values(COURSE_MEDAL_CODES).filter((code) =>
        context.earnedAchievementCodes.has(code),
      ).length;
      return earnedMedals >= Object.values(COURSE_MEDAL_CODES).length;
    },
  },
  {
    code: 'UNICYBER_EXPERT',
    name: 'Experto UniCyber',
    description:
      'Has alcanzado todos los principales reconocimientos de UniCyber Academy.',
    category: 'COMPLEMENTARY',
    icon: 'achievement-expert',
    order: 13,
    isEligible: (context) => {
      const allMedalsEarned = Object.values(COURSE_MEDAL_CODES).every((code) =>
        context.earnedAchievementCodes.has(code),
      );
      const allRanksEarned = Object.keys(
        LEARNING_RANK_THRESHOLDS,
      ).every((code) => context.earnedAchievementCodes.has(code));
      const complementaryEarned = EXPERT_REQUIRED_COMPLEMENTARY.every((code) =>
        context.earnedAchievementCodes.has(code),
      );
      return allMedalsEarned && allRanksEarned && complementaryEarned;
    },
  },
];

function findCourseIdByMedalCode(
  courseIdToMedalCode: Map<number, string>,
  medalCode: string,
): number | null {
  for (const [courseId, code] of courseIdToMedalCode.entries()) {
    if (code === medalCode) {
      return courseId;
    }
  }
  return null;
}

/**
 * Evalúa qué logros son elegibles y aún no han sido obtenidos.
 *
 * Devuelve los códigos en el orden definido por el catálogo. El llamador
 * es responsable de persistirlos y de evitar duplicados (la restricción
 * única de la base de datos también lo impide).
 */
export function evaluateEligibleAchievements(
  rules: AchievementRule[],
  context: GamificationContext,
): string[] {
  const eligible: string[] = [];
  const earned = context.earnedAchievementCodes;

  for (const rule of rules) {
    if (earned.has(rule.code)) {
      continue;
    }

    if (rule.isEligible(context)) {
      eligible.push(rule.code);
    }
  }

  return eligible;
}

/** Reglas canonicas del sistema (exportadas para uso de la aplicación). */
export const RULES: AchievementRule[] = ACHIEVEMENT_RULES;

/** Categorías válidas de logro. */
export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  'COURSE_MEDAL',
  'LEARNING_RANK',
  'COMPLEMENTARY',
];
