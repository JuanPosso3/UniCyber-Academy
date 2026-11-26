import { Shield } from "lucide-react";

export function DataProtectionPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <article className="mx-auto max-w-3xl space-y-7 rounded-2xl border border-border bg-card p-5 sm:p-10">
        <header>
          <Shield className="mb-4 text-accent" aria-hidden="true" />
          <p className="mb-2 text-sm text-accent">UniCyber Academy</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Política de protección de datos personales y tratamiento de la información</h1>
          <p className="mt-3 text-sm text-muted-foreground">Información para las personas que utilizan esta plataforma académica de educación en ciberseguridad.</p>
        </header>
        <section className="space-y-2" aria-labelledby="purpose">
          <h2 id="purpose" className="text-lg font-semibold">1. Finalidad de la recopilación de datos</h2>
          <p>Los nombres, apellidos, correo electrónico y credenciales suministrados durante el registro permiten identificar tu cuenta y darte acceso a los servicios educativos. La plataforma también conserva el nombre de usuario, rol, estado de la cuenta, progreso de lecciones, respuestas e intentos de evaluación y logros asociados a tu aprendizaje.</p>
        </section>
        <section className="space-y-2" aria-labelledby="usage">
          <h2 id="usage" className="text-lg font-semibold">2. Uso de la información</h2>
          <p>La información se utiliza para operar UniCyber Academy, gestionar cuentas, presentar contenidos, evaluar el aprendizaje y recuperar el acceso. El proyecto tiene una finalidad académica, no comercial ni publicitaria.</p>
          <p>La infraestructura prevista utiliza Vercel para el sitio, Render para la API y Neon para la base de datos. Estos proveedores pueden procesar los datos necesarios para prestar sus servicios; esta página no certifica sus condiciones contractuales ni la ubicación del tratamiento.</p>
        </section>
        <section className="space-y-2" aria-labelledby="privacy">
          <h2 id="privacy" className="text-lg font-semibold">3. Privacidad y confidencialidad</h2>
          <p>El acceso a información de cuenta y al progreso requiere autenticación. Las funciones administrativas están restringidas mediante controles de autorización del servidor. Las contraseñas se guardan mediante una función de derivación criptográfica con sal, no como texto legible. Estas medidas reducen riesgos, pero no constituyen una garantía absoluta de seguridad.</p>
        </section>
        <section className="space-y-2" aria-labelledby="analysis">
          <h2 id="analysis" className="text-lg font-semibold">4. Análisis de información</h2>
          <p>Los registros disponibles permiten analizar internamente el uso de la plataforma, la participación educativa, el avance, los resultados y las oportunidades de mejora de la experiencia de aprendizaje. Las estadísticas administrativas incluyen registros de cuentas, cursos, intentos y aprobación. El análisis del desempeño de la aplicación se limita a la información operativa disponible; esta política no supone la incorporación de rastreadores publicitarios ni servicios adicionales de analítica.</p>
        </section>
        <section className="space-y-2" aria-labelledby="rights">
          <h2 id="rights" className="text-lg font-semibold">5. Derechos e información del responsable</h2>
          <p>En el contexto colombiano, la Ley 1581 de 2012 contempla derechos como conocer, actualizar y rectificar los datos, solicitar información sobre su uso y, cuando proceda, solicitar su supresión o revocar la autorización. El perfil permite consultar información de cuenta y actualizar el nombre de usuario; no existe una función de autoeliminación de cuenta.Si un usuario desea eliminar su cuenta y solicitar la supresión de sus datos personales, deberá enviar una solicitud al correo electrónico de contacto indicado en esta política</p>
          <p>El responsable del tratamiento de datos personales es el estudiante de posgrado Juan Miguel Posso Alvarado que desarrolla este proyecto académico, quien puede ser contactado mediante el correo electrónico juan.miguel.posso@correounivalle.edu.co </p>
          <p>Esta página no atribuye responsabilidad jurídica o autorización institucional a la Universidad del Valle, ni certifica cumplimiento legal integral.</p>
        </section>
        <section id="conditions" className="space-y-2" aria-labelledby="acceptance">
          <h2 id="acceptance" className="text-lg font-semibold">6. Aceptación de las condiciones</h2>
          <p>Al marcar la casilla obligatoria del registro declaras que has leído y aceptas las condiciones de tratamiento de datos expuestas en esta página. Los enlaces de condiciones y privacidad del formulario remiten a este mismo documento informativo. La aceptación no acredita por sí sola el cumplimiento de todas las obligaciones legales aplicables.</p>
        </section>
        <footer className="border-t border-border pt-5 text-sm">
          <p className="mb-3 text-muted-foreground">Si abriste esta página desde el formulario, vuelve a la pestaña de registro para conservar los datos que estabas escribiendo.</p>
          <a href="/register" className="font-semibold text-accent underline focus-visible:outline-2 focus-visible:outline-primary">Volver al registro</a>
        </footer>
      </article>
    </main>
  );
}
