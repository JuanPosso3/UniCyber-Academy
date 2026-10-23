import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, FileText, Save } from "lucide-react";
import { AuthenticatedLayout } from "../../components/layout/AuthenticatedLayout";
import { AdminNav } from "../../components/layout/AdminNav";
import { ContentStatusBadge } from "../../components/courses/ContentStatusBadge";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { StatePanel } from "../../components/ui/StatePanel";
import { Textarea } from "../../components/ui/Textarea";
import { ApiError } from "../../lib/api";
import { setFlash } from "../../lib/flash";
import {
  createModuleRequest,
  getAdminModuleRequest,
  listAdminModulesRequest,
  updateModuleRequest,
} from "../../services/courses";
import type {
  CourseModule,
  CourseModuleList,
} from "../../types/course";
import type { FieldErrors } from "../../types/auth";
import type { NavigateFn } from "../../types/navigation";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

function validateForm(title: string, description: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    errors["title"] = "Este campo es obligatorio.";
  } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    errors["title"] = `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres.`;
  }

  if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    errors["description"] = `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres.`;
  }

  return errors;
}

export interface ModuleFormPageProps {
  courseId: number;
  moduleId?: number;
  navigate: NavigateFn;
}

export function ModuleFormPage({
  courseId,
  moduleId,
  navigate,
}: ModuleFormPageProps) {
  const isEditing = moduleId !== undefined;
  const [courseData, setCourseData] = useState<CourseModuleList | null>(
    null,
  );
  const [module, setModule] = useState<CourseModule | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    const requests: [
      Promise<CourseModuleList>,
      Promise<{ module: CourseModule }> | null,
    ] = [
      listAdminModulesRequest(courseId),
      isEditing && moduleId !== undefined
        ? getAdminModuleRequest(courseId, moduleId)
        : null,
    ];

    void Promise.all([
      requests[0],
      requests[1] ?? Promise.resolve(null),
    ])
      .then(([loadedCourse, moduleResult]) => {
        if (!active) {
          return;
        }

        setCourseData(loadedCourse);

        if (moduleResult) {
          setModule(moduleResult.module);
          setTitle(moduleResult.module.title);
          setDescription(moduleResult.module.description ?? "");
        }
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cargar el módulo.",
        );
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [courseId, isEditing, moduleId, reloadKey]);

  const courseIsArchived = courseData?.course.status === "ARCHIVED";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (courseIsArchived) {
      setError(
        "No se pueden modificar los módulos de un curso archivado.",
      );
      return;
    }

    const validationErrors = validateForm(title, description);
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
    };

    setIsSubmitting(true);

    try {
      if (isEditing && moduleId !== undefined) {
        await updateModuleRequest(courseId, moduleId, payload);
        setFlash({
          variant: "success",
          message: "El módulo se actualizó correctamente.",
        });
      } else {
        await createModuleRequest(courseId, payload);
        setFlash({
          variant: "success",
          message:
            "El módulo se creó como borrador. Publícalo cuando esté listo.",
        });
      }

      navigate(`/admin/courses/${courseId}/modules`);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setFieldErrors(requestError.fields ?? {});
        setError(requestError.message);
      } else {
        setError("No se pudo guardar el módulo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthenticatedLayout
      title={isEditing ? "Editar módulo" : "Crear módulo"}
      currentPath="/admin/courses"
      navigate={navigate}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(`/admin/courses/${courseId}/modules`)}
        >
          <ArrowLeft size={15} /> Volver a los módulos del curso
        </Button>

        <AdminNav currentPath="/admin/courses" navigate={navigate} />

        {courseData && (
          <div>
            <p className="text-xs font-medium text-accent">
              {courseData.course.title}
            </p>
            <h1 className="mb-1 text-2xl font-bold text-white">
              {isEditing ? "Editar módulo" : "Crear módulo"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Actualiza la información del módulo."
                : "El módulo se creará como borrador al final de la lista."}
            </p>
          </div>
        )}

        {isLoading && (
          <StatePanel
            variant="loading"
            title="Cargando módulo"
            description="Estamos consultando la información del módulo."
          />
        )}

        {!isLoading && error && !courseData && (
          <StatePanel
            variant="error"
            title="No se pudo cargar el módulo"
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

        {!isLoading && courseData && (
          <>
            {courseIsArchived && (
              <Alert variant="warning">
                El curso está archivado. No se pueden crear ni modificar
                módulos mientras permanezca en ese estado.
              </Alert>
            )}

            {module && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white/5 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  Estado actual:
                </span>
                <ContentStatusBadge status={module.status} />
                <span className="ml-auto text-xs text-muted-foreground">
                  El estado se cambia desde la lista de módulos.
                </span>
              </div>
            )}

            {error && <Alert variant="error">{error}</Alert>}

            {fieldErrors["_form"] && (
              <Alert variant="error">{fieldErrors["_form"]}</Alert>
            )}

            <Card className="p-5">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  label="Título del módulo"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  error={fieldErrors["title"]}
                  placeholder="Ej. Segmentación de redes"
                  maxLength={MAX_TITLE_LENGTH}
                  required
                  autoComplete="off"
                  disabled={courseIsArchived}
                  icon={<FileText size={15} />}
                />

                <Textarea
                  label="Descripción"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  error={fieldErrors["description"]}
                  helperText={`${description.length}/${MAX_DESCRIPTION_LENGTH} caracteres`}
                  placeholder="Describe los temas que cubre este módulo."
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  rows={6}
                  disabled={courseIsArchived}
                />

                <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        `/admin/courses/${courseId}/modules`,
                      )
                    }
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || courseIsArchived}
                    aria-busy={isSubmitting}
                  >
                    <Save size={15} />
                    {isSubmitting
                      ? "Guardando..."
                      : isEditing
                        ? "Guardar cambios"
                        : "Crear módulo"}
                  </Button>
                </div>
              </form>
            </Card>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
