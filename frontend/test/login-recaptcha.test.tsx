import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import type { ReCAPTCHAProps } from "react-google-recaptcha";
import { Login } from "../src/pages/auth/Login";
import { ApiError } from "../src/lib/api";

const { login, reset } = vi.hoisted(() => ({ login: vi.fn(), reset: vi.fn() }));
vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({ login, isSubmitting: false, sessionNotice: null }),
}));
vi.mock("react-google-recaptcha", () => ({
  default: forwardRef(function MockCaptcha(props: ReCAPTCHAProps, ref) {
    useImperativeHandle(ref, () => ({ reset: () => { reset(); props.onChange?.(null); }, getWidgetId: () => 0 }));
    return <div data-testid="captcha" data-sitekey={props.sitekey} data-language={props.hl} data-size={props.size}>
      <button type="button" onClick={() => props.onChange?.("mock-captcha-token")}>Completar CAPTCHA</button>
      <button type="button" onClick={props.onExpired}>Expirar CAPTCHA</button>
      <button type="button" onClick={props.onErrored}>Error CAPTCHA</button>
    </div>;
  }),
}));

function credentials() {
  fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "ana@example.test" } });
  fireEvent.change(screen.getByLabelText("Contraseña", { exact: true }), { target: { value: "Valida123!" } });
}
const submit = () => fireEvent.click(screen.getByRole("button", { name: /^Ingresar/ }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_RECAPTCHA_SITE_KEY", "public-test-site-key");
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("login CAPTCHA", () => {
  it("renders Spanish checkbox using the public environment key without changing the slogan", () => {
    render(<Login navigate={vi.fn()} />);
    const captcha = screen.getByTestId("captcha");
    expect(captcha.getAttribute("data-sitekey")).toBe("public-test-site-key");
    expect(captcha.getAttribute("data-language")).toBe("es");
    expect(captcha.getAttribute("data-size")).toBe("normal");
    expect(screen.getByText("Construye tus habilidades. Defiende el futuro.")).toBeTruthy();
  });

  it("missing token prevents login and focuses accessible verification instructions", () => {
    render(<Login navigate={vi.fn()} />);
    credentials(); submit();
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("Completa la verificación de seguridad para continuar.");
    expect(document.activeElement?.getAttribute("aria-labelledby")).toBe("captcha-label");
  });

  it("includes token and resets after successful authentication", async () => {
    login.mockResolvedValue({ id: 1 });
    const navigate = vi.fn();
    render(<Login navigate={navigate} />);
    credentials(); fireEvent.click(screen.getByText("Completar CAPTCHA")); submit();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("dashboard"));
    expect(login).toHaveBeenCalledWith("ana@example.test", "Valida123!", "mock-captcha-token");
    expect(reset).toHaveBeenCalledTimes(1);
    submit();
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("preserves incorrect-credentials message and resets after failure", async () => {
    login.mockRejectedValue(new ApiError(401, "Correo electrónico o contraseña incorrectos.", "INVALID_CREDENTIALS"));
    render(<Login navigate={vi.fn()} />);
    credentials(); fireEvent.click(screen.getByText("Completar CAPTCHA")); submit();
    await waitFor(() => expect(screen.getByText("Correo electrónico o contraseña incorrectos.")).toBeTruthy());
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("expiration clears token, resets widget and requests a new verification", () => {
    render(<Login navigate={vi.fn()} />);
    credentials(); fireEvent.click(screen.getByText("Completar CAPTCHA")); fireEvent.click(screen.getByText("Expirar CAPTCHA"));
    expect(screen.getByRole("status").textContent).toContain("La verificación ha expirado. Inténtalo nuevamente.");
    expect(reset).toHaveBeenCalledTimes(1);
    submit(); expect(login).not.toHaveBeenCalled();
  });

  it("widget errors clear token and reset with a Spanish error", () => {
    render(<Login navigate={vi.fn()} />);
    credentials(); fireEvent.click(screen.getByText("Completar CAPTCHA")); fireEvent.click(screen.getByText("Error CAPTCHA"));
    expect(screen.getByRole("status").textContent).toContain("No se pudo completar la verificación de seguridad.");
    expect(reset).toHaveBeenCalledTimes(1);
    submit(); expect(login).not.toHaveBeenCalled();
  });

  it.each([0, 403, 503])("verification or network failure (%s) resets the verification", async (status) => {
    login.mockRejectedValue(new ApiError(status, "No se pudo completar la verificación de seguridad. Inténtalo más tarde.", "CAPTCHA_UNAVAILABLE"));
    render(<Login navigate={vi.fn()} />);
    credentials(); fireEvent.click(screen.getByText("Completar CAPTCHA")); submit();
    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/No se pudo completar la verificación de seguridad/)).toBeTruthy();
  });

  it("prevents synchronous duplicate submissions and does not retain the consumed token", async () => {
    let resolve: (value: unknown) => void = () => {};
    login.mockReturnValue(new Promise(r => { resolve = r; }));
    const { container } = render(<Login navigate={vi.fn()} />);
    credentials(); fireEvent.click(screen.getByText("Completar CAPTCHA"));
    fireEvent.submit(container.querySelector("form")!);
    fireEvent.submit(container.querySelector("form")!);
    expect(login).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ id: 1 }); });
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not navigate or update the widget after unmounting an active request", async () => {
    let reject: (error: Error) => void = () => {};
    login.mockReturnValue(new Promise((_r, j) => { reject = j; }));
    const navigate = vi.fn();
    const page = render(<Login navigate={navigate} />);
    credentials(); fireEvent.click(screen.getByText("Completar CAPTCHA")); submit();
    page.unmount();
    await act(async () => { reject(new Error("network")); });
    expect(navigate).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
  });

  it("fails closed if public site key is absent", () => {
    vi.stubEnv("VITE_RECAPTCHA_SITE_KEY", "");
    render(<Login navigate={vi.fn()} />);
    expect(screen.queryByTestId("captcha")).toBeNull();
    expect(screen.getByText("La verificación de seguridad no está disponible. Inténtalo más tarde.")).toBeTruthy();
    credentials(); submit(); expect(login).not.toHaveBeenCalled();
  });

  it("uses compact widget on mobile screens", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    render(<Login navigate={vi.fn()} />);
    expect(screen.getByTestId("captcha").getAttribute("data-size")).toBe("compact");
  });
});
