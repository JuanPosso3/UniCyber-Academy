import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Layers,
  Pencil,
  Search,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { AdminNav } from "../../components/layout/AdminNav";
import { Alert } from "../../components/ui/Alert";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatePanel } from "../../components/ui/StatePanel";
import { ApiError } from "../../lib/api";
import {
  getAdminStatisticsRequest,
  listAdminUsersRequest,
  updateAdminUserRequest,
  type AdminDashboardStatistics,
  type AdminUser,
} from "../../services/admin";
import type { UserRole } from "../../types/auth";
import type { NavigateFn } from "../../types/navigation";

export interface AdminStatisticsPageProps {
  navigate: NavigateFn;
}

const ROLE_OPTIONS = [
  { value: "student", label: "Estudiante" },
  { value: "admin", label: "Administrador" },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  [["STUDENT", "Estudiante"], ["ADMINISTRATIVE", "Administrador"]],
);

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>}
    </Card>
  );
}

function registrationHasData(
  statistics: AdminDashboardStatistics | null,
): boolean {
  return (
    statistics?.registrations.some((point) => point.count > 0) ?? false
  );
}

export function AdminStatisticsPage({ navigate }: AdminStatisticsPageProps) {
  const [statistics, setStatistics] =
    useState<AdminDashboardStatistics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftUsername, setDraftUsername] = useState("");
  const [draftRole, setDraftRole] = useState<UserRole>("STUDENT");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [loadedStatistics, loadedUsers] = await Promise.all([
        getAdminStatisticsRequest(),
        listAdminUsersRequest(),
      ]);
      setStatistics(loadedStatistics);
      setUsers(loadedUsers);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudieron cargar las estadísticas.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) =>
      [user.firstName, user.lastName, user.username ?? "", user.email]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [users, search]);

  const startEditing = (user: AdminUser): void => {
    setEditingId(user.id);
    setDraftUsername(user.username ?? "");
    setDraftRole(user.role);
    setActionError(null);
    setActionMessage(null);
  };

  const cancelEditing = (): void => {
    setEditingId(null);
    setDraftUsername("");
    setDraftRole("STUDENT");
  };

  const saveUser = async (user: AdminUser): Promise<void> => {
    if (saving) {
      return;
    }

    const username = draftUsername.trim();
    const payload: { username?: string; role?: UserRole } = {};

    if (username !== (user.username ?? "")) {
      payload.username = username;
    }

    if (draftRole !== user.role) {
      payload.role = draftRole;
    }

    if (payload.username === undefined && payload.role === undefined) {
      cancelEditing();
      return;
    }

    setSaving(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const updated = await updateAdminUserRequest(user.id, payload);
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setActionMessage("Usuario actualizado correctamente.");
      cancelEditing();
      await loadData();
    } catch (requestError) {
      setActionError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo actualizar el usuario.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading && !statistics) {
    return (
      <AuthenticatedLayout
        title="Estadísticas"
        currentPath="/admin/statistics"
        navigate={navigate}
      >
        <StatePanel variant="loading" title="Cargando estadísticas" />
      </AuthenticatedLayout>
    );
  }

  if (error && !statistics) {
    return (
      <AuthenticatedLayout
        title="Estadísticas"
        currentPath="/admin/statistics"
        navigate={navigate}
      >
        <StatePanel
          variant="error"
          title="No se pudieron cargar las estadísticas"
          description={error}
          action={
            <Button type="button" variant="primary" onClick={() => void loadData()}>
              Reintentar
            </Button>
          }
        />
      </AuthenticatedLayout>
    );
  }

  const maxRegistrations = Math.max(
    1,
    ...(statistics?.registrations.map((point) => point.count) ?? [0]),
  );

  return (
    <AuthenticatedLayout
      title="Estadísticas"
      currentPath="/admin/statistics"
      navigate={navigate}
    >
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Panel de administración
          </h1>
          <p className="text-sm text-muted-foreground">
            Métricas y gestión de UniCyber Academy
          </p>
        </div>

        <AdminNav currentPath="/admin/statistics" navigate={navigate} />

        {error && <Alert variant="error">{error}</Alert>}
        {actionError && <Alert variant="error">{actionError}</Alert>}
        {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

        <section aria-labelledby="general-heading">
          <h2
            id="general-heading"
            className="mb-3 text-sm font-semibold text-white"
          >
            Resumen general
          </h2>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={<Users size={18} />}
              label="Total de estudiantes"
              value={statistics?.students.total ?? 0}
              detail={`${statistics?.students.active ?? 0} activos · ${
                statistics?.students.disabled ?? 0
              } deshabilitados`}
            />
            <StatCard
              icon={<BookOpen size={18} />}
              label="Total de cursos"
              value={statistics?.courses.total ?? 0}
            />
            <StatCard
              icon={<CheckCircle2 size={18} />}
              label="Cursos publicados"
              value={statistics?.courses.published ?? 0}
            />
            <StatCard
              icon={<Layers size={18} />}
              label="Cursos no publicados"
              value={statistics?.courses.unpublished ?? 0}
            />
            <StatCard
              icon={<Layers size={18} />}
              label="Total de módulos"
              value={statistics?.modules ?? 0}
            />
            <StatCard
              icon={<BookOpen size={18} />}
              label="Lecciones teóricas"
              value={statistics?.lessons.theory ?? 0}
            />
            <StatCard
              icon={<FlaskConical size={18} />}
              label="Laboratorios"
              value={statistics?.lessons.laboratory ?? 0}
            />
            <StatCard
              icon={<BarChart3 size={18} />}
              label="Intentos de evaluación final"
              value={statistics?.assessmentAttempts ?? 0}
            />
          </div>
        </section>

        <section aria-labelledby="activity-heading" className="space-y-4">
          <h2
            id="activity-heading"
            className="text-sm font-semibold text-white"
          >
            Actividad de estudiantes
          </h2>

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">
              Nuevos registros de estudiantes
            </h3>

            {registrationHasData(statistics) ? (
              <div>
                <div className="flex h-40 items-end gap-2">
                  {statistics?.registrations.map((point) => (
                    <div
                      key={point.period}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                    >
                      <span className="text-[10px] font-semibold text-white">
                        {point.count}
                      </span>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-primary to-accent"
                        style={{
                          height: `${Math.max(
                            4,
                            (point.count / maxRegistrations) * 100,
                          )}%`,
                        }}
                        title={`${point.label}: ${point.count} registros`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {point.label}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Registros agrupados por mes durante los últimos seis meses.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no hay registros de estudiantes en el período
                mostrado.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">
              Cursos con más estudiantes con progreso
            </h3>

            {statistics && statistics.topCourses.length > 0 ? (
              <ul className="space-y-2">
                {statistics.topCourses.map((course, index) => (
                  <li
                    key={course.courseId}
                    className="flex items-center gap-3 rounded-xl border border-border bg-white/5 px-3 py-2.5"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-white">
                      {course.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {course.students}{" "}
                      {course.students === 1 ? "estudiante" : "estudiantes"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay datos de participación registrados.
              </p>
            )}
          </Card>
        </section>

        <section aria-labelledby="results-heading" className="space-y-4">
          <h2
            id="results-heading"
            className="text-sm font-semibold text-white"
          >
            Resultados académicos
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Trophy size={14} className="text-success" />
                Tasa de aprobación
              </div>
              <p className="mt-2 text-3xl font-bold text-white">
                {statistics?.passingRate.rate ?? 0}%
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {statistics?.passingRate.passedStudents ?? 0} de{" "}
                {statistics?.passingRate.attemptedStudents ?? 0} estudiantes
                con evaluación final presentada
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 size={14} className="text-accent" />
                Cursos completados
              </div>
              <p className="mt-2 text-3xl font-bold text-white">
                {statistics?.completedCourses ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Pares únicos de estudiante y curso con todas las lecciones y
                la evaluación final aprobada.
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BarChart3 size={14} className="text-purple" />
                Evaluaciones presentadas
              </div>
              <p className="mt-2 text-3xl font-bold text-white">
                {statistics?.assessmentAttempts ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Intentos de evaluación final registrados.
              </p>
            </Card>
          </div>
        </section>

        <section aria-labelledby="users-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="users-heading" className="text-sm font-semibold text-white">
              Gestión de usuarios
            </h2>
            <span className="text-xs text-muted-foreground">
              {users.length} {users.length === 1 ? "usuario" : "usuarios"}
            </span>
          </div>

          <div className="relative max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="admin-users-search" className="sr-only">
              Buscar usuario
            </label>
            <input
              id="admin-users-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, usuario o correo..."
              className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {[
                      "Usuario",
                      "Correo",
                      "Rol",
                      "Estado",
                      "Registro",
                      "Acciones",
                    ].map((header) => (
                      <th
                        key={header}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-muted-foreground"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const fullName = `${user.firstName} ${user.lastName}`;
                    const isEditing = editingId === user.id;

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-white/5 last:border-0 hover:bg-white/3"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={fullName} size="sm" />
                            <div className="min-w-0">
                              <p className="whitespace-nowrap text-sm font-medium text-white">
                                {fullName}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {user.username ?? "Sin nombre de usuario"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select
                              aria-label={`Rol de ${fullName}`}
                              value={draftRole === "ADMINISTRATIVE" ? "admin" : draftRole === "STUDENT" ? "student" : ""}
                              onChange={(event) =>
                                setDraftRole(event.target.value === "admin" ? "ADMINISTRATIVE" : "STUDENT")
                              }
                              className="rounded-xl border border-border bg-card px-2 py-1.5 text-xs text-white focus:border-primary/50 focus:outline-none"
                            >
                              {draftRole !== "ADMINISTRATIVE" && draftRole !== "STUDENT" && <option value="" disabled>Selecciona un rol compatible</option>}
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Badge
                              color={
                                user.role === "ADMINISTRATIVE"
                                  ? "purple"
                                  : user.role === "STUDENT"
                                    ? "blue"
                                    : "gray"
                              }
                            >
                              {ROLE_LABELS[user.role] ?? "Rol heredado (pendiente de revisión)"}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            color={user.status === "ACTIVE" ? "green" : "red"}
                          >
                            {user.status === "ACTIVE" ? "Activo" : "Deshabilitado"}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString("es-CO")}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                aria-label={`Nombre de usuario de ${fullName}`}
                                value={draftUsername}
                                onChange={(event) =>
                                  setDraftUsername(event.target.value)
                                }
                                placeholder="Nombre de usuario"
                                className="w-40 rounded-xl border border-border bg-card px-2 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                disabled={saving}
                                onClick={() => void saveUser(user)}
                              >
                                {saving ? "Guardando..." : "Guardar"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={saving}
                                onClick={cancelEditing}
                                aria-label="Cancelar edición"
                              >
                                <X size={13} />
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditing(user)}
                              aria-label={`Editar a ${fullName}`}
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        No se encontraron usuarios con ese criterio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-[11px] text-muted-foreground">
            La eliminación de usuarios no está disponible para conservar la
            integridad de los registros académicos. No es posible cambiar el
            rol propio ni dejar la plataforma sin administradores activos.
          </p>
        </section>
      </div>
    </AuthenticatedLayout>
  );
}
