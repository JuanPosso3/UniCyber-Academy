import { afterEach, expect, it, vi } from "vitest";
import { loginRequest } from "../src/services/auth";

afterEach(() => vi.unstubAllGlobals());
it("login request sends CAPTCHA token with existing credential and cookie conventions", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user: { id: 1 } }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await loginRequest({ email: "ana@example.test", password: "Valida123!", recaptchaToken: "test-captcha-token" });
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(String(url)).toMatch(/\/auth\/login$/);
  expect(JSON.parse(init.body)).toEqual({ email: "ana@example.test", password: "Valida123!", recaptchaToken: "test-captcha-token" });
  expect(init.credentials).toBe("include");
  expect(new Headers(init.headers).get("x-unicyber-request")).toBe("1");
});
