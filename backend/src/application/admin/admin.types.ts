import type { UserRole, UserStatus } from '../../domain/user.js';

/** Punto del gráfico de registros de estudiantes. */
export interface RegistrationPoint {
  /** Clave estable en formato YYYY-MM. */
  period: string;
  /** Etiqueta en español, por ejemplo "sep 2026". */
  label: string;
  count: number;
}

/** Curso con mayor cantidad de estudiantes con progreso. */
export interface TopCourseStat {
  courseId: number;
  title: string;
  students: number;
}

/** Tasa de aprobación de la evaluación final. */
export interface PassingRateStat {
  attemptedStudents: number;
  passedStudents: number;
  /** Porcentaje entero (0-100). */
  rate: number;
}

export interface AdminDashboardStatistics {
  students: {
    total: number;
    active: number;
    disabled: number;
  };
  registrations: RegistrationPoint[];
  courses: {
    total: number;
    published: number;
    unpublished: number;
  };
  modules: number;
  lessons: {
    theory: number;
    laboratory: number;
  };
  topCourses: TopCourseStat[];
  passingRate: PassingRateStat;
  completedCourses: number;
  assessmentAttempts: number;
}

/** Usuario visible en la gestión administrativa. */
export interface AdminUserSummary {
  id: number;
  firstName: string;
  lastName: string;
  username: string | null;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface UpdateManagedUserInput {
  username?: string;
  role?: string;
}
