# Academic Content Structure

## 1. Purpose

This document describes the initial academic content created for UniCyber Academy and the constraints used to develop it.

The content is based on the two supplied reference documents:

- `# INSTRUCCIÓN COMPLEMENTARIA CREACI.txt`
- `# DOCUMENTO MAESTRO DE ESPECIFICACI.txt`

The implementation does not invent institutional procedures, references, statistics, assessment questions, or academic facts. When a procedure depends on an organization, the content refers to the organization's established reporting channel without inventing a specific channel.

## 2. Required structure

The database structure created by the seed is:

| Element | Count |
| --- | --- |
| Courses | 5 |
| Modules | 15 |
| Theory lessons | 30 |
| Laboratories | 5 |
| Draft module assessments | 15 |

Each course has three modules. Each module has two theory lessons. The laboratory is stored as an additional lesson at the end of the third module, so it does not create a fourth module.

## 3. Courses and modules

### Course 1: Phishing y simulaciones de ataque

| Module | Theory lessons |
| --- | --- |
| Fundamentos del phishing | ¿Qué es el phishing y cómo funciona?; Tipos de phishing y técnicas de engaño |
| Identificación de correos y sitios fraudulentos | Cómo identificar un correo electrónico falso; Identificación de páginas web fraudulentas |
| Prevención y actuación frente al phishing | Buenas prácticas para prevenir ataques de phishing; Qué hacer cuando recibimos un correo sospechoso |

Laboratory: **Detectives del phishing**.

### Course 2: Gestión de contraseñas y autenticación

| Module | Theory lessons |
| --- | --- |
| Fundamentos de las contraseñas seguras | Importancia de las contraseñas en la seguridad digital; Características de una contraseña segura |
| Administración y protección de credenciales | Riesgos de reutilizar contraseñas; Gestores de contraseñas y almacenamiento seguro |
| Autenticación multifactor (MFA) | ¿Qué es la autenticación multifactor?; Métodos de autenticación y buenas prácticas |

Laboratory: **Protege tus credenciales**.

### Course 3: Respuesta a incidentes de seguridad

| Module | Theory lessons |
| --- | --- |
| Identificación y comprensión de incidentes | ¿Qué es un incidente de seguridad informática?; Señales de alerta y detección de incidentes |
| Procedimientos de actuación y reporte | Primeras acciones ante un incidente; Cómo reportar un incidente de seguridad |
| Suplantación de identidad y recuperación de cuentas | Cómo actuar ante la suplantación de una cuenta; Recuperación y protección posterior al incidente |

Laboratory: **Centro de respuesta a incidentes**.

### Course 4: Seguridad en redes WiFi

| Module | Theory lessons |
| --- | --- |
| Fundamentos de las redes inalámbricas | ¿Cómo funcionan las redes WiFi?; Riesgos de las redes WiFi públicas |
| Amenazas y ataques en redes inalámbricas | Ataques de intermediario (MITM); Redes falsas y otros ataques WiFi |
| Protección y navegación segura | Uso de VPN y protección de conexiones; Buenas prácticas al conectarse a redes WiFi |

Laboratory: **Conexión segura bajo presión**.

### Course 5: Amenazas emergentes

| Module | Theory lessons |
| --- | --- |
| Deepfakes e inteligencia artificial en la ciberseguridad | ¿Qué son los deepfakes y cómo funcionan?; Identificación de contenido manipulado |
| Ingeniería social avanzada | Evolución de la ingeniería social; Nuevas técnicas de manipulación y engaño |
| Dispositivos USB y amenazas físicas digitales | Los dispositivos USB como vector de ataque; Prevención y protección frente a amenazas emergentes |

Laboratory: **Identifica la amenaza emergente**.

## 4. Theory content

Each theory lesson contains:

- A heading.
- One or more explanatory paragraphs.
- A list of key ideas, risks, or practices.
- A table when it helps compare concepts.
- A callout with an important warning, tip, or common mistake.

The content uses the existing theory block contract:

`heading`, `paragraph`, `list`, `table`, `code`, `callout`, and `link`.

No arbitrary HTML is used. Inline emphasis is limited to the supported inline syntax.

## 5. Laboratory content

Each laboratory contains:

- An introduction.
- An objective.
- A scenario.
- Between three and five activities.

The activities use the implemented types:

- `SINGLE_CHOICE`
- `IDENTIFY_SUSPICIOUS`
- `MULTIPLE_SELECT`
- `DECISION_STEPS`
- `ORDER_PROCEDURE`
- `TERMINAL`

Every activity includes Spanish instructions and hints. Solutions remain in the stored JSON for administrative preview and are removed from student responses.

The terminal activities are fully simulated. Their commands and outputs are defined in the lesson JSON and are not executed on the host.

## 6. Assessment records

The reference documents require a short recall assessment at the end of each module. The current project has `Assessment` and `AssessmentAttempt` models but no assessment authoring or execution workflow.

To avoid inventing a parallel system:

- The seed creates one `Assessment` per module with `type = MODULE` and `status = DRAFT`.
- The assessments have titles and descriptions but no questions.
- They do not affect students while they remain `DRAFT`.
- The module unlocking logic reads active assessments and existing attempts with `score >= 70`.
- Question authoring, delivery, and attempt registration through a UI remain pending.

This dependency is documented in `LESSON_LEARNING_SYSTEM.md` and in the frontend documentation.

## 7. Status and publication

All academic content is created as `DRAFT`:

- Courses: `DRAFT`.
- Modules: `DRAFT`.
- Lessons: `DRAFT`.
- Module assessments: `DRAFT`.

The seed does not publish content automatically. An administrator must review and activate courses, modules, and lessons through the existing administrative flow. Lesson activation validates the stored JSON.

## 8. Seed command

```bash
pnpm seed:academic
```

The seed is idempotent. It validates all content before writing, preserves existing records with the same course/module/lesson title, and does not overwrite edited content.

## 9. Content limitations

- The content is introductory and educational; it is not a substitute for an organization's security policies.
- Reporting references are intentionally generic because the project does not define a specific institutional reporting channel.
- No statistics, external study results, or institutional procedures were invented.
- The assessment questions are intentionally absent because no assessment execution workflow exists.
- The academic content should be reviewed by subject-matter experts before publication.
