import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { ArrowLeft, BookOpen, Save } from "lucide-react";
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
  createCourseRequest,
  getAdminCourseRequest,
  updateCourseRequest,
} from "../../services/courses";
import type { CourseDetail } from "../../types/course";
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

export interface CourseFormPageProps {
  courseId?: number;
  navigate: NavigateFn;
}

export function CourseFormPage({
  courseId,
  navigate,
}: CourseFormPageProps) {
  const isEditing = courseId !== undefined;
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isEditing || courseId === undefined) {
      return;
    }

    let active = true;

    setIsLoading(true);
    setError(null);

    void getAdminCourseRequest(courseId)
      .then(({ course: loadedCourse }) => {
        if (!active) {
          return;
        }

        setCourse(loadedCourse);
        setTitle(loadedCourse.title);
        setDescription(loadedCourse.description ?? "");
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cargar el curso.",
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
  }, [courseId, isEditing, reloadKey]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setError(null);

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
      if (isEditing && courseId !== undefined) {
        const { course: updated } = await updateCourseRequest(
          courseId,
          payload,
        );

        setCourse((current) =>
          current ? { ...current, ...updated } : current,
        );
        setFieldErrors({});
        setNotice("Los cambios del curso se guardaron correctamente.");
      } else {
        const { course: created } = await createCourseRequest(payload);
        setFlash({
          variant: "success",
          message: "El curso se creó correctamente. Ahora puedes agregar módulos.",
        });
        navigate(`/admin/courses/${created.id}/modules`);
      }
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setFieldErrors(requestError.fields ?? {});
        setError(requestError.message);
      } else {
        setError("No se pudo guardar el curso.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthenticatedLayout
      title={isEditing ? "Editar curso" : "Crear curso"}
      currentPath="/admin/courses"
      navigate={navigate}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/admin/courses")}
        >
          <ArrowLeft size={15} /> Volver a la gestión de cursos
        </Button>

        <AdminNav currentPath="/admin/courses" navigate={navigate} />

        <div>
          <h1 className="mb-1 text-2xl font-bold text-white">
            {isEditing ? "Editar curso" : "Crear curso"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Actualiza la información general del curso."
              : "El curso se creará como borrador y podrás publicarlo cuando esté listo."}
          </p>
        </div>

        {isLoading && (
          <StatePanel
            variant="loading"
            title="Cargando curso"
            description="Estamos consultando la información del curso."
          />
        )}

        {!isLoading && error && !course && (
          <StatePanel
            variant="error"
            title="No se pudo cargar el curso"
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

        {!isLoading && (!error || course) && (
          <Card className="p-5">
            {course && (
              <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white/5 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  Estado actual:
                </span>
                <ContentStatusBadge status={course.status} />
                <span className="ml-auto text-xs text-muted-foreground">
                  El estado se cambia desde la lista de cursos.
                </span>
              </div>
            )}

            {notice && <Alert variant="success">{notice}</Alert>}

            {error && course && (
              <Alert variant="error" className="mt-3">
                {error}
              </Alert>
            )}

            {fieldErrors["_form"] && (
              <Alert variant="error" className="mt-3">
                {fieldErrors["_form"]}
              </Alert>
            )}

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Título del curso"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                error={fieldErrors["title"]}
                placeholder="Ej. Fundamentos de seguridad en redes"
                maxLength={MAX_TITLE_LENGTH}
                required
                autoComplete="off"
                icon={<BookOpen size={15} />}
              />

              <Textarea
                label="Descripción"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                error={fieldErrors["description"]}
                helperText={`${description.length}/${MAX_DESCRIPTION_LENGTH} caracteres`}
                placeholder="Describe el propósito y el contenido general del curso."
                maxLength={MAX_DESCRIPTION_LENGTH}
                rows={6}
              />

              <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/admin/courses")}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                >
                  <Save size={15} />
                  {isSubmitting
                    ? "Guardando..."
                    : isEditing
                      ? "Guardar cambios"
                      : "Crear curso"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
