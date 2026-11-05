import { useEffect, useState } from "react";
import { ArrowLeft, Code2, Eye, FileText, Save } from "lucide-react";
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
  createLessonRequest,
  getAdminLessonRequest,
  listAdminLessonsRequest,
  updateLessonRequest,
  validateLessonContentRequest,
} from "../../services/lessons";
import type {
  AdminLessonDetailResponse,
  AdminLessonList,
  LessonContent,
  LessonContentIssue,
  LessonType,
} from "../../types/lesson";
import type { NavigateFn } from "../../types/navigation";

const MAX_TITLE_LENGTH = 200;

const THEORY_TEMPLATE = {
  schemaVersion: 1,
  blocks: [
    {
      id: "titulo",
      type: "heading",
      content: "Título de la sección",
      level: 2,
    },
    {
      id: "introduccion",
      type: "paragraph",
      content:
        "Escribe aquí el contenido de la lección. Puedes usar **negrita**, *cursiva*, ==resaltado== y enlaces con [texto](https://ejemplo.com).",
    },
    {
      id: "aviso",
      type: "callout",
      variant: "IMPORTANT",
      content: "Agrega aquí la información que el estudiante debe recordar.",
    },
  ],
};

const LAB_TEMPLATE = {
  schemaVersion: 1,
  introduction: "Describe la situación que el estudiante va a enfrentar.",
  objective: "Indica la habilidad o el conocimiento que pondrá en práctica.",
  scenario: "Presenta un escenario creíble y relacionado con el tema.",
  activities: [
    {
      id: "decision",
      type: "SINGLE_CHOICE",
      title: "Toma una decisión",
      instructions: "Selecciona la opción más segura.",
      required: true,
      hints: ["Revisa las señales de riesgo antes de decidir."],
      options: [
        { id: "opcion-a", text: "Primera opción" },
        { id: "opcion-b", text: "Segunda opción" },
      ],
      solution: { optionId: "opcion-a" },
    },
    {
      id: "terminal",
      type: "TERMINAL",
      title: "Terminal simulada",
      instructions: "Ejecuta los comandos necesarios para completar el objetivo.",
      required: true,
      hints: ["Usa el comando de ayuda para consultar la información disponible."],
      welcome: "Entorno aislado de práctica. No se ejecutan comandos reales.",
      prompt: "Ejecuta al menos un comando para completar la actividad.",
      commands: [
        {
          command: "ayuda",
          output: "Comandos disponibles: ayuda, estado",
          description: "Muestra la ayuda del entorno simulado.",
        },
        {
          command: "estado",
          output: "Estado simulado: entorno seguro",
          description: "Consulta el estado del entorno.",
        },
      ],
      solution: { requiredCommands: ["ayuda"] },
    },
    {
      id: "correo-sospechoso",
      type: "EMAIL_ANALYSIS",
      title: "Analiza el correo sospechoso",
      instructions:
        "Selecciona directamente sobre el correo las partes sospechosas. También hay partes legítimas que no debes marcar.",
      required: true,
      hints: [
        "Presta atención al dominio utilizado por quien envía el mensaje.",
      ],
      email: {
        fromName: "Soporte del sitio",
        fromAddress: "soporte@sitio-ejemplo.example.com",
        fromElementId: "remitente",
        toAddress: "usuario@sitio-ejemplo.example.com",
        toElementId: "destinatario",
        subject: "URGENTE: verifica tus credenciales",
        subjectElementId: "asunto",
        datetime: "miércoles, 4 de noviembre de 2026, 10:00 a. m.",
        datetimeElementId: "fecha",
        greeting: "Hola usuario:",
        greetingElementId: "saludo",
        body: [
          {
            text: "Detectamos un problema en tu cuenta y debemos verificar tus credenciales.",
            elementId: "credenciales",
          },
          {
            text: "Gracias por tu atención.",
          },
        ],
        linkLabel: "VERIFICAR AHORA",
        linkUrl: "http://sitio-ejemplo.example.com/verificar",
        linkElementId: "enlace",
        closingLines: ["Equipo de soporte."],
        closingElementId: "cierre",
        signatureLines: ["Departamento de soporte simulado"],
        signatureElementId: "firma",
        disclaimer:
          "Ejemplo ficticio para practicar. Ajusta el correo y los elementos a tu escenario real.",
      },
      elements: [
        { id: "remitente", text: "Datos del remitente" },
        { id: "destinatario", text: "Destinatario del mensaje" },
        { id: "asunto", text: "Línea de asunto" },
        { id: "fecha", text: "Fecha y hora de envío" },
        { id: "saludo", text: "Saludo inicial" },
        { id: "credenciales", text: "Solicitud de credenciales" },
        { id: "enlace", text: "Enlace de verificación" },
        { id: "cierre", text: "Cierre del mensaje" },
        { id: "firma", text: "Firma del mensaje" },
      ],
      solution: { elementIds: ["remitente", "asunto", "credenciales", "enlace"] },
    },
  ],
};

function templateFor(type: LessonType): string {
  return JSON.stringify(
    type === "THEORY" ? THEORY_TEMPLATE : LAB_TEMPLATE,
    null,
    2,
  );
}

export interface LessonFormPageProps {
  courseId: number;
  moduleId: number;
  lessonId?: number;
  navigate: NavigateFn;
}

export function LessonFormPage({
  courseId,
  moduleId,
  lessonId,
  navigate,
}: LessonFormPageProps) {
  const isEditing = lessonId !== undefined;
  const [listData, setListData] = useState<AdminLessonList | null>(null);
  const [lessonData, setLessonData] =
    useState<AdminLessonDetailResponse | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<LessonType>("THEORY");
  const [contentText, setContentText] = useState(templateFor("THEORY"));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [issues, setIssues] = useState<LessonContentIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    void Promise.all([
      listAdminLessonsRequest(courseId, moduleId),
      isEditing && lessonId !== undefined
        ? getAdminLessonRequest(courseId, moduleId, lessonId)
        : Promise.resolve(null),
    ])
      .then(([loadedList, loadedLesson]) => {
        if (!active) {
          return;
        }

        setListData(loadedList);

        if (loadedLesson) {
          setLessonData(loadedLesson);
          setTitle(loadedLesson.lesson.title);
          setType(loadedLesson.lesson.type);
          setContentText(
            JSON.stringify(loadedLesson.lesson.content, null, 2),
          );
        }
      })
      .catch((requestError: unknown) => {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo cargar la lección.",
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
  }, [courseId, moduleId, isEditing, lessonId, reloadKey]);

  const courseIsArchived = listData?.course.status === "ARCHIVED";

  const changeType = (nextType: LessonType) => {
    setType(nextType);

    if (!contentText.trim()) {
      setContentText(templateFor(nextType));
    }
  };

  const save = async (intent: "save" | "preview") => {
    setError(null);
    setIssues([]);

    if (courseIsArchived) {
      setError(
        "No se pueden modificar las lecciones de un curso archivado.",
      );
      return;
    }

    const nextFieldErrors: Record<string, string> = {};
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      nextFieldErrors["title"] = "Este campo es obligatorio.";
    } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      nextFieldErrors["title"] =
        `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres.`;
    }

    let parsedContent: unknown;

    try {
      parsedContent = JSON.parse(contentText);
    } catch (parseError) {
      nextFieldErrors["content"] =
        parseError instanceof Error
          ? `El JSON no es válido: ${parseError.message}`
          : "El JSON no es válido.";
    }

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const validation = await validateLessonContentRequest(
        courseId,
        moduleId,
        type,
        parsedContent as LessonContent,
      );

      if (!validation.valid) {
        setIssues(validation.issues);
        setError("Corrige los errores del contenido antes de guardar.");
        return;
      }

      let savedLessonId = lessonId;

      if (isEditing && lessonId !== undefined) {
        await updateLessonRequest(courseId, moduleId, lessonId, {
          title: trimmedTitle,
          type,
          content: parsedContent as LessonContent,
        });
        setFlash({
          variant: "success",
          message: "La lección se actualizó correctamente.",
        });
      } else {
        const created = await createLessonRequest(courseId, moduleId, {
          title: trimmedTitle,
          type,
          content: parsedContent as LessonContent,
        });
        savedLessonId = created.lesson.id;
        setFlash({
          variant: "success",
          message:
            "La lección se creó como borrador. Publícala cuando esté lista.",
        });
      }

      if (intent === "preview" && savedLessonId !== undefined) {
        navigate(
          `/admin/courses/${courseId}/modules/${moduleId}/lessons/${savedLessonId}/preview`,
        );
      } else {
        navigate(`/admin/courses/${courseId}/modules/${moduleId}/lessons`);
      }
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setFieldErrors(requestError.fields ?? {});
        setError(requestError.message);
      } else {
        setError("No se pudo guardar la lección.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthenticatedLayout
      title={isEditing ? "Editar lección" : "Crear lección"}
      currentPath="/admin/courses"
      navigate={navigate}
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            navigate(`/admin/courses/${courseId}/modules/${moduleId}/lessons`)
          }
        >
          <ArrowLeft size={15} /> Volver a las lecciones
        </Button>

        <AdminNav currentPath="/admin/courses" navigate={navigate} />

        {listData && (
          <div>
            <p className="text-xs font-medium text-accent">
              {listData.course.title} · {listData.module.title}
            </p>
            <h1 className="mb-1 text-2xl font-bold text-white">
              {isEditing ? "Editar lección" : "Crear lección"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Actualiza el título, el tipo o el JSON de contenido."
                : "La lección se creará como borrador al final del módulo."}
            </p>
          </div>
        )}

        {isLoading && (
          <StatePanel
            variant="loading"
            title="Cargando lección"
            description="Estamos consultando el contenido de la lección."
          />
        )}

        {!isLoading && error && !listData && (
          <StatePanel
            variant="error"
            title="No se pudo cargar la lección"
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

        {!isLoading && listData && (
          <>
            {courseIsArchived && (
              <Alert variant="warning">
                El curso está archivado. No se pueden crear ni modificar
                lecciones mientras permanezca en ese estado.
              </Alert>
            )}

            {lessonData && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white/5 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  Estado actual:
                </span>
                <ContentStatusBadge status={lessonData.lesson.status} />
                <span className="ml-auto text-xs text-muted-foreground">
                  El estado se cambia desde la lista de lecciones.
                </span>
              </div>
            )}

            {error && <Alert variant="error">{error}</Alert>}

            {fieldErrors["_form"] && (
              <Alert variant="error">{fieldErrors["_form"]}</Alert>
            )}

            <Card className="p-5">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save("save");
                }}
              >
                <Input
                  label="Título de la lección"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  error={fieldErrors["title"]}
                  placeholder="Ej. Identificación de correos fraudulentos"
                  maxLength={MAX_TITLE_LENGTH}
                  required
                  autoComplete="off"
                  disabled={courseIsArchived}
                  icon={<FileText size={15} />}
                />

                <div>
                  <label
                    htmlFor="lesson-type"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Tipo de lección
                  </label>
                  <select
                    id="lesson-type"
                    value={type}
                    onChange={(event) =>
                      changeType(event.target.value as LessonType)
                    }
                    disabled={courseIsArchived}
                    className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  >
                    <option value="THEORY">Teoría</option>
                    <option value="LABORATORY">Laboratorio</option>
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Las lecciones sencillas y desarrolladas usan el tipo
                    Teoría y la misma estructura JSON.
                  </p>
                </div>

                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="lesson-content"
                      className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                    >
                      <Code2 size={15} /> Contenido JSON
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={courseIsArchived}
                        onClick={() => setContentText(templateFor("THEORY"))}
                      >
                        Plantilla de teoría
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={courseIsArchived}
                        onClick={() => setContentText(templateFor("LABORATORY"))}
                      >
                        Plantilla de laboratorio
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="lesson-content"
                    value={contentText}
                    onChange={(event) => setContentText(event.target.value)}
                    error={fieldErrors["content"]}
                    helperText="El contenido se valida en el servidor antes de guardarse."
                    rows={22}
                    spellCheck={false}
                    disabled={courseIsArchived}
                    className="font-mono text-xs"
                  />
                </div>

                {issues.length > 0 && (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/25 bg-destructive/10 p-4"
                  >
                    <p className="mb-2 text-sm font-semibold text-destructive">
                      Errores de contenido
                    </p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {issues.map((issue, index) => (
                        <li key={`${issue.path}-${issue.code}-${index}`}>
                          <code className="text-destructive">
                            {issue.path}
                          </code>{" "}
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        `/admin/courses/${courseId}/modules/${moduleId}/lessons`,
                      )
                    }
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isSubmitting || courseIsArchived}
                    onClick={() => {
                      void save("preview");
                    }}
                  >
                    <Eye size={15} />
                    Guardar y previsualizar
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
                        : "Crear lección"}
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
