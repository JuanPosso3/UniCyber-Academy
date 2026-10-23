import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BookOpen,
  CalendarDays,
  Edit2,
  Layers,
  Plus,
  Search,
  Send,
  Settings,
} from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { AdminNav } from "../../components/layout/AdminNav";
import { ContentStatusBadge } from "../../components/courses/ContentStatusBadge";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StatePanel } from "../../components/ui/StatePanel";
import { ApiError } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { consumeFlash } from "../../lib/flash";
import {
  changeCourseStatusRequest,
  listAdminCoursesRequest,
} from "../../services/courses";
import type { CourseSummary, ContentStatus } from "../../types/course";
import type { NavigateFn } from "../../types/navigation";

type StatusFilter = "ALL" | ContentStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todos los estados" },
  { value: "DRAFT", label: "Borradores" },
  { value: "ACTIVE", label: "Publicados" },
  { value: "ARCHIVED", label: "Archivados" },
];

export interface AdminCoursesPageProps {
  navigate: NavigateFn;
}

export function AdminCoursesPage({ navigate }: AdminCoursesPageProps) {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [notice, setNotice] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [courseToArchive, setCourseToArchive] =
    useState<CourseSummary | null>(null);

  useEffect(() => {
    setNotice(consumeFlash());
  }, []);

  useEffect(() => {
    let active = true;

    setError(null);

    void listAdminCoursesRequest()
      .then(({ courses: loadedCourses }) => {
        if (active) {
          setCourses(loadedCourses);
        }
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setCourses([]);
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudieron cargar los cursos.",
        );
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");

    return (courses ?? []).filter((course) => {
      const matchesStatus =
        statusFilter === "ALL" || course.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      return `${course.title} ${course.description ?? ""}`
        .toLocaleLowerCase("es")
        .includes(term);
    });
  }, [courses, search, statusFilter]);

  const applyUpdatedCourse = (updated: CourseSummary) => {
    setCourses((current) =>
      current
        ? current.map((course) =>
            course.id === updated.id ? updated : course,
          )
        : current,
    );
  };

  const changeStatus = async (
    course: CourseSummary,
    status: ContentStatus,
  ) => {
    setPendingId(course.id);
    setNotice(null);

    try {
      const { course: updated } = await changeCourseStatusRequest(
        course.id,
        status,
      );
      applyUpdatedCourse(updated);
      setNotice({
        variant: "success",
        message:
          status === "ACTIVE"
            ? "El curso se publicó correctamente."
            : "El curso se archivó correctamente.",
      });
      setCourseToArchive(null);
    } catch (requestError) {
      setNotice({
        variant: "error",
        message:
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cambiar el estado del curso.",
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <AuthenticatedLayout
      title="Administración de cursos"
      currentPath="/admin/courses"
      navigate={navigate}
    >
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-white">
              Gestión de cursos
            </h1>
            <p className="text-sm text-muted-foreground">
              {courses === null
                ? "Cargando cursos..."
                : `${courses.length} ${
                    courses.length === 1
                      ? "curso en el catálogo"
                      : "cursos en el catálogo"
                  }`}
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => navigate("/admin/courses/new")}
          >
            <Plus size={16} /> Crear curso
          </Button>
        </div>

        <AdminNav currentPath="/admin/courses" navigate={navigate} />

        {notice && (
          <Alert variant={notice.variant}>
            <span className="flex-1">{notice.message}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="ml-2 text-xs font-semibold underline"
            >
              Cerrar
            </button>
          </Alert>
        )}

        <Card className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título o descripción..."
                aria-label="Buscar cursos en administración"
                className="w-full rounded-xl border border-border bg-input-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              aria-label="Filtrar cursos por estado"
              className="rounded-xl border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:border-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {error && (
          <StatePanel
            variant="error"
            title="No se pudieron cargar los cursos"
            description={error}
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReloadKey((value) => value + 1)}
              >
                Reintentar
              </Button>
            }
          />
        )}

        {!error && courses === null && (
          <StatePanel
            variant="loading"
            title="Cargando cursos"
            description="Estamos consultando la administración de cursos."
          />
        )}

        {!error && courses !== null && courses.length === 0 && (
          <StatePanel
            variant="empty"
            title="Todavía no hay cursos"
            description="Crea el primer curso para empezar a organizar el catálogo."
            action={
              <Button
                type="button"
                variant="primary"
                onClick={() => navigate("/admin/courses/new")}
              >
                <Plus size={16} /> Crear curso
              </Button>
            }
          />
        )}

        {!error &&
          courses !== null &&
          courses.length > 0 &&
          filteredCourses.length === 0 && (
            <StatePanel
              variant="empty"
              title="No encontramos coincidencias"
              description="Cambia el término de búsqueda o el filtro de estado."
              action={
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          )}

        {filteredCourses.length > 0 && (
          <div className="space-y-3">
            {filteredCourses.map((course) => {
              const isPending = pendingId === course.id;

              return (
                <Card key={course.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-accent/20 text-primary">
                      <BookOpen size={20} aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-white">
                          {course.title}
                        </h2>
                        <ContentStatusBadge status={course.status} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {course.description ?? "Sin descripción."}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Layers size={13} aria-hidden="true" />
                          {course.moduleCount}{" "}
                          {course.moduleCount === 1 ? "módulo" : "módulos"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays size={13} aria-hidden="true" />
                          Actualizado el {formatDate(course.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {course.status === "DRAFT" && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={isPending}
                          onClick={() => {
                            void changeStatus(course, "ACTIVE");
                          }}
                        >
                          <Send size={14} /> Publicar
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/admin/courses/${course.id}/edit`,
                          )
                        }
                      >
                        <Edit2 size={14} /> Editar
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/admin/courses/${course.id}/modules`,
                          )
                        }
                      >
                        <Settings size={14} /> Módulos
                      </Button>

                      {course.status !== "ARCHIVED" && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={isPending}
                          onClick={() => setCourseToArchive(course)}
                        >
                          <Archive size={14} /> Archivar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={courseToArchive !== null}
        title="Archivar curso"
        description={
          courseToArchive
            ? `El curso «${courseToArchive.title}» dejará de estar visible para los estudiantes. Sus módulos y el historial se conservarán.`
            : ""
        }
        confirmLabel="Archivar curso"
        isConfirming={
          courseToArchive !== null && pendingId === courseToArchive.id
        }
        onCancel={() => setCourseToArchive(null)}
        onConfirm={() => {
          if (courseToArchive) {
            void changeStatus(courseToArchive, "ARCHIVED");
          }
        }}
      />
    </AuthenticatedLayout>
  );
}
