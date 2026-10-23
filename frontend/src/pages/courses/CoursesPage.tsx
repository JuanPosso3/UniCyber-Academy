import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Layers, Search } from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatePanel } from "../../components/ui/StatePanel";
import { ApiError } from "../../lib/api";
import { listAvailableCoursesRequest } from "../../services/courses";
import type { CourseSummary } from "../../types/course";
import type { NavigateFn } from "../../types/navigation";

export interface CoursesPageProps {
  navigate: NavigateFn;
}

export function CoursesPage({ navigate }: CoursesPageProps) {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setError(null);

    void listAvailableCoursesRequest()
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
            : "No se pudo cargar el catálogo de cursos.",
        );
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");

    if (!term || !courses) {
      return courses ?? [];
    }

    return courses.filter((course) => {
      const haystack = `${course.title} ${
        course.description ?? ""
      }`.toLocaleLowerCase("es");

      return haystack.includes(term);
    });
  }, [courses, search]);

  return (
    <AuthenticatedLayout
      title="Catálogo de cursos"
      currentPath="/courses"
      navigate={navigate}
    >
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-white">
              Catálogo de cursos
            </h1>
            <p className="text-sm text-muted-foreground">
              {courses === null
                ? "Cargando cursos publicados..."
                : `${courses.length} ${
                    courses.length === 1
                      ? "curso publicado"
                      : "cursos publicados"
                  }`}
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cursos..."
              aria-label="Buscar cursos"
              className="w-full rounded-xl border border-border bg-input-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>
        </div>

        {error && (
          <StatePanel
            variant="error"
            title="No se pudo cargar el catálogo"
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
            description="Estamos consultando los cursos publicados."
          />
        )}

        {!error && courses !== null && courses.length === 0 && (
          <StatePanel
            variant="empty"
            title="No hay cursos publicados"
            description="Cuando el equipo administrativo publique un curso, aparecerá aquí."
          />
        )}

        {!error &&
          courses !== null &&
          courses.length > 0 &&
          filteredCourses.length === 0 && (
            <StatePanel
              variant="empty"
              title="No encontramos coincidencias"
              description="Prueba con otro término de búsqueda."
              action={
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSearch("")}
                >
                  Limpiar búsqueda
                </Button>
              }
            />
          )}

        {filteredCourses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                interactive
                className="flex flex-col p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-accent/20 text-primary">
                    <BookOpen size={21} aria-hidden="true" />
                  </div>
                  <span className="flex items-center gap-1.5 rounded-lg border border-border bg-white/5 px-2 py-1 text-xs text-muted-foreground">
                    <Layers size={13} aria-hidden="true" />
                    {course.moduleCount}{" "}
                    {course.moduleCount === 1 ? "módulo" : "módulos"}
                  </span>
                </div>

                <h2 className="text-base font-semibold text-white">
                  {course.title}
                </h2>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">
                  {course.description ?? "Sin descripción."}
                </p>

                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 justify-center"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  Ver curso <ArrowRight size={15} />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
