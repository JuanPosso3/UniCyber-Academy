import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Layers,
} from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatePanel } from "../../components/ui/StatePanel";
import { ApiError } from "../../lib/api";
import { getAvailableCourseRequest } from "../../services/courses";
import type { CourseDetail } from "../../types/course";
import type { NavigateFn } from "../../types/navigation";

export interface CourseDetailPageProps {
  courseId: number;
  navigate: NavigateFn;
}

export function CourseDetailPage({
  courseId,
  navigate,
}: CourseDetailPageProps) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setError(null);

    void getAvailableCourseRequest(courseId)
      .then(({ course: loadedCourse }) => {
        if (active) {
          setCourse(loadedCourse);
        }
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setCourse(null);
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cargar el curso.",
        );
      });

    return () => {
      active = false;
    };
  }, [courseId, reloadKey]);

  return (
    <AuthenticatedLayout
      title="Detalle del curso"
      currentPath="/courses"
      navigate={navigate}
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/courses")}
        >
          <ArrowLeft size={15} /> Volver al catálogo
        </Button>

        {error && (
          <StatePanel
            variant="error"
            title="No se pudo abrir el curso"
            description={error}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  Reintentar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/courses")}
                >
                  Ir al catálogo
                </Button>
              </div>
            }
          />
        )}

        {!error && course === null && (
          <StatePanel
            variant="loading"
            title="Cargando curso"
            description="Estamos consultando la información del curso."
          />
        )}

        {course && (
          <>
            <Card className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-accent/20 text-primary">
                  <BookOpen size={26} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge color="green">Publicado</Badge>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Layers size={13} aria-hidden="true" />
                      {course.moduleCount}{" "}
                      {course.moduleCount === 1 ? "módulo" : "módulos"}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-white">
                    {course.title}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {course.description ?? "Sin descripción."}
                  </p>
                </div>
              </div>
            </Card>

            <section aria-labelledby="modules-title">
              <div className="mb-3 flex items-center justify-between">
                <h2
                  id="modules-title"
                  className="text-lg font-semibold text-white"
                >
                  Módulos del curso
                </h2>
                <span className="text-xs text-muted-foreground">
                  {course.modules.length} publicados
                </span>
              </div>

              {course.modules.length === 0 ? (
                <StatePanel
                  variant="empty"
                  title="Este curso aún no tiene módulos disponibles"
                  description="El equipo administrativo publicará el contenido próximamente."
                />
              ) : (
                <ol className="space-y-3">
                  {course.modules.map((module) => (
                    <li key={module.id}>
                      <Card className="flex gap-4 p-4">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 text-sm font-bold text-accent">
                          {module.order}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white">
                            {module.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {module.description ?? "Sin descripción."}
                          </p>
                        </div>
                        <FileText
                          size={16}
                          className="ml-auto hidden flex-shrink-0 text-muted-foreground sm:block"
                          aria-hidden="true"
                        />
                      </Card>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
